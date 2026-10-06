export type PadButton = "up" | "down" | "left" | "right" | "a" | "b";

export type ActionButton = { code: string; label: string }; // p. ej. { code: "Space", label: "DISPARAR" }

export type TouchLayout = {
  a?: ActionButton; // ausente → botón atenuado sin función
  b?: ActionButton;
  repeat?: PadButton[]; // botones con autorrepetición
};

export const DPAD_CODES: Record<"up" | "down" | "left" | "right", string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;
