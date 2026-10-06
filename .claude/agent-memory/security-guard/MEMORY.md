# Memoria de security-guard

## Baseline (SPEC 12 y 13)

- RLS activa en `games`, `scores`, `profiles`. Políticas esperadas:
  - `games_select_public` (SELECT, anon+authenticated, `true`)
  - `scores_select_public` (SELECT, `true`)
  - `scores_insert_public` (INSERT, `with check (user_id is null)`)
  - `profiles_select_public` (SELECT, `true`)
  - `profiles_insert_own` (INSERT, authenticated, `id = (select auth.uid())`)
  - Sin UPDATE ni DELETE en ninguna tabla.
- `public.rls_auto_enable()` sin EXECUTE para `public`, `anon`, `authenticated`; el event trigger `ensure_rls` sigue activo.
- `handle_new_user()` es SECURITY DEFINER con `search_path = ''`; trigger `on_auth_user_created`.
- Cabeceras en `next.config.ts`: X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS (sin preload).
- `proxy.ts` (no `middleware.ts`): `REQUIRES_SESSION = /auth/alias, /auth/reset` → `/auth`; `GUEST_ONLY = /auth, /auth/forgot` → `/`; `/auth/callback` público; sin `?next=`.
- Contraseña: 8+ con minúscula, mayúscula, dígito y símbolo (UI, Server Action y panel). Login sin regex. Rate limit 30 cada 5 min por IP (panel).

## Riesgos aceptados

- `auth_leaked_password_protection`: requiere plan Pro; el proyecto está en Free (decisión del usuario, SPEC 13).
- Sin CSP ni captcha todavía (specs futuras).
- `scores_insert_public` permite insertar como anónimo con `user_id` nulo: intencionado (jugar como invitado). Sin anti-trampas ni rate limit de `scores`.
- HSTS `includeSubDomains`: revisar cuando exista dominio de producción.

## Historial de auditorías

(vacío; primera ejecución pendiente)
