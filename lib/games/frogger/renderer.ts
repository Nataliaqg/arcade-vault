import {
  CELL,
  FROG_FRAMES,
  H,
  MOUTH_STARTS,
  MOUTH_WIDTH,
  ROW_GOALS,
  ROW_MEDIAN,
  ROW_RIVER_BOTTOM,
  ROW_RIVER_TOP,
  ROW_ROAD_BOTTOM,
  ROW_ROAD_TOP,
  ROW_START,
  SPRITE_PAD,
  TURTLE_VISIBLE_MS,
  TURTLE_WARNING_MS,
  W,
} from "./constants";
import { turtleCycle, type Dir, type Entity, type Lane } from "./frogger";
import { carSprite, truckSprite, type FroggerSprites } from "./sprites";
import type { SkinId } from "../skins";
import type { FroggerPalette } from "./skins";

// Everything the renderer needs for one frame; the engine owns the state.
export type RenderView = {
  paused: boolean;
  over: boolean;
  score: number;
  level: number;
  lives: number;
  timeMs: number; // time left in the round
  roundMs: number; // total time of the round
  clockMs: number; // free-running clock for turtles and water
  lanes: Lane[];
  frog: {
    x: number; // left edge in cells (float while riding or jumping)
    y: number; // row in cells (float while jumping)
    facing: Dir;
    jump: number; // 0..1 progress of the current jump, 0 when idle
    dead: boolean;
    hidden: boolean; // true while the frog has just settled into a mouth
  };
  occupied: boolean[];
  /** CSS font-family string, already ending in a monospace fallback. */
  fontFamily: string;
  palette: FroggerPalette;
  skin: SkinId;
  sprites: FroggerSprites;
  hud: HudLayer;
};

// Score, level and lives are pre-rendered; `signature` says what the canvas shows.
export type HudLayer = {
  canvas: HTMLCanvasElement; // W × HUD_LAYER_H
  signature: string;
};

export const HUD_LAYER_H = 40;

const HUD_SIZE = 12;
const HUD_MARGIN = 16;
const TIME_BAR_Y = 28;
const TIME_BAR_H = 6;
const TITLE_SIZE = 36;
const TITLE_MARGIN = 32;
const SUB_SIZE = 12;
const LIFE_RADIUS = 7;
const LIFE_GAP = 20;

const SAFE_ROWS = [ROW_MEDIAN, ROW_START];
const ROAD_DASH = [16, 16];
const NO_DASH: number[] = [];
const SIDES = [-1, 1];

const FACING_ANGLE: Record<Dir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

function glow(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
  color: string,
  blur = 10,
) {
  c.shadowColor = color;
  c.shadowBlur = blur * p.glow;
}

function noGlow(c: CanvasRenderingContext2D) {
  c.shadowBlur = 0;
}

function box(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (r === 0) {
    c.fillRect(x, y, w, h);
    return;
  }
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

// Everything in the field that never moves; painted once into the background sprite.
export function paintStaticZones(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
) {
  // Hedge row with a bay (mouth) every four columns.
  c.fillStyle = p.safe;
  c.fillRect(0, ROW_GOALS * CELL, W, CELL);
  for (const start of MOUTH_STARTS) {
    const x = start * CELL;
    c.fillStyle = p.mouthWater;
    c.fillRect(x, ROW_GOALS * CELL, MOUTH_WIDTH * CELL, CELL);
    c.strokeStyle = p.mouthEdge;
    c.lineWidth = 2;
    c.strokeRect(x + 1, ROW_GOALS * CELL + 1, MOUTH_WIDTH * CELL - 2, CELL - 2);
  }

  // River (the ripples are drawn per frame by drawRipples).
  const riverTop = ROW_RIVER_TOP * CELL;
  const riverH = (ROW_RIVER_BOTTOM - ROW_RIVER_TOP + 1) * CELL;
  c.fillStyle = p.river;
  c.fillRect(0, riverTop, W, riverH);

  // Safe strips: median and start.
  for (const row of SAFE_ROWS) {
    c.fillStyle = p.safe;
    c.fillRect(0, row * CELL, W, CELL);
    c.fillStyle = p.safeEdge;
    c.fillRect(0, row * CELL + (row === ROW_MEDIAN ? 0 : CELL - 2), W, 2);
  }

  // Road with dashed lane dividers.
  c.fillStyle = p.road;
  c.fillRect(
    0,
    ROW_ROAD_TOP * CELL,
    W,
    (ROW_ROAD_BOTTOM - ROW_ROAD_TOP + 1) * CELL,
  );
  c.strokeStyle = p.roadLine;
  c.lineWidth = 2;
  c.setLineDash(ROAD_DASH);
  c.beginPath();
  for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOTTOM; row++) {
    c.moveTo(0, row * CELL);
    c.lineTo(W, row * CELL);
  }
  c.stroke();
  c.setLineDash(NO_DASH);
}

