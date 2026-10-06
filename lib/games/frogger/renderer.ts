import {
  CELL,
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
  TURTLE_VISIBLE_MS,
  TURTLE_WARNING_MS,
  W,
} from "./constants";
import { turtleCycle, type Dir, type Entity, type Lane } from "./frogger";
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
};

const HUD_SIZE = 12;
const HUD_MARGIN = 16;
const TIME_BAR_Y = 28;
const TIME_BAR_H = 6;
const TITLE_SIZE = 36;
const TITLE_MARGIN = 32;
const SUB_SIZE = 12;
const LIFE_RADIUS = 7;
const LIFE_GAP = 20;

const FACING_ANGLE: Record<Dir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

function glow(c: CanvasRenderingContext2D, p: FroggerPalette, color: string, blur = 10) {
  c.shadowColor = color;
  c.shadowBlur = blur * p.glow;
}

function noGlow(c: CanvasRenderingContext2D) {
  c.shadowBlur = 0;
}

function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (r === 0) {
    c.fillRect(x, y, w, h);
    return;
  }
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

function drawZones(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;

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

  // River with slow drifting ripples.
  const riverTop = ROW_RIVER_TOP * CELL;
  const riverH = (ROW_RIVER_BOTTOM - ROW_RIVER_TOP + 1) * CELL;
  c.fillStyle = p.river;
  c.fillRect(0, riverTop, W, riverH);
  c.strokeStyle = p.riverWave;
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

  // Safe strips: median and start.
  for (const row of [ROW_MEDIAN, ROW_START]) {
    c.fillStyle = p.safe;
    c.fillRect(0, row * CELL, W, CELL);
    c.fillStyle = p.safeEdge;
    c.fillRect(0, row * CELL + (row === ROW_MEDIAN ? 0 : CELL - 2), W, 2);
  }

  // Road with dashed lane dividers.
  c.fillStyle = p.road;
  c.fillRect(0, ROW_ROAD_TOP * CELL, W, (ROW_ROAD_BOTTOM - ROW_ROAD_TOP + 1) * CELL);
  c.strokeStyle = p.roadLine;
  c.lineWidth = 2;
  c.setLineDash([16, 16]);
  c.beginPath();
  for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOTTOM; row++) {
    c.moveTo(0, row * CELL);
    c.lineTo(W, row * CELL);
  }
  c.stroke();
  c.setLineDash([]);
}

function drawCar(c: CanvasRenderingContext2D, p: FroggerPalette, e: Entity, dir: 1 | -1, y: number) {
  const x = e.col * CELL;
  const w = e.width * CELL;
  const color = p.carColors[e.variant % p.carColors.length];
  c.fillStyle = color;
  glow(c, p, color, 8);
  box(c, x + 3, y + 7, w - 6, CELL - 14, p.radius);
  noGlow(c);

  // Windshield at the front, wheels at both ends.
  c.fillStyle = p.carGlass;
  const glassW = Math.min(10, w * 0.3);
  c.fillRect(dir === 1 ? x + w - 3 - glassW - 3 : x + 6, y + 11, glassW, CELL - 22);
  c.fillStyle = p.wheel;
  for (const wx of [x + 10, x + w - 14]) {
    c.fillRect(wx, y + 4, 6, 4);
    c.fillRect(wx, y + CELL - 8, 6, 4);
  }
}

function drawTruck(c: CanvasRenderingContext2D, p: FroggerPalette, e: Entity, dir: 1 | -1, y: number) {
  const x = e.col * CELL;
  const w = e.width * CELL;
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

function drawLog(c: CanvasRenderingContext2D, p: FroggerPalette, e: Entity, y: number) {
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

function drawTurtles(c: CanvasRenderingContext2D, v: RenderView, e: Entity, y: number) {
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
      if (e.kind === "car") drawCar(c, p, e, lane.dir, y);
      else if (e.kind === "truck") drawTruck(c, p, e, lane.dir, y);
      else if (e.kind === "log") drawLog(c, p, e, y);
      else drawTurtles(c, v, e, y);
    }
  }
}

// Draws a frog centered on (0, 0) facing up, scaled; `jump` stretches the legs.
function frogShape(c: CanvasRenderingContext2D, p: FroggerPalette, jump: number) {
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

  for (const side of [-1, 1]) {
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

function drawFrog(c: CanvasRenderingContext2D, v: RenderView) {
  if (v.frog.hidden) return;
  const p = v.palette;
  const cx = (v.frog.x + 0.5) * CELL;
  const cy = (v.frog.y + 0.5) * CELL;
  c.save();
  c.translate(cx, cy);

  if (v.frog.dead) {
    c.strokeStyle = p.frogDead;
    glow(c, p, p.frogDead, 14);
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-11, -11);
    c.lineTo(11, 11);
    c.moveTo(11, -11);
    c.lineTo(-11, 11);
    c.stroke();
    c.restore();
    noGlow(c);
    return;
  }

  c.rotate(FACING_ANGLE[v.frog.facing]);
  glow(c, p, p.frog, 12);
  frogShape(c, p, v.frog.jump);
  c.restore();
  noGlow(c);
}

function drawMouthFrogs(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
  MOUTH_STARTS.forEach((start, i) => {
    if (!v.occupied[i]) return;
    c.save();
    c.translate((start + MOUTH_WIDTH / 2) * CELL, ROW_GOALS * CELL + CELL / 2);
    c.scale(0.9, 0.9);
    glow(c, p, p.frog, 10);
    frogShape(c, p, 0);
    c.restore();
    noGlow(c);
  });
}

function drawHud(c: CanvasRenderingContext2D, v: RenderView) {
  const p = v.palette;
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
    c.arc(W - HUD_MARGIN - LIFE_RADIUS - i * LIFE_GAP, y, LIFE_RADIUS, 0, Math.PI * 2);
    c.fill();
  }
  noGlow(c);

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
  c.fillStyle = p.bg;
  c.fillRect(0, 0, W, H);

  drawZones(c, v);
  drawLanes(c, v);
  drawMouthFrogs(c, v);
  drawFrog(c, v);
  drawHud(c, v);

  if (v.over) drawOverlay(c, v, "GAME OVER", p.titleLost, `${v.score} PUNTOS`);
  else if (v.paused) drawOverlay(c, v, "PAUSA", p.titlePause, "P o Esc para seguir");
}
