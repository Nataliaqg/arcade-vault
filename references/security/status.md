# Estado de seguridad — Arcade Vault

- **Fecha:** 2026-10-06
- **Commit auditado:** `913f565` (rama `spec-13-seguridad-basica`)
- **Auditor:** agente `security-guard`
- **Baseline:** SPEC 12 (autenticación) y SPEC 13 (seguridad básica)
- **Semáforo:** BD verde (0 críticas/altas/medias) · App verde (0 críticas/altas/medias)

## Base de datos (Supabase)

| Control | Estado | Evidencia |
| --- | --- | --- |
| Advisors de seguridad | ✅ | Solo `auth_leaked_password_protection` (ACEPTADA, plan Free). 0028/0029 ya no aparecen. |
| Advisors de rendimiento | ⚠️ | INFO `unused_index` en `scores_user_id_idx` (esperable: 0 filas con `user_id`). |
| RLS en todas las tablas de `public` | ✅ | `games`, `profiles`, `scores` con `relrowsecurity = true`; no hay otras tablas, vistas ni matviews. |
| Políticas vs SPEC 13 | ✅ | 5 políticas idénticas a la tabla de la spec; todas con `TO` explícito; `(select auth.uid())`; sin UPDATE/DELETE. |
| Grants anon/authenticated | ⚠️ | `has_table_privilege` = true para SELECT/INSERT/UPDATE/DELETE/TRUNCATE en las 3 tablas (grants por defecto de Supabase). UPDATE/DELETE bloqueados por RLS (sin políticas). Ver B1. |
| Privilegios por defecto en `public` | ⚠️ | `pg_default_acl`: tablas nuevas `arwdDxtm` y funciones nuevas `EXECUTE` para anon/authenticated. Ver B1. |
| `rls_auto_enable()` | ✅ | SECURITY DEFINER, `search_path=pg_catalog`, EXECUTE false para public/anon/authenticated. |
| `handle_new_user()` | ✅ | SECURITY DEFINER, `search_path=''`, EXECUTE false para public/anon/authenticated. |
| Event trigger `ensure_rls` | ✅ | Activo (`ddl_command_end` → `rls_auto_enable`). |
| Trigger `on_auth_user_created` | ✅ | Activo en `auth.users` → `handle_new_user`. |
| Extensiones | ✅ | Ninguna en `public` (`uuid-ossp`, `pgcrypto`, `pg_stat_statements` en `extensions`). |
| Restricciones de datos | ✅ | CHECK `score` 0–10 000 000, `player_name` 3–12, `username ~ ^[A-Za-z0-9_]{3,12}$`, índice único `lower(username)`. |
| Integridad de datos | ✅ | 6 scores, 0 fuera de rango, 0 nombres inválidos, 0 con `user_id`, máx. 1 por nombre y minuto. 1 perfil. |
| Logs de auth (24 h) | ✅ | Sin 5xx ni `over_request_rate_limit`; 2 `invalid_credentials`, 1 `OAuth state parameter missing` (aislado). |

## Aplicación (Next.js)

| Control | Estado | Evidencia |
| --- | --- | --- |
| `proxy.ts` / `lib/auth/routes.ts` | ✅ | Listas cerradas, `includes(pathname)` exacto; cookies y cabeceras de sesión copiadas al redirect; destinos fijos. |
| `middleware.ts` | ✅ | No existe. |
| Rutas `app/auth/*` | ✅ | `alias`, `reset` en REQUIRES_SESSION; `/auth`, `forgot` en GUEST_ONLY; `callback` público. Sin rutas nuevas fuera de lista. |
| `/auth/callback` | ✅ | `next` solo si `=== "/auth/reset"`; destino construido sobre `origin` de la URL (Host forjado no se refleja en local). |
| Server Actions (`app/auth/actions.ts`) | ⚠️ | Revalidan alias/email/contraseña, `redirect()` fuera de try/catch, errores traducidos. Ver A1, A2, A3. |
| Comprobación de sesión en páginas | ✅ | `alias`, `reset`, `/auth`, `forgot` llaman a `getCurrentUser()` (defensa en profundidad). |
| `lib/auth/validation.ts` | ✅ | `PASSWORD_RE` y `PASSWORD_SYMBOLS` coinciden con la SPEC 13; login sin regex. |
| Cabeceras (`next.config.ts`) | ✅ | Las 5 de la SPEC 13; sin CSP (ACEPTADA). Verificado con `curl -I` en `/`, `/games`, `/auth`. |
| Redirects del proxy en vivo | ✅ | Sin sesión `/auth/alias` y `/auth/reset` → 307 `/auth`; `/auth/alias/` → 308 normalizado; `/AUTH/ALIAS` → 404. |
| Secretos | ✅ | Sin `service_role`, JWT ni claves literales. Solo `.env.example` versionado (valores vacíos). `NEXT_PUBLIC_*` = URL + publishable. |
| Cliente | ✅ | Sesión solo en cookies `@supabase/ssr`; localStorage solo nombre y skin. Sin `dangerouslySetInnerHTML`/`eval`/`innerHTML`. `submitScore` no envía `user_id`. |
| Dependencias | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades. |
| Lint / tipos | ✅ | `npm run lint` y `npx tsc --noEmit` sin errores. |
| Build | ⚠️ | `npm run build` no ejecutado (había un servidor corriendo en :3000 que usa `.next`). No verificado en esta auditoría. |

