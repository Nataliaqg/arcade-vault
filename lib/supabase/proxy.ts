import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Refresca la sesión de Supabase en cada petición y reescribe las cookies
 * en la request (para los Server Components) y en la response (para el navegador).
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; hasSession: boolean }> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { response: supabaseResponse, hasSession: false };

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) =>
          supabaseResponse.headers.set(k, v),
        );
      },
    },
  });

  // No ejecutar código entre createServerClient y getClaims(): si se quita,
  // la sesión puede caducar de forma aleatoria en el servidor.
  const { data } = await supabase.auth.getClaims();

  return { response: supabaseResponse, hasSession: !!data?.claims };
}
