"use client";

import { useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import type { ScoreRow } from "@/lib/data";
import { fetchTopScores, submitScore } from "@/lib/db/submit-score";
import {
  isValidPlayerName,
  PLAYER_NAME_MAX,
  readStoredName,
  storeName,
} from "@/lib/player-name";

type Props = {
  gameId: string;
  score: number;
  onRestart: (e: MouseEvent<HTMLElement>) => void;
};

type Saved = { rank: number; top: ScoreRow[] };

// El motor escucha teclas en `window` (Espacio reinicia en game over). Sin esto,
// escribir un espacio en el nombre reiniciaría la partida y cerraría el modal.
const keepKeysInInput = (e: KeyboardEvent<HTMLInputElement>) => e.stopPropagation();

export default function GameOverModal({ gameId, score, onRestart }: Props) {
  // El modal solo se monta en el navegador tras una partida, nunca en el render del servidor.
  const [name, setName] = useState(readStoredName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);

  const canSave = isValidPlayerName(name) && !saving;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(false);
    try {
      const { rank } = await submitScore({ gameId, playerName: name, score });
      storeName(name);
      const top = await fetchTopScores(gameId, 5).catch(() => []);
      setSaved({ rank, top });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bd">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <h2 id="gameover-title">FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>

        {saved ? (
          <div>
            <div className="toast-saved">PUNTUACIÓN GUARDADA</div>
            {saved.rank > 0 && (
              <div className="final-label" style={{ marginTop: 14 }}>
                TU POSICIÓN · #{String(saved.rank).padStart(2, "0")}
              </div>
            )}
            {saved.top.length > 0 && (
              <div className="leaderboard" style={{ marginTop: 16, textAlign: "left" }}>
                {saved.top.map((r, i) => (
                  <div
                    key={r.rank}
                    className={
                      "lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
                    }
                  >
                    <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                    <div className="pl">{r.name}</div>
                    <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={save}>
            <div className="input-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={keepKeysInInput}
                onKeyUp={keepKeysInInput}
                maxLength={PLAYER_NAME_MAX}
                placeholder="Tu nombre (3 a 12 caracteres)"
                aria-label="Tu nombre"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <button type="submit" className="btn" disabled={!canSave}>
                {saving ? "GUARDANDO…" : "GUARDAR"}
              </button>
            </div>
            {error && (
              <div role="alert" style={{ color: "var(--magenta)", fontSize: 13, marginBottom: 6 }}>
                No se pudo guardar la puntuación. Pulsa GUARDAR para reintentar.
              </div>
            )}
          </form>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onRestart}>
            JUGAR DE NUEVO
          </button>
          <Link href="/games" className="btn magenta">
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}