function drawRipples(c: CanvasRenderingContext2D, v: RenderView) {
  c.strokeStyle = v.palette.riverWave;
  c.lineWidth = 2;
  const drift = (v.clockMs / 60) % 80;
  c.beginPath();
  for (let row = ROW_RIVER_TOP; row <= ROW_RIVER_BOTTOM; row++) {
    const y = row * CELL + CELL / 2 + (row % 2 === 0 ? 8 : -8);
    for (let x = -80 + drift + (row % 3) * 26; x < W; x += 80) {
      c.moveTo(x, y);
      c.lineTo(x + 18, y);
    }
  }
  c.stroke();
}

// Sprite painters: draw at (x, y) with glow. They run once per sprite, not per frame.
export function paintCar(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
  colorIdx: number,
  widthCells: number,
  dir: 1 | -1,
) {
  const x = 0;
  const y = 0;
  const w = widthCells * CELL;
  const color = p.carColors[colorIdx % p.carColors.length];
  c.fillStyle = color;
  glow(c, p, color, 8);
  box(c, x + 3, y + 7, w - 6, CELL - 14, p.radius);
  noGlow(c);

  // Windshield at the front, wheels at both ends.
  c.fillStyle = p.carGlass;
  const glassW = Math.min(10, w * 0.3);
  c.fillRect(
    dir === 1 ? x + w - 3 - glassW - 3 : x + 6,
    y + 11,
    glassW,
    CELL - 22,
  );
  c.fillStyle = p.wheel;
  c.fillRect(x + 10, y + 4, 6, 4);
  c.fillRect(x + 10, y + CELL - 8, 6, 4);
  c.fillRect(x + w - 14, y + 4, 6, 4);
  c.fillRect(x + w - 14, y + CELL - 8, 6, 4);
}

export function paintTruck(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
  widthCells: number,
  dir: 1 | -1,
) {
  const x = 0;
  const y = 0;
  const w = widthCells * CELL;
  const cabW = CELL - 4;
  const trailerX = dir === 1 ? x + 2 : x + 2 + cabW;
  const cabX = dir === 1 ? x + w - 2 - cabW : x + 2;

  c.fillStyle = p.truckBody;
  box(c, trailerX, y + 6, w - 4 - cabW, CELL - 12, p.radius);
  c.fillStyle = p.truckCab;
  glow(c, p, p.truckCab, 8);
  box(c, cabX, y + 8, cabW, CELL - 16, p.radius);
  noGlow(c);

  c.fillStyle = p.carGlass;
  c.fillRect(dir === 1 ? cabX + cabW - 10 : cabX + 4, y + 12, 6, CELL - 24);
  c.fillStyle = p.wheel;
  for (let wx = x + 10; wx < x + w - 12; wx += 26) {
    c.fillRect(wx, y + 3, 6, 4);
    c.fillRect(wx, y + CELL - 7, 6, 4);
  }
}

function drawLog(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
  e: Entity,
  y: number,
) {
  const x = e.col * CELL;
  const w = e.width * CELL;
  c.fillStyle = p.log;
  box(c, x + 2, y + 6, w - 4, CELL - 12, p.radius + 2);
  c.strokeStyle = p.logGrain;
  c.lineWidth = 2;
  c.beginPath();
  for (let gx = x + 14; gx < x + w - 10; gx += 22) {
    c.moveTo(gx, y + 12);
    c.lineTo(gx + 8, y + 12);
    c.moveTo(gx + 6, y + CELL - 13);
    c.lineTo(gx + 14, y + CELL - 13);
  }
  c.stroke();
}

