import { createAsteroids } from "./asteroids";
import type { GameFactory } from "./types";

// Games with a real engine, by game id. Games not listed here keep the mockup.
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
};
