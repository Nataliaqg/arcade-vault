import { CELL, COLS, H, ROWS, W } from "./constants";
import type { Dir } from "./snake";
import type { SnakePalette } from "./skins";

export type Frame = { sx: number; sy: number; sw: number; sh: number };

export const SPRITESHEET_SRC = "/games/snake/fruits.png";

// Middle row (pixel art) of fruits.png, 3790 × 442. The 22 crops were checked against
// the image by scanning for opaque columns; the names in the reference sprites.js don't
// match the image, so these are anonymous.
const ROW_Y = 136;
const ROW_H = 160;
const FRUIT_COLUMNS: [x: number, w: number][] = [
  [34, 110],
  [186, 150],
  [378, 110],
  [540, 130],
  [712, 130],
  [894, 110],
  [1066, 110],
  [1228, 130],
  [1400, 130],
  [1582, 110],
  [1734, 150],
  [1906, 150],
  [2068, 170],
  [2250, 140],
  [2432, 130],
  [2604, 130],
  [2786, 110],
  [2948, 130],
  [3110, 150],
  [3302, 110],
  [3454, 150],
  [3637, 130],
];

export const FRUIT_SPRITES: Frame[] = FRUIT_COLUMNS.map(([sx, sw]) => ({
  sx,
  sy: ROW_Y,
  sw,
  sh: ROW_H,
}));

export type FruitSheet = {
  status: "loading" | "loaded" | "error";
  image: HTMLImageElement;
  /** Detaches the load handlers so a late load can't wake a destroyed engine. */
  dispose: () => void;
};

/**
 * Starts loading the spritesheet. State lives in the returned handle (one per
 * engine instance); `onSettle` fires once, after `status` has been updated.
 */
export function loadFruitSheet(src: string, onSettle: () => void): FruitSheet {
  const image = new Image();
  const sheet: FruitSheet = {
    status: "loading",
    image,
    dispose() {
      image.onload = null;
      image.onerror = null;
    },
  };
  image.onload = () => {
    sheet.status = "loaded";
    onSettle();
  };
  image.onerror = () => {
    sheet.status = "error";
    onSettle();
  };
  image.src = src;
  return sheet;
}

// ── Glow sprites ──────────────────────────────────────────────────────────────
// shadowBlur is the most expensive 2D operation, and the snake can have ~300 glowing
// segments. Every glowing shape is pre-rendered once per skin (shadow included) and
// composed with drawImage in the same order, so the result looks the same.

/** Margin around each sprite so the glow is not clipped: > 1.5 × the largest blur (18 × 1.8). */
export const SPRITE_PAD = 52;

/** Gap between a segment and its cell edge; neighbours leave a neon gap. */
export const SEGMENT_INSET = 4;
export const SEGMENT_SIZE = CELL - SEGMENT_INSET * 2;

const FRUIT_FALLBACK_RADIUS = 12;
const EYE_RADIUS = 3.5;
const PUPIL_RADIUS = 1.6;
const SIDES = [-1, 1];
const DIRS: Dir[] = ["up", "down", "left", "right"];

export type SnakeSprites = {
  background: HTMLCanvasElement; // W×H: bg + grid
  bridgeH: HTMLCanvasElement; // horizontal bridge between two segments
  bridgeV: HTMLCanvasElement; // vertical bridge between two segments
  segment: HTMLCanvasElement;
  head: Record<Dir, HTMLCanvasElement>; // head with its eyes, per direction
  fruit: HTMLCanvasElement; // fallback fruit (circle or square), one cell
};

export function glow(c: CanvasRenderingContext2D, p: SnakePalette, color: string, blur = 12) {
  c.shadowColor = color;
  c.shadowBlur = blur * p.glow;
}

export function noGlow(c: CanvasRenderingContext2D) {
  c.shadowBlur = 0;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  return [canvas, ctx];
}

