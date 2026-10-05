// Logical canvas: same 4:3 size as the other games, CSS scales it inside the CRT.
export const W = 800;
export const H = 600;

export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s with the keyboard

export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;

// Block grid: 10 columns × 6 rows, centered horizontally.
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

export const BLOCK_POINTS = 10;
export const INITIAL_LIVES = 3;
export const LAST_LEVEL = 5;

// Largest frame step the loop accepts, so the ball can't tunnel through blocks.
export const MAX_DT = 0.05; // s

export type BlockColor =
  | "gray"
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green";
