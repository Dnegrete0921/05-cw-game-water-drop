// Variables to control game state
let gameRunning = false;
let dropMaker;
let gameTimer;
let score = 0;
let timeRemaining = 30;
let winEffectTimeout;

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
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

function startGame() {
  if (gameRunning) {
    return;
  }

  gameRunning = true;
  syncCanPosition();
  score = 0;
  timeRemaining = 30;
  scoreEl.textContent = score;
  timeEl.textContent = timeRemaining;
  messageEl.textContent = "";
  startBtn.disabled = true;

  // Create new drops every 750 milliseconds
  dropMaker = setInterval(createDrop, 750);
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
  timeRemaining = 30;
  scoreEl.textContent = score;
  timeEl.textContent = timeRemaining;
  messageEl.textContent = "";
  startBtn.disabled = false;

  Array.from(gameContainer.querySelectorAll(".water-drop")).forEach((drop) => {
    drop.remove();
  });
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

  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  drop.className = "water-drop";
  const isBadDrop = Math.random() < 0.25;

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
  drop.style.animationDuration = "4s";

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  let catchCheck = setInterval(() => {
    if (!gameRunning || !drop.isConnected) {
      clearInterval(catchCheck);
      return;
    }

    if (isCaughtByWaterCan(drop)) {
      score += isBadDrop ? -1 : 1;
      scoreEl.textContent = score;
      clearInterval(catchCheck);
      drop.remove();
    }
  }, 50);

  drop.addEventListener("click", () => {
    if (!gameRunning) {
      return;
    }

    clearInterval(catchCheck);
    score += isBadDrop ? -1 : 1;
    scoreEl.textContent = score;
    drop.remove();
  });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    clearInterval(catchCheck);

    if (isCaughtByWaterCan(drop)) {
      score += isBadDrop ? -1 : 1;
      scoreEl.textContent = score;
    }

    drop.remove();
  });
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

  Array.from(gameContainer.querySelectorAll(".water-drop")).forEach((drop) => {
    drop.remove();
  });

  const isWinner = score >= 20;
  const messages = isWinner ? winningMessages : losingMessages;
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  messageEl.textContent = randomMessage;

  if (isWinner) {
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
