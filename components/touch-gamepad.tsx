"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  DPAD_CODES,
  REPEAT_DELAY_MS,
  REPEAT_INTERVAL_MS,
  type ActionButton,
  type PadButton,
  type TouchLayout,
} from "@/lib/games/touch";

type DpadButton = keyof typeof DPAD_CODES;

type Hold = {
  button: PadButton;
  code: string;
  delay?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
};

const DPAD_GLYPHS: Record<DpadButton, string> = { up: "▲", down: "▼", left: "◀", right: "▶" };
const DPAD_LABELS: Record<DpadButton, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
const DPAD_ORDER: DpadButton[] = ["up", "left", "right", "down"];
// Fraction of the zone's half-size around the center where no direction is chosen.
const DEAD_ZONE = 0.18;

// KeyboardEvent.key for the codes the engines can receive; engines read `code`.
function keyFor(code: string): string {
  if (code === "Space") return " ";
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  return code;
}

function dispatchKey(type: "keydown" | "keyup", code: string, repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key: keyFor(code), repeat, bubbles: true, cancelable: true }),
  );
}

function sectorAt(el: HTMLElement, x: number, y: number): DpadButton | null {
  const r = el.getBoundingClientRect();
  const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
  const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
  if (Math.hypot(dx, dy) < DEAD_ZONE) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

export default function TouchGamepad({ layout }: { layout: TouchLayout }) {
  // One hold per active pointer (multitouch) and a press count per key code, so two
  // buttons sharing a code (Asteroids ↑ and B) do not release each other.
  const holds = useRef(new Map<number, Hold>());
  const counts = useRef(new Map<string, number>());
  const [active, setActive] = useState<PadButton[]>([]);

  const sync = useCallback(() => {
    setActive([...holds.current.values()].map((h) => h.button));
  }, []);

  const stopHold = useCallback((hold: Hold) => {
    clearTimeout(hold.delay);
    clearInterval(hold.interval);
    const left = (counts.current.get(hold.code) ?? 1) - 1;
    if (left <= 0) {
      counts.current.delete(hold.code);
      dispatchKey("keyup", hold.code);
    } else {
      counts.current.set(hold.code, left);
    }
  }, []);

  const press = useCallback(
    (pointerId: number, button: PadButton, code: string, repeats: boolean) => {
      const hold: Hold = { button, code };
      const count = counts.current.get(code) ?? 0;
      counts.current.set(code, count + 1);
      if (count === 0) dispatchKey("keydown", code);
      if (repeats) {
        hold.delay = setTimeout(() => {
          hold.interval = setInterval(() => dispatchKey("keydown", code, true), REPEAT_INTERVAL_MS);
        }, REPEAT_DELAY_MS);
      }
      holds.current.set(pointerId, hold);
    },
    [],
  );

  const release = useCallback(
    (pointerId: number) => {
      const hold = holds.current.get(pointerId);
      if (!hold) return;
      holds.current.delete(pointerId);
      stopHold(hold);
      sync();
    },
    [stopHold, sync],
  );

  const releaseAll = useCallback(() => {
    if (holds.current.size === 0) return;
    holds.current.forEach(stopHold);
    holds.current.clear();
    sync();
  }, [stopHold, sync]);

  useEffect(() => {
    const activeHolds = holds.current;
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVisibility);
      // Unmount: free every key and timer (also covers StrictMode's double mount).
      activeHolds.forEach(stopHold);
      activeHolds.clear();
    };
  }, [releaseAll, stopHold]);

  const repeats = (button: PadButton) => layout.repeat?.includes(button) ?? false;

  // --- D-pad: a single zone with 4 sectors; sliding the finger changes direction ---
  const setDirection = (e: PointerEvent<HTMLDivElement>, next: DpadButton | null) => {
    const current = holds.current.get(e.pointerId);
    if (current?.button === next) return;
    release(e.pointerId);
    if (next) {
      press(e.pointerId, next, DPAD_CODES[next], repeats(next));
      sync();
    }
  };

  const onDpadDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDirection(e, sectorAt(e.currentTarget, e.clientX, e.clientY));
  };

  const onDpadMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!holds.current.has(e.pointerId) && !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setDirection(e, sectorAt(e.currentTarget, e.clientX, e.clientY));
  };

  const onEnd = (e: PointerEvent<HTMLElement>) => release(e.pointerId);

  // --- A / B action buttons ---
  const onActionDown = (e: PointerEvent<HTMLButtonElement>, button: "a" | "b", action: ActionButton) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    release(e.pointerId);
    press(e.pointerId, button, action.code, repeats(button));
    sync();
  };

  const renderAction = (button: "a" | "b", action: ActionButton | undefined) => {
    const enabled = !!action;
    return (
      <div className="pad-action">
        <button
          type="button"
          tabIndex={-1}
          className={`pad-btn pad-${button}${active.includes(button) ? " is-active" : ""}`}
          aria-disabled={!enabled}
          aria-label={enabled ? `${button.toUpperCase()}: ${action.label}` : `${button.toUpperCase()}: sin función`}
          onPointerDown={enabled ? (e) => onActionDown(e, button, action) : undefined}
          onPointerUp={enabled ? onEnd : undefined}
          onPointerCancel={enabled ? onEnd : undefined}
          onLostPointerCapture={enabled ? onEnd : undefined}
        >
          {button.toUpperCase()}
        </button>
        <span className="pad-label">{action?.label ?? "—"}</span>
      </div>
    );
  };

  return (
    <div className="touch-pad" onContextMenu={(e) => e.preventDefault()}>
      <div
        className="dpad"
        role="group"
        aria-label="Cruceta"
        onPointerDown={onDpadDown}
        onPointerMove={onDpadMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        onLostPointerCapture={onEnd}
      >
        {DPAD_ORDER.map((dir) => (
          <span
            key={dir}
            className={`dpad-arrow dpad-${dir}${active.includes(dir) ? " is-active" : ""}`}
            role="img"
            aria-label={DPAD_LABELS[dir]}
          >
            {DPAD_GLYPHS[dir]}
          </span>
        ))}
      </div>
      <div className="pad-actions">
        {renderAction("b", layout.b)}
        {renderAction("a", layout.a)}
      </div>
    </div>
  );
}
