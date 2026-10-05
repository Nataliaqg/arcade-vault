import { DEFAULT_SKIN, type SkinId } from "../skins";
import type { GameCallbacks, GameEngine, GameOptions, GameState, GameStatus } from "../types";
import {
  BALL_SIZE,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  H,
  INITIAL_LIVES,
  LAST_LEVEL,
  MAX_DT,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  W,
} from "./constants";
import { LEVELS } from "./levels";
import {
  bounceWalls,
  bouncePaddle,
  collideBlocks,
  placeBall,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from "./physics";
import { draw, type Phase } from "./renderer";
import { SKINS } from "./skins";
import { EXPLOSION_DURATION, loadSpritesheet, SPRITESHEET_SRC } from "./sprites";

// Keys the game uses; the page must not scroll or click buttons with them.
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "KeyP", "Escape"];

export function createArkanoid(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options: GameOptions = {},
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  canvas.width = W;
  canvas.height = H;

  // ── Game state ──────────────────────────────────────────────────────────────
  const paddle: Paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let phase: Phase = "loading";
  let paused = false;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;

  const keys = { ArrowLeft: false, ArrowRight: false };

  let skin: SkinId = options.skin ?? DEFAULT_SKIN;
  let lastEmitted: GameState | null = null;

  // Loading counts as "playing": the contract has no loading status.
  const status = (): GameStatus =>
    phase === "won" || phase === "lost" ? "gameover" : paused ? "paused" : "playing";

  const emit = () => {
    const nextState: GameState = { score, lives, level, status: status() };
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

  function loadLevel(n: number) {
    level = n;
    const def = LEVELS[n - 1];
    blocks = def.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    placeBall(ball, paddle, def.speed);
  }

  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    paused = false;
    paddle.x = (W - paddle.w) / 2;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    loadLevel(1);
  }

  // ── Spritesheet ─────────────────────────────────────────────────────────────
  // Until it settles the canvas shows "CARGANDO…"; on error the game still
  // starts and draws flat rectangles.
  const sheet = loadSpritesheet(SPRITESHEET_SRC, () => {
    if (destroyed) return;
    phase = "playing";
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
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
  };

  const onBlur = () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (paused || phase === "won" || phase === "lost") return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    bounceWalls(ball);
    bouncePaddle(ball, paddle);

    const broken = collideBlocks(ball, blocks);
    if (broken) {
      explosions.push({
        x: broken.x,
        y: broken.y,
        w: broken.w,
        h: broken.h,
        color: broken.color,
        elapsed: 0,
      });
      score += BLOCK_POINTS;
      if (blocks.every((b) => !b.alive)) {
        if (level < LAST_LEVEL) loadLevel(level + 1);
        else phase = "won";
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        phase = "lost";
      } else {
        placeBall(ball, paddle, LEVELS[level - 1].speed);
      }
    }
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let destroyed = false;

  const loop = (ts: number) => {
    if (destroyed) return;
    // dt in seconds, capped so a tab blur can't make the ball tunnel.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;

    if (phase === "playing" && !paused) update(dt);

    draw(ctx, {
      phase,
      paused,
      score,
      level,
      lives,
      blocks,
      explosions,
      paddle,
      ball,
      sheet,
      fontFamily: fontFamily(),
      palette: SKINS[skin],
    });
    emit();
    rafId = requestAnimationFrame(loop);
  };

  // ── Start ───────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onMouseMove);

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
      // If the sheet is still loading, keep showing CARGANDO….
      phase = sheet.status === "loading" ? "loading" : "playing";
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      sheet.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
