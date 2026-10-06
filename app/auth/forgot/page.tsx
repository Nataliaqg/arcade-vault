import { redirect } from "next/navigation";
import { ForgotForm } from "@/components/password-forms";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ForgotPage() {
  if (await getCurrentUser()) redirect("/");
  return <ForgotForm />;
}
