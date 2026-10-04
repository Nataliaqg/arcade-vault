import { createClient } from "@/lib/supabase/server";
import type { ScoreRow } from "@/lib/data";
import { formatDate } from "@/lib/format";

export async function getTopScores(opts: {
  gameId?: string;
  limit: number;
}): Promise<ScoreRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("scores")
    .select("player_name, score, created_at, game_id, games(title)")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(opts.limit);

  if (opts.gameId) query = query.eq("game_id", opts.gameId);

  const { data, error } = await query;
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
