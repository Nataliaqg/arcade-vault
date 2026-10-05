import type { BlockColor } from "./constants";

export type Frame = { sx: number; sy: number; sw: number; sh: number };

export const SPRITESHEET_SRC = "/games/arkanoid/spritesheet-breakout.png";

export const EXPLOSION_DURATION = 150; // ms, for all 4 frames

function explosionRow(sy: number): Frame[] {
  return [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
}

const RED_EXPLOSION = explosionRow(176);

// `gray` reuses the red frames, as in the original.
export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = {
  red: RED_EXPLOSION,
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: RED_EXPLOSION,
};

export const SPRITES: {
  paddle: Frame;
  ball: Frame;
  blocks: Record<BlockColor, Frame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

export type Spritesheet = {
  status: "loading" | "loaded" | "error";
  image: HTMLImageElement;
  /** Detaches the load handlers so a late load can't wake a destroyed engine. */
  dispose: () => void;
};

/**
 * Starts loading the spritesheet. State lives in the returned handle (one per
 * engine instance); `onSettled` fires once, after `status` has been updated.
 */
export function loadSpritesheet(src: string, onSettled: () => void): Spritesheet {
  const image = new Image();
  const sheet: Spritesheet = {
    status: "loading",
    image,
    dispose() {
      image.onload = null;
      image.onerror = null;
    },
  };
  image.onload = () => {
    sheet.status = "loaded";
    onSettled();
  };
  image.onerror = () => {
    sheet.status = "error";
    onSettled();
  };
  image.src = src;
  return sheet;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(sheet.image, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
