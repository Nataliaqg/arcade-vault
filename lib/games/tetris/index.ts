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
import { drawFrame, HUD_LAYER_H, HUD_LAYER_W, type HudLayer, type RenderView } from "./renderer";
import { SKINS } from "./skins";
import { buildSprites, type TetrisSprites } from "./sprites";

// Keys the game uses; the page must not scroll or click buttons with them.
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
  "KeyP",
]);

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
  // Placeholders so the shared render view can be built; initGame() sets them.
  let board: Board = createBoard();
  let next: Piece = randomPiece();
  let current: Piece = next;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval: number;
  let dropAccum: number;
  let gameOver: boolean;
  let paused = false;

  let skin: SkinId = options.skin ?? DEFAULT_SKIN;

  // Sprites are built the first time a skin is used and freed in destroy().
  let spriteCache: Partial<Record<SkinId, TetrisSprites>> = {};
  const spritesFor = (id: SkinId): TetrisSprites => (spriteCache[id] ??= buildSprites(SKINS[id]));

  let lastEmitted: GameState | null = null;

  const status = (): GameStatus => (gameOver ? "gameover" : paused ? "paused" : "playing");

  // Tetris has no lives: the contract field is fixed at 1.
  const emit = () => {
    const nextStatus = status();
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === score &&
      prev.lives === 1 &&
      prev.level === level &&
      prev.status === nextStatus
    ) {
      return;
    }
    const nextState: GameState = { score, lives: 1, level, status: nextStatus };
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
    ensureRunning();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();

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

  initGame();

  const hud: HudLayer = {
    canvas: document.createElement("canvas"),
    signature: "",
  };
  hud.canvas.width = HUD_LAYER_W;
  hud.canvas.height = HUD_LAYER_H;

  // One view object, mutated each frame, so rendering allocates nothing.
  const view: RenderView = {
    board,
    current,
    next,
    score,
    lines,
    level,
    status: status(),
    palette: SKINS[skin],
    skin,
    sprites: spritesFor(skin),
    hud,
  };

  const render = () => {
    view.board = board;
    view.current = current;
    view.next = next;
    view.score = score;
    view.lines = lines;
    view.level = level;
    view.status = status();
    view.palette = SKINS[skin];
    view.skin = skin;
    view.sprites = spritesFor(skin);
    drawFrame(ctx, view);
  };

  const loop = (ts: number) => {
    rafId = 0;
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

    render();
    emit();
    // Paused or game over: the frame above (with its overlay) is the last one.
    // resume() and restart() start the loop again.
    if (!paused && !gameOver) rafId = requestAnimationFrame(loop);
  };

  function ensureRunning() {
    if (rafId !== 0 || destroyed) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  // If a font loads after the engine starts, the cached text used the fallback.
  void document.fonts?.ready.then(() => {
    if (destroyed) return;
    spriteCache = {};
    hud.signature = "";
    if (rafId === 0) render();
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);

  emit();
  rafId = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    setSkin(next: SkinId) {
      skin = next;
      if (rafId === 0 && !destroyed) render();
    },
    restart() {
      if (destroyed) return;
      lastTime = null;
      initGame();
      emit();
      ensureRunning();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      rafId = 0;
      spriteCache = {};
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
