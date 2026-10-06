// Rutas de cuenta protegidas por proxy.ts. Lista cerrada, comparación por
// igualdad exacta de pathname: /auth/callback queda fuera a propósito.

/** Sin sesión se redirige a /auth. */
export const REQUIRES_SESSION: readonly string[] = ["/auth/alias", "/auth/reset"];

/** Con sesión se redirige a /. */
export const GUEST_ONLY: readonly string[] = ["/auth", "/auth/forgot"];
