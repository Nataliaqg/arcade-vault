import { DEFAULT_SKIN, type SkinId } from "../skins";
import type { GameCallbacks, GameEngine, GameOptions, GameState, GameStatus } from "../types";
import { Asteroid } from "./asteroid";
import { Bullet } from "./bullet";
import { POINTS, POWERUP_DROP_CHANCE, POWERUP_DURATION } from "./constants";
import { Particle } from "./particle";
import { PowerUp } from "./powerup";
import { Ship } from "./ship";
import { SKINS } from "./skins";
import { H, W, dist, rand, type Keys } from "./utils";

// Keys the game uses; the page must not scroll or click buttons with them.
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

type Phase = "playing" | "dead" | "gameover";

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options: GameOptions = {},
): GameEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  canvas.width = W;
  canvas.height = H;

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};

  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    keys[e.code] = false;
  };
  // Avoid stuck keys when the window loses focus.
  const onBlur = () => {
    for (const code of Object.keys(keys)) keys[code] = false;
  };

  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  };

  // ── Game state ──────────────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let phase: Phase;
  let deadTimer = 0;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;
  let paused = false;

  let skin: SkinId = options.skin ?? DEFAULT_SKIN;
  let lastEmitted: GameState | null = null;

  const status = (): GameStatus =>
    phase === "gameover" ? "gameover" : paused ? "paused" : "playing";

  const emit = () => {
    const next: GameState = { score, lives, level, status: status() };
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === next.score &&
      prev.lives === next.lives &&
      prev.level === next.level &&
      prev.status === next.status
    ) {
      return;
    }
    lastEmitted = next;
    callbacks.onStateChange(next);
  };

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    phase = "playing";
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
    } else {
      phase = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "gameover") {
      if (pressed("Space")) initGame();
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }

    // Shoot
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(c: CanvasRenderingContext2D, x: number, y: number) {
    const pal = SKINS[skin];
    c.save();
    c.translate(x, y);
    c.rotate(-Math.PI / 2);
    c.strokeStyle = pal.lifeIcon;
    c.lineWidth = pal.pixel ? 2 : 1.2;
    c.lineJoin = pal.pixel ? "miter" : "round";
    c.shadowColor = pal.lifeIcon;
    c.shadowBlur = 6 * pal.glow;
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-6, -5);
    c.lineTo(-3, 0);
    c.lineTo(-6, 5);
    c.closePath();
    c.stroke();
    c.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D) {
    const pal = SKINS[skin];
    c.shadowBlur = 0;
    c.fillStyle = pal.hudText;
    c.font = "15px monospace";
    c.textBaseline = "alphabetic";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(c, W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = pal.hudBonus;
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function drawOverlay(c: CanvasRenderingContext2D, title: string, sub: string) {
    const pal = SKINS[skin];
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = pal.overlayTitle;
    c.shadowColor = pal.overlayTitle;
    c.shadowBlur = 16 * pal.glow;
    c.font = "bold 46px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.shadowBlur = 0;
    c.font = "18px monospace";
    c.fillStyle = pal.overlaySub;
    c.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw(c: CanvasRenderingContext2D) {
    const pal = SKINS[skin];
    c.fillStyle = pal.bg;
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(c, pal));
    asteroids.forEach((a) => a.draw(c, pal));
    powerUps.forEach((p) => p.draw(c, pal));
    bullets.forEach((b) => b.draw(c, pal));
    ship.draw(c, pal);

    drawHUD(c);

    if (phase === "gameover") {
      drawOverlay(c, "GAME OVER", `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
    }
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastTime: number | null = null;
  let destroyed = false;

  const loop = (ts: number) => {
    if (destroyed) return;
    // dt capped at 50ms to avoid a spiral of death after a tab blur.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!paused) update(dt);
    draw(ctx);
    emit();
    rafId = requestAnimationFrame(loop);
  };

  // ── Start ───────────────────────────────────────────────────────────────────
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  initGame();
  emit();
  rafId = requestAnimationFrame(loop);

  return {
    setSkin(next: SkinId) {
      skin = next;
    },
    pause() {
      if (paused || destroyed) return;
      paused = true;
      emit();
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      // Drop presses made while paused so a queued shot does not fire.
      for (const code of Object.keys(justPressed)) justPressed[code] = false;
      lastTime = null;
      emit();
    },
    restart() {
      if (destroyed) return;
      paused = false;
      for (const code of Object.keys(justPressed)) justPressed[code] = false;
      lastTime = null;
      initGame();
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
