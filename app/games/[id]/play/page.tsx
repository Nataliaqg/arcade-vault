import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { getCurrentUser } from "@/lib/auth/session";
import { getGame } from "@/lib/db/games";

export default async function PlayPage(props: PageProps<"/games/[id]/play">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();

  const user = await getCurrentUser();

  return <GamePlayer game={game} playerLabel={user?.username ?? "INVITADO"} />;
}
