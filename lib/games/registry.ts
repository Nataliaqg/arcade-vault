import { createArkanoid } from "./arkanoid";
import { createAsteroids } from "./asteroids";
import { createSnake } from "./snake";
import { createTetris } from "./tetris";
import type { GameFactory } from "./types";

// Games with a real engine, by game id. Games not listed here keep the mockup.
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
  arkanoid: createArkanoid,
  snake: createSnake,
};
