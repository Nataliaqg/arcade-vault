import { CELL, COLS, H, ROWS, W } from "./constants";
import type { Cell, Dir } from "./snake";
import type { SnakePalette } from "./skins";
import { FRUIT_SPRITES, type FruitSheet } from "./sprites";

export type Phase = "loading" | "countdown" | "playing" | "won" | "lost";

// Everything the renderer needs for one frame; the engine owns the state.
export type RenderView = {
  phase: Phase;
  paused: boolean;
  score: number;
  level: number;
  countdownMs: number;
  body: Cell[]; // body[0] is the head
  dir: Dir;
  fruit: { cell: Cell; sprite: number } | null;
  sheet: FruitSheet;
  /** CSS font-family string, already ending in a monospace fallback. */
  fontFamily: string;
  palette: SnakePalette;
};

const HUD_SIZE = 12;
const HUD_Y = 30;
const HUD_MARGIN = 16;
const TITLE_SIZE = 36;
const TITLE_MARGIN = 32;
const SUB_SIZE = 12;
const COUNTDOWN_SIZE = 96;

const SEGMENT_INSET = 4; // segment = CELL - 2 * inset, so neighbours leave a neon gap
const FRUIT_HEIGHT = 32;
const FRUIT_FALLBACK_RADIUS = 12;
const EYE_RADIUS = 3.5;
const PUPIL_RADIUS = 1.6;

function glow(c: CanvasRenderingContext2D, p: SnakePalette, color: string, blur = 12) {
  c.shadowColor = color;
  c.shadowBlur = blur * p.glow;
}

function noGlow(c: CanvasRenderingContext2D) {
  c.shadowBlur = 0;
}

function drawGrid(c: CanvasRenderingContext2D, p: SnakePalette) {
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

function drawFruit(c: CanvasRenderingContext2D, v: RenderView) {
  if (!v.fruit) return;
  const cx = v.fruit.cell.x * CELL + CELL / 2;
  const cy = v.fruit.cell.y * CELL + CELL / 2;

  const p = v.palette;

  if (p.fruit === "sprite" && v.sheet.status === "loaded") {
    const f = FRUIT_SPRITES[v.fruit.sprite];
    // Keeps the crop's aspect ratio at a fixed height, centered in its cell.
    const w = (f.sw / f.sh) * FRUIT_HEIGHT;
    c.drawImage(v.sheet.image, f.sx, f.sy, f.sw, f.sh, cx - w / 2, cy - FRUIT_HEIGHT / 2, w, FRUIT_HEIGHT);
  } else {
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
    noGlow(c);
  }
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

function drawEyes(c: CanvasRenderingContext2D, p: SnakePalette, head: Cell, dir: Dir) {
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  const ahead = 6; // eyes sit toward the direction of travel
  const spread = 7;
  const horizontal = dir === "left" || dir === "right";
  const sign = dir === "right" || dir === "down" ? 1 : -1;
  const fx = horizontal ? sign * ahead : 0;
  const fy = horizontal ? 0 : sign * ahead;

  for (const side of [-1, 1]) {
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

function drawSnake(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  const size = CELL - SEGMENT_INSET * 2;
  c.fillStyle = p.snake;
  glow(c, p, p.snake, 14);

  // Bridges between consecutive segments make the body read as one continuous tube.
  for (let i = v.body.length - 1; i > 0; i--) {
    const a = v.body[i];
    const b = v.body[i - 1];
    const x = Math.min(a.x, b.x) * CELL + SEGMENT_INSET;
    const y = Math.min(a.y, b.y) * CELL + SEGMENT_INSET;
    const w = a.x !== b.x ? CELL + size : size;
    const h = a.y !== b.y ? CELL + size : size;
    c.fillRect(x, y, w, h);
  }
  for (let i = v.body.length - 1; i > 0; i--) {
    const s = v.body[i];
    roundRect(c, s.x * CELL + SEGMENT_INSET, s.y * CELL + SEGMENT_INSET, size, size, p.segmentRadius);
  }

  const head = v.body[0];
  c.fillStyle = p.snakeHead;
  glow(c, p, p.snakeHead, 18);
  roundRect(c, head.x * CELL + SEGMENT_INSET, head.y * CELL + SEGMENT_INSET, size, size, p.segmentRadius);
  noGlow(c);
  drawEyes(c, p, head, v.dir);
}

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.font = `${HUD_SIZE}px ${v.fontFamily}`;
  c.textBaseline = "alphabetic";

  c.textAlign = "left";
  c.fillStyle = p.hudScore;
  glow(c, p, p.hudScore, 8);
  c.fillText(String(v.score).padStart(5, "0"), HUD_MARGIN, HUD_Y);

  c.textAlign = "right";
  c.fillStyle = p.hudLevel;
  glow(c, p, p.hudLevel, 8);
  c.fillText(`NIVEL ${v.level}`, W - HUD_MARGIN, HUD_Y);
  noGlow(c);
}

function drawOverlay(
  c: CanvasRenderingContext2D,
  v: RenderView,
  title: string,
  color: string,
  sub?: string,
) {
  const p = v.palette;
  c.fillStyle = p.veil;
  c.fillRect(0, 0, W, H);

  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `${TITLE_SIZE}px ${v.fontFamily}`;
  // Long titles shrink to fit inside the canvas margins.
  const fit = Math.min(1, (W - TITLE_MARGIN * 2) / c.measureText(title).width);
  c.font = `${Math.floor(TITLE_SIZE * fit)}px ${v.fontFamily}`;
  c.fillStyle = color;
  glow(c, p, color, 24);
  c.fillText(title, W / 2, H / 2 - 12);
  noGlow(c);

  if (sub) {
    c.font = `${SUB_SIZE}px ${v.fontFamily}`;
    c.fillStyle = p.ink;
    c.fillText(sub, W / 2, H / 2 + 36);
  }
}

function drawCountdown(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.fillStyle = p.veil;
  c.fillRect(0, 0, W, H);

  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `${COUNTDOWN_SIZE}px ${v.fontFamily}`;
  c.fillStyle = p.countdown;
  glow(c, p, p.countdown, 32);
  c.fillText(String(Math.max(1, Math.ceil(v.countdownMs / 1000))), W / 2, H / 2 - 12);
  noGlow(c);

  c.font = `${SUB_SIZE}px ${v.fontFamily}`;
  c.fillStyle = p.ink;
  c.fillText("PREPÁRATE", W / 2, H / 2 + 56);
}

export function draw(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.fillStyle = p.bg;
  c.fillRect(0, 0, W, H);

  if (v.phase === "loading") {
    drawOverlay(c, v, "CARGANDO…", p.titleLoading);
    return;
  }

  drawGrid(c, p);
  drawFruit(c, v);
  drawSnake(c, v);
  drawHud(c, v);

  const points = `${v.score} PUNTOS`;
  if (v.phase === "lost") drawOverlay(c, v, "GAME OVER", p.titleLost, points);
  else if (v.phase === "won") drawOverlay(c, v, "¡REJILLA LLENA!", p.titleWon, points);
  else if (v.paused) drawOverlay(c, v, "PAUSA", p.titlePause, "P o Esc para seguir");
  else if (v.phase === "countdown") drawCountdown(c, v);
}
