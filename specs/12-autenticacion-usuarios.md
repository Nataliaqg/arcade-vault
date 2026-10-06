# SPEC 12 — Autenticación: registro, login, OAuth y sesión

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 03, SPEC 05
> **Fecha:** 2026-10-06
> **Objetivo:** Que un jugador pueda crear una cuenta con email y contraseña o con Google/GitHub, elegir un alias único, iniciar y cerrar sesión, recuperar su contraseña y ver su alias en el nav y en el HUD.

## Por qué existe esta spec

`/auth` es una maqueta desde la SPEC 01: el formulario hace `preventDefault`, los botones sociales e invitado no hacen nada y el nav siempre muestra "Iniciar Sesión". `lib/supabase/server.ts` ya deja anotado que el proxy de sesión llegaría con la spec de auth. Esta spec da identidad real al jugador con Supabase Auth. Es la base para, en otra spec, ligar las puntuaciones al usuario.

## Alcance

**Dentro:**

- **Registro con email y contraseña** (pestaña CREAR CUENTA): alias, email, contraseña. Supabase envía un correo de confirmación. Hasta confirmarlo no hay sesión.
- **Vista "REVISA TU CORREO"** tras registrarse, con botón REENVIAR CORREO.
- **Ruta `/auth/callback`**: canjea el `?code=` (PKCE) por sesión. La usan el OAuth, el correo de confirmación y el de recuperación (con las plantillas de correo por defecto de Supabase).
- **Login con email y contraseña** (pestaña INICIAR SESIÓN). Mensajes de error en español.
- **Google y GitHub** con Supabase OAuth (PKCE), también por `/auth/callback`.
- **Alias** en la tabla `profiles`: único sin distinguir mayúsculas, 3 a 12 caracteres `[A-Za-z0-9_]`.
  - Email: se pide en el registro y lo crea un trigger al crear el usuario.
  - OAuth: la primera vez, `/auth/callback` redirige a `/auth/alias` para elegirlo.
- **Recuperación de contraseña**: enlace "¿OLVIDASTE TU CONTRASEÑA?" → `/auth/forgot` (pide email) → correo → `/auth/callback?next=/auth/reset` → `/auth/reset` (nueva contraseña).
- **Proxy de sesión** (`proxy.ts`) que refresca las cookies de Supabase en cada petición.
- **Nav con sesión**: el botón "Iniciar Sesión" se sustituye por el alias con un menú CERRAR SESIÓN (escritorio y panel móvil). Si hay sesión sin alias, el nav muestra "ELIGE TU ALIAS" hacia `/auth/alias`.
- **HUD del player**: muestra el alias en lugar de "INVITADO" cuando hay sesión.
- **JUGAR COMO INVITADO** pasa a ser un enlace a `/games`.
- **Redirecciones**: `/auth` y `/auth/forgot` redirigen a `/` con sesión iniciada. `/auth/alias` exige sesión sin alias. `/auth/reset` exige sesión.
- **Configuración manual** de Supabase (URLs y proveedores; las plantillas de correo se dejan por defecto), con checklist en esta spec.

**Fuera de alcance (para specs futuras):**

- Ligar puntuaciones al usuario (`scores.user_id`, cambiar la política RLS, guardar sin pedir nombre en el modal). El modal de fin de partida no cambia.
- Prellenar el modal de puntuación con el alias.
- Página `/perfil`, cambiar alias, email o contraseña desde la app, borrar la cuenta.
- Rutas que exijan login. Jugar sigue siendo libre.
- Volver a la página de origen tras el login (`?next=`). Siempre se va a `/`.
- Otros proveedores OAuth, magic link y sesión anónima de Supabase.
- SMTP propio y plantillas de correo con diseño del Vault.
- Confirmar el correo o recuperar la contraseña desde otro navegador o dispositivo (requiere plantillas editadas y, por tanto, SMTP propio).
- Dominio de producción en las URLs de redirección (solo `http://localhost:3000`).
- Captcha, rate limit propio y moderación de alias.
- El contador `CRÉDITOS · 03` del nav.
- Tests automatizados.

## Modelo de datos

Tabla `profiles` (esquema `public`), migración `create_profiles_table`:

```sql
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (username ~ '^[A-Za-z0-9_]{3,12}$'),
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));
```

