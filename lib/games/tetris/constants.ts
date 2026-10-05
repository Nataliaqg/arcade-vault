export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Logical canvas: same 4:3 size as Asteroids, CSS scales it inside the CRT.
export const W = 800;
export const H = 600;

// Playfield (COLS × BLOCK by ROWS × BLOCK) and side panel positions.
export const BOARD_X = 80;
export const BOARD_Y = 0;
export const PANEL_X = 420;

export const PIECES: number[][][] = [
  [],
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (nut)
];

export const PIECE_TYPES = PIECES.length - 1;

// Points for clearing 0–4 lines at once, multiplied by the current level.
export const LINE_SCORES = [0, 100, 300, 500, 800];

export const LINES_PER_LEVEL = 10;
export const BASE_DROP_INTERVAL = 1000; // ms
export const LEVEL_SPEEDUP = 90; // ms faster per level
export const MIN_DROP_INTERVAL = 100; // ms

// Horizontal offsets tried when a rotation collides.
export const KICKS = [0, -1, 1, -2, 2];
