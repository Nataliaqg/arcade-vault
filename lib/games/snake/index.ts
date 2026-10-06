import { DEFAULT_SKIN, type SkinId } from "../skins";
import type { GameCallbacks, GameEngine, GameOptions, GameState, GameStatus } from "../types";
import { COUNTDOWN_MS, H, INITIAL_LENGTH, MAX_DT, W } from "./constants";
import { countdownDigit, draw, HUD_LAYER_H, type HudLayer, type Phase, type RenderView } from "./renderer";
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
import { SKINS } from "./skins";
import {
  buildSprites,
  FRUIT_SPRITES,
  loadFruitSheet,
  SPRITESHEET_SRC,
  type FruitSheet,
  type SnakeSprites,
} from "./sprites";

// Keys the game uses; the page must not scroll or click buttons with them.
const GAME_KEYS = new Set([
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
]);

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
  options: GameOptions = {},
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

  let skin: SkinId = options.skin ?? DEFAULT_SKIN;

  // Sprites are built the first time a skin is used and freed in destroy().
  let spriteCache: Partial<Record<SkinId, SnakeSprites>> = {};
  const spritesFor = (id: SkinId): SnakeSprites => (spriteCache[id] ??= buildSprites(SKINS[id]));
  let lastEmitted: GameState | null = null;

  // Loading counts as "playing": the contract has no loading status.
  const status = (): GameStatus =>
    phase === "won" || phase === "lost" ? "gameover" : paused ? "paused" : "playing";

  const emit = () => {
    const nextStatus = status();
    const prev = lastEmitted;
    if (prev && prev.score === score && prev.level === level && prev.status === nextStatus) {
      return;
    }
    const nextState: GameState = { score, lives: LIVES, level, status: nextStatus };
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
    // Paused while loading: the loop is stopped, so show the new phase now.
    if (rafId === 0) render();
  });

  // The pixel font comes from next/font as a CSS variable on <html>; read once.
  const fontFamily = (() => {
    const family = getComputedStyle(canvas).getPropertyValue("--font-press-start").trim();
    return family ? `${family}, monospace` : "monospace";
  })();

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
    emit();
    ensureRunning();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();

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

  // The step interval only changes with the level.
  let intervalLevel = 0;
  let interval = 0;

  function update(dt: number) {
    stepAccum += dt;
    if (intervalLevel !== level) {
      intervalLevel = level;
      interval = stepMs(level);
    }
    // dt is capped below the minimum interval, so this runs at most once per frame.
    if (stepAccum >= interval) {
      stepAccum -= interval;
      step();
    }
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let destroyed = false;

  const hud: HudLayer = { canvas: document.createElement("canvas"), signature: "" };
  hud.canvas.width = W;
  hud.canvas.height = HUD_LAYER_H;

  // One view object, mutated each frame, so rendering allocates nothing.
  const view: RenderView = {
    phase,
    paused,
    score,
    level,
    countdownMs,
    body,
    dir,
    fruit,
    sheet,
    fontFamily,
    palette: SKINS[skin],
    skin,
    sprites: spritesFor(skin),
    hud,
  };

  // The snake moves cell by cell with no in-between animation, so most frames would
  // repaint the same picture. What was last drawn; a frame is skipped if nothing changed.
  const drawn: {
    body: Cell[] | null;
    dir: Dir;
    fruit: RenderView["fruit"];
    phase: Phase;
    paused: boolean;
    digit: number;
    skin: SkinId;
    sheet: FruitSheet["status"];
  } = { body: null, dir, fruit, phase, paused, digit: 0, skin, sheet: sheet.status };

  const render = (force = false) => {
    const digit = phase === "countdown" ? countdownDigit(countdownMs) : 0;
    if (
      !force &&
      drawn.body === body &&
      drawn.dir === dir &&
      drawn.fruit === fruit &&
      drawn.phase === phase &&
      drawn.paused === paused &&
      drawn.digit === digit &&
      drawn.skin === skin &&
      drawn.sheet === sheet.status
    ) {
      return;
    }
    drawn.body = body;
    drawn.dir = dir;
    drawn.fruit = fruit;
    drawn.phase = phase;
    drawn.paused = paused;
    drawn.digit = digit;
    drawn.skin = skin;
    drawn.sheet = sheet.status;

    view.phase = phase;
    view.paused = paused;
    view.score = score;
    view.level = level;
    view.countdownMs = countdownMs;
    view.body = body;
    view.dir = dir;
    view.fruit = fruit;
    view.palette = SKINS[skin];
    view.skin = skin;
    view.sprites = spritesFor(skin);
    draw(ctx, view);
  };

  // The game advances only while playing, counting down or loading.
  const running = () => !paused && phase !== "won" && phase !== "lost";

  const loop = (ts: number) => {
    rafId = 0;
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

    render();
    emit();
    // Paused or game over: the frame above (with its overlay) is the last one.
    // resume() and restart() start the loop again.
    if (running()) rafId = requestAnimationFrame(loop);
  };

  const ensureRunning = () => {
    if (rafId !== 0 || destroyed) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  };

  // If the pixel font loads after the engine starts, the cached HUD used the fallback.
  void document.fonts?.ready.then(() => {
    if (destroyed) return;
    hud.signature = "";
    render(true);
  });

  // ── Start ───────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);

  initGame();
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
      // If the sheet is still loading, keep showing CARGANDO….
      if (sheet.status === "loading") phase = "loading";
      else startCountdown();
      emit();
      ensureRunning();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      rafId = 0;
      sheet.dispose();
      spriteCache = {};
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    },
  };
}
