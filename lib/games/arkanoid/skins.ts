import type { SkinId } from "../skins";
import type { BlockColor } from "./constants";

export type ArkanoidPalette = {
  bg: string;
  ink: string;
  veil: string;
  /** Flat colors per block; also the fallback when the spritesheet fails in classic. */
  blocks: Record<BlockColor, string>;
  paddle: string;
  ball: string;
  hudScore: string;
  hudLevel: string;
  titleLoading: string;
  titleLost: string;
  titleWon: string;
  titlePause: string;
  /** Multiplier for every shadowBlur; 0 disables glow. */
  glow: number;
  /** Classic keeps the spritesheet; the other skins draw shapes. */
  sprites: boolean;
  /** Px trimmed from each side of a drawn block, leaving a gap between neighbours. */
  blockInset: number;
  /** Round ball and paddle ends instead of squares. */
  rounded: boolean;
};

export const SKINS: Record<SkinId, ArkanoidPalette> = {
  classic: {
    bg: "#0a0a0f",
    ink: "#e6e9ff",
    veil: "rgba(10,10,15,0.7)",
    blocks: {
      gray: "#9e9e9e",
      red: "#e53935",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#d500f9",
      hotpink: "#ff006e",
      green: "#39ff14",
    },
    paddle: "#e6e9ff",
    ball: "#e6e9ff",
    hudScore: "#00f5ff",
    hudLevel: "#f5ff00",
    titleLoading: "#00f5ff",
    titleLost: "#ff006e",
    titleWon: "#f5ff00",
    titlePause: "#00f5ff",
    glow: 1,
    sprites: true,
    blockInset: 0,
    rounded: false,
  },
  neon: {
    bg: "#0a0a0f",
    ink: "#e6e9ff",
    veil: "rgba(10,10,15,0.75)",
    blocks: {
      gray: "#e6e9ff",
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#d500f9",
      hotpink: "#ff4d9d",
      green: "#39ff14",
    },
    paddle: "#00f5ff",
    ball: "#f5ff00",
    hudScore: "#00f5ff",
    hudLevel: "#f5ff00",
    titleLoading: "#00f5ff",
    titleLost: "#ff006e",
    titleWon: "#39ff14",
    titlePause: "#f5ff00",
    glow: 1.6,
    sprites: false,
    blockInset: 2,
    rounded: true,
  },
  retro: {
    // Amber phosphor: 4 tones over a near-black brown.
    bg: "#0d0800",
    ink: "#ffd98a",
    veil: "rgba(13,8,0,0.82)",
    blocks: {
      gray: "#a8650f",
      red: "#d98a1c",
      yellow: "#ffd98a",
      cyan: "#ffb327",
      magenta: "#d98a1c",
      hotpink: "#ffb327",
      green: "#a8650f",
    },
    paddle: "#ffd98a",
    ball: "#ffd98a",
    hudScore: "#ffb327",
    hudLevel: "#ffb327",
    titleLoading: "#ffb327",
    titleLost: "#ffd98a",
    titleWon: "#ffd98a",
    titlePause: "#ffb327",
    glow: 0,
    sprites: false,
    blockInset: 2,
    rounded: false,
  },
};
