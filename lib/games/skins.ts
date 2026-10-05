// Shared skin contract. Each game defines its own palette in lib/games/<id>/skins.ts.
export type SkinId = "classic" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["classic", "neon", "retro"];

export const DEFAULT_SKIN: SkinId = "classic";

export const SKIN_LABELS: Record<SkinId, string> = {
  classic: "Clásico",
  neon: "Neón",
  retro: "Retro",
};

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);
}

function channels(color: string): [number, number, number] {
  let hex = color.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
  const n = parseInt(hex.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance of a "#rrggbb" / "#rgb" color. */
export function relativeLuminance(color: string): number {
  const [r, g, b] = channels(color).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two "#rrggbb" colors (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
