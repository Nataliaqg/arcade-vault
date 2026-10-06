import type { SkinId } from "../skins";

export type FroggerPalette = {
  bg: string;
  ink: string;
  veil: string;
  // Zones.
  road: string;
  roadLine: string;
  river: string;
  riverWave: string;
  safe: string;
  safeEdge: string;
  mouthWater: string;
  mouthEdge: string;
  // Vehicles.
  carColors: [string, string, string];
  carGlass: string;
  wheel: string;
  truckBody: string;
  truckCab: string;
  // River platforms.
  log: string;
  logGrain: string;
  turtleShell: string;
  turtleScale: string;
  turtleSkin: string;
  turtleGhost: string;
  // Frog.
  frog: string;
  frogBelly: string;
  eyeWhite: string;
  pupil: string;
  frogDead: string;
  // HUD and overlays.
  hudScore: string;
  hudLevel: string;
  life: string;
  timeOk: string;
  timeWarn: string;
  timeLow: string;
  timeTrack: string;
  titleLost: string;
  titlePause: string;
  /** Multiplier for every shadowBlur; 0 disables glow. */
  glow: number;
  /** Corner radius of vehicles and logs. */
  radius: number;
};

const classic: FroggerPalette = {
  bg: "#0a0a0f",
  ink: "#e6e9ff",
  veil: "rgba(10,10,15,0.7)",
  road: "#15151f",
  roadLine: "rgba(230,233,255,0.18)",
  river: "#0a1f3d",
  riverWave: "rgba(0,245,255,0.14)",
  safe: "#0e2a18",
  safeEdge: "#1d5a30",
  mouthWater: "#06142a",
  mouthEdge: "#f5ff00",
  carColors: ["#ff006e", "#f5ff00", "#00f5ff"],
  carGlass: "#0a0a0f",
  wheel: "#05050a",
  truckBody: "#6c7199",
  truckCab: "#ff8a00",
  log: "#7a4a22",
  logGrain: "#4e2d12",
  turtleShell: "#2fbf71",
  turtleScale: "#1b7a47",
  turtleSkin: "#7bd88f",
  turtleGhost: "rgba(123,216,143,0.28)",
  frog: "#39ff14",
  frogBelly: "#b6ff9e",
  eyeWhite: "#e6e9ff",
  pupil: "#0a0a0f",
  frogDead: "#ff006e",
  hudScore: "#00f5ff",
  hudLevel: "#f5ff00",
  life: "#39ff14",
  timeOk: "#39ff14",
  timeWarn: "#f5ff00",
  timeLow: "#ff006e",
  timeTrack: "rgba(230,233,255,0.12)",
  titleLost: "#ff006e",
  titlePause: "#00f5ff",
  glow: 1,
  radius: 6,
};

// `neon` and `retro` start as copies of `classic`; `skin-designer` replaces them.
export const SKINS: Record<SkinId, FroggerPalette> = {
  classic,
  neon: { ...classic },
  retro: { ...classic },
};
