// Logical canvas: same 4:3 size as the other games, CSS scales it inside the CRT.
export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;
export const W = COLS * CELL; // 800
export const H = ROWS * CELL; // 600

// Zones by row (0 = top).
export const ROW_HUD = 0;
export const ROW_GOALS = 1;
export const ROW_RIVER_TOP = 2;
export const ROW_RIVER_BOTTOM = 7;
export const ROW_MEDIAN = 8;
export const ROW_ROAD_TOP = 9;
export const ROW_ROAD_BOTTOM = 13;
export const ROW_START = 14;

export const START_X = 9; // cell column of the frog on spawn (centered between mouths)

// Five mouths of two columns each, on ROW_GOALS.
export const MOUTH_STARTS = [1, 5, 9, 13, 17];
export const MOUTH_WIDTH = 2;

export const INITIAL_LIVES = 3;

export const JUMP_MS = 120;

// Lanes loop over COLS + 2 * LANE_MARGIN cells, so entities (at most 4 wide) are fully
// off-screen before they re-enter on the opposite side.
export const LANE_MARGIN = 4;
export const LANE_SPAN = COLS + 2 * LANE_MARGIN;

// Turtle group cycle: visible, then under water.
export const TURTLE_VISIBLE_MS = 3000;
export const TURTLE_SUBMERGED_MS = 1500;
export const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
export const TURTLE_WARNING_MS = 600; // blinking window before sinking

// Per level: +15 % speed, less time.
export const SPEED_PER_LEVEL = 1.15;
export const BASE_ROUND_MS = 15000;
export const ROUND_DEC_MS = 1000;
export const MIN_ROUND_MS = 8000;

// Score.
export const ROW_POINTS = 10; // first time a row is reached in a life
export const MOUTH_POINTS = 50;
export const TIME_BONUS_PER_SEC = 10;
export const ROUND_POINTS = 200;

// Forgiveness when a vehicle grazes the frog's cell (cells).
export const HIT_MARGIN = 0.15;

// Pause after a death or a mouth reached, before the frog respawns.
export const RESPAWN_MS = 600;

// Largest frame step the loop accepts.
export const MAX_DT = 50; // ms

// Pre-rendered sprites: margin around each one so its glow is not clipped.
export const SPRITE_PAD = 16;

// Phases of the frog's jump pre-rendered as sprites.
export const FROG_FRAMES = 4;
