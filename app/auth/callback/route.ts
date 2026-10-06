import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Solo se acepta esta ruta interna como destino alternativo (recuperación de contraseña).
const ALLOWED_NEXT = "/auth/reset";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") === ALLOWED_NEXT ? ALLOWED_NEXT : null;

  const fail = () => NextResponse.redirect(`${origin}/auth?error=link`);
  // El proveedor devuelve ?error=... si el usuario cancela el consentimiento.
  if (searchParams.has("error")) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }
  if (!code) return fail();

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();

  if (next) return NextResponse.redirect(`${origin}${next}`);

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return fail();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.redirect(`${origin}${profile ? "/" : "/auth/alias"}`);
}