## Hallazgos abiertos

### CRÍTICA / ALTA / MEDIA

Ninguno.

### BAJA

- **B1 — Grants amplios y privilegios por defecto en `public`.** anon/authenticated tienen UPDATE, DELETE y TRUNCATE en `games`, `scores`, `profiles` e INSERT en `games`; hoy solo los frena RLS (TRUNCATE no lo evalúa RLS, aunque PostgREST no lo expone). Las funciones nuevas en `public` nacen con EXECUTE para anon/authenticated: una futura función SECURITY DEFINER quedaría expuesta por RPC. *Remedio (migración `harden_public_grants`, no aplicada):*
  ```sql
  revoke update, delete, truncate on public.games, public.scores, public.profiles from anon, authenticated;
  revoke insert on public.games from anon, authenticated;
  alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, public;
  ```
  (Si se aplica, revisar que `profiles_insert_own` y `scores_insert_public` siguen funcionando.)
- **B2 — Índice `scores_user_id_idx` sin uso (advisor INFO).** Esperable hasta que `scores` se ligue al usuario; cubre la FK. *Remedio:* mantener; reevaluar en la spec que ligue `scores` al usuario.
- **A1 — `getOrigin()` deriva las URLs de redirección de las cabeceras `Origin`/`Host`** (`app/auth/actions.ts:47-50`). Hoy lo contiene la allow-list de Redirect URLs del panel (`http://localhost:3000/**`); con un comodín amplio en producción permitiría enviar enlaces de confirmación/recuperación a otro dominio. *Remedio:* usar una URL fija de entorno (p. ej. `SITE_URL`) o validar el origin contra una lista.
- **A2 — `signUp` revela si un email ya está registrado** (`app/auth/actions.ts:111-113`, des-ofusca `identities.length === 0`). Permite enumerar cuentas, al contrario que `requestPasswordReset`. *Remedio:* responder `{ sent: true }` en ese caso (decisión UX del usuario).
- **A3 — `signInWithProvider` no valida `provider` en runtime** (`app/auth/actions.ts:167`). El tipo TS no protege una Server Action. *Remedio:* `if (provider !== "google" && provider !== "github") redirect("/auth?error=oauth")`.

### ACEPTADA

- `auth_leaked_password_protection` (plan Free).
- Sin CSP ni captcha (specs futuras).
- `scores_insert_public` anónimo con `user_id` nulo; sin anti-trampas ni rate limit de `scores`.
- HSTS `includeSubDomains` (revisar con dominio de producción).

## Verificaciones manuales pendientes (panel de Supabase)

Sin confirmación registrada del usuario a fecha 2026-10-06:

- [ ] Minimum password length = 8 y Password requirements = "Lowercase, uppercase letters, digits and symbols".
- [ ] Rate limit *Sign-ups and sign-ins* = 30 cada 5 min por IP.
- [ ] Site URL `http://localhost:3000` y Redirect URLs `http://localhost:3000/**` (sin comodines más amplios; relevante para A1).
- [ ] Confirmación de email activa.
- [ ] Proveedores OAuth (GitHub, Google) con callback correcto.
- [ ] *Secure password change* / reautenticación para cambio de contraseña (hoy `updatePassword` solo exige sesión).
