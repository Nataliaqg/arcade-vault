import { DEFAULT_SKIN, type SkinId } from "../skins";
import type {
  GameCallbacks,
  GameEngine,
  GameOptions,
  GameState,
  GameStatus,
} from "../types";
import {
  COLS,
  H,
  INITIAL_LIVES,
  JUMP_MS,
  MAX_DT,
  MOUTH_STARTS,
  RESPAWN_MS,
  ROUND_POINTS,
  ROW_GOALS,
  ROW_POINTS,
  ROW_START,
  START_X,
  W,
} from "./constants";
import {
  advanceLanes,
  buildLanes,
  DIR_VECTORS,
  isOffside,
  isRiverRow,
  mouthScore,
  resolveCell,
  roundTime,
  type Dir,
  type Lane,
} from "./frogger";
import { draw, HUD_LAYER_H, type HudLayer, type RenderView } from "./renderer";
import { SKINS } from "./skins";
import { buildSprites, type FroggerSprites } from "./sprites";

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

type Phase = "playing" | "respawn" | "over";

type Jump = {
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
  t: number;
};

export function createFrogger(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options: GameOptions = {},
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  canvas.width = W;
  canvas.height = H;

  // ── Game state ──────────────────────────────────────────────────────────────
  let lanes: Lane[] = [];
  let occupied: boolean[] = [];
  let phase: Phase = "playing";
  let paused = false;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let clockMs = 0;
  let timeMs = 0;

  // Frog: x is a float (it rides logs); row is an integer between jumps.
  let frogX = START_X;
  let frogRow = ROW_START;
  let facing: Dir = "up";
  let jump: Jump | null = null;
  let pending: Dir | null = null;
  let topRow = ROW_START; // highest row reached in this life, for the row bonus
  let dead = false;
  let hidden = false;

  // What the respawn timer leads to.
  let respawnMs = 0;
  let afterRespawn: "continue" | "over" = "continue";

  let skin: SkinId = options.skin ?? DEFAULT_SKIN;

  // Sprites are built the first time a skin is used and freed in destroy().
  let spriteCache: Partial<Record<SkinId, FroggerSprites>> = {};
  const spritesFor = (id: SkinId): FroggerSprites =>
    (spriteCache[id] ??= buildSprites(SKINS[id]));
  let lastEmitted: GameState | null = null;
  let lastTime: number | null = null;

  const status = (): GameStatus =>
    phase === "over" ? "gameover" : paused ? "paused" : "playing";

  const emit = () => {
    const nextStatus = status();
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === score &&
      prev.lives === lives &&
      prev.level === level &&
      prev.status === nextStatus
    ) {
      return;
    }
    const nextState: GameState = { score, lives, level, status: nextStatus };
    lastEmitted = nextState;
    callbacks.onStateChange(nextState);
  };

  // The pixel font comes from next/font as a CSS variable on <html>; read once.
  const fontFamily = (() => {
    const family = getComputedStyle(canvas)
      .getPropertyValue("--font-press-start")
      .trim();
    return family ? `${family}, monospace` : "monospace";
  })();

  // The round length only changes with the level.
  let roundMs = roundTime(level);

  function placeFrogAtStart() {
    frogX = START_X;
    frogRow = ROW_START;
    facing = "up";
    jump = null;
    pending = null;
    topRow = ROW_START;
    dead = false;
    hidden = false;
    timeMs = roundMs;
  }

  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    roundMs = roundTime(level);
    clockMs = 0;
    phase = "playing";
    paused = false;
    afterRespawn = "continue";
    respawnMs = 0;
    occupied = MOUTH_STARTS.map(() => false);
    lanes = buildLanes(level, Math.random);
    placeFrogAtStart();
  }

  // ── Death, mouths and rounds ────────────────────────────────────────────────
  function kill() {
    lives = Math.max(0, lives - 1);
    dead = true;
    jump = null;
    pending = null;
    phase = "respawn";
    respawnMs = RESPAWN_MS;
    afterRespawn = lives === 0 ? "over" : "continue";
  }

  function reachMouth(index: number) {
    occupied[index] = true;
    score += mouthScore(timeMs);
    hidden = true;
    phase = "respawn";
    respawnMs = RESPAWN_MS;
    afterRespawn = "continue";
  }

  function finishRespawn() {
    if (afterRespawn === "over") {
      phase = "over";
      return;
    }
    if (occupied.every(Boolean)) {
      score += ROUND_POINTS;
      level++;
      roundMs = roundTime(level);
      occupied = MOUTH_STARTS.map(() => false);
      lanes = buildLanes(level, Math.random);
    }
    placeFrogAtStart();
    phase = "playing";
  }

  // ── Frog movement ───────────────────────────────────────────────────────────
  function startJump(dir: Dir) {
    const v = DIR_VECTORS[dir];
    const toRow = frogRow + v.y;
    const toX = frogX + v.x;
    // Can't leave the field: the HUD row above the mouths and the sides are walls.
    if (toRow < ROW_GOALS || toRow > ROW_START || toX < 0 || toX > COLS - 1)
      return;
    facing = dir;
    jump = { fromX: frogX, fromRow: frogRow, toX, toRow, t: 0 };
  }

  function land(j: Jump) {
    jump = null;
    frogRow = j.toRow;
    // On solid ground the frog snaps to the grid; on the river it keeps its offset.
    frogX = isRiverRow(frogRow)
      ? j.toX
      : Math.min(COLS - 1, Math.max(0, Math.round(j.toX)));

    if (frogRow < topRow) {
      score += (topRow - frogRow) * ROW_POINTS;
      topRow = frogRow;
    }
    settle();
  }

  // Checks what is under the frog. Returns true if the frog is dead or has finished.
  function settle(dtMs = 0): boolean {
    const landing = resolveCell(lanes, frogX, frogRow, clockMs, occupied);
    if (landing.outcome === "dead") {
      kill();
      return true;
    }
    if (landing.outcome === "mouth") {
      reachMouth(landing.index);
      return true;
    }
    if (landing.outcome === "ride") {
      frogX += landing.lane.speed * landing.lane.dir * (dtMs / 1000);
      if (isOffside(frogX)) {
        kill();
        return true;
      }
    }
    return false;
  }

  // ── Pause ───────────────────────────────────────────────────────────────────
  function pause() {
    if (paused || phase === "over" || destroyed) return;
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
    if (e.repeat) return;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (paused) resume();
      else pause();
      return;
    }

    const dir = KEY_DIRS[e.code];
    if (!dir || paused || phase !== "playing") return;
    // One hop can be buffered while another is in the air.
    pending = dir;
  };

  const onBlur = () => {
    pending = null;
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    clockMs += dt;
    advanceLanes(lanes, dt);

    if (phase === "respawn") {
      respawnMs -= dt;
      if (respawnMs <= 0) finishRespawn();
      return;
    }

    timeMs -= dt;
    if (timeMs <= 0) {
      timeMs = 0;
      kill();
      return;
    }

    if (jump) {
      jump.t += dt / JUMP_MS;
      if (jump.t >= 1) land(jump);
      return;
    }

    if (settle(dt)) return;

    if (pending) {
      const dir = pending;
      pending = null;
      startJump(dir);
    }
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let destroyed = false;

  const hud: HudLayer = {
    canvas: document.createElement("canvas"),
    signature: "",
  };
  hud.canvas.width = W;
  hud.canvas.height = HUD_LAYER_H;

  // One view object, mutated each frame, so rendering allocates nothing.
  const view: RenderView = {
    paused: false,
    over: false,
    score: 0,
    level: 1,
    lives: 0,
    timeMs: 0,
    roundMs: 0,
    clockMs: 0,
    lanes,
    frog: { x: 0, y: 0, facing: "up", jump: 0, dead: false, hidden: false },
    occupied,
    fontFamily,
    palette: SKINS[skin],
    skin,
    sprites: spritesFor(skin),
    hud,
  };

  const render = () => {
    const t = jump ? Math.min(1, jump.t) : 0;
    view.paused = paused;
    view.over = phase === "over";
    view.score = score;
    view.level = level;
    view.lives = lives;
    view.timeMs = timeMs;
    view.roundMs = roundMs;
    view.clockMs = clockMs;
    view.lanes = lanes;
    view.occupied = occupied;
    view.palette = SKINS[skin];
    view.skin = skin;
    view.sprites = spritesFor(skin);
    const f = view.frog;
    f.x = jump ? jump.fromX + (jump.toX - jump.fromX) * t : frogX;
    f.y = jump ? jump.fromRow + (jump.toRow - jump.fromRow) * t : frogRow;
    f.facing = facing;
    f.jump = t;
    f.dead = dead;
    f.hidden = hidden;
    draw(ctx, view);
  };

  const loop = (ts: number) => {
    rafId = 0;
    if (destroyed) return;
    // dt in ms, capped so a tab blur can't teleport the world.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;

    if (!paused && phase !== "over") update(dt);

    render();
    emit();
    // Paused or game over: the frame above (with its overlay) is the last one.
    // resume() and restart() start the loop again.
    if (!paused && phase !== "over") rafId = requestAnimationFrame(loop);
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
    if (rafId === 0) render();
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
      initGame();
      emit();
      ensureRunning();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      spriteCache = {};
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    },
  };
}
