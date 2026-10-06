import { BLOCK, BOARD_X, BOARD_Y, COLS, H, ROWS, SPRITE_PAD, W } from "./constants";
import { paintBackground, paintBlock, paintBorder } from "./renderer";
import type { TetrisPalette } from "./skins";

// Pre-rendered layers for one skin. Built once per skin and composed with drawImage.
export type TetrisSprites = {
  background: HTMLCanvasElement; // W×H: page, empty board, grid and static panel text
  border: HTMLCanvasElement; // board frame with its glow, drawn over the blocks
  block: (HTMLCanvasElement | null)[]; // by piece type (1-8); BLOCK + 2·SPRITE_PAD square
  ghost: (HTMLCanvasElement | null)[]; // same, with the skin's ghostAlpha baked in
};

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  return [canvas, ctx];
}

function blockSprite(p: TetrisPalette, colorIndex: number, alpha: number) {
  const size = BLOCK + SPRITE_PAD * 2;
  const [canvas, c] = makeCanvas(size, size);
  // Same offsets as a cell at grid (0, 0): the block starts 1 px inside the cell.
  paintBlock(c, p, SPRITE_PAD + 1, SPRITE_PAD + 1, colorIndex, BLOCK, alpha);
  return canvas;
}

export function buildSprites(p: TetrisPalette): TetrisSprites {
  const [background, bg] = makeCanvas(W, H);
  paintBackground(bg, p);

  const [border, bc] = makeCanvas(COLS * BLOCK + SPRITE_PAD * 2, ROWS * BLOCK + SPRITE_PAD * 2);
  bc.translate(SPRITE_PAD - BOARD_X, SPRITE_PAD - BOARD_Y);
  paintBorder(bc, p);

  const block: (HTMLCanvasElement | null)[] = [null];
  const ghost: (HTMLCanvasElement | null)[] = [null];
  for (let i = 1; i < p.pieces.length; i++) {
    block.push(blockSprite(p, i, 1));
    ghost.push(blockSprite(p, i, p.ghostAlpha));
  }

  return { background, border, block, ghost };
}
