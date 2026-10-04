import { createClient } from "@/lib/supabase/client";
import type { ScoreRow } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isValidPlayerName, PLAYER_NAME_MAX, PLAYER_NAME_MIN } from "@/lib/player-name";

// Solo navegador: usa el cliente de navegador. El de servidor vive en lib/db/scores.ts.
export async function submitScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<{ rank: number }> {
  const playerName = input.playerName.trim();
  if (!isValidPlayerName(playerName)) {
    throw new Error(`El nombre debe tener entre ${PLAYER_NAME_MIN} y ${PLAYER_NAME_MAX} caracteres`);
  }
  if (!Number.isInteger(input.score) || input.score < 0) {
    throw new Error("Puntuación inválida");
  }

  const supabase = createClient();

  const { error } = await supabase.from("scores").insert({
    game_id: input.gameId,
    player_name: playerName,
    score: input.score,
  });
  if (error) throw new Error("No se pudo guardar la puntuación");

  // Posición: filas del juego con score >= al nuevo (incluye la recién insertada).
  // En empate las anteriores quedan por encima, igual que el orden por created_at.
  const { count, error: rankError } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("game_id", input.gameId)
    .gte("score", input.score);

  // La fila ya está guardada: si falla el conteo no se lanza error (evita duplicar
  // al reintentar). rank 0 significa "posición desconocida".
  return { rank: rankError ? 0 : (count ?? 0) };
}

// Mismo resultado que getTopScores (servidor), para el top 5 del modal.
export async function fetchTopScores(gameId: string, limit: number): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at, game_id, games(title)")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("No se pudo leer la tabla scores");

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
    gameId: row.game_id,
    gameTitle: row.games?.title ?? row.game_id,
  }));
}
