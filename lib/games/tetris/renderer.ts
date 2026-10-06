import type { SkinId } from "../skins";
import type { GameStatus } from "../types";
import type { Board } from "./board";
import { ghostY } from "./board";
import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLS,
  H,
  PANEL_X,
  ROWS,
  SPRITE_PAD,
  W,
} from "./constants";
import type { Piece } from "./piece";
import type { TetrisPalette } from "./skins";
import type { TetrisSprites } from "./sprites";

// Everything the renderer needs for one frame; the engine owns the state.
export type RenderView = {
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  palette: TetrisPalette;
  skin: SkinId;
  sprites: TetrisSprites;
  hud: HudLayer;
};

// Score, lines and level values are pre-rendered; `signature` says what the canvas shows.
export type HudLayer = {
  canvas: HTMLCanvasElement; // HUD_LAYER_W × HUD_LAYER_H, placed at (HUD_LAYER_X, 0)
  signature: string;
};

const MONO = "'Courier New', Courier, monospace";
const SANS = "system-ui, -apple-system, sans-serif";
const LABEL_FONT = `bold 11px ${SANS}`;
const VALUE_FONT = `bold 26px ${MONO}`;
const CONTROLS_FONT = `12px ${SANS}`;
const TITLE_FONT = `800 40px ${SANS}`;
const SUB_FONT = `16px ${MONO}`;

const NEXT_SIZE = 120;
const NEXT_Y = 296;

// Stat rows: label baseline; the value sits 32 px below.
const SCORE_Y = 40;
const LINES_Y = 120;
const LEVEL_Y = 200;

// The HUD layer covers the three stat values plus room for their glow.
export const HUD_LAYER_X = PANEL_X - SPRITE_PAD;
export const HUD_LAYER_W = W - HUD_LAYER_X;
export const HUD_LAYER_H = 260;

const CONTROLS: [string, string][] = [
  ["← →", "mover"],
  ["↑ / X", "rotar"],
  ["↓", "bajar"],
  ["ESPACIO", "caída"],
  ["P", "pausa"],
];

// Paints one block whose top-left corner is (left, top). Runs once per sprite, not per frame.
export function paintBlock(
  c: CanvasRenderingContext2D,
  p: TetrisPalette,
  left: number,
  top: number,
  colorIndex: number,
  size: number,
  alpha: number,
) {
  c.globalAlpha = alpha;
  const color = p.pieces[colorIndex] ?? p.accent;
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = 10 * p.glow;
  c.fillRect(left, top, size - 2, size - 2);
  c.shadowBlur = 0;
  if (p.block === "ring") {
    const ring = Math.max(3, Math.round(size / 6));
    c.fillStyle = p.boardBg;
    c.fillRect(left + ring, top + ring, size - 2 - ring * 2, size - 2 - ring * 2);
  }
  if (p.bevel) {
    c.fillStyle = p.bevel;
    c.fillRect(left, top, size - 2, 4);
  }
  c.globalAlpha = 1;
}

// Composes the cached sprite of one cell at grid position (x, y) inside the area at (ox, oy).
function drawBlock(
  c: CanvasRenderingContext2D,
  sprites: (HTMLCanvasElement | null)[],
  ox: number,
  oy: number,
  x: number,
  y: number,
  colorIndex: number,
) {
  if (!colorIndex) return;
  const sprite = sprites[colorIndex];
  if (!sprite) return;
  c.drawImage(sprite, ox + x * BLOCK - SPRITE_PAD, oy + y * BLOCK - SPRITE_PAD);
}

function paintGrid(c: CanvasRenderingContext2D, p: TetrisPalette) {
  c.strokeStyle = p.gridLine;
  c.lineWidth = 0.5;
  c.beginPath();
  for (let col = 1; col < COLS; col++) {
    c.moveTo(BOARD_X + col * BLOCK, BOARD_Y);
    c.lineTo(BOARD_X + col * BLOCK, BOARD_Y + ROWS * BLOCK);
  }
  for (let row = 1; row < ROWS; row++) {
    c.moveTo(BOARD_X, BOARD_Y + row * BLOCK);
    c.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + row * BLOCK);
  }
  c.stroke();
}

// Board frame with its glow; cached in its own sprite because it goes over the blocks.
export function paintBorder(c: CanvasRenderingContext2D, p: TetrisPalette) {
  c.strokeStyle = p.border;
  c.shadowColor = p.border;
  c.shadowBlur = 10 * p.glow;
  c.lineWidth = 1;
  c.strokeRect(BOARD_X - 0.5, BOARD_Y + 0.5, COLS * BLOCK + 1, ROWS * BLOCK - 1);
  c.shadowBlur = 0;
}

function paintLabel(c: CanvasRenderingContext2D, p: TetrisPalette, label: string, y: number) {
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillStyle = p.label;
  c.font = LABEL_FONT;
  c.fillText(label, PANEL_X, y);
}

