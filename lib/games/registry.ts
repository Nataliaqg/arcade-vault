import { createArkanoid } from "./arkanoid";
import { TOUCH_LAYOUT as arkanoidTouch } from "./arkanoid/touch";
import { createAsteroids } from "./asteroids";
import { TOUCH_LAYOUT as asteroidsTouch } from "./asteroids/touch";
import { createSnake } from "./snake";
import { TOUCH_LAYOUT as snakeTouch } from "./snake/touch";
import { createTetris } from "./tetris";
import { TOUCH_LAYOUT as tetrisTouch } from "./tetris/touch";
import type { TouchLayout } from "./touch";
import type { GameFactory } from "./types";

// Games with a real engine, by game id. Games not listed here keep the mockup.
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
  arkanoid: createArkanoid,
  snake: createSnake,
};

// Virtual gamepad mapping (A/B buttons, auto-repeat) by game id.
export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
  asteroids: asteroidsTouch,
  tetris: tetrisTouch,
  arkanoid: arkanoidTouch,
  snake: snakeTouch,
};
