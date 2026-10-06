import { CELL, FROG_FRAMES, H, SPRITE_PAD, W } from "./constants";
import {
  paintCar,
  paintDeadFrog,
  paintLiveFrog,
  paintMouthFrog,
  paintStaticZones,
  paintTruck,
} from "./renderer";
import type { FroggerPalette } from "./skins";

// Pre-rendered layers for one skin. Built once per skin and composed with drawImage.
export type FroggerSprites = {
  background: HTMLCanvasElement; // W×H: bg + zones, without the river ripples
  car: Map<string, HTMLCanvasElement>; // key `${colorIdx}:${width}:${dir}`
  truck: Map<string, HTMLCanvasElement>; // key `${width}:${dir}`
  frog: HTMLCanvasElement[]; // FROG_FRAMES jump phases, facing up
  mouthFrog: HTMLCanvasElement;
  deadFrog: HTMLCanvasElement;
};

export { FROG_FRAMES, SPRITE_PAD };

function makeCanvas(
  w: number,
  h: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  return [canvas, ctx];
}

export function buildSprites(p: FroggerPalette): FroggerSprites {
  const [background, bg] = makeCanvas(W, H);
  bg.fillStyle = p.bg;
  bg.fillRect(0, 0, W, H);
  paintStaticZones(bg, p);

  // Frog sprites are square and centered, so a rotation by 90° keeps them in place.
  const frogSprite = (paint: (c: CanvasRenderingContext2D) => void) => {
    const size = CELL + SPRITE_PAD * 2;
    const [canvas, c] = makeCanvas(size, size);
    c.translate(size / 2, size / 2);
    paint(c);
    return canvas;
  };
  const frog = Array.from({ length: FROG_FRAMES }, (_, i) =>
    frogSprite((c) => paintLiveFrog(c, p, i / (FROG_FRAMES - 1))),
  );
  const mouthFrog = frogSprite((c) => paintMouthFrog(c, p));
  const deadFrog = frogSprite((c) => paintDeadFrog(c, p));

  return {
    background,
    car: new Map(),
    truck: new Map(),
    frog,
    mouthFrog,
    deadFrog,
  };
}

// Sprites are made on first use: only the width/color/direction combos a level has.
function vehicleSprite(
  widthCells: number,
  paint: (c: CanvasRenderingContext2D) => void,
) {
  const [canvas, c] = makeCanvas(
    widthCells * CELL + SPRITE_PAD * 2,
    CELL + SPRITE_PAD * 2,
  );
  c.translate(SPRITE_PAD, SPRITE_PAD);
  paint(c);
  return canvas;
}

export function carSprite(
  s: FroggerSprites,
  p: FroggerPalette,
  colorIdx: number,
  widthCells: number,
  dir: 1 | -1,
): HTMLCanvasElement {
  const key = `${colorIdx}:${widthCells}:${dir}`;
  let sprite = s.car.get(key);
  if (!sprite) {
    sprite = vehicleSprite(widthCells, (c) =>
      paintCar(c, p, colorIdx, widthCells, dir),
    );
    s.car.set(key, sprite);
  }
  return sprite;
}

export function truckSprite(
  s: FroggerSprites,
  p: FroggerPalette,
  widthCells: number,
  dir: 1 | -1,
): HTMLCanvasElement {
  const key = `${widthCells}:${dir}`;
  let sprite = s.truck.get(key);
  if (!sprite) {
    sprite = vehicleSprite(widthCells, (c) =>
      paintTruck(c, p, widthCells, dir),
    );
    s.truck.set(key, sprite);
  }
  return sprite;
}
