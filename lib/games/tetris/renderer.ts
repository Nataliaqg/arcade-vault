import type { GameStatus } from "../types";
import type { Board } from "./board";
import { ghostY } from "./board";
import {
  BLOCK,
  BOARD_BG,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  GRID_LINE,
  H,
  PANEL_X,
  ROWS,
  W,
} from "./constants";
import type { Piece } from "./piece";

// Everything the renderer needs for one frame; the engine owns the state.
export type RenderView = {
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
};

const PAGE_BG = "#0f0f17";
const BORDER = "#2a2a3a";
const LABEL = "#555570";
const ACCENT = "#7aa2f7";
const DIM = "#888";
const KEY = "#aaa";
const DANGER = "#e57373";
const OVERLAY_BG = "rgba(10, 10, 20, 0.75)";
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
  c.fillStyle = COLORS[colorIndex] ?? "#fff";
  c.fillRect(left, top, size - 2, size - 2);
  c.fillStyle = "rgba(255,255,255,0.12)";
  c.fillRect(left, top, size - 2, 4);
  c.globalAlpha = 1;
}

function drawGrid(c: CanvasRenderingContext2D) {
  c.strokeStyle = GRID_LINE;
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
  c.fillStyle = BOARD_BG;
  c.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
  drawGrid(c);

  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      drawBlock(c, BOARD_X, BOARD_Y, col, r, v.board[r][col], BLOCK);
    }
  }

  const { current } = v;
  const gy = ghostY(v.board, current);
  for (let r = 0; r < current.shape.length; r++) {
    for (let col = 0; col < current.shape[r].length; col++) {
      drawBlock(c, BOARD_X, BOARD_Y, current.x + col, gy + r, current.shape[r][col], BLOCK, 0.2);
    }
  }
  for (let r = 0; r < current.shape.length; r++) {
    for (let col = 0; col < current.shape[r].length; col++) {
      drawBlock(c, BOARD_X, BOARD_Y, current.x + col, current.y + r, current.shape[r][col], BLOCK);
    }
  }

  c.strokeStyle = BORDER;
  c.lineWidth = 1;
  c.strokeRect(BOARD_X - 0.5, BOARD_Y + 0.5, COLS * BLOCK + 1, ROWS * BLOCK - 1);
}

function drawStat(c: CanvasRenderingContext2D, label: string, value: string, y: number) {
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillStyle = LABEL;
  c.font = `bold 11px ${SANS}`;
  c.fillText(label, PANEL_X, y);
  c.fillStyle = ACCENT;
  c.font = `bold 26px ${MONO}`;
  c.fillText(value, PANEL_X, y + 32);
}

function drawNext(c: CanvasRenderingContext2D, next: Piece) {
  c.fillStyle = LABEL;
  c.font = `bold 11px ${SANS}`;
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillText("NEXT", PANEL_X, NEXT_Y - 12);

  c.fillStyle = BOARD_BG;
  c.fillRect(PANEL_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
  c.strokeStyle = BORDER;
  c.lineWidth = 1;
  c.strokeRect(PANEL_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);

  // The preview grid is 4×4 cells of BLOCK px; center the piece inside it.
  const { shape } = next;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let col = 0; col < shape[r].length; col++) {
      drawBlock(c, PANEL_X, NEXT_Y, offX + col, offY + r, shape[r][col], BLOCK);
    }
  }
}

function drawControls(c: CanvasRenderingContext2D) {
  const top = 450;
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.fillStyle = LABEL;
  c.font = `bold 11px ${SANS}`;
  c.fillText("CONTROLS", PANEL_X, top);

  c.font = `12px ${SANS}`;
  CONTROLS.forEach(([key, action], i) => {
    const y = top + 24 + i * 22;
    c.fillStyle = KEY;
    c.fillText(key, PANEL_X, y);
    c.fillStyle = DIM;
    c.fillText(action, PANEL_X + 80, y);
  });
}

function drawPanel(c: CanvasRenderingContext2D, v: RenderView) {
  drawStat(c, "SCORE", v.score.toLocaleString("es-ES"), 40);
  drawStat(c, "LINES", String(v.lines), 120);
  drawStat(c, "LEVEL", String(v.level), 200);
  drawNext(c, v.next);
  drawControls(c);
}

function drawOverlay(c: CanvasRenderingContext2D, title: string, sub: string) {
  c.fillStyle = OVERLAY_BG;
  c.fillRect(0, 0, W, H);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = DANGER;
  c.font = `800 40px ${SANS}`;
  c.fillText(title, W / 2, H / 2 - 8);
  if (sub) {
    c.fillStyle = ACCENT;
    c.font = `16px ${MONO}`;
    c.fillText(sub, W / 2, H / 2 + 28);
  }
}

export function drawFrame(c: CanvasRenderingContext2D, v: RenderView) {
  c.fillStyle = PAGE_BG;
  c.fillRect(0, 0, W, H);

  drawBoard(c, v);
  drawPanel(c, v);

  if (v.status === "paused") {
    drawOverlay(c, "PAUSA", "");
  } else if (v.status === "gameover") {
    drawOverlay(c, "GAME OVER", `Puntuación: ${v.score.toLocaleString("es-ES")}`);
  }
}
