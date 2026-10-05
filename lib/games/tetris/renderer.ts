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
  W,
} from "./constants";
import type { Piece } from "./piece";
import type { TetrisPalette } from "./skins";

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
};

const MONO = "'Courier New', Courier, monospace";
const SANS = "system-ui, -apple-system, sans-serif";

const NEXT_SIZE = 120;
const NEXT_Y = 296;

const CONTROLS: [string, string][] = [
  ["← →", "mover"],
  ["↑ / X", "rotar"],
  ["↓", "bajar"],
  ["ESPACIO", "caída"],
  ["P", "pausa"],
];

// Draws one cell at grid position (x, y) inside the area whose origin is (ox, oy).
function drawBlock(
  c: CanvasRenderingContext2D,
  p: TetrisPalette,
  ox: number,
  oy: number,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  const left = ox + x * size + 1;
  const top = oy + y * size + 1;
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

function drawGrid(c: CanvasRenderingContext2D, p: TetrisPalette) {
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

function drawBoard(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.fillStyle = p.boardBg;
  c.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
  drawGrid(c, p);

  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      drawBlock(c, p, BOARD_X, BOARD_Y, col, r, v.board[r][col], BLOCK);
    }
  }

  const { current } = v;
  const gy = ghostY(v.board, current);
  for (let r = 0; r < current.shape.length; r++) {
    for (let col = 0; col < current.shape[r].length; col++) {
      drawBlock(c, p, BOARD_X, BOARD_Y, current.x + col, gy + r, current.shape[r][col], BLOCK, p.ghostAlpha);
    }
  }
  for (let r = 0; r < current.shape.length; r++) {
    for (let col = 0; col < current.shape[r].length; col++) {
      drawBlock(c, p, BOARD_X, BOARD_Y, current.x + col, current.y + r, current.shape[r][col], BLOCK);
    }
  }

  c.strokeStyle = p.border;
  c.shadowColor = p.border;
  c.shadowBlur = 10 * p.glow;
  c.lineWidth = 1;
  c.strokeRect(BOARD_X - 0.5, BOARD_Y + 0.5, COLS * BLOCK + 1, ROWS * BLOCK - 1);
  c.shadowBlur = 0;
}

function drawStat(c: CanvasRenderingContext2D, p: TetrisPalette, label: string, value: string, y: number) {
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillStyle = p.label;
  c.font = `bold 11px ${SANS}`;
  c.fillText(label, PANEL_X, y);
  c.fillStyle = p.accent;
  c.shadowColor = p.accent;
  c.shadowBlur = 8 * p.glow;
  c.font = `bold 26px ${MONO}`;
  c.fillText(value, PANEL_X, y + 32);
  c.shadowBlur = 0;
}

function drawNext(c: CanvasRenderingContext2D, p: TetrisPalette, next: Piece) {
  c.fillStyle = p.label;
  c.font = `bold 11px ${SANS}`;
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillText("NEXT", PANEL_X, NEXT_Y - 12);

  c.fillStyle = p.boardBg;
  c.fillRect(PANEL_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
  c.strokeStyle = p.border;
  c.lineWidth = 1;
  c.strokeRect(PANEL_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);

  // The preview grid is 4×4 cells of BLOCK px; center the piece inside it.
  const { shape } = next;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let col = 0; col < shape[r].length; col++) {
      drawBlock(c, p, PANEL_X, NEXT_Y, offX + col, offY + r, shape[r][col], BLOCK);
    }
  }
}

function drawControls(c: CanvasRenderingContext2D, p: TetrisPalette) {
  const top = 450;
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillStyle = p.label;
  c.font = `bold 11px ${SANS}`;
  c.fillText("CONTROLS", PANEL_X, top);

  c.font = `12px ${SANS}`;
  CONTROLS.forEach(([key, action], i) => {
    const y = top + 24 + i * 22;
    c.fillStyle = p.key;
    c.fillText(key, PANEL_X, y);
    c.fillStyle = p.dim;
    c.fillText(action, PANEL_X + 80, y);
  });
}

function drawPanel(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  drawStat(c, p, "SCORE", v.score.toLocaleString("es-ES"), 40);
  drawStat(c, p, "LINES", String(v.lines), 120);
  drawStat(c, p, "LEVEL", String(v.level), 200);
  drawNext(c, p, v.next);
  drawControls(c, p);
}

function drawOverlay(c: CanvasRenderingContext2D, p: TetrisPalette, title: string, sub: string) {
  c.fillStyle = p.overlayBg;
  c.fillRect(0, 0, W, H);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = p.danger;
  c.shadowColor = p.danger;
  c.shadowBlur = 16 * p.glow;
  c.font = `800 40px ${SANS}`;
  c.fillText(title, W / 2, H / 2 - 8);
  c.shadowBlur = 0;
  if (sub) {
    c.fillStyle = p.accent;
    c.font = `16px ${MONO}`;
    c.fillText(sub, W / 2, H / 2 + 28);
  }
}

export function drawFrame(c: CanvasRenderingContext2D, v: RenderView) {
  c.fillStyle = v.palette.pageBg;
  c.fillRect(0, 0, W, H);

  drawBoard(c, v);
  drawPanel(c, v);

  if (v.status === "paused") {
    drawOverlay(c, v.palette, "PAUSA", "");
  } else if (v.status === "gameover") {
    drawOverlay(c, v.palette, "GAME OVER", `Puntuación: ${v.score.toLocaleString("es-ES")}`);
  }
}
