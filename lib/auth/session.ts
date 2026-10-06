import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  username: string | null;
};

/**
 * Usuario de la sesión actual (o null). Valida el JWT con getClaims() y lee el
 * alias de `profiles`. Envuelto en cache() para una sola consulta por petición.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    username: profile?.username ?? null,
  };
});
