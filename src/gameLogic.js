export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 360;
export const GROUND_Y = 292;
export const PLAYER_SIZE = { width: 54, height: 42 };
export const GRAVITY = 1900;
export const JUMP_VELOCITY = 760;
export const BASE_SCROLL_SPEED = 320;
export const MAX_SCROLL_SPEED = 760;
export const SPEED_RAMP_PER_SECOND = 20;
export const SCORE_RATE = 12;
export const OBSTACLE_MIN_GAP = 240;
export const OBSTACLE_MAX_GAP = 420;

export function createInitialState(bestScore = 0) {
  return {
    player: createPlayer(),
    obstacles: [],
    particles: [],
    score: 0,
    bestScore,
    speed: BASE_SCROLL_SPEED,
    started: false,
    gameOver: false,
    distance: 0,
    obstacleTimer: 0,
    nextObstacleIn: 280
  };
}

export function startGame(state) {
  if (state.started && !state.gameOver) {
    return state;
  }

  if (state.gameOver) {
    return createInitialState(Math.max(state.bestScore, state.score));
  }

  return {
    ...state,
    started: true
  };
}

export function restartGame(state) {
  return createInitialState(Math.max(state.bestScore, state.score));
}

export function stepGame(state, input, dtMs, randomValue = Math.random()) {
  if (!state.started || state.gameOver) {
    return state;
  }

  const dt = Math.min(dtMs / 1000, 1 / 20);
  const player = { ...state.player };
  const jumpPressed = Boolean(input.jumpPressed);

  if (jumpPressed && player.onGround) {
    player.vy = -JUMP_VELOCITY;
    player.onGround = false;
  }

  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  const speed = Math.min(MAX_SCROLL_SPEED, state.speed + SPEED_RAMP_PER_SECOND * dt);
  const obstacles = [];
  let passedThisFrame = 0;
  let hitObstacle = false;

  for (const obstacle of state.obstacles) {
    const nextObstacle = { ...obstacle, x: obstacle.x - speed * dt };

    if (!nextObstacle.passed && nextObstacle.x + nextObstacle.width < player.x) {
      nextObstacle.passed = true;
      passedThisFrame += 1;
    }

    if (nextObstacle.x + nextObstacle.width > 0) {
      if (rectsIntersect(player, nextObstacle)) {
        hitObstacle = true;
      }
      obstacles.push(nextObstacle);
    }
  }

  let obstacleTimer = state.obstacleTimer + speed * dt;
  let nextObstacleIn = state.nextObstacleIn;

  if (obstacleTimer >= nextObstacleIn) {
    obstacles.push(createObstacle(randomValue));
    obstacleTimer = 0;
    nextObstacleIn = getObstacleGap(randomValue);
  }

  const score = state.score + dt * SCORE_RATE + passedThisFrame * 25;
  const bestScore = Math.max(state.bestScore, Math.floor(score));

  return {
    ...state,
    player,
    obstacles,
    speed,
    score,
    bestScore,
    distance: state.distance + speed * dt,
    obstacleTimer,
    nextObstacleIn,
    gameOver: hitObstacle
  };
}

export function createObstacle(randomValue = Math.random()) {
  const tall = randomValue > 0.55;
  const width = tall ? 28 : 48;
  const height = tall ? 66 : 38;

  return {
    x: WORLD_WIDTH + 36,
    y: GROUND_Y - height,
    width,
    height,
    kind: tall ? "reed" : "log",
    passed: false
  };
}

export function getObstacleGap(randomValue) {
  return OBSTACLE_MIN_GAP + (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP) * randomValue;
}

export function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function createPlayer() {
  return {
    x: 96,
    y: GROUND_Y - PLAYER_SIZE.height,
    width: PLAYER_SIZE.width,
    height: PLAYER_SIZE.height,
    vy: 0,
    onGround: true
  };
}
