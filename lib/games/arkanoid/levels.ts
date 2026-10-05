import { BLOCK_COLS, BLOCK_ROWS, type BlockColor } from "./constants";

export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: LevelBlock[] };

const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

// 1 — full grid (60 blocks)
function level1(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      blocks.push({ col, row, color: rowColors1[row] });
  return blocks;
}

// 2 — pyramid (40 blocks)
function level2(): LevelBlock[] {
  const start = [4, 3, 2, 1, 0, 0];
  const end = [5, 6, 7, 8, 9, 9];
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = start[row]; col <= end[row]; col++)
      blocks.push({ col, row, color: rowColors2[row] });
  return blocks;
}

// 3 — checkerboard (30 blocks)
function level3(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        blocks.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
  return blocks;
}

// 4 — rows with gaps (39 blocks)
function level4(): LevelBlock[] {
  const gaps = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps[row].includes(col))
        blocks.push({ col, row, color: rowColors4[row] });
  return blocks;
}

// 5 — frame with a cross (39 blocks)
function level5(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === BLOCK_COLS - 1 || row === 0 || row === BLOCK_ROWS - 1;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        blocks.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }
  return blocks;
}

export const LEVELS: Level[] = [
  { speed: 1.0, blocks: level1() },
  { speed: 1.1, blocks: level2() },
  { speed: 1.21, blocks: level3() },
  { speed: 1.33, blocks: level4() },
  { speed: 1.46, blocks: level5() },
];
