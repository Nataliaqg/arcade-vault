import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { getGame } from "@/lib/db/games";

export default async function PlayPage(props: PageProps<"/games/[id]/play">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
