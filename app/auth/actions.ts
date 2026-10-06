"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/session";
import { isValidUsername, PASSWORD_MIN } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  sent?: boolean;
  email?: string;
  unconfirmed?: boolean;
};

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo";
const ALIAS_TAKEN = "Ese alias ya está en uso";
const ALIAS_INVALID = "El alias debe tener de 3 a 12 caracteres: letras, números o _";
const EMAIL_INVALID = "Escribe un correo electrónico válido";
const PASSWORD_SHORT = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;

function translateError(error: Pick<AuthError, "code" | "message">): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos";
    case "email_not_confirmed":
      return "Confirma tu correo antes de entrar";
    case "user_already_exists":
      return "Ya existe una cuenta con ese email";
    case "weak_password":
      return PASSWORD_SHORT;
    case "same_password":
      return "La nueva contraseña debe ser distinta de la anterior";
    case "over_email_send_rate_limit":
      return "Se han enviado demasiados correos. Espera unos minutos e inténtalo de nuevo";
    default:
      // El trigger de profiles falla si el alias choca con el índice único.
      if (error.message.includes("Database error")) return ALIAS_TAKEN;
      return GENERIC_ERROR;
  }
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  return h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`;
}

function field(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email");
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";

  if (!looksLikeEmail(email)) return { error: EMAIL_INVALID, email };
  if (!password) return { error: "Escribe tu contraseña", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: translateError(error),
      email,
      unconfirmed: error.code === "email_not_confirmed",
    };
  }

  redirect("/");
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const username = field(form, "username");
  const email = field(form, "email");
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";

  if (!isValidUsername(username)) return { error: ALIAS_INVALID, email };
  if (!looksLikeEmail(email)) return { error: EMAIL_INVALID, email };
  if (password.length < PASSWORD_MIN) return { error: PASSWORD_SHORT, email };

  const supabase = await createClient();

  // `_` es comodín en ilike: se escapa para comparar el alias literal.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username.replace(/_/g, "\\_"))
    .maybeSingle();
  if (taken) return { error: ALIAS_TAKEN, email };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });
  if (error) return { error: translateError(error), email };

  // Con confirmación de email activa, un email ya registrado no devuelve error:
  // devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { error: translateError({ code: "user_already_exists", message: "" }), email };
  }

  return { sent: true, email };
}

export async function resendConfirmation(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const email = field(form, "email");
  if (!looksLikeEmail(email)) return { error: EMAIL_INVALID, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await getOrigin()}/auth/callback` },
  });
  if (error) return { error: translateError(error), email, sent: true };

  return { sent: true, email };
}

export async function requestPasswordReset(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const email = field(form, "email");
  if (!looksLikeEmail(email)) return { error: EMAIL_INVALID, email };

  const supabase = await createClient();
  // Se ignora el resultado: la respuesta es idéntica exista o no la cuenta.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/auth/reset`,
  });

  return { sent: true, email };
}

export async function updatePassword(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (password.length < PASSWORD_MIN) return { error: PASSWORD_SHORT };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translateError(error) };

  redirect("/");
}

export async function signInWithProvider(provider: "google" | "github"): Promise<never> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await getOrigin()}/auth/callback` },
  });
  if (error || !data.url) redirect("/auth?error=oauth");

  redirect(data.url);
}

export async function setUsername(_prev: AuthState, form: FormData): Promise<AuthState> {
  const username = field(form, "username");
  if (!isValidUsername(username)) return { error: ALIAS_INVALID };

  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (user.username) redirect("/");

  const supabase = await createClient();

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username.replace(/_/g, "\\_"))
    .maybeSingle();
  if (taken) return { error: ALIAS_TAKEN };

  const { error } = await supabase.from("profiles").insert({ id: user.id, username });
  if (error) {
    // 23505: carrera con el índice único de lower(username).
    return { error: error.code === "23505" ? ALIAS_TAKEN : GENERIC_ERROR };
  }

  redirect("/");
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
