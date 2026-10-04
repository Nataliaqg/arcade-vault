import HallOfFame from "@/components/hall-of-fame";
import { getGames } from "@/lib/db/games";
import { getTopScores } from "@/lib/db/scores";

const LIMIT = 20;

export default async function SalonPage() {
  const games = await getGames();

  const [general, perGame] = await Promise.all([
    getTopScores({ limit: LIMIT }),
    Promise.all(games.map((g) => getTopScores({ gameId: g.id, limit: LIMIT }))),
  ]);

  const byGame = Object.fromEntries(games.map((g, i) => [g.id, perGame[i]]));

  return <HallOfFame games={games} general={general} byGame={byGame} />;
}
