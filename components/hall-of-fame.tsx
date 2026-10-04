"use client";

import { useState } from "react";
import Link from "next/link";
import type { Game, ScoreRow } from "@/lib/data";

const GENERAL = "general";

type Props = {
  games: Game[];
  general: ScoreRow[];
  byGame: Record<string, ScoreRow[]>;
};

type Slot = { tone: "gold" | "silver" | "bronze"; place: string; row: ScoreRow | undefined };

function PodiumSlot({ slot, showGame }: { slot: Slot; showGame: boolean }) {
  const { tone, place, row } = slot;
  const champion = tone === "gold";

  if (!row) {
    return (
      <div className={`podium-slot ${tone} free`}>
        <div className="rank-num" style={champion ? { fontSize: 36 } : undefined}>
          {place}
        </div>
        <div className="name">PUESTO LIBRE</div>
        <div className="date">JUEGA PARA OCUPARLO</div>
      </div>
    );
  }

  return (
    <div className={`podium-slot ${tone}`}>
      {champion && (
        <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {place}
      </div>
      <div className="name">{row.name}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row.score.toLocaleString("es-ES")}
      </div>
      {showGame && <div className="game">{row.gameTitle}</div>}
      <div className="date">{row.date}</div>
    </div>
  );
}

export default function HallOfFame({ games, general, byGame }: Props) {
  const [tab, setTab] = useState(GENERAL);
  const isGeneral = tab === GENERAL;
  const rows = isGeneral ? general : (byGame[tab] ?? []);

  const slots: Slot[] = [
    { tone: "silver", place: "02", row: rows[1] },
    { tone: "gold", place: "01", row: rows[0] },
    { tone: "bronze", place: "03", row: rows[2] },
  ];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        <button
          type="button"
          className={"chip" + (isGeneral ? " active" : "")}
          onClick={() => setTab(GENERAL)}
        >
          GENERAL
        </button>
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        {slots.map((s) => (
          <PodiumSlot key={s.tone} slot={s} showGame={isGeneral} />
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="hall-empty">
          <div className="pixel">AÚN NO HAY PUNTUACIONES</div>
          <p>Juega una partida y guarda tu nombre para abrir el ranking.</p>
          <Link
            href={isGeneral ? "/games" : `/games/${tab}/play`}
            className="btn"
          >
            {isGeneral ? "ELEGIR UN JUEGO" : "JUGAR AHORA"}
          </Link>
        </div>
      ) : (
        <div className={"hall-table" + (isGeneral ? " with-game" : "")}>
          <div className="th">
            <div>RANGO</div>
            <div>JUGADOR</div>
            {isGeneral && <div className="gm">JUEGO</div>}
            <div>PUNTUACIÓN</div>
            <div className="dt">FECHA</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={tab + r.rank}
              className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              {isGeneral && <div className="gm">{r.gameTitle}</div>}
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
