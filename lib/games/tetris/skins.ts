import type { SkinId } from "../skins";

export type TetrisPalette = {
  pageBg: string;
  boardBg: string;
  gridLine: string;
  border: string;
  label: string;
  accent: string;
  dim: string;
  key: string;
  danger: string;
  /** May be rgba(): it is drawn over the frame. */
  overlayBg: string;
  /** Indexed by piece type (1-8); index 0 is unused. */
  pieces: (string | null)[];
  /** Highlight strip across the top of a block, or null for none. */
  bevel: string | null;
  ghostAlpha: number;
  /** Multiplier for every shadowBlur; 0 disables glow. */
  glow: number;
  /** "flat": filled block; "ring": hollow pixel block. */
  block: "flat" | "ring";
};

export const SKINS: Record<SkinId, TetrisPalette> = {
  classic: {
    pageBg: "#0f0f17",
    boardBg: "#1a1a25",
    gridLine: "#22222e",
    border: "#2a2a3a",
    label: "#555570",
    accent: "#7aa2f7",
    dim: "#888",
    key: "#aaa",
    danger: "#e57373",
    overlayBg: "rgba(10, 10, 20, 0.75)",
    pieces: [
      null,
      "#4dd0e1", // I
      "#ffd54f", // O
      "#ba68c8", // T
      "#81c784", // S
      "#e57373", // Z
      "#90caf9", // J
      "#ffb74d", // L
      "#9e9e9e", // N
    ],
    bevel: "rgba(255,255,255,0.12)",
    ghostAlpha: 0.2,
    glow: 0,
    block: "flat",
  },
  neon: {
    pageBg: "#0a0a0f",
    boardBg: "#0d0d18",
    gridLine: "#1a1a2e",
    border: "#00f5ff",
    label: "#8a90c0",
    accent: "#00f5ff",
    dim: "#aab0d8",
    key: "#e6e9ff",
    danger: "#ff006e",
    overlayBg: "rgba(10, 10, 15, 0.8)",
    pieces: [
      null,
      "#00f5ff", // I
      "#f5ff00", // O
      "#d500f9", // T
      "#39ff14", // S
      "#ff006e", // Z
      "#4d7cff", // J
      "#ff9f1c", // L
      "#e6e9ff", // N
    ],
    bevel: null,
    ghostAlpha: 0.25,
    glow: 1,
    block: "flat",
  },
  retro: {
    // Green phosphor: 4 tones over a near-black green.
    pageBg: "#050f07",
    boardBg: "#071a0b",
    gridLine: "#0f3d1a",
    border: "#2e8b3f",
    label: "#4fb862",
    accent: "#7bd88f",
    dim: "#4fb862",
    key: "#c8ffd0",
    danger: "#c8ffd0",
    overlayBg: "rgba(5, 15, 7, 0.85)",
    pieces: [
      null,
      "#c8ffd0", // I
      "#7bd88f", // O
      "#4fb862", // T
      "#7bd88f", // S
      "#4fb862", // Z
      "#c8ffd0", // J
      "#7bd88f", // L
      "#2e8b3f", // N
    ],
    bevel: null,
    ghostAlpha: 0.3,
    glow: 0,
    block: "ring",
  },
};
