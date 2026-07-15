// Variables to control game state
let gameRunning = false;
let dropMaker;
let gameTimer;
let score = 0;
let timeRemaining = 30;
let winEffectTimeout;
let currentDifficulty = "normal";
let reachedMilestones = new Set();

const sounds = {
  collect: { src: "audio/collect.mp3", volume: 0.45 },
  miss: { src: "audio/miss.mp3", volume: 0.4 },
  click: { src: "audio/click.mp3", volume: 0.35 },
  win: { src: "audio/win.mp3", volume: 0.45 }
};

const audioPool = Object.fromEntries(
  Object.entries(sounds).map(([key, config]) => {
    const audio = new Audio(config.src);
    audio.preload = "auto";
    audio.volume = config.volume;
    return [key, audio];
  })
);

const milestoneMessages = [
  { key: "quarter", ratio: 0.25, text: "Great start! Keep it going." },
  { key: "half", ratio: 0.5, text: "Halfway there!" },
  { key: "three-quarters", ratio: 0.75, text: "Almost there. Final push!" }
];

const difficultyModes = {
  easy: {
    label: "Easy",
    goal: 20,
    time: 40,
    spawnInterval: 900,
    badDropChance: 0.15,
    dropDuration: 4.4,
    badDropPenalty: 1
  },
  normal: {
    label: "Normal",
    goal: 20,
    time: 30,
    spawnInterval: 750,
    badDropChance: 0.25,
    dropDuration: 4,
    badDropPenalty: 1
  },
  hard: {
    label: "Hard",
    goal: 25,
    time: 30,
    spawnInterval: 750,
    badDropChance: 0.35,
    dropDuration: 3.2,
    badDropPenalty: 2
  }
};

const winningMessages = [
  "Great job! You collected enough water!",
  "Nice work, you won the water challenge!"
];

const losingMessages = [
  "Try again! You were close, but not quite there.",
  "Better luck next time. Keep practicing!",
  "So close! Catch more drops on your next run."
];

const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const gameContainer = document.getElementById("game-container");
const waterCan = document.getElementById("water-can");
const difficultySelect = document.getElementById("difficulty-select");
const goalText = document.getElementById("goal-text");
let messageEl = document.getElementById("game-message");
let canPositionX = 0;
const canMoveStep = 55;

if (!messageEl) {
  messageEl = document.createElement("p");
  messageEl.id = "game-message";
  messageEl.className = "game-message";
  gameContainer.insertAdjacentElement("afterend", messageEl);
}

window.addEventListener("keydown", handleCanMovement);
window.addEventListener("resize", syncCanPosition);

if (waterCan.complete) {
  syncCanPosition();
} else {
  waterCan.addEventListener("load", syncCanPosition, { once: true });
}

// Wait for button click to start the game
startBtn.addEventListener("click", () => {
  playSound("click");
  startGame();
});

resetBtn.addEventListener("click", () => {
  playSound("click");
  resetGame();
});

difficultySelect.addEventListener("change", (event) => {
  playSound("click");
  handleDifficultyChange(event);
});

applyDifficultyUi();

function startGame() {
  if (gameRunning) {
    return;
  }

  const mode = getCurrentMode();

  gameRunning = true;
  reachedMilestones = new Set();
  syncCanPosition();
  score = 0;
  timeRemaining = mode.time;
  scoreEl.textContent = score;
  timeEl.textContent = timeRemaining;
  messageEl.textContent = "";
  startBtn.disabled = true;
  difficultySelect.disabled = true;

  dropMaker = setInterval(createDrop, mode.spawnInterval);
  gameTimer = setInterval(updateTimer, 1000);
}

function resetGame() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameTimer);
  clearTimeout(winEffectTimeout);
  removeWinEffect();
  syncCanPosition();
  score = 0;
  reachedMilestones = new Set();
  timeRemaining = getCurrentMode().time;
  scoreEl.textContent = score;
  timeEl.textContent = timeRemaining;
  messageEl.textContent = "";
  startBtn.disabled = false;
  difficultySelect.disabled = false;

  Array.from(gameContainer.querySelectorAll(".water-drop")).forEach((drop) => {
    drop.remove();
  });

  Array.from(gameContainer.querySelectorAll(".drop-splash")).forEach((splash) => {
    splash.remove();
  });
}

function handleDifficultyChange(event) {
  const selected = event.target.value;

  if (!difficultyModes[selected]) {
    return;
  }

  currentDifficulty = selected;
  applyDifficultyUi();

  if (!gameRunning) {
    timeRemaining = getCurrentMode().time;
    timeEl.textContent = timeRemaining;
  }
}

function getCurrentMode() {
  return difficultyModes[currentDifficulty];
}

function applyDifficultyUi() {
  const mode = getCurrentMode();
  goalText.textContent = `${mode.label} mode: Get ${mode.goal} points in ${mode.time} seconds.`;
}

function playSound(soundKey) {
  const baseAudio = audioPool[soundKey];

  if (!baseAudio) {
    return;
  }

  const audio = baseAudio.cloneNode();
  audio.volume = baseAudio.volume;

  audio.play().catch(() => {
    // Ignore playback issues (autoplay policy, race conditions, etc.)
  });
}

