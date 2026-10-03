"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import type { Game } from "@/lib/data";
import { ENGINES } from "@/lib/games/registry";
import type { GameEngine, GameState } from "@/lib/games/types";

// Mockup (games without an engine): HUD values are fixed, nothing is simulated or saved.
const PLAYER = "INVITADO";
const MOCK_STATE: GameState = { score: 12480, lives: 3, level: 1, status: "playing" };
const INITIAL_STATE: GameState = { score: 0, lives: 3, level: 1, status: "playing" };

// Keep keyboard focus on the page so Space/arrows reach the game, not a button.
const blurAfterClick = (e: MouseEvent<HTMLElement>) => e.currentTarget.blur();

export default function GamePlayer({ game }: { game: Game }) {
  const factory = ENGINES[game.id];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engineState, setEngineState] = useState<GameState>(INITIAL_STATE);
  const [mockPaused, setMockPaused] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!factory || !canvas) return;
    const engine = factory(canvas, { onStateChange: setEngineState });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [factory]);

  const real = !!factory;
  const state = real ? engineState : MOCK_STATE;
  const paused = real ? state.status === "paused" : mockPaused;
  // The modal opens with FIN or when the engine reports game over, and closes
  // by itself if the engine restarts (e.g. Space on the game over screen).
  const showModal = over || state.status === "gameover";

  const togglePause = (e: MouseEvent<HTMLElement>) => {
    blurAfterClick(e);
    const engine = engineRef.current;
    if (!engine) return setMockPaused((p) => !p);
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
    setMockPaused(false);
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
          {real ? (
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
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
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {showModal && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{state.score.toLocaleString("es-ES")}</div>
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
