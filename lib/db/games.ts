import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Game, GameCategory, GameColor } from "@/lib/data";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function withStats(supabase: Supabase, row: GameRow): Promise<Game> {
  const [bestRes, playsRes] = await Promise.all([
    supabase
      .from("scores")
      .select("score")
      .eq("game_id", row.id)
      .order("score", { ascending: false })
      .limit(1),
    supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("game_id", row.id),
  ]);

  if (bestRes.error) throw new Error(`No se pudo leer el mejor puntaje de ${row.id}`);
  if (playsRes.error) throw new Error(`No se pudo contar las partidas de ${row.id}`);

  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
    best: bestRes.data[0]?.score ?? 0,
    plays: playsRes.count ?? 0,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error("No se pudo leer la tabla games");

  return Promise.all(data.map((row) => withStats(supabase, row)));
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el juego ${id}`);
  if (!data) return null;

  return withStats(supabase, data);
}
