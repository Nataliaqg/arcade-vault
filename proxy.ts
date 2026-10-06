import { NextResponse, type NextRequest } from "next/server";
import { GUEST_ONLY, REQUIRES_SESSION } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/proxy";

// Cabeceras que Supabase añade a la respuesta con la sesión refrescada.
const SESSION_HEADERS = ["cache-control", "expires", "pragma"];

export async function proxy(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Primera capa (optimista): las páginas y las Server Actions siguen validando la sesión.
  const target =
    !hasSession && REQUIRES_SESSION.includes(pathname)
      ? "/auth"
      : hasSession && GUEST_ONLY.includes(pathname)
        ? "/"
        : null;
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Conserva las cookies de sesión refrescadas; si no, el redirect cerraría la sesión.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  SESSION_HEADERS.forEach((name) => {
    const value = response.headers.get(name);
    if (value) redirect.headers.set(name, value);
  });
  return redirect;
}

export const config = {
  matcher: [
    // Excluye estáticos, optimización de imágenes, favicon e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
