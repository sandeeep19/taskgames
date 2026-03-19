import {
  BASE_SCROLL_SPEED,
  GROUND_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createInitialState,
  restartGame,
  startGame,
  stepGame
} from "./gameLogic.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreValue = document.querySelector("#score");
const bestScoreValue = document.querySelector("#best-score");
const speedValue = document.querySelector("#speed");
const stateLabel = document.querySelector("#state-label");
const statusValue = document.querySelector("#status");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const controlButtons = document.querySelectorAll("[data-control]");

const BEST_SCORE_KEY = "duck-dash-best-score";

let state = createInitialState(loadBestScore());
let lastFrameTime = performance.now();
let jumpQueued = false;

render();
requestAnimationFrame(loop);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "r") {
    state = restartGame(state);
    jumpQueued = false;
    render();
    return;
  }

  if (key === " " || key === "arrowup" || key === "w") {
    event.preventDefault();
    if (!state.started || state.gameOver) {
      state = startGame(state);
    }
    jumpQueued = true;
    render();
  }
});

startButton.addEventListener("click", () => {
  state = startGame(state);
  render();
});

restartButton.addEventListener("click", () => {
  state = restartGame(state);
  jumpQueued = false;
  render();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const control = button.dataset.control;

    if (control === "restart") {
      state = restartGame(state);
      jumpQueued = false;
      render();
      return;
    }

    if (!state.started || state.gameOver) {
      state = startGame(state);
    }
    jumpQueued = true;
    render();
  });
});

function loop(now) {
  const dt = now - lastFrameTime;
  lastFrameTime = now;

  state = stepGame(state, { jumpPressed: jumpQueued }, dt);
  jumpQueued = false;

  persistBestScore(state.bestScore);
  render();
  requestAnimationFrame(loop);
}

function render() {
  drawScene();

  scoreValue.textContent = Math.floor(state.score).toString();
  bestScoreValue.textContent = state.bestScore.toString();
  speedValue.textContent = `${(state.speed / BASE_SCROLL_SPEED).toFixed(1)}x`;
  stateLabel.textContent = getStateLabel(state);
  statusValue.textContent = getStatusMessage(state);
  startButton.textContent = state.started && !state.gameOver ? "Running" : "Start";
  startButton.disabled = state.started && !state.gameOver;
}

function drawScene() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawSun();
  drawClouds();
  drawHills();
  drawGround();
  drawDuck(state.player);
  drawObstacles(state.obstacles);
  drawOverlay();
}

function drawSky() {
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#d7f7ff");
  sky.addColorStop(0.65, "#c9f3de");
  sky.addColorStop(1, "#fff0b5");
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSun() {
  context.fillStyle = "#ffd166";
  context.beginPath();
  context.arc(790, 74, 32, 0, Math.PI * 2);
  context.fill();
}

function drawClouds() {
  drawCloud(150, 78, 0.8);
  drawCloud(390, 108, 1);
  drawCloud(670, 62, 0.72);
}

function drawCloud(x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.beginPath();
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.arc(24, -8, 22, 0, Math.PI * 2);
  context.arc(50, 0, 18, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHills() {
  const hillOffset = state.distance * 0.08;
  drawHillBand("#9ad59f", 250, 52, 200, hillOffset);
  drawHillBand("#6ebb74", 276, 66, 240, hillOffset * 1.3);
}

function drawHillBand(color, baseline, amplitude, width, offset) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, canvas.height);
  context.lineTo(0, baseline);

  for (let x = 0; x <= canvas.width + width; x += width) {
    const hillX = x - (offset % width);
    context.quadraticCurveTo(
      hillX + width / 2,
      baseline - amplitude,
      hillX + width,
      baseline
    );
  }

  context.lineTo(canvas.width, canvas.height);
  context.closePath();
  context.fill();
}

function drawGround() {
  context.fillStyle = "#7fc96b";
  context.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);

  context.fillStyle = "#5fa451";
  context.fillRect(0, GROUND_Y - 8, WORLD_WIDTH, 8);

  const stripeOffset = state.distance * 0.45;
  context.fillStyle = "rgba(68, 117, 48, 0.42)";
  for (let x = -40; x < WORLD_WIDTH + 80; x += 54) {
    context.fillRect(x - (stripeOffset % 54), GROUND_Y + 18, 24, 4);
  }
}

