import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { GAMES } from "@/lib/data";

export default async function PlayPage(props: PageProps<"/games/[id]/play">) {
  const { id } = await props.params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
