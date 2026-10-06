import { redirect } from "next/navigation";
import AliasForm from "@/components/alias-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AliasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (user.username) redirect("/");

  return <AliasForm />;
}
