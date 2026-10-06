import type { SkinId } from "../skins";
import { BALL_SIZE, H, W } from "./constants";
import type { Ball, Block, Explosion, Paddle } from "./physics";
import { paintShape, SPRITE_PAD, type ArkanoidShapes } from "./shapes";
import type { ArkanoidPalette } from "./skins";
import {
  drawFrame,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  SPRITES,
  type Frame,
  type Spritesheet,
} from "./sprites";

export type Phase = "loading" | "playing" | "won" | "lost";

// Everything the renderer needs for one frame; the engine owns the state.
export type RenderView = {
  phase: Phase;
  paused: boolean;
  score: number;
  level: number;
  lives: number;
  blocks: Block[];
  explosions: Explosion[];
  paddle: Paddle;
  ball: Ball;
  sheet: Spritesheet;
  /** CSS font-family string, already ending in a monospace fallback. */
  fontFamily: string;
  palette: ArkanoidPalette;
  skin: SkinId;
  /** Flat shapes with their glow, pre-rendered for the current skin. */
  shapes: ArkanoidShapes;
  hud: HudLayer;
};

// Score, level and lives are pre-rendered; `signature` says what the canvas shows.
export type HudLayer = {
  canvas: HTMLCanvasElement; // W × HUD_LAYER_H
  signature: string;
};

// Tall enough for the lives' glow (ball bottom at 33 + ~29 px of neon blur).
export const HUD_LAYER_H = 64;

const HUD_SIZE = 12;
const HUD_Y = 30;
const HUD_MARGIN = 16;
const LIFE_SPACING = 6;
const TITLE_SIZE = 36;
const TITLE_MARGIN = 32;
const SUB_SIZE = 12;

function glow(c: CanvasRenderingContext2D, p: ArkanoidPalette, color: string, blur = 12) {
  c.shadowColor = color;
  c.shadowBlur = blur * p.glow;
}

function noGlow(c: CanvasRenderingContext2D) {
  c.shadowBlur = 0;
}

// Draws one sprite frame (classic skin), or the cached flat shape (with its glow)
// of the skin palette. The cached shape has SPRITE_PAD of margin on every side.
function drawPiece(
  c: CanvasRenderingContext2D,
  v: RenderView,
  frame: Frame,
  cached: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (v.palette.sprites && v.sheet.status === "loaded") {
    drawFrame(c, v.sheet, frame, x, y, w, h);
    return;
  }
  c.drawImage(cached, x - SPRITE_PAD, y - SPRITE_PAD);
}

function drawBlocks(c: CanvasRenderingContext2D, v: RenderView) {
  for (const b of v.blocks) {
    if (!b.alive) continue;
    drawPiece(c, v, SPRITES.blocks[b.color], v.shapes.blocks[b.color], b.x, b.y, b.w, b.h);
  }
}

function drawExplosions(c: CanvasRenderingContext2D, v: RenderView) {
  for (const e of v.explosions) {
    const t = e.elapsed / EXPLOSION_DURATION;
    if (v.palette.sprites && v.sheet.status === "loaded") {
      const i = Math.min(Math.floor(t * 4), 3);
      drawFrame(c, v.sheet, EXPLOSION_FRAMES[e.color][i], e.x, e.y, e.w, e.h);
    } else {
      c.globalAlpha = Math.max(0, 1 - t);
      c.fillStyle = v.palette.blocks[e.color];
      c.fillRect(e.x, e.y, e.w, e.h);
      c.globalAlpha = 1;
    }
  }
}

// Paints score, level and lives on the HUD layer; same coordinates as the canvas.
function paintHudLayer(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.clearRect(0, 0, W, HUD_LAYER_H);
  c.font = `${HUD_SIZE}px ${v.fontFamily}`;
  c.textBaseline = "alphabetic";

  c.textAlign = "left";
  c.fillStyle = p.hudScore;
  glow(c, p, p.hudScore, 8);
  c.fillText(String(v.score).padStart(5, "0"), HUD_MARGIN, HUD_Y);

  c.textAlign = "center";
  c.fillStyle = p.hudLevel;
  glow(c, p, p.hudLevel, 8);
  c.fillText(`NIVEL ${v.level}`, W / 2, HUD_Y);
  noGlow(c);

  // Lives as ball sprites, right-aligned.
  for (let i = 0; i < v.lives; i++) {
    const x = W - HUD_MARGIN - (v.lives - i) * (BALL_SIZE + LIFE_SPACING) + LIFE_SPACING;
    const y = HUD_Y - BALL_SIZE + 3;
    if (p.sprites && v.sheet.status === "loaded") {
      drawFrame(c, v.sheet, SPRITES.ball, x, y, BALL_SIZE, BALL_SIZE);
    } else {
      paintShape(c, p, p.ball, "ball", x, y, BALL_SIZE, BALL_SIZE);
    }
  }
}

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  // The sheet status decides between sprite and flat lives.
  const signature = `${v.score}|${v.level}|${v.lives}|${v.skin}|${v.sheet.status}`;
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

export function draw(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.fillStyle = p.bg;
  c.fillRect(0, 0, W, H);

  if (v.phase === "loading") {
    drawOverlay(c, v, "CARGANDO…", p.titleLoading);
    return;
  }

  drawBlocks(c, v);
  drawExplosions(c, v);
  drawPiece(c, v, SPRITES.paddle, v.shapes.paddle, v.paddle.x, v.paddle.y, v.paddle.w, v.paddle.h);
  drawPiece(c, v, SPRITES.ball, v.shapes.ball, v.ball.x, v.ball.y, v.ball.w, v.ball.h);
  drawHud(c, v);

  if (v.phase === "lost") drawOverlay(c, v, "GAME OVER", p.titleLost);
  else if (v.phase === "won") drawOverlay(c, v, "¡COMPLETASTE EL JUEGO!", p.titleWon);
  else if (v.paused) drawOverlay(c, v, "PAUSA", p.titlePause, "P o Esc para seguir");
}