function drawTurtles(
  c: CanvasRenderingContext2D,
  v: RenderView,
  e: Entity,
  y: number,
) {
  const p = v.palette;
  const cycle = turtleCycle(e, v.clockMs);
  const submerged = cycle >= TURTLE_VISIBLE_MS;
  // Blinks just before sinking: that is the only warning the player gets.
  const warning = !submerged && cycle >= TURTLE_VISIBLE_MS - TURTLE_WARNING_MS;
  const blinkOff = warning && Math.floor(cycle / 100) % 2 === 0;

  for (let i = 0; i < e.width; i++) {
    const cx = (e.col + i) * CELL + CELL / 2;
    const cy = y + CELL / 2;
    if (submerged || blinkOff) {
      c.strokeStyle = p.turtleGhost;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, cy, 13, 0, Math.PI * 2);
      c.stroke();
      continue;
    }
    c.fillStyle = p.turtleSkin;
    c.beginPath();
    c.arc(cx, cy - 15 + 3, 4, 0, Math.PI * 2); // head
    c.fill();
    c.fillStyle = p.turtleShell;
    c.beginPath();
    c.arc(cx, cy, 14, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = p.turtleScale;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 8, cy);
    c.lineTo(cx + 8, cy);
    c.moveTo(cx, cy - 8);
    c.lineTo(cx, cy + 8);
    c.stroke();
  }
}

function drawLanes(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  for (const lane of v.lanes) {
    const y = lane.row * CELL;
    for (const e of lane.entities) {
      // Lanes wrap over more columns than are visible: skip what is off-canvas.
      const left = e.col * CELL;
      if (left + e.width * CELL < 0 || left > W) continue;
      if (e.kind === "car") {
        c.drawImage(
          carSprite(v.sprites, p, e.variant, e.width, lane.dir),
          left - SPRITE_PAD,
          y - SPRITE_PAD,
        );
      } else if (e.kind === "truck") {
        c.drawImage(
          truckSprite(v.sprites, p, e.width, lane.dir),
          left - SPRITE_PAD,
          y - SPRITE_PAD,
        );
      } else if (e.kind === "log") drawLog(c, p, e, y);
      else drawTurtles(c, v, e, y);
    }
  }
}

// Draws a frog centered on (0, 0) facing up, scaled; `jump` stretches the legs.
function frogShape(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
  jump: number,
) {
  const stretch = Math.sin(jump * Math.PI); // 0 at both ends of the jump, 1 mid-air
  c.fillStyle = p.frog;
  // Legs: back pair and front pair, swept out while jumping.
  const back = 9 + stretch * 5;
  const front = 7 + stretch * 4;
  c.fillRect(-14 - stretch * 2, back - 2, 7, 5);
  c.fillRect(7 + stretch * 2, back - 2, 7, 5);
  c.fillRect(-14 - stretch * 2, -front - 3, 7, 5);
  c.fillRect(7 + stretch * 2, -front - 3, 7, 5);

  c.beginPath();
  c.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = p.frogBelly;
  c.beginPath();
  c.ellipse(0, 3, 6, 7, 0, 0, Math.PI * 2);
  c.fill();

  for (const side of SIDES) {
    c.fillStyle = p.eyeWhite;
    c.beginPath();
    c.arc(side * 6, -10, 3.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = p.pupil;
    c.beginPath();
    c.arc(side * 6, -11, 1.6, 0, Math.PI * 2);
    c.fill();
  }
}

export function paintLiveFrog(
  c: CanvasRenderingContext2D,
  p: FroggerPalette,
  jump: number,
) {
  glow(c, p, p.frog, 12);
  frogShape(c, p, jump);
  noGlow(c);
}

export function paintMouthFrog(c: CanvasRenderingContext2D, p: FroggerPalette) {
  c.scale(0.9, 0.9);
  glow(c, p, p.frog, 10);
  frogShape(c, p, 0);
  noGlow(c);
}

export function paintDeadFrog(c: CanvasRenderingContext2D, p: FroggerPalette) {
  c.strokeStyle = p.frogDead;
  glow(c, p, p.frogDead, 14);
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-11, -11);
  c.lineTo(11, 11);
  c.moveTo(11, -11);
  c.lineTo(-11, 11);
  c.stroke();
  noGlow(c);
}

// Frog sprites are centered in a square of this half-size.
const FROG_HALF = CELL / 2 + SPRITE_PAD;

