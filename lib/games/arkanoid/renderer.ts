import {
  BALL_FALLBACK_COLOR,
  BALL_SIZE,
  BG,
  BLOCK_FALLBACK_COLORS,
  CYAN,
  H,
  INK,
  MAGENTA,
  OVERLAY_VEIL,
  PADDLE_FALLBACK_COLOR,
  W,
  YELLOW,
} from "./constants";
import type { Ball, Block, Explosion, Paddle } from "./physics";
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
};

const HUD_SIZE = 12;
const HUD_Y = 30;
const HUD_MARGIN = 16;
const LIFE_SPACING = 6;
const TITLE_SIZE = 36;
const TITLE_MARGIN = 32;
const SUB_SIZE = 12;

function glow(c: CanvasRenderingContext2D, color: string, blur = 12) {
  c.shadowColor = color;
  c.shadowBlur = blur;
}

function noGlow(c: CanvasRenderingContext2D) {
  c.shadowBlur = 0;
}

// Draws one sprite frame, or a flat rectangle when the spritesheet failed.
function drawPiece(
  c: CanvasRenderingContext2D,
  v: RenderView,
  frame: Frame,
  fallback: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (v.sheet.status === "loaded") {
    drawFrame(c, v.sheet, frame, x, y, w, h);
  } else {
    c.fillStyle = fallback;
    c.fillRect(x, y, w, h);
  }
}

function drawBlocks(c: CanvasRenderingContext2D, v: RenderView) {
  for (const b of v.blocks) {
    if (!b.alive) continue;
    drawPiece(c, v, SPRITES.blocks[b.color], BLOCK_FALLBACK_COLORS[b.color], b.x, b.y, b.w, b.h);
  }
}

function drawExplosions(c: CanvasRenderingContext2D, v: RenderView) {
  for (const e of v.explosions) {
    const t = e.elapsed / EXPLOSION_DURATION;
    if (v.sheet.status === "loaded") {
      const i = Math.min(Math.floor(t * 4), 3);
      drawFrame(c, v.sheet, EXPLOSION_FRAMES[e.color][i], e.x, e.y, e.w, e.h);
    } else {
      c.globalAlpha = Math.max(0, 1 - t);
      c.fillStyle = BLOCK_FALLBACK_COLORS[e.color];
      c.fillRect(e.x, e.y, e.w, e.h);
      c.globalAlpha = 1;
    }
  }
}

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  c.font = `${HUD_SIZE}px ${v.fontFamily}`;
  c.textBaseline = "alphabetic";

  c.textAlign = "left";
  c.fillStyle = CYAN;
  glow(c, CYAN, 8);
  c.fillText(String(v.score).padStart(5, "0"), HUD_MARGIN, HUD_Y);

  c.textAlign = "center";
  c.fillStyle = YELLOW;
  glow(c, YELLOW, 8);
  c.fillText(`NIVEL ${v.level}`, W / 2, HUD_Y);
  noGlow(c);

  // Lives as ball sprites, right-aligned.
  for (let i = 0; i < v.lives; i++) {
    const x = W - HUD_MARGIN - (v.lives - i) * (BALL_SIZE + LIFE_SPACING) + LIFE_SPACING;
    drawPiece(c, v, SPRITES.ball, BALL_FALLBACK_COLOR, x, HUD_Y - BALL_SIZE + 3, BALL_SIZE, BALL_SIZE);
  }
}

function drawOverlay(
  c: CanvasRenderingContext2D,
  v: RenderView,
  title: string,
  color: string,
  sub?: string,
) {
  c.fillStyle = OVERLAY_VEIL;
  c.fillRect(0, 0, W, H);

  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `${TITLE_SIZE}px ${v.fontFamily}`;
  // Long titles shrink to fit inside the canvas margins.
  const fit = Math.min(1, (W - TITLE_MARGIN * 2) / c.measureText(title).width);
  c.font = `${Math.floor(TITLE_SIZE * fit)}px ${v.fontFamily}`;
  c.fillStyle = color;
  glow(c, color, 24);
  c.fillText(title, W / 2, H / 2 - 12);
  noGlow(c);

  if (sub) {
    c.font = `${SUB_SIZE}px ${v.fontFamily}`;
    c.fillStyle = INK;
    c.fillText(sub, W / 2, H / 2 + 36);
  }
}

export function draw(c: CanvasRenderingContext2D, v: RenderView) {
  c.fillStyle = BG;
  c.fillRect(0, 0, W, H);

  if (v.phase === "loading") {
    drawOverlay(c, v, "CARGANDO…", CYAN);
    return;
  }

  drawBlocks(c, v);
  drawExplosions(c, v);
  drawPiece(c, v, SPRITES.paddle, PADDLE_FALLBACK_COLOR, v.paddle.x, v.paddle.y, v.paddle.w, v.paddle.h);
  drawPiece(c, v, SPRITES.ball, BALL_FALLBACK_COLOR, v.ball.x, v.ball.y, v.ball.w, v.ball.h);
  drawHud(c, v);

  if (v.phase === "lost") drawOverlay(c, v, "GAME OVER", MAGENTA);
  else if (v.phase === "won") drawOverlay(c, v, "¡COMPLETASTE EL JUEGO!", YELLOW);
  else if (v.paused) drawOverlay(c, v, "PAUSA", CYAN, "P o Esc para seguir");
}
