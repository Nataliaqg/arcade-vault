import type { SkinId } from "../skins";

export type AsteroidsPalette = {
  bg: string;
  ship: string;
  shipFlame: string;
  asteroid: string;
  bullet: string;
  particle: string;
  powerUp: string;
  hudText: string;
  hudBonus: string;
  lifeIcon: string;
  overlayTitle: string;
  /** May be rgba(): it is drawn over `bg`. */
  overlaySub: string;
  /** Multiplier for every shadowBlur; 0 disables glow. */
  glow: number;
  /** Stroke width of ship, asteroids and power-up. */
  lineWidth: number;
  /** Sharp corners and square bullets instead of rounded ones. */
  pixel: boolean;
};

export const SKINS: Record<SkinId, AsteroidsPalette> = {
  classic: {
    bg: "#000",
    ship: "#fff",
    shipFlame: "rgba(255, 130, 0, 0.85)",
    asteroid: "#fff",
    bullet: "#fff",
    particle: "#fff",
    powerUp: "#0ff",
    hudText: "#fff",
    hudBonus: "#0ff",
    lifeIcon: "#fff",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    glow: 0,
    lineWidth: 1.5,
    pixel: false,
  },
  neon: {
    bg: "#0a0a0f",
    ship: "#00f5ff",
    shipFlame: "#f5ff00",
    asteroid: "#ff006e",
    bullet: "#f5ff00",
    particle: "#39ff14",
    powerUp: "#39ff14",
    hudText: "#e6e9ff",
    hudBonus: "#39ff14",
    lifeIcon: "#00f5ff",
    overlayTitle: "#ff006e",
    overlaySub: "#e6e9ff",
    glow: 1,
    lineWidth: 1.8,
    pixel: false,
  },
  retro: {
    // Amber phosphor: 4 tones over a near-black brown.
    bg: "#0d0800",
    ship: "#ffd98a",
    shipFlame: "#d98a1c",
    asteroid: "#ffb327",
    bullet: "#ffd98a",
    particle: "#d98a1c",
    powerUp: "#ffd98a",
    hudText: "#ffd98a",
    hudBonus: "#ffb327",
    lifeIcon: "#ffd98a",
    overlayTitle: "#ffd98a",
    overlaySub: "#ffb327",
    glow: 0,
    lineWidth: 2.5,
    pixel: true,
  },
};