function checkMilestones() {
  const mode = getCurrentMode();

  for (const milestone of milestoneMessages) {
    const targetScore = Math.max(1, Math.ceil(mode.goal * milestone.ratio));
    const milestoneId = `${currentDifficulty}-${milestone.key}`;

    if (score >= targetScore && !reachedMilestones.has(milestoneId)) {
      reachedMilestones.add(milestoneId);
      messageEl.textContent = `${milestone.text} (${targetScore}/${mode.goal})`;
    }
  }
}

function handleCanMovement(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();

  if (event.key === "ArrowLeft") {
    moveCan(-canMoveStep);
  }

  if (event.key === "ArrowRight") {
    moveCan(canMoveStep);
  }
}

function moveCan(deltaX) {
  const gameWidth = gameContainer.offsetWidth;
  const canWidth = waterCan.offsetWidth;
  const maxCanX = gameWidth - canWidth;

  canPositionX = Math.max(0, Math.min(maxCanX, canPositionX + deltaX));
  waterCan.style.left = `${canPositionX}px`;
}

function syncCanPosition() {
  const gameWidth = gameContainer.offsetWidth;
  const canWidth = waterCan.offsetWidth;

  canPositionX = Math.max(0, (gameWidth - canWidth) / 2);
  waterCan.style.left = `${canPositionX}px`;
}

function createDrop() {
  if (!gameRunning) {
    return;
  }

  const mode = getCurrentMode();

  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  drop.className = "water-drop";
  const isBadDrop = Math.random() < mode.badDropChance;

  if (isBadDrop) {
    drop.classList.add("bad-drop");
  }

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  // Make drops fall for 4 seconds
  drop.style.animationDuration = `${mode.dropDuration}s`;

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  let resolved = false;

  const resolveDropInteraction = () => {
    if (resolved || !drop.isConnected) {
      return;
    }

    resolved = true;
    clearInterval(catchCheck);

    const scoreDelta = isBadDrop ? -mode.badDropPenalty : 1;
    score += scoreDelta;
    scoreEl.textContent = score;
    playSound(isBadDrop ? "miss" : "collect");
    checkMilestones();

    addSplashEffect(drop, isBadDrop);
    drop.remove();
  };

  let catchCheck = setInterval(() => {
    if (!gameRunning || !drop.isConnected) {
      clearInterval(catchCheck);
      return;
    }

    if (isCaughtByWaterCan(drop)) {
      resolveDropInteraction();
    }
  }, 50);

  drop.addEventListener("click", () => {
    if (!gameRunning) {
      return;
    }

    resolveDropInteraction();
  });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    if (resolved) {
      return;
    }

    clearInterval(catchCheck);

    if (isCaughtByWaterCan(drop)) {
      resolveDropInteraction();
      return;
    }

    playSound("miss");
    drop.remove();
  });
}

function addSplashEffect(drop, isBadDrop) {
  const dropRect = drop.getBoundingClientRect();
  const containerRect = gameContainer.getBoundingClientRect();
  const splash = document.createElement("span");

  splash.className = "drop-splash";
  if (isBadDrop) {
    splash.classList.add("bad");
  }

  splash.style.left = `${dropRect.left - containerRect.left + dropRect.width / 2}px`;
  splash.style.top = `${dropRect.top - containerRect.top + dropRect.height / 2}px`;

  splash.addEventListener("animationend", () => {
    splash.remove();
  });

  gameContainer.appendChild(splash);
}

function isCaughtByWaterCan(drop) {
  if (!waterCan) {
    return false;
  }

  const dropRect = drop.getBoundingClientRect();
  const canRect = waterCan.getBoundingClientRect();
  const dropCenterX = dropRect.left + dropRect.width / 2;
  const hitboxHeight = canRect.height * 0.75;
  const hitboxTop = canRect.bottom - hitboxHeight;

  return (
    dropCenterX >= canRect.left &&
    dropCenterX <= canRect.right &&
    dropRect.bottom >= hitboxTop &&
    dropRect.bottom <= canRect.bottom
  );
}

function updateTimer() {
  if (!gameRunning) {
    return;
  }

  timeRemaining -= 1;
  timeEl.textContent = timeRemaining;

  if (timeRemaining <= 0) {
    endGame();
  }
}

function endGame() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameTimer);
  startBtn.disabled = false;
  difficultySelect.disabled = false;

  Array.from(gameContainer.querySelectorAll(".water-drop")).forEach((drop) => {
    drop.remove();
  });

  const isWinner = score >= getCurrentMode().goal;
  const messages = isWinner ? winningMessages : losingMessages;
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  messageEl.textContent = randomMessage;

  if (isWinner) {
    playSound("win");
    triggerWinEffect();
  }
}

function triggerWinEffect() {
  removeWinEffect();

  const effectLayer = document.createElement("div");
  effectLayer.className = "win-effect";

  const colors = ["#FFC907", "#2E9DF7", "#4FCB53", "#F16061", "#FF902A"];
  const pieceCount = 28;

  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 0.9}s`;
    piece.style.setProperty("--x-drift", `${-60 + Math.random() * 120}px`);
    piece.style.setProperty("--rotation", `${360 + Math.random() * 540}deg`);
    effectLayer.appendChild(piece);
  }

  gameContainer.appendChild(effectLayer);
  winEffectTimeout = setTimeout(removeWinEffect, 2600);
}

function removeWinEffect() {
  const existingEffect = gameContainer.querySelector(".win-effect");
  if (existingEffect) {
    existingEffect.remove();
  }
}