RLS (activada):

- `select` para `anon` y `authenticated`. El alias es público; lo usarán los rankings.
- `insert` para `authenticated` con `with check (id = auth.uid())`. Lo usa `/auth/alias`.
- Sin `update` ni `delete`. El alias no se cambia en esta spec.

Trigger `on_auth_user_created` (`after insert on auth.users`), función `public.handle_new_user()` con `security definer` y `set search_path = ''`:

- Si `new.raw_user_meta_data->>'username'` existe, inserta `(new.id, username)` en `public.profiles`.
- Si no existe (OAuth), no hace nada y el usuario elige alias en `/auth/alias`.

Contratos en código:

```ts
// lib/auth/validation.ts (compartido)
export const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;
export const PASSWORD_MIN = 8;
export function isValidUsername(v: string): boolean;

// lib/auth/session.ts (servidor, envuelto en React cache)
export type CurrentUser = { id: string; email: string | null; username: string | null };
export function getCurrentUser(): Promise<CurrentUser | null>;

// app/auth/actions.ts ("use server"; usadas con useActionState)
type AuthState = { error?: string; sent?: boolean; email?: string };
signIn(prev: AuthState, form: FormData): Promise<AuthState>         // redirect("/") si ok
signUp(prev: AuthState, form: FormData): Promise<AuthState>         // { sent: true, email }
resendConfirmation(prev: AuthState, form: FormData): Promise<AuthState>
signInWithProvider(provider: "google" | "github"): Promise<never>   // redirect(url de Supabase)
requestPasswordReset(prev: AuthState, form: FormData): Promise<AuthState> // siempre { sent: true }
updatePassword(prev: AuthState, form: FormData): Promise<AuthState> // redirect("/")
setUsername(prev: AuthState, form: FormData): Promise<AuthState>    // redirect("/")
signOut(): Promise<never>                                           // redirect("/")
```

Convenciones:

- `signUp` comprueba antes si el alias está libre (`select` en `profiles` por `lower(username)`). Si el trigger falla por la carrera del índice único, se muestra "Ese alias ya está en uso".
- Errores de Supabase traducidos por `code`: `invalid_credentials`, `email_not_confirmed`, `user_already_exists`, `weak_password`, `over_email_send_rate_limit`. Cualquier otro: "No se pudo completar la operación. Inténtalo de nuevo".
- `requestPasswordReset` responde igual exista o no la cuenta, para no revelar emails registrados.
- Sin `localStorage` para la sesión: solo cookies de `@supabase/ssr`. Sin clave `service_role`.
- `app/layout.tsx` llama a `getCurrentUser()` y pasa `user` a `Nav` (client component). `app/games/[id]/play/page.tsx` pasa `playerLabel` (alias o "INVITADO") a `GamePlayer`.
- `signUp` pasa `options.emailRedirectTo = <origin>/auth/callback`; `requestPasswordReset` pasa `redirectTo = <origin>/auth/callback?next=/auth/reset`. `<origin>` sale de la cabecera `origin` de la petición.
- `/auth/callback` canjea el código con `exchangeCodeForSession`. Acepta `next` solo si vale exactamente `/auth/reset`; cualquier otro valor se ignora (no es el `?next=` de volver a la página de origen, que sigue fuera de alcance). Sin perfil → `/auth/alias`; con perfil → `/` (o `/auth/reset` si `next` lo pide).
- Si el canje falla (enlace caducado, usado, abierto en otro navegador, o sin código) → `/auth?error=link`, con el mensaje "El enlace no es válido o ha caducado. Ábrelo en el mismo navegador donde lo pediste, o solicita uno nuevo." y opción de pedirlo de nuevo.
- Rutas en inglés, como `/auth` y `/games`: `/auth/callback`, `/auth/alias`, `/auth/forgot`, `/auth/reset`.

Archivos nuevos o modificados:

