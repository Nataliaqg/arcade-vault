import { Bullet } from "./bullet";
import { TRIPLE_SPREAD } from "./constants";
import { H, W, rand, wrap, type Keys } from "./utils";
import type { AsteroidsPalette } from "./skins";

export class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  tripleShot = 0;
  dead = false;

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  /** False while dead or during the blink-off phase of the respawn shield. */
  visible(): boolean {
    if (this.dead) return false;
    // Blink while invincible after respawn
    return !(this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0);
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    if (!this.visible()) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    paintShipBody(ctx, pal);
    this.traceFlame(ctx, pal);
    ctx.restore();
  }

  /** Thruster flame around the origin (nose along +x). Changes every frame. */
  traceFlame(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    if (this.thrusting && Math.random() > 0.35) {
      ctx.lineWidth = pal.lineWidth;
      ctx.lineJoin = pal.pixel ? "miter" : "round";
      ctx.shadowBlur = 10 * pal.glow;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = pal.shipFlame;
      ctx.shadowColor = pal.shipFlame;
      ctx.stroke();
    }
  }
}

/** Furthest point of the hull from its origin (the nose). */
export const SHIP_EXTENT = 20;

/** Ship hull around the origin, nose along +x. */
export function paintShipBody(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
  ctx.strokeStyle = pal.ship;
  ctx.lineWidth = pal.lineWidth;
  ctx.lineJoin = pal.pixel ? "miter" : "round";
  ctx.shadowColor = pal.ship;
  ctx.shadowBlur = 10 * pal.glow;

  // Classic silhouette: triangle with a rear notch
  ctx.beginPath();
  ctx.moveTo(SHIP_EXTENT, 0); // nose
  ctx.lineTo(-12, -9); // left wing
  ctx.lineTo(-7, 0); // rear notch
  ctx.lineTo(-12, 9); // right wing
  ctx.closePath();
  ctx.stroke();
}