function drawFrog(c: CanvasRenderingContext2D, v: RenderView) {
  if (v.frog.hidden) return;
  const s = v.sprites;
  const cx = (v.frog.x + 0.5) * CELL;
  const cy = (v.frog.y + 0.5) * CELL;

  if (v.frog.dead) {
    c.drawImage(s.deadFrog, cx - FROG_HALF, cy - FROG_HALF);
    return;
  }

  const sprite = s.frog[Math.round(v.frog.jump * (FROG_FRAMES - 1))];
  c.save();
  c.translate(cx, cy);
  c.rotate(FACING_ANGLE[v.frog.facing]);
  c.drawImage(sprite, -FROG_HALF, -FROG_HALF);
  c.restore();
}

function drawMouthFrogs(c: CanvasRenderingContext2D, v: RenderView) {
  MOUTH_STARTS.forEach((start, i) => {
    if (!v.occupied[i]) return;
    const cx = (start + MOUTH_WIDTH / 2) * CELL;
    const cy = ROW_GOALS * CELL + CELL / 2;
    c.drawImage(v.sprites.mouthFrog, cx - FROG_HALF, cy - FROG_HALF);
  });
}

function paintHudLayer(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.clearRect(0, 0, W, HUD_LAYER_H);
  c.font = `${HUD_SIZE}px ${v.fontFamily}`;
  c.textBaseline = "middle";
  const y = 14;

  c.textAlign = "left";
  c.fillStyle = p.hudScore;
  glow(c, p, p.hudScore, 8);
  c.fillText(String(v.score).padStart(5, "0"), HUD_MARGIN, y);

  c.textAlign = "center";
  c.fillStyle = p.hudLevel;
  glow(c, p, p.hudLevel, 8);
  c.fillText(`NIVEL ${v.level}`, W / 2, y);
  noGlow(c);

  // Lives as frog-colored dots, right-aligned.
  c.fillStyle = p.life;
  glow(c, p, p.life, 8);
  for (let i = 0; i < v.lives; i++) {
    c.beginPath();
    c.arc(
      W - HUD_MARGIN - LIFE_RADIUS - i * LIFE_GAP,
      y,
      LIFE_RADIUS,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  noGlow(c);
}

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  const signature = `${v.score}|${v.level}|${v.lives}|${v.skin}`;
  if (v.hud.signature !== signature) {
    const hc = v.hud.canvas.getContext("2d");
    if (hc) paintHudLayer(hc, v);
    v.hud.signature = signature;
  }
  c.drawImage(v.hud.canvas, 0, 0);

  // Time bar: green, then yellow, then magenta as the round runs out.
  const ratio = Math.max(0, Math.min(1, v.timeMs / v.roundMs));
  const barW = W - HUD_MARGIN * 2;
  c.fillStyle = p.timeTrack;
  c.fillRect(HUD_MARGIN, TIME_BAR_Y, barW, TIME_BAR_H);
  const color = ratio > 0.5 ? p.timeOk : ratio > 0.25 ? p.timeWarn : p.timeLow;
  c.fillStyle = color;
  glow(c, p, color, 6);
  c.fillRect(HUD_MARGIN, TIME_BAR_Y, barW * ratio, TIME_BAR_H);
  noGlow(c);
}

function drawOverlay(
  c: CanvasRenderingContext2D,
  v: RenderView,
  title: string,
  color: string,
  sub?: string,
) {
  const p = v.palette;
  c.fillStyle = p.veil;
  c.fillRect(0, 0, W, H);

  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `${TITLE_SIZE}px ${v.fontFamily}`;
  // Long titles shrink to fit inside the canvas margins.
  const fit = Math.min(1, (W - TITLE_MARGIN * 2) / c.measureText(title).width);
  c.font = `${Math.floor(TITLE_SIZE * fit)}px ${v.fontFamily}`;
  c.fillStyle = color;
  glow(c, p, color, 24);
  c.fillText(title, W / 2, H / 2 - 12);
  noGlow(c);

  if (sub) {
    c.font = `${SUB_SIZE}px ${v.fontFamily}`;
    c.fillStyle = p.ink;
    c.fillText(sub, W / 2, H / 2 + 36);
  }
}

export function draw(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  c.drawImage(v.sprites.background, 0, 0);
  drawRipples(c, v);
  drawLanes(c, v);
  drawMouthFrogs(c, v);
  drawFrog(c, v);
  drawHud(c, v);

  if (v.over) drawOverlay(c, v, "GAME OVER", p.titleLost, `${v.score} PUNTOS`);
  else if (v.paused)
    drawOverlay(c, v, "PAUSA", p.titlePause, "P o Esc para seguir");
}
