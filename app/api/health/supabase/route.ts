import { createClient } from "@/lib/supabase/server";

type HealthResponse = { status: "ok" } | { status: "error"; message: string };

function json(body: HealthResponse, status = 200) {
  return Response.json(body, { status });
}

export async function GET() {
  try {
    // Valida las variables de entorno y que el cliente de servidor se crea.
    await createClient();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
      {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
        cache: "no-store",
      },
    );

    if (!res.ok) throw new Error(`status ${res.status}`);

    return json({ status: "ok" });
  } catch {
    return json(
      { status: "error", message: "No se pudo conectar con Supabase" },
      500,
    );
  }
}
