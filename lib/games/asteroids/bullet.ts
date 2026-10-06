import type { AsteroidsPalette } from "./skins";
import { H, W, wrap } from "./utils";

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    const SPEED = 520;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, pal: AsteroidsPalette) {
    paintBullet(ctx, pal, this.x, this.y, this.radius);
  }
}

export function paintBullet(
  ctx: CanvasRenderingContext2D,
  pal: AsteroidsPalette,
  x: number,
  y: number,
  radius: number,
) {
  ctx.fillStyle = pal.bullet;
  ctx.shadowColor = pal.bullet;
  ctx.shadowBlur = 8 * pal.glow;
  if (pal.pixel) {
    const side = radius * 2 + 1;
    ctx.fillRect(x - side / 2, y - side / 2, side, side);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}
