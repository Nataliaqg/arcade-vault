import type { Asteroid } from "./asteroid";
import { paintBullet } from "./bullet";
import { paintShipBody, SHIP_EXTENT } from "./ship";
import type { AsteroidsPalette } from "./skins";

// Pre-rendered glow for skins with `glow > 0`. Built once per skin and composed
// with drawImage, so no shadowBlur runs per entity per frame. Skins without glow
// keep drawing vectors: they are already cheap and stay pixel-identical.
export type AsteroidsSprites = {
  ship: HTMLCanvasElement; // hull centered, nose along +x (no flame: it changes every frame)
  bullet: HTMLCanvasElement; // centered
  asteroids: WeakMap<Asteroid, HTMLCanvasElement>; // one per rock: each has its own polygon
};

/** Margin so the glow is not clipped: larger than the max shadowBlur (10). */
export const SPRITE_PAD = 16;

// Bullets always have radius 2 (Bullet.radius).
const BULLET_RADIUS = 2;

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  // Draw around the center so composing only needs -size/2.
  ctx.translate(size / 2, size / 2);
  return [canvas, ctx];
}

const spriteSize = (extent: number, p: AsteroidsPalette) =>
  2 * Math.ceil(extent + p.lineWidth + SPRITE_PAD);

export function buildSprites(p: AsteroidsPalette): AsteroidsSprites {
  const [ship, sc] = makeCanvas(spriteSize(SHIP_EXTENT, p));
  paintShipBody(sc, p);

  const [bullet, bc] = makeCanvas(spriteSize(BULLET_RADIUS + 1, p));
  paintBullet(bc, p, 0, 0, BULLET_RADIUS);

  return { ship, bullet, asteroids: new WeakMap() };
}

// Made on first draw of each rock; dropped with it (WeakMap).
export function asteroidSprite(
  s: AsteroidsSprites,
  p: AsteroidsPalette,
  a: Asteroid,
): HTMLCanvasElement {
  let sprite = s.asteroids.get(a);
  if (!sprite) {
    const [canvas, c] = makeCanvas(spriteSize(a.radius, p));
    a.trace(c, p);
    s.asteroids.set(a, canvas);
    sprite = canvas;
  }
  return sprite;
}
