"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
import GameOverModal from "@/components/game-over-modal";
import type { Game } from "@/lib/data";
import { ENGINES } from "@/lib/games/registry";
import { DEFAULT_SKIN, isSkinId, SKIN_IDS, SKIN_LABELS, type SkinId } from "@/lib/games/skins";
import type { GameEngine, GameState } from "@/lib/games/types";

const PLAYER = "INVITADO";
const SKIN_KEY = "arcade-vault:skin:v1";
const INITIAL_STATE: GameState = { score: 0, lives: 3, level: 1, status: "playing" };

// Skin preference store. Documented exception to the localStorage rule (a per-viewer
// preference); the server snapshot is the default skin so hydration stays stable.
let memorySkin: SkinId | null = null;
const skinListeners = new Set<() => void>();

function readSkin(): SkinId {
  if (memorySkin) return memorySkin;
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (isSkinId(saved)) return saved;
  } catch {
    // Storage unavailable: default skin.
  }
  return DEFAULT_SKIN;
}

function writeSkin(next: SkinId) {
  memorySkin = next;
  try {
    localStorage.setItem(SKIN_KEY, next);
  } catch {
    // Storage unavailable: the choice only lasts for this visit.
  }
  skinListeners.forEach((l) => l());
}

function subscribeSkin(listener: () => void) {
  skinListeners.add(listener);
  return () => {
    skinListeners.delete(listener);
  };
}

// Keep keyboard focus on the page so Space/arrows reach the game, not a button.
const blurAfterClick = (e: MouseEvent<HTMLElement>) => e.currentTarget.blur();

export default function GamePlayer({ game }: { game: Game }) {
  const factory = ENGINES[game.id];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engineState, setEngineState] = useState<GameState>(INITIAL_STATE);
  const [over, setOver] = useState(false);
  const skin = useSyncExternalStore(subscribeSkin, readSkin, () => DEFAULT_SKIN);
  const skinRef = useRef<SkinId>(DEFAULT_SKIN);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!factory || !canvas) return;
    const engine = factory(canvas, { onStateChange: setEngineState }, { skin: skinRef.current });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [factory]);

  // Live skin switch: no restart, the match keeps going.
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setSkin(skin);
  }, [skin]);

  const chooseSkin = (e: MouseEvent<HTMLElement>, next: SkinId) => {
    blurAfterClick(e);
    writeSkin(next);
  };

  const state = engineState;
  const paused = state.status === "paused";
  // The modal opens with FIN or when the engine reports game over, and closes
  // by itself if the engine restarts (e.g. Space on the game over screen).
  const showModal = over || state.status === "gameover";

  const togglePause = (e: MouseEvent<HTMLElement>) => {
    blurAfterClick(e);
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.resume();
    else engine.pause();
  };

  const finish = (e: MouseEvent<HTMLElement>) => {
    blurAfterClick(e);
    engineRef.current?.pause();
    setOver(true);
  };

  const restart = (e: MouseEvent<HTMLElement>) => {
    blurAfterClick(e);
    engineRef.current?.restart();
    setOver(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{PLAYER}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{state.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(state.lives).trim()}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(state.level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={finish}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          {paused && !showModal && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="skin-picker" role="group" aria-label="Aspecto del juego">
          <span className="skin-picker-label">Aspecto</span>
          {SKIN_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`btn ghost skin-btn${id === skin ? " active" : ""}`}
              aria-pressed={id === skin}
              onClick={(e) => chooseSkin(e, id)}
            >
              {SKIN_LABELS[id]}
            </button>
          ))}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {showModal && (
        <GameOverModal gameId={game.id} score={state.score} onRestart={restart} />
      )}
    </div>
  );
}
