import type { SkinId } from "./skins";

export type GameStatus = "playing" | "paused" | "gameover";

export type GameState = {
  score: number;
  lives: number;
  level: number;
  status: GameStatus;
};

export type GameCallbacks = {
  // Only called when some field of the state changes, never per frame.
  onStateChange: (state: GameState) => void;
};

export type GameEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  // Cancels requestAnimationFrame and removes every listener.
  destroy: () => void;
  // Switches skin on the fly, without restarting the game.
  setSkin: (skin: SkinId) => void;
};

export type GameOptions = { skin?: SkinId };

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
) => GameEngine;
