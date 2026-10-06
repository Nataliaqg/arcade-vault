import {
  BASE_ROUND_MS,
  COLS,
  HIT_MARGIN,
  LANE_MARGIN,
  LANE_SPAN,
  MIN_ROUND_MS,
  MOUTH_POINTS,
  MOUTH_STARTS,
  MOUTH_WIDTH,
  ROUND_DEC_MS,
  ROW_GOALS,
  ROW_RIVER_BOTTOM,
  ROW_RIVER_TOP,
  ROW_ROAD_BOTTOM,
  ROW_ROAD_TOP,
  SPEED_PER_LEVEL,
  TIME_BONUS_PER_SEC,
  TURTLE_CYCLE_MS,
  TURTLE_VISIBLE_MS,
} from "./constants";

export type EntityKind = "car" | "truck" | "log" | "turtle";

export type Entity = {
  kind: EntityKind;
  col: number; // left edge, in cells (float)
  width: number; // in cells
  phase: number; // ms offset into the turtle cycle (turtles only)
  variant: number; // 0..2, picks a color in the renderer
};

export type Lane = {
  row: number;
  zone: "road" | "river";
  dir: 1 | -1;
  speed: number; // cells per second, already scaled by level
  entities: Entity[];
};

export type Dir = "up" | "down" | "left" | "right";

export const DIR_VECTORS: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

type LaneSpec = {
  row: number;
  zone: "road" | "river";
  kind: EntityKind;
  width: number;
  count: number;
  dir: 1 | -1;
  speed: number; // cells per second at level 1
};

// Entities are spread evenly over LANE_SPAN, so every lane keeps a gap of at least one
// cell between neighbours: span / count >= width + 1.
const LANE_SPECS: LaneSpec[] = [
  // River, from the top (row 2) to just above the median (row 7).
  { row: 2, zone: "river", kind: "log", width: 4, count: 3, dir: 1, speed: 1.6 },
  { row: 3, zone: "river", kind: "turtle", width: 2, count: 5, dir: -1, speed: 1.4 },
  { row: 4, zone: "river", kind: "log", width: 2, count: 5, dir: 1, speed: 2.2 },
  { row: 5, zone: "river", kind: "log", width: 4, count: 3, dir: -1, speed: 1.2 },
  { row: 6, zone: "river", kind: "turtle", width: 3, count: 4, dir: 1, speed: 1.8 },
  { row: 7, zone: "river", kind: "log", width: 3, count: 4, dir: -1, speed: 2.0 },
  // Road, from just below the median (row 9) to just above the start (row 13).
  { row: 9, zone: "road", kind: "car", width: 1, count: 4, dir: -1, speed: 2.4 },
  { row: 10, zone: "road", kind: "truck", width: 3, count: 2, dir: 1, speed: 1.6 },
  { row: 11, zone: "road", kind: "car", width: 1, count: 3, dir: -1, speed: 3.2 },
  { row: 12, zone: "road", kind: "car", width: 2, count: 3, dir: 1, speed: 2.2 },
  { row: 13, zone: "road", kind: "truck", width: 3, count: 3, dir: -1, speed: 1.4 },
];

export function speedFactor(level: number): number {
  return Math.pow(SPEED_PER_LEVEL, level - 1);
}

// Round time in ms: 15 s on level 1, one second less per level, never below 8 s.
export function roundTime(level: number): number {
  return Math.max(MIN_ROUND_MS, BASE_ROUND_MS - (level - 1) * ROUND_DEC_MS);
}

// Builds every lane for `level`. `rng` only shifts each lane's starting offset and
// picks color variants.
export function buildLanes(level: number, rng: () => number): Lane[] {
  const factor = speedFactor(level);
  return LANE_SPECS.map((spec) => {
    const pitch = LANE_SPAN / spec.count;
    const offset = rng() * pitch;
    const entities: Entity[] = Array.from({ length: spec.count }, (_, i) => ({
      kind: spec.kind,
      col: wrapCol(-LANE_MARGIN + offset + i * pitch),
      width: spec.width,
      // Turtles of the same group sink together; groups are staggered across the lane.
      phase: spec.kind === "turtle" ? Math.floor(rng() * TURTLE_CYCLE_MS) : 0,
      variant: Math.floor(rng() * 3),
    }));
    return {
      row: spec.row,
      zone: spec.zone,
      dir: spec.dir,
      speed: spec.speed * factor,
      entities,
    };
  });
}

