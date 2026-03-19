import test from "node:test";
import assert from "node:assert/strict";

import {
  BASE_SCROLL_SPEED,
  GROUND_Y,
  JUMP_VELOCITY,
  MAX_SCROLL_SPEED,
  OBSTACLE_MAX_GAP,
  OBSTACLE_MIN_GAP,
  PLAYER_SIZE,
  WORLD_WIDTH,
  createInitialState,
  createObstacle,
  getObstacleGap,
  rectsIntersect,
  restartGame,
  startGame,
  stepGame
} from "../src/gameLogic.js";

test("starting the game switches it into a running state", () => {
  const initial = createInitialState();
  const next = startGame(initial);

  assert.equal(next.started, true);
  assert.equal(next.gameOver, false);
});

test("jump input launches the duck upward from the ground", () => {
  let state = createInitialState();
  state = startGame(state);

  const next = stepGame(state, { jumpPressed: true }, 16, 0.2);

  assert.ok(next.player.vy < 0);
  assert.ok(next.player.vy <= -JUMP_VELOCITY + 40);
  assert.equal(next.player.onGround, false);
});

test("the duck lands back on the ground after falling", () => {
  let state = createInitialState();
  state = startGame(state);
  state = {
    ...state,
    player: {
      ...state.player,
      y: GROUND_Y - PLAYER_SIZE.height - 30,
      vy: 400,
      onGround: false
    }
  };

  let next = state;
  for (let index = 0; index < 5; index += 1) {
    next = stepGame(next, { jumpPressed: false }, 50, 0.2);
  }

  assert.equal(next.player.y, GROUND_Y - PLAYER_SIZE.height);
  assert.equal(next.player.vy, 0);
  assert.equal(next.player.onGround, true);
});

test("spawning logic adds a new obstacle after enough travel", () => {
  let state = createInitialState();
  state = startGame({
    ...state,
    obstacleTimer: 500,
    nextObstacleIn: 200
  });

  const next = stepGame(state, { jumpPressed: false }, 16, 0.8);

  assert.equal(next.obstacles.length, 1);
  assert.ok(next.nextObstacleIn >= OBSTACLE_MIN_GAP);
  assert.ok(next.nextObstacleIn <= OBSTACLE_MAX_GAP);
});

test("colliding with an obstacle ends the run", () => {
  let state = createInitialState();
  state = startGame({
    ...state,
    obstacles: [
      {
        x: 110,
        y: GROUND_Y - 38,
        width: 40,
        height: 38,
        kind: "log",
        passed: false
      }
    ]
  });

  const next = stepGame(state, { jumpPressed: false }, 16, 0.5);

  assert.equal(next.gameOver, true);
});

test("passing an obstacle increases score and marks it as passed", () => {
  let state = createInitialState();
  state = startGame({
    ...state,
    obstacles: [
      {
        x: 20,
        y: GROUND_Y - 38,
        width: 30,
        height: 38,
        kind: "log",
        passed: false
      }
    ]
  });

  const next = stepGame(state, { jumpPressed: false }, 100, 0.5);

  assert.equal(next.obstacles[0].passed, true);
  assert.ok(next.score >= 25);
});

test("speed ramps up over time but stays capped", () => {
  let state = startGame(createInitialState());

  for (let index = 0; index < 300; index += 1) {
    state = stepGame(state, { jumpPressed: false }, 50, 0.4);
  }

  assert.ok(state.speed > BASE_SCROLL_SPEED);
  assert.ok(state.speed <= MAX_SCROLL_SPEED);
});

test("restart preserves the best score and resets the run", () => {
  const state = {
    ...createInitialState(),
    started: true,
    gameOver: true,
    score: 87,
    bestScore: 42,
    obstacles: [createObstacle(0.7)]
  };

  const next = restartGame(state);

  assert.equal(next.started, false);
  assert.equal(next.gameOver, false);
  assert.equal(next.score, 0);
  assert.equal(next.bestScore, 87);
  assert.equal(next.obstacles.length, 0);
});

test("obstacle factory creates shapes at the right edge", () => {
  const reed = createObstacle(0.9);
  const log = createObstacle(0.1);

  assert.equal(reed.kind, "reed");
  assert.equal(log.kind, "log");
  assert.equal(reed.x, WORLD_WIDTH + 36);
  assert.equal(log.x, WORLD_WIDTH + 36);
});

test("gap helper stays within the configured range", () => {
  assert.equal(getObstacleGap(0), OBSTACLE_MIN_GAP);
  assert.equal(getObstacleGap(1), OBSTACLE_MAX_GAP);
});

test("rectangle collision helper detects overlap", () => {
  assert.equal(
    rectsIntersect(
      { x: 10, y: 10, width: 20, height: 20 },
      { x: 25, y: 15, width: 20, height: 20 }
    ),
    true
  );
});
