import {
  BASE_BALL_VX,
  BASE_BALL_VY,
  W,
  type BlockColor,
} from "./constants";

export type Rect = { x: number; y: number; w: number; h: number };
export type Paddle = Rect;
export type Ball = Rect & { vx: number; vy: number };
export type Block = Rect & { color: BlockColor; alive: boolean };
export type Explosion = Rect & { color: BlockColor; elapsed: number };

export function collideAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Puts the ball on top of the paddle, moving up-right at the level's speed. */
export function placeBall(ball: Ball, paddle: Paddle, speed: number) {
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * speed;
  ball.vy = BASE_BALL_VY * speed;
}

/** Bounces off the left, right and top walls. */
export function bounceWalls(ball: Ball) {
  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x + ball.w >= W) {
    ball.x = W - ball.w;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
  }
}

/** Pure vertical bounce on the paddle (no angle change). Returns true on hit. */
export function bouncePaddle(ball: Ball, paddle: Paddle): boolean {
  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + 8
  ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs(ball.vy);
    return true;
  }
  return false;
}

/**
 * Breaks the first live block the ball overlaps (one per frame) and inverts
 * `vy`. Returns the broken block, or null when nothing was hit.
 */
export function collideBlocks(ball: Ball, blocks: Block[]): Block | null {
  for (const block of blocks) {
    if (!block.alive) continue;
    if (collideAABB(ball, block)) {
      block.alive = false;
      ball.vy = -ball.vy;
      return block;
    }
  }
  return null;
}