// Maps a column into [-LANE_MARGIN, LANE_SPAN - LANE_MARGIN).
function wrapCol(col: number): number {
  const shifted = (((col + LANE_MARGIN) % LANE_SPAN) + LANE_SPAN) % LANE_SPAN;
  return shifted - LANE_MARGIN;
}

// Moves every entity. Mutates the lanes in place (hot path, once per frame).
export function advanceLanes(lanes: Lane[], dtMs: number): void {
  for (const lane of lanes) {
    const delta = lane.speed * lane.dir * (dtMs / 1000);
    for (const e of lane.entities) e.col = wrapCol(e.col + delta);
  }
}

export function laneAt(lanes: Lane[], row: number): Lane | undefined {
  return lanes.find((l) => l.row === row);
}

export function isRoadRow(row: number): boolean {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOTTOM;
}

export function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOTTOM;
}

// ms into the turtle cycle; the group is under water once it passes TURTLE_VISIBLE_MS.
export function turtleCycle(e: Entity, clockMs: number): number {
  return (clockMs + e.phase) % TURTLE_CYCLE_MS;
}

export function isSubmerged(e: Entity, clockMs: number): boolean {
  return e.kind === "turtle" && turtleCycle(e, clockMs) >= TURTLE_VISIBLE_MS;
}

// True when a vehicle overlaps the frog's cell. `x` is the frog's left edge in cells.
export function vehicleHit(lanes: Lane[], x: number, row: number): boolean {
  if (!isRoadRow(row)) return false;
  const lane = laneAt(lanes, row);
  if (!lane) return false;
  return lane.entities.some(
    (e) => e.col < x + 1 - HIT_MARGIN && e.col + e.width > x + HIT_MARGIN,
  );
}

// Lane that carries the frog (a log, or a turtle that is not under water), or null if
// the frog would fall in the water. The frog is supported when its center is over a
// visible entity.
export function supportAt(
  lanes: Lane[],
  x: number,
  row: number,
  clockMs: number,
): Lane | null {
  if (!isRiverRow(row)) return null;
  const lane = laneAt(lanes, row);
  if (!lane) return null;
  const center = x + 0.5;
  const carried = lane.entities.some(
    (e) => center >= e.col && center < e.col + e.width && !isSubmerged(e, clockMs),
  );
  return carried ? lane : null;
}

// Index of the mouth under the frog's center, or -1 if it is between mouths.
export function mouthAt(x: number): number {
  const center = x + 0.5;
  return MOUTH_STARTS.findIndex((s) => center >= s && center < s + MOUTH_WIDTH);
}

export type Landing =
  | { outcome: "safe" }
  | { outcome: "ride"; lane: Lane }
  | { outcome: "mouth"; index: number }
  | { outcome: "dead"; cause: "vehicle" | "water" | "mouth" };

// What happens to a frog standing at (x, row). Called when a jump ends and on every
// frame while the frog is idle, since the world keeps moving under it.
export function resolveCell(
  lanes: Lane[],
  x: number,
  row: number,
  clockMs: number,
  occupied: boolean[],
): Landing {
  if (row === ROW_GOALS) {
    const index = mouthAt(x);
    if (index < 0 || occupied[index]) return { outcome: "dead", cause: "mouth" };
    return { outcome: "mouth", index };
  }
  if (isRoadRow(row)) {
    return vehicleHit(lanes, x, row)
      ? { outcome: "dead", cause: "vehicle" }
      : { outcome: "safe" };
  }
  if (isRiverRow(row)) {
    const lane = supportAt(lanes, x, row, clockMs);
    return lane ? { outcome: "ride", lane } : { outcome: "dead", cause: "water" };
  }
  return { outcome: "safe" };
}

// True when the frog drifted past a side edge while riding.
export function isOffside(x: number): boolean {
  return x + 0.5 < 0 || x + 0.5 > COLS;
}

// Mouth bonus: base points plus remaining whole seconds.
export function mouthScore(remainingMs: number): number {
  return MOUTH_POINTS + Math.floor(remainingMs / 1000) * TIME_BONUS_PER_SEC;
}
