import type { GameCallbacks, GameEngine, GameState, GameStatus } from "../types";
import { COUNTDOWN_MS, H, INITIAL_LENGTH, MAX_DT, W } from "./constants";
import { draw, type Phase } from "./renderer";
import {
  advance,
  fruitScore,
  initialBody,
  isValidTurn,
  level as levelFor,
  placeFruit,
  stepMs,
  type Cell,
  type Dir,
} from "./snake";
import { FRUIT_SPRITES, loadFruitSheet, SPRITESHEET_SRC } from "./sprites";

// Keys the game uses; the page must not scroll or click buttons with them.
const GAME_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyP",
  "Escape",
];

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const MAX_QUEUED_TURNS = 2;
const LIVES = 1; // the game has no lives; the contract field stays fixed

export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  canvas.width = W;
  canvas.height = H;

  // ── Game state ──────────────────────────────────────────────────────────────
  let body: Cell[] = [];
  let dir: Dir = "right";
  let turnQueue: Dir[] = [];
  let fruit: { cell: Cell; sprite: number } | null = null;
  let phase: Phase = "loading";
  let paused = false;
  let score = 0;
  let level = 1;
  let eaten = 0;
  let stepAccum = 0;
  let countdownMs = 0;

  let lastEmitted: GameState | null = null;

  // Loading counts as "playing": the contract has no loading status.
  const status = (): GameStatus =>
    phase === "won" || phase === "lost" ? "gameover" : paused ? "paused" : "playing";

  const emit = () => {
    const nextState: GameState = { score, lives: LIVES, level, status: status() };
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

  function spawnFruit() {
    const cell = placeFruit(body, Math.random);
    // No free cell left: the grid is full.
    if (!cell) {
      fruit = null;
      phase = "won";
      return;
    }
    fruit = { cell, sprite: Math.floor(Math.random() * FRUIT_SPRITES.length) };
  }

  function startCountdown() {
    phase = "countdown";
    countdownMs = COUNTDOWN_MS;
    stepAccum = 0;
  }

  function initGame() {
    body = initialBody(INITIAL_LENGTH);
    dir = "right";
    turnQueue = [];
    score = 0;
    level = 1;
    eaten = 0;
    stepAccum = 0;
    paused = false;
    spawnFruit();
  }

  // ── Spritesheet ─────────────────────────────────────────────────────────────
  // Until it settles the canvas shows "CARGANDO…", then the countdown runs; on error
  // the game still starts and draws flat circles.
  const sheet = loadFruitSheet(SPRITESHEET_SRC, () => {
    if (destroyed) return;
    if (phase === "loading") startCountdown();
    lastTime = null;
  });

  // The pixel font comes from next/font as a CSS variable on <html>.
  const fontFamily = () => {
    const family = getComputedStyle(canvas).getPropertyValue("--font-press-start").trim();
    return family ? `${family}, monospace` : "monospace";
  };

  // ── Pause ───────────────────────────────────────────────────────────────────
  let lastTime: number | null = null;

  function pause() {
    if (paused || phase === "won" || phase === "lost" || destroyed) return;
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

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (paused) resume();
      else pause();
      return;
    }

    const next = KEY_DIRS[e.code];
    // Turns can be queued during the countdown so the first move is already chosen.
    if (!next || paused || (phase !== "playing" && phase !== "countdown")) return;
    // Each turn is checked against the last queued one, so two quick turns inside
    // one step can never add up to a 180° reversal.
    const reference = turnQueue.length > 0 ? turnQueue[turnQueue.length - 1] : dir;
    if (turnQueue.length < MAX_QUEUED_TURNS && isValidTurn(reference, next)) {
      turnQueue.push(next);
    }
  };

  const onBlur = () => {
    turnQueue = [];
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  function step() {
    const next = turnQueue.shift();
    if (next) dir = next;

    // `fruit` is only null once the phase is already "won".
    const result = advance(body, dir, fruit!.cell);
    if (result.outcome === "dead") {
      phase = "lost";
      return;
    }
    body = result.body;
    if (result.outcome === "ate") {
      score += fruitScore(level);
      eaten++;
      level = levelFor(eaten);
      spawnFruit();
    }
  }

  function update(dt: number) {
    stepAccum += dt;
    const interval = stepMs(level);
    // dt is capped below the minimum interval, so this runs at most once per frame.
    if (stepAccum >= interval) {
      stepAccum -= interval;
      step();
    }
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let destroyed = false;

  const loop = (ts: number) => {
    if (destroyed) return;
    // dt in ms, capped so a tab blur can't make the snake jump several cells.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;

    if (phase === "countdown" && !paused) {
      countdownMs -= dt;
      if (countdownMs <= 0) {
        phase = "playing";
        stepAccum = 0;
      }
    } else if (phase === "playing" && !paused) {
      update(dt);
    }

    draw(ctx, {
      phase,
      paused,
      score,
      level,
      countdownMs,
      body,
      dir,
      fruit,
      sheet,
      fontFamily: fontFamily(),
    });
    emit();
    rafId = requestAnimationFrame(loop);
  };

  // ── Start ───────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);

  initGame();
  emit();
  rafId = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    restart() {
      if (destroyed) return;
      lastTime = null;
      initGame();
      // If the sheet is still loading, keep showing CARGANDO….
      if (sheet.status === "loading") phase = "loading";
      else startCountdown();
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      sheet.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    },
  };
}
