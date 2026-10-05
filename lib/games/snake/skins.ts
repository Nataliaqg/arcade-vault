import type { SkinId } from "../skins";

export type SnakePalette = {
  bg: string;
  ink: string;
  grid: string;
  veil: string;
  snake: string;
  snakeHead: string;
  fruitFallback: string;
  eyeWhite: string;
  pupil: string;
  hudScore: string;
  hudLevel: string;
  titleLoading: string;
  titleLost: string;
  titleWon: string;
  titlePause: string;
  countdown: string;
  /** Multiplier for every shadowBlur; 0 disables glow. */
  glow: number;
  /** Corner radius of snake segments. */
  segmentRadius: number;
  /** "sprite" uses the spritesheet when loaded; the others always draw a shape. */
  fruit: "sprite" | "circle" | "square";
  /** Square eyes instead of round ones. */
  pixelEyes: boolean;
};

export const SKINS: Record<SkinId, SnakePalette> = {
  classic: {
    bg: "#0a0a0f",
    ink: "#e6e9ff",
    grid: "rgba(230,233,255,0.05)",
    veil: "rgba(10,10,15,0.7)",
    snake: "#f5ff00",
    snakeHead: "#fbff80",
    fruitFallback: "#ff006e",
    eyeWhite: "#e6e9ff",
    pupil: "#0a0a0f",
    hudScore: "#00f5ff",
    hudLevel: "#f5ff00",
    titleLoading: "#00f5ff",
    titleLost: "#ff006e",
    titleWon: "#f5ff00",
    titlePause: "#00f5ff",
    countdown: "#00f5ff",
    glow: 1,
    segmentRadius: 8,
    fruit: "sprite",
    pixelEyes: false,
  },
  neon: {
    bg: "#0a0a0f",
    ink: "#e6e9ff",
    grid: "rgba(0,245,255,0.08)",
    veil: "rgba(10,10,15,0.75)",
    snake: "#39ff14",
    snakeHead: "#00f5ff",
    fruitFallback: "#ff006e",
    eyeWhite: "#e6e9ff",
    pupil: "#0a0a0f",
    hudScore: "#00f5ff",
    hudLevel: "#f5ff00",
    titleLoading: "#00f5ff",
    titleLost: "#ff006e",
    titleWon: "#39ff14",
    titlePause: "#f5ff00",
    countdown: "#ff006e",
    glow: 1.8,
    segmentRadius: 12,
    fruit: "circle",
    pixelEyes: false,
  },
  retro: {
    // Green phosphor: 4 tones over a near-black green.
    bg: "#050f07",
    ink: "#c8ffd0",
    grid: "rgba(46,139,63,0.22)",
    veil: "rgba(5,15,7,0.82)",
    snake: "#4fb862",
    snakeHead: "#c8ffd0",
    fruitFallback: "#c8ffd0",
    eyeWhite: "#050f07",
    pupil: "#050f07",
    hudScore: "#7bd88f",
    hudLevel: "#7bd88f",
    titleLoading: "#7bd88f",
    titleLost: "#c8ffd0",
    titleWon: "#c8ffd0",
    titlePause: "#7bd88f",
    countdown: "#c8ffd0",
    glow: 0,
    segmentRadius: 0,
    fruit: "square",
    pixelEyes: true,
  },
};
