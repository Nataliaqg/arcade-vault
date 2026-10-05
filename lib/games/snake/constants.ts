// Logical canvas: same 4:3 size as the other games, CSS scales it inside the CRT.
export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

export const INITIAL_LENGTH = 3;
export const FRUIT_POINTS = 10; // multiplied by the current level
export const FRUITS_PER_LEVEL = 5;

// Step interval: max(MIN_STEP_MS, BASE_STEP_MS - (level - 1) * STEP_DEC_MS).
export const BASE_STEP_MS = 220;
export const STEP_DEC_MS = 10;
export const MIN_STEP_MS = 100;

// Countdown shown before every game.
export const COUNTDOWN_MS = 3000;

// Largest frame step the loop accepts. Below MIN_STEP_MS, so at most one step per frame.
export const MAX_DT = 50; // ms

// Vault palette for the canvas background, HUD and overlays.
export const BG = "#0a0a0f"; // --bg
export const INK = "#e6e9ff"; // --ink
export const MAGENTA = "#ff006e";
export const CYAN = "#00f5ff";
export const YELLOW = "#f5ff00";
export const SNAKE_COLOR = YELLOW;
export const SNAKE_HEAD_COLOR = "#fbff80";
export const GRID_COLOR = "rgba(230,233,255,0.05)";
export const FRUIT_FALLBACK_COLOR = MAGENTA;
export const OVERLAY_VEIL = "rgba(10,10,15,0.7)";
