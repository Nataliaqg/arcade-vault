import { BALL_SIZE, BLOCK_H, BLOCK_W, PADDLE_H, PADDLE_W, type BlockColor } from "./constants";
import type { ArkanoidPalette } from "./skins";

export type Shape = "block" | "paddle" | "ball";

// Pre-rendered flat shapes (with their glow) for one skin, composed with drawImage.
// Used by the skins without spritesheet, and by classic if the sheet fails.
export type ArkanoidShapes = {
  blocks: Record<BlockColor, HTMLCanvasElement>;
  paddle: HTMLCanvasElement;
  ball: HTMLCanvasElement;
};

// Margin so the glow isn't clipped: the widest blur is 12 × 1.6 (neon) ≈ 19 px,
// and a Gaussian shadow still shows ~1.5× its blur away from the shape.
export const SPRITE_PAD = 32;

const BLOCK_GLOW = 8;
const PIECE_GLOW = 12;

/** Paints one flat shape at (x, y), with glow when the skin has no spritesheet. */
export function paintShape(
  c: CanvasRenderingContext2D,
  p: ArkanoidPalette,
  color: string,
  shape: Shape,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = color;
  if (!p.sprites) {
    c.shadowColor = color;
    c.shadowBlur = (shape === "block" ? BLOCK_GLOW : PIECE_GLOW) * p.glow;
  }
  if (shape === "block") {
    const i = p.blockInset;
    c.fillRect(x + i, y + i, w - 2 * i, h - 2 * i);
  } else if (p.rounded) {
    c.beginPath();
    c.roundRect(x, y, w, h, shape === "ball" ? Math.min(w, h) / 2 : h / 2);
    c.fill();
  } else {
    c.fillRect(x, y, w, h);
  }
  c.shadowBlur = 0;
}

function shapeSprite(p: ArkanoidPalette, color: string, shape: Shape, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w + SPRITE_PAD * 2;
  canvas.height = h + SPRITE_PAD * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  paintShape(ctx, p, color, shape, SPRITE_PAD, SPRITE_PAD, w, h);
  return canvas;
}

export function buildShapes(p: ArkanoidPalette): ArkanoidShapes {
  const blocks = {} as Record<BlockColor, HTMLCanvasElement>;
  for (const color of Object.keys(p.blocks) as BlockColor[]) {
    blocks[color] = shapeSprite(p, p.blocks[color], "block", BLOCK_W, BLOCK_H);
  }
  return {
    blocks,
    paddle: shapeSprite(p, p.paddle, "paddle", PADDLE_W, PADDLE_H),
    ball: shapeSprite(p, p.ball, "ball", BALL_SIZE, BALL_SIZE),
  };
}
