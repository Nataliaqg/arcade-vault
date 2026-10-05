import {
  COLS,
  ROWS,
  BASE_STEP_MS,
  STEP_DEC_MS,
  MIN_STEP_MS,
  FRUITS_PER_LEVEL,
  FRUIT_POINTS,
} from "./constants";

export type Cell = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";

export const DIR_VECTORS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export type StepResult =
  | { outcome: "moved"; body: Cell[] }
  | { outcome: "ate"; body: Cell[] }
  | { outcome: "dead" };

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function level(eaten: number): number {
  return Math.floor(eaten / FRUITS_PER_LEVEL) + 1;
}

export function stepMs(lvl: number): number {
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - (lvl - 1) * STEP_DEC_MS);
}

export function fruitScore(lvl: number): number {
  return FRUIT_POINTS * lvl;
}

// Initial snake: centered, head first, heading right.
export function initialBody(length: number): Cell[] {
  const headX = Math.floor(COLS / 2);
  const y = Math.floor(ROWS / 2);
  return Array.from({ length }, (_, i) => ({ x: headX - i, y }));
}

// A turn is valid unless it reverses `reference` or repeats it. `reference` is the
// last queued turn, or the current direction when the queue is empty.
export function isValidTurn(reference: Dir, next: Dir): boolean {
  return next !== reference && next !== OPPOSITES[reference];
}

// Advances one cell. Does not mutate `body`. Walls don't kill: leaving the grid wraps
// to the opposite edge. The tail is released before the body check unless the step
// eats the fruit, so entering the tail's cell is safe.
export function advance(body: Cell[], dir: Dir, fruit: Cell): StepResult {
  const v = DIR_VECTORS[dir];
  const head = {
    x: (body[0].x + v.x + COLS) % COLS,
    y: (body[0].y + v.y + ROWS) % ROWS,
  };

  const ate = sameCell(head, fruit);
  const kept = ate ? body : body.slice(0, -1);
  if (kept.some((c) => sameCell(c, head))) return { outcome: "dead" };

  return { outcome: ate ? "ate" : "moved", body: [head, ...kept] };
}

// Picks among the free cells (not by random retries), so it stays fast on a near-full
// grid. Returns null when the grid is full.
export function placeFruit(body: Cell[], rng: () => number): Cell | null {
  const taken = new Set(body.map((c) => c.y * COLS + c.x));
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(y * COLS + x)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(rng() * free.length)];
}
