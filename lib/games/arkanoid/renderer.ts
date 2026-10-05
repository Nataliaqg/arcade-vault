import { BALL_SIZE, H, W } from "./constants";
import type { Ball, Block, Explosion, Paddle } from "./physics";
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
};

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

type Shape = "block" | "paddle" | "ball";

// Draws one sprite frame (classic skin), or a flat shape in the skin palette.
function drawPiece(
  c: CanvasRenderingContext2D,
  v: RenderView,
  frame: Frame,
  fallback: string,
  shape: Shape,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const p = v.palette;
  if (p.sprites && v.sheet.status === "loaded") {
    drawFrame(c, v.sheet, frame, x, y, w, h);
    return;
  }
  c.fillStyle = fallback;
  if (!p.sprites) glow(c, p, fallback, shape === "block" ? 8 : 12);
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

function drawBlocks(c: CanvasRenderingContext2D, v: RenderView) {
  for (const b of v.blocks) {
    if (!b.alive) continue;
    drawPiece(c, v, SPRITES.blocks[b.color], v.palette.blocks[b.color], "block", b.x, b.y, b.w, b.h);
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

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
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
    drawPiece(c, v, SPRITES.ball, p.ball, "ball", x, HUD_Y - BALL_SIZE + 3, BALL_SIZE, BALL_SIZE);
  }
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
  drawPiece(c, v, SPRITES.paddle, p.paddle, "paddle", v.paddle.x, v.paddle.y, v.paddle.w, v.paddle.h);
  drawPiece(c, v, SPRITES.ball, p.ball, "ball", v.ball.x, v.ball.y, v.ball.w, v.ball.h);
  drawHud(c, v);

  if (v.phase === "lost") drawOverlay(c, v, "GAME OVER", p.titleLost);
  else if (v.phase === "won") drawOverlay(c, v, "¡COMPLETASTE EL JUEGO!", p.titleWon);
  else if (v.paused) drawOverlay(c, v, "PAUSA", p.titlePause, "P o Esc para seguir");
}