// A sprite of w × h plus the glow margin; `paint` draws with its origin at (0, 0).
function padded(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const [canvas, c] = makeCanvas(w + SPRITE_PAD * 2, h + SPRITE_PAD * 2);
  c.translate(SPRITE_PAD, SPRITE_PAD);
  paint(c);
  return canvas;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (r === 0) {
    c.fillRect(x, y, w, h);
    return;
  }
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

function paintGrid(c: CanvasRenderingContext2D, p: SnakePalette) {
  c.strokeStyle = p.grid;
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 1; x < COLS; x++) {
    c.moveTo(x * CELL + 0.5, 0);
    c.lineTo(x * CELL + 0.5, H);
  }
  for (let y = 1; y < ROWS; y++) {
    c.moveTo(0, y * CELL + 0.5);
    c.lineTo(W, y * CELL + 0.5);
  }
  c.stroke();
}

// Eyes of a head whose segment starts at (0, 0); they sit toward the direction of travel.
function paintEyes(c: CanvasRenderingContext2D, p: SnakePalette, dir: Dir) {
  const cx = SEGMENT_SIZE / 2;
  const cy = SEGMENT_SIZE / 2;
  const ahead = 6;
  const spread = 7;
  const horizontal = dir === "left" || dir === "right";
  const sign = dir === "right" || dir === "down" ? 1 : -1;
  const fx = horizontal ? sign * ahead : 0;
  const fy = horizontal ? 0 : sign * ahead;

  for (const side of SIDES) {
    const ex = cx + fx + (horizontal ? 0 : side * spread);
    const ey = cy + fy + (horizontal ? side * spread : 0);
    c.fillStyle = p.eyeWhite;
    if (p.pixelEyes) {
      c.fillRect(ex - EYE_RADIUS, ey - EYE_RADIUS, EYE_RADIUS * 2, EYE_RADIUS * 2);
      continue;
    }
    c.beginPath();
    c.arc(ex, ey, EYE_RADIUS, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = p.pupil;
    c.beginPath();
    c.arc(ex + (horizontal ? sign : 0), ey + (horizontal ? 0 : sign), PUPIL_RADIUS, 0, Math.PI * 2);
    c.fill();
  }
}

export function buildSprites(p: SnakePalette): SnakeSprites {
  const [background, bg] = makeCanvas(W, H);
  bg.fillStyle = p.bg;
  bg.fillRect(0, 0, W, H);
  paintGrid(bg, p);

  const size = SEGMENT_SIZE;
  const body = (w: number, h: number, r: number) =>
    padded(w, h, (c) => {
      c.fillStyle = p.snake;
      glow(c, p, p.snake, 14);
      roundRect(c, 0, 0, w, h, r);
    });

  const head = {} as Record<Dir, HTMLCanvasElement>;
  for (const d of DIRS) {
    head[d] = padded(size, size, (c) => {
      c.fillStyle = p.snakeHead;
      glow(c, p, p.snakeHead, 18);
      roundRect(c, 0, 0, size, size, p.segmentRadius);
      noGlow(c);
      paintEyes(c, p, d);
    });
  }

  const fruit = padded(CELL, CELL, (c) => {
    const cx = CELL / 2;
    const cy = CELL / 2;
    c.fillStyle = p.fruitFallback;
    glow(c, p, p.fruitFallback, 12);
    if (p.fruit === "square") {
      const side = FRUIT_FALLBACK_RADIUS * 2 - 4;
      c.fillRect(cx - side / 2, cy - side / 2, side, side);
    } else {
      c.beginPath();
      c.arc(cx, cy, FRUIT_FALLBACK_RADIUS, 0, Math.PI * 2);
      c.fill();
    }
  });

  return {
    background,
    bridgeH: body(CELL + size, size, 0),
    bridgeV: body(size, CELL + size, 0),
    segment: body(size, size, p.segmentRadius),
    head,
    fruit,
  };
}
