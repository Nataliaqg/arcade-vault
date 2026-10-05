import { DEFAULT_SKIN, type SkinId } from "../skins";
import type { GameCallbacks, GameEngine, GameOptions, GameState, GameStatus } from "../types";
import { clearLines, collide, createBoard, ghostY, merge, type Board } from "./board";
import {
  BASE_DROP_INTERVAL,
  H,
  LEVEL_SPEEDUP,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MIN_DROP_INTERVAL,
  W,
} from "./constants";
import { randomPiece, tryRotate, type Piece } from "./piece";
import { drawFrame } from "./renderer";
import { SKINS } from "./skins";

// Keys the game uses; the page must not scroll or click buttons with them.
const GAME_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
  "KeyP",
];

export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options: GameOptions = {},
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  canvas.width = W;
  canvas.height = H;

  // ── Game state ──────────────────────────────────────────────────────────────
  let board: Board;
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let dropInterval: number;
  let dropAccum: number;
  let gameOver: boolean;
  let paused = false;

  let skin: SkinId = options.skin ?? DEFAULT_SKIN;
  let lastEmitted: GameState | null = null;

  const status = (): GameStatus => (gameOver ? "gameover" : paused ? "paused" : "playing");

  // Tetris has no lives: the contract field is fixed at 1.
  const emit = () => {
    const nextState: GameState = { score, lives: 1, level, status: status() };
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === nextState.score &&
      prev.lives === nextState.lives &&
      prev.level === nextState.level &&
      prev.status === nextState.status
    ) {
      return;
    }
    lastEmitted = nextState;
    callbacks.onStateChange(nextState);
  };

  function spawn() {
    current = next;
    next = randomPiece();
    // A new piece that collides on arrival means the stack reached the top.
    if (collide(board, current.shape, current.x, current.y)) gameOver = true;
  }

  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      // Points use the level in force before this clear can raise it.
      score += (LINE_SCORES[cleared] ?? 0) * level;
      lines += cleared;
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = Math.max(
        MIN_DROP_INTERVAL,
        BASE_DROP_INTERVAL - (level - 1) * LEVEL_SPEEDUP,
      );
    }
    spawn();
  }

  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = BASE_DROP_INTERVAL;
    dropAccum = 0;
    gameOver = false;
    paused = false;
    next = randomPiece();
    spawn();
  }

  // ── Pause ───────────────────────────────────────────────────────────────────
  let lastTime: number | null = null;

  function pause() {
    if (paused || gameOver || destroyed) return;
    paused = true;
    emit();
  }

  function resume() {
    if (!paused || destroyed) return;
    paused = false;
    lastTime = null;
    emit();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();

    if (e.code === "KeyP") {
      if (paused) resume();
      else pause();
      return;
    }
    if (paused || gameOver) return;

    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(board, current);
        break;
      case "Space":
        hardDrop();
        break;
    }
  };

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let destroyed = false;

  const loop = (ts: number) => {
    if (destroyed) return;
    // dt in ms, capped at 50 to avoid a big fall after a tab blur.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
    lastTime = ts;

    if (!paused && !gameOver) {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
        else lockPiece();
      }
    }

    drawFrame(ctx, { board, current, next, score, lines, level, status: status(), palette: SKINS[skin] });
    emit();
    rafId = requestAnimationFrame(loop);
  };

  // ── Start ───────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);

  initGame();
  emit();
  rafId = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    setSkin(next: SkinId) {
      skin = next;
    },
    restart() {
      if (destroyed) return;
      lastTime = null;
      initGame();
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