function paintControls(c: CanvasRenderingContext2D, p: TetrisPalette) {
  const top = 450;
  paintLabel(c, p, "CONTROLS", top);

  c.font = CONTROLS_FONT;
  CONTROLS.forEach(([key, action], i) => {
    const y = top + 24 + i * 22;
    c.fillStyle = p.key;
    c.fillText(key, PANEL_X, y);
    c.fillStyle = p.dim;
    c.fillText(action, PANEL_X + 80, y);
  });
}

// Everything that never moves; painted once per skin into the background sprite.
export function paintBackground(c: CanvasRenderingContext2D, p: TetrisPalette) {
  c.fillStyle = p.pageBg;
  c.fillRect(0, 0, W, H);

  c.fillStyle = p.boardBg;
  c.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
  paintGrid(c, p);

  paintLabel(c, p, "SCORE", SCORE_Y);
  paintLabel(c, p, "LINES", LINES_Y);
  paintLabel(c, p, "LEVEL", LEVEL_Y);

  paintLabel(c, p, "NEXT", NEXT_Y - 12);
  c.fillStyle = p.boardBg;
  c.fillRect(PANEL_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
  c.strokeStyle = p.border;
  c.lineWidth = 1;
  c.strokeRect(PANEL_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);

  paintControls(c, p);
}

function drawBoard(c: CanvasRenderingContext2D, v: RenderView) {
  const s = v.sprites;
  for (let r = 0; r < ROWS; r++) {
    const row = v.board[r];
    for (let col = 0; col < COLS; col++) {
      drawBlock(c, s.block, BOARD_X, BOARD_Y, col, r, row[col]);
    }
  }

  const { current } = v;
  const { shape } = current;
  const gy = ghostY(v.board, current);
  for (let r = 0; r < shape.length; r++) {
    for (let col = 0; col < shape[r].length; col++) {
      drawBlock(c, s.ghost, BOARD_X, BOARD_Y, current.x + col, gy + r, shape[r][col]);
    }
  }
  for (let r = 0; r < shape.length; r++) {
    for (let col = 0; col < shape[r].length; col++) {
      drawBlock(c, s.block, BOARD_X, BOARD_Y, current.x + col, current.y + r, shape[r][col]);
    }
  }

  c.drawImage(s.border, BOARD_X - SPRITE_PAD, BOARD_Y - SPRITE_PAD);
}

function paintValue(c: CanvasRenderingContext2D, p: TetrisPalette, value: string, labelY: number) {
  c.fillStyle = p.accent;
  c.shadowColor = p.accent;
  c.shadowBlur = 8 * p.glow;
  c.fillText(value, PANEL_X, labelY + 32);
  c.shadowBlur = 0;
}

function paintHudLayer(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, HUD_LAYER_W, HUD_LAYER_H);
  // Paint in canvas coordinates: the layer is composed at (HUD_LAYER_X, 0).
  c.translate(-HUD_LAYER_X, 0);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.font = VALUE_FONT;
  paintValue(c, p, v.score.toLocaleString("es-ES"), SCORE_Y);
  paintValue(c, p, String(v.lines), LINES_Y);
  paintValue(c, p, String(v.level), LEVEL_Y);
}

function drawPanel(c: CanvasRenderingContext2D, v: RenderView) {
  const signature = `${v.score}|${v.lines}|${v.level}|${v.skin}`;
  if (v.hud.signature !== signature) {
    const hc = v.hud.canvas.getContext("2d");
    if (hc) paintHudLayer(hc, v);
    v.hud.signature = signature;
  }
  c.drawImage(v.hud.canvas, HUD_LAYER_X, 0);

  // The preview grid is 4×4 cells of BLOCK px; center the piece inside it.
  const { shape } = v.next;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let col = 0; col < shape[r].length; col++) {
      drawBlock(c, v.sprites.block, PANEL_X, NEXT_Y, offX + col, offY + r, shape[r][col]);
    }
  }
}

// Only drawn while paused or game over, when the loop has stopped: one frame each.
function drawOverlay(c: CanvasRenderingContext2D, p: TetrisPalette, title: string, sub: string) {
  c.fillStyle = p.overlayBg;
  c.fillRect(0, 0, W, H);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = p.danger;
  c.shadowColor = p.danger;
  c.shadowBlur = 16 * p.glow;
  c.font = TITLE_FONT;
  c.fillText(title, W / 2, H / 2 - 8);
  c.shadowBlur = 0;
  if (sub) {
    c.fillStyle = p.accent;
    c.font = SUB_FONT;
    c.fillText(sub, W / 2, H / 2 + 28);
  }
}

export function drawFrame(c: CanvasRenderingContext2D, v: RenderView) {
  c.drawImage(v.sprites.background, 0, 0);

  drawBoard(c, v);
  drawPanel(c, v);

  if (v.status === "paused") {
    drawOverlay(c, v.palette, "PAUSA", "");
  } else if (v.status === "gameover") {
    drawOverlay(c, v.palette, "GAME OVER", `Puntuación: ${v.score.toLocaleString("es-ES")}`);
  }
}
