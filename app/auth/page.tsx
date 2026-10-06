import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthPage(props: PageProps<"/auth">) {
  if (await getCurrentUser()) redirect("/");

  const { error } = await props.searchParams;
  return <AuthForm linkError={error === "link"} oauthError={error === "oauth"} />;
}
