import { redirect } from "next/navigation";
import { ResetForm } from "@/components/password-forms";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ResetPage() {
  if (!(await getCurrentUser())) redirect("/auth/forgot");
  return <ResetForm />;
}