| Archivo | Cambio |
| --- | --- |
| `proxy.ts` | Nuevo. Llama a `updateSession`; `matcher` excluye estáticos e imágenes. |
| `lib/supabase/proxy.ts` | Nuevo. `updateSession(request)` con `createServerClient` y cookies de request/response. |
| `lib/supabase/database.types.ts` | Regenerado con `profiles`. |
| `lib/auth/validation.ts`, `lib/auth/session.ts` | Nuevos. |
| `app/auth/actions.ts` | Nuevo. Server Actions. |
| `app/auth/page.tsx` | Redirige con sesión; renderiza `AuthForm`. |
| `app/auth/callback/route.ts` | Nuevo. Route Handler: canjea el código (OAuth, confirmación y recuperación). |
| `app/auth/alias/page.tsx`, `app/auth/forgot/page.tsx`, `app/auth/reset/page.tsx` | Nuevos. |
| `components/auth-form.tsx` | Reescrito con `useActionState`, vista "REVISA TU CORREO", OAuth e invitado. |
| `components/alias-form.tsx`, `components/password-forms.tsx`, `components/user-menu.tsx` | Nuevos. |
| `components/nav.tsx`, `app/layout.tsx` | Nav recibe `user`; menú de usuario. |
| `components/game-player.tsx`, `app/games/[id]/play/page.tsx` | HUD con `playerLabel`. |
| `app/globals.css` | Estilos del menú de usuario, mensajes de error y vistas nuevas. |

## Plan de implementación