function drawDuck(player) {
  const bodyX = player.x + 26;
  const bodyY = player.y + 25;
  const bob = player.onGround ? Math.sin(state.distance * 0.06) * 1.6 : -4;

  context.save();
  context.translate(bodyX, bodyY + bob);

  context.fillStyle = "#ffd457";
  context.beginPath();
  context.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.arc(18, -14, 12, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff9640";
  context.beginPath();
  context.moveTo(27, -12);
  context.lineTo(44, -8);
  context.lineTo(27, -2);
  context.closePath();
  context.fill();

  context.fillStyle = "#111827";
  context.beginPath();
  context.arc(21, -16, 2.4, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#b76b1e";
  context.lineWidth = 3;
  const legOffset = player.onGround ? Math.sin(state.distance * 0.18) * 5 : 0;
  drawLeg(-8, 16, -legOffset);
  drawLeg(8, 16, legOffset);

  context.fillStyle = "#fff2b0";
  context.beginPath();
  context.ellipse(-6, 2, 10, 7, 0.25, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function drawLeg(x, y, swing) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + swing * 0.35, y + 14);
  context.stroke();
}

function drawObstacles(obstacles) {
  for (const obstacle of obstacles) {
    if (obstacle.kind === "reed") {
      context.fillStyle = "#3f7f45";
      context.fillRect(obstacle.x + 10, obstacle.y, 8, obstacle.height);
      context.beginPath();
      context.ellipse(obstacle.x + 7, obstacle.y + 12, 8, 18, -0.4, 0, Math.PI * 2);
      context.ellipse(obstacle.x + 22, obstacle.y + 20, 7, 16, 0.4, 0, Math.PI * 2);
      context.fill();
      continue;
    }

    context.fillStyle = "#8a5a34";
    context.beginPath();
    context.roundRect(obstacle.x, obstacle.y + 5, obstacle.width, obstacle.height - 5, 12);
    context.fill();

    context.strokeStyle = "rgba(77, 45, 25, 0.45)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(obstacle.x + 12, obstacle.y + 8);
    context.lineTo(obstacle.x + 12, obstacle.y + obstacle.height - 4);
    context.moveTo(obstacle.x + 28, obstacle.y + 10);
    context.lineTo(obstacle.x + 28, obstacle.y + obstacle.height - 8);
    context.stroke();
  }
}

function drawOverlay() {
  if (state.started && !state.gameOver) {
    return;
  }

  context.fillStyle = "rgba(9, 37, 45, 0.18)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.font = "700 36px Trebuchet MS";
  context.fillText(state.gameOver ? "Duck down!" : "Duck Dash", canvas.width / 2, 124);

  context.font = "600 18px Trebuchet MS";
  context.fillText(
    state.gameOver ? "Press restart or jump to try again." : "Jump over the obstacles to begin.",
    canvas.width / 2,
    158
  );
}

function getStateLabel(currentState) {
  if (currentState.gameOver) {
    return "Crashed";
  }

  if (!currentState.started) {
    return "Ready";
  }

  return "Running";
}

function getStatusMessage(currentState) {
  if (currentState.gameOver) {
    return `Your duck scored ${Math.floor(currentState.score)}. Jump again for another run.`;
  }

  if (!currentState.started) {
    return "Press space or tap jump to start your duck run.";
  }

  return "The pond is getting faster. Keep hopping over every obstacle.";
}

function loadBestScore() {
  try {
    const saved = window.localStorage.getItem(BEST_SCORE_KEY);
    return saved ? Number(saved) || 0 : 0;
  } catch {
    return 0;
  }
}

function persistBestScore(bestScore) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  } catch {
    // Ignore storage errors so gameplay still works in restricted environments.
  }
}
