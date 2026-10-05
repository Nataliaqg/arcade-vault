export type Frame = { sx: number; sy: number; sw: number; sh: number };

export const SPRITESHEET_SRC = "/games/snake/fruits.png";

// Middle row (pixel art) of fruits.png, 3790 × 442. The 22 crops were checked against
// the image by scanning for opaque columns; the names in the reference sprites.js don't
// match the image, so these are anonymous.
const ROW_Y = 136;
const ROW_H = 160;
const FRUIT_COLUMNS: [x: number, w: number][] = [
  [34, 110],
  [186, 150],
  [378, 110],
  [540, 130],
  [712, 130],
  [894, 110],
  [1066, 110],
  [1228, 130],
  [1400, 130],
  [1582, 110],
  [1734, 150],
  [1906, 150],
  [2068, 170],
  [2250, 140],
  [2432, 130],
  [2604, 130],
  [2786, 110],
  [2948, 130],
  [3110, 150],
  [3302, 110],
  [3454, 150],
  [3637, 130],
];

export const FRUIT_SPRITES: Frame[] = FRUIT_COLUMNS.map(([sx, sw]) => ({
  sx,
  sy: ROW_Y,
  sw,
  sh: ROW_H,
}));

export type FruitSheet = {
  status: "loading" | "loaded" | "error";
  image: HTMLImageElement;
  /** Detaches the load handlers so a late load can't wake a destroyed engine. */
  dispose: () => void;
};

/**
 * Starts loading the spritesheet. State lives in the returned handle (one per
 * engine instance); `onSettle` fires once, after `status` has been updated.
 */
export function loadFruitSheet(src: string, onSettle: () => void): FruitSheet {
  const image = new Image();
  const sheet: FruitSheet = {
    status: "loading",
    image,
    dispose() {
      image.onload = null;
      image.onerror = null;
    },
  };
  image.onload = () => {
    sheet.status = "loaded";
    onSettle();
  };
  image.onerror = () => {
    sheet.status = "error";
    onSettle();
  };
  image.src = src;
  return sheet;
}