1. **Configuración base en Supabase (manual).** En el panel de Supabase:
   - Authentication → URL Configuration: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:3000/**`.
   - Email → confirmación de email activada.
   - Las plantillas de correo no se tocan (editarlas exige SMTP propio). Si el SMTP por defecto agota su límite, confirmar usuarios a mano en Authentication → Users.

   Verificación: capturas o revisión visual del panel por el usuario.
2. **Migración `create_profiles_table`**: tabla, índice único, RLS, políticas, función `handle_new_user` y trigger. Consultar `search_docs` de Supabase (perfiles con trigger). Verificación: `list_tables` muestra `profiles` con RLS; `get_advisors` de seguridad sin avisos nuevos; un `insert` con alias `ab` o `a b` falla.
3. **Tipos**: `generate_typescript_types` en `lib/supabase/database.types.ts`. Verificación: `npx tsc --noEmit` pasa.
4. **Proxy de sesión**: leer `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` y `.../03-file-conventions/proxy.md`. Crear `lib/supabase/proxy.ts` y `proxy.ts`. Actualizar el comentario de `lib/supabase/server.ts`. Verificación: `npm run build` pasa y `/`, `/games`, `/salon` cargan igual.
5. **Sesión en servidor**: `lib/auth/validation.ts` y `lib/auth/session.ts` (`getCurrentUser` con `auth.getUser()` o `getClaims()` según la doc vigente, más `profiles`). Verificación: `npx tsc --noEmit` pasa.
6. **Nav y HUD**: `app/layout.tsx` pasa `user` a `Nav`; `components/user-menu.tsx` con el alias y CERRAR SESIÓN (`signOut`); "ELIGE TU ALIAS" si no hay alias; panel móvil igual. HUD con `playerLabel`. Verificación: sin sesión todo se ve como hoy y la consola no tiene errores de hidratación.
7. **Registro y login con email**: `app/auth/actions.ts` (`signIn`, `signUp`, `resendConfirmation`, `signOut`; el correo redirige a `/auth/callback`), `components/auth-form.tsx` con estados de carga, error y "REVISA TU CORREO". JUGAR COMO INVITADO enlaza a `/games`. `/auth` redirige a `/` con sesión. Verificación: registrar `tester_01`, confirmar desde el correo (en el mismo navegador), ver el alias en el nav, cerrar sesión e iniciar de nuevo.
8. **Recuperación de contraseña**: `requestPasswordReset` (con `redirectTo` a `/auth/callback?next=/auth/reset`), `updatePassword`, `/auth/forgot`, `/auth/reset` y el enlace en el login. Verificación: pedir el correo, abrir el enlace en el mismo navegador, fijar contraseña nueva y entrar con ella.
9. **Proveedores OAuth (manual)**: crear la OAuth App en GitHub y el cliente OAuth en Google Cloud con callback `https://<proyecto>.supabase.co/auth/v1/callback`; pegar client id y secret en Authentication → Providers. Verificación: ambos proveedores aparecen como activos.
10. **Login con Google y GitHub y alias**: `signInWithProvider`, `app/auth/callback/route.ts` (canjea el código; gestiona `next=/auth/reset` y los errores; sin perfil → `/auth/alias`, con perfil → `/`), `/auth/alias` con `components/alias-form.tsx` y `setUsername`. Verificación: primer login con GitHub pide alias; el segundo entra directo. Igual con Google.
11. **Cierre**: estados de error y vacío, ancho móvil, diseño final con `/frontend-design`. Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` (proxy, Server Actions, `redirect`, Route Handlers, `01-app/02-guides/authentication.md`) antes de escribir código, según `AGENTS.md`, y `search_docs` de Supabase para el patrón SSR vigente. Las pantallas se diseñan con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `list_tables` muestra `profiles` con RLS activa; `get_advisors` de seguridad no reporta avisos nuevos.
- [ ] Un `insert` en `profiles` con alias de 2 caracteres, de 13, con espacios o con un `id` distinto de `auth.uid()` es rechazado.
- [ ] Dos alias que solo difieren en mayúsculas (`Tester` / `tester`) no pueden coexistir.
- [ ] No se pueden hacer `UPDATE` ni `DELETE` sobre `profiles` con la clave publishable.
- [ ] Registrarse con alias, email y contraseña válidos muestra "REVISA TU CORREO" y no inicia sesión.
- [ ] Registrarse con un alias ya usado muestra "Ese alias ya está en uso" y no envía correo.
- [ ] Registrarse con un email ya registrado o con contraseña de menos de 8 caracteres muestra un error en español.
- [ ] El enlace del correo de confirmación, abierto en el mismo navegador del registro, pasa por `/auth/callback`, inicia sesión y lleva a `/` con el alias visible en el nav.
- [ ] El registro con email crea la fila en `profiles` con el alias elegido.
- [ ] Iniciar sesión con contraseña incorrecta muestra "Email o contraseña incorrectos"; con email sin confirmar muestra el aviso y la opción de reenviar.
- [ ] Con sesión, el nav muestra el alias y su menú tiene CERRAR SESIÓN, en escritorio y en el panel móvil.
- [ ] CERRAR SESIÓN borra la sesión, lleva a `/` y el nav vuelve a "Iniciar Sesión".
- [ ] La sesión sobrevive a recargar la página y a cerrar y abrir la pestaña.
- [ ] Con sesión, `/auth` y `/auth/forgot` redirigen a `/`.
- [ ] El primer login con GitHub o Google redirige a `/auth/alias`; tras elegir alias se va a `/` y el nav lo muestra. El segundo login entra directo a `/`.
- [ ] `/auth/alias` sin sesión redirige a `/auth`; con alias ya elegido redirige a `/`.
- [ ] Con sesión sin alias, el nav muestra "ELIGE TU ALIAS".
- [ ] "¿OLVIDASTE TU CONTRASEÑA?" envía el correo y muestra el mismo mensaje exista o no la cuenta.
- [ ] El enlace de recuperación lleva a `/auth/reset`; la nueva contraseña funciona y la antigua no.
- [ ] `/auth/reset` sin sesión redirige a `/auth/forgot`.
- [ ] Un enlace de confirmación o recuperación caducado, usado o abierto en otro navegador muestra un error en `/auth` con opción de volver a pedirlo, no una pantalla en blanco.
- [ ] Cancelar el consentimiento en Google o GitHub vuelve a `/auth` con un mensaje de error.
- [ ] JUGAR COMO INVITADO lleva a `/games`; se puede jugar y guardar puntuación sin sesión, igual que antes.
- [ ] En `/games/<id>/play` el HUD muestra el alias con sesión e "INVITADO" sin ella.
- [ ] El modal de fin de partida funciona igual que antes y guarda con `user_id` nulo.
- [ ] La consola no muestra errores ni warnings de hidratación en `/`, `/auth`, `/salon` y `/games/<id>/play`, con y sin sesión.
- [ ] La sesión no se guarda en `localStorage`; no se usa la clave `service_role`.
- [ ] Las pantallas de auth se ven bien a ancho móvil (sin scroll horizontal).

## Decisiones

- **Sí:** email + contraseña, Google y GitHub en la misma spec (decisión del usuario). **No:** separar OAuth en otra spec.
- **Sí:** ligar puntuaciones al usuario en otra spec. **No:** tocar `scores` aquí; la spec se centra en la autenticación.
- **Sí:** login con email y alias como nombre visible. **No:** login con alias; obliga a resolver alias→email en servidor y facilita enumerar cuentas.
- **Sí:** alias en `profiles`, único sin distinguir mayúsculas, `[A-Za-z0-9_]{3,12}`. Los 3–12 caracteres coinciden con `player_name`, para usarlo después en los rankings.
- **Sí:** el alias del registro por email lo crea un trigger desde `raw_user_meta_data`. **No:** insertarlo desde la app tras confirmar; sin sesión hasta la confirmación, RLS no lo permitiría.
- **Sí:** OAuth elige alias en `/auth/alias` la primera vez. **No:** alias autogenerado desde el proveedor; el usuario no lo controlaría.
- **Sí:** confirmación de email obligatoria. **No:** entrar sin confirmar; permitiría emails falsos.
- **Sí:** enlace por defecto de Supabase con PKCE y `/auth/callback`, sin SMTP propio. **No:** plantillas editadas con `token_hash` + `verifyOtp`; Supabase exige SMTP propio para editarlas. Limitación aceptada: el enlace solo funciona en el navegador donde se pidió.
- **Sí:** recuperación de contraseña incluida, con respuesta idéntica exista o no la cuenta.
- **Sí:** Server Actions con `useActionState`. La sesión se escribe en cookies del servidor y no hay endpoints propios.
- **Sí:** `proxy.ts` que refresca la sesión. Es la convención de Next 16 (antes `middleware.ts`).
- **Sí:** ninguna ruta exige login; jugar sigue siendo libre. **No:** página `/perfil`.
- **Sí:** JUGAR COMO INVITADO es un enlace a `/games`. **No:** sesión anónima de Supabase.
- **Sí:** el usuario configura proveedores, URLs y plantillas en el panel, con checklist. El MCP de Supabase no puede hacerlo.
- **Sí:** solo `http://localhost:3000` como URL de redirección. El dominio de producción se añade cuando exista despliegue.
- **Sí:** el nav recibe `user` desde el layout (servidor). **No:** leer la sesión en el cliente con `onAuthStateChange`; provoca parpadeo y desajustes de hidratación.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El SMTP por defecto de Supabase permite muy pocos correos por hora | Error `over_email_send_rate_limit` traducido. SMTP propio fuera de alcance; en pruebas, confirmar usuarios desde el panel si hace falta. |
| Enlace abierto en otro navegador: falta el verificador PKCE y el canje falla | Mensaje claro con opción de pedir otro enlace. Aceptado en desarrollo. |
| Supabase puede devolver el error de un enlace caducado en el fragmento `#` de la URL, que el servidor no ve | `/auth/callback` trata también la ausencia de código como error y redirige a `/auth?error=link`. |
| Carrera entre la comprobación del alias y el trigger | Índice único `lower(username)`; el error del trigger se traduce a "alias en uso". |
| Si el trigger falla, Supabase devuelve un error genérico y no crea el usuario | Validar el alias antes de `signUp`; probar el caso del alias duplicado. |
| Mismo email con contraseña y con Google: Supabase enlaza las identidades | Comportamiento aceptado: ambas entradas llevan a la misma cuenta y al mismo alias. |
| `getCurrentUser` en el layout hace dinámicas todas las páginas | Ya lo son por las lecturas con `cookies()`. `cache()` evita llamadas repetidas por petición. |
| El proxy en cada petición añade latencia | `matcher` excluye `_next/static`, `_next/image`, imágenes y `favicon.ico`. |
| `redirect()` dentro de `try/catch` en una Server Action se traga la redirección | Llamar a `redirect()` fuera del `try/catch`, según la doc de Next. |
| Usuario OAuth abandona `/auth/alias` y queda sin alias | El nav muestra "ELIGE TU ALIAS"; `/auth/callback` vuelve a pedirlo en el siguiente login. |
| Credenciales OAuth expuestas | Client secret solo en el panel de Supabase, nunca en el repo ni en `.env.local`. |

## Qué **no** está en esta spec

- Ligar puntuaciones al usuario y prellenar el modal con el alias.
- Página de perfil, cambiar alias, email o contraseña, borrar cuenta.
- Rutas protegidas y `?next=`.
- Otros proveedores, magic link y sesión anónima.
- SMTP propio, plantillas con diseño y dominio de producción.
- Captcha, rate limit y moderación de alias.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
