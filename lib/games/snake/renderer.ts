import { CELL, H, W } from "./constants";
import type { Cell, Dir } from "./snake";
import type { SnakePalette } from "./skins";
import {
  FRUIT_SPRITES,
  glow,
  noGlow,
  SEGMENT_INSET,
  SPRITE_PAD,
  type FruitSheet,
  type SnakeSprites,
} from "./sprites";
import type { SkinId } from "../skins";

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
  skin: SkinId;
  sprites: SnakeSprites;
  hud: HudLayer;
};

// Score and level are pre-rendered; `signature` says what the canvas shows.
export type HudLayer = {
  canvas: HTMLCanvasElement; // W × HUD_LAYER_H
  signature: string;
};

export const HUD_LAYER_H = 64;

const HUD_SIZE = 12;
const HUD_Y = 30;
const HUD_MARGIN = 16;
const TITLE_SIZE = 36;
const TITLE_MARGIN = 32;
const SUB_SIZE = 12;
const COUNTDOWN_SIZE = 96;

const FRUIT_HEIGHT = 32;

function drawFruit(c: CanvasRenderingContext2D, v: RenderView) {
  if (!v.fruit) return;
  const x = v.fruit.cell.x * CELL;
  const y = v.fruit.cell.y * CELL;
  const p = v.palette;

  if (p.fruit === "sprite" && v.sheet.status === "loaded") {
    const f = FRUIT_SPRITES[v.fruit.sprite];
    // Keeps the crop's aspect ratio at a fixed height, centered in its cell.
    const w = (f.sw / f.sh) * FRUIT_HEIGHT;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    c.drawImage(v.sheet.image, f.sx, f.sy, f.sw, f.sh, cx - w / 2, cy - FRUIT_HEIGHT / 2, w, FRUIT_HEIGHT);
  } else {
    c.drawImage(v.sprites.fruit, x - SPRITE_PAD, y - SPRITE_PAD);
  }
}

function drawSnake(c: CanvasRenderingContext2D, v: RenderView) {
  const s = v.sprites;

  // Bridges between consecutive segments make the body read as one continuous tube.
  for (let i = v.body.length - 1; i > 0; i--) {
    const a = v.body[i];
    const b = v.body[i - 1];
    const x = Math.min(a.x, b.x) * CELL + SEGMENT_INSET;
    const y = Math.min(a.y, b.y) * CELL + SEGMENT_INSET;
    c.drawImage(a.x !== b.x ? s.bridgeH : s.bridgeV, x - SPRITE_PAD, y - SPRITE_PAD);
  }
  for (let i = v.body.length - 1; i > 0; i--) {
    const seg = v.body[i];
    c.drawImage(s.segment, seg.x * CELL + SEGMENT_INSET - SPRITE_PAD, seg.y * CELL + SEGMENT_INSET - SPRITE_PAD);
  }

  const head = v.body[0];
  c.drawImage(
    s.head[v.dir],
    head.x * CELL + SEGMENT_INSET - SPRITE_PAD,
    head.y * CELL + SEGMENT_INSET - SPRITE_PAD,
  );
}

function paintHudLayer(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.clearRect(0, 0, W, HUD_LAYER_H);
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

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  const signature = `${v.score}|${v.level}|${v.skin}`;
  if (v.hud.signature !== signature) {
    const hc = v.hud.canvas.getContext("2d");
    if (hc) paintHudLayer(hc, v);
    v.hud.signature = signature;
  }
  c.drawImage(v.hud.canvas, 0, 0);
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

/** Number shown by the countdown overlay; it only changes once per second. */
export function countdownDigit(countdownMs: number): number {
  return Math.max(1, Math.ceil(countdownMs / 1000));
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
  c.fillText(String(countdownDigit(v.countdownMs)), W / 2, H / 2 - 12);
  noGlow(c);

  c.font = `${SUB_SIZE}px ${v.fontFamily}`;
  c.fillStyle = p.ink;
  c.fillText("PREPÁRATE", W / 2, H / 2 + 56);
}

export function draw(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;

  if (v.phase === "loading") {
    c.fillStyle = p.bg;
    c.fillRect(0, 0, W, H);
    drawOverlay(c, v, "CARGANDO…", p.titleLoading);
    return;
  }

  c.drawImage(v.sprites.background, 0, 0);
  drawFruit(c, v);
  drawSnake(c, v);
  drawHud(c, v);

  if (v.phase === "lost") drawOverlay(c, v, "GAME OVER", p.titleLost, `${v.score} PUNTOS`);
  else if (v.phase === "won") drawOverlay(c, v, "¡REJILLA LLENA!", p.titleWon, `${v.score} PUNTOS`);
  else if (v.paused) drawOverlay(c, v, "PAUSA", p.titlePause, "P o Esc para seguir");
  else if (v.phase === "countdown") drawCountdown(c, v);
}
