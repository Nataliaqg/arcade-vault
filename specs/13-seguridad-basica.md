# SPEC 13 — Seguridad básica: RLS, contraseñas, rate limit y cabeceras

> **Estado:** Approved
> **Depende de:** SPEC 03, SPEC 12
> **Fecha:** 2026-10-06
> **Objetivo:** Cerrar el checklist de seguridad básico (RLS verificada, función `rls_auto_enable` sin acceso público, contraseña fuerte de 8+ caracteres validada en UI, servidor y Supabase, límite de registros por IP, cabeceras HTTP de seguridad y protección de rutas de cuenta en `proxy.ts`), dejando documentado lo que el plan Free no permite.

## Por qué existe esta spec

Con la SPEC 12 hay cuentas reales, así que el Security Advisor de Supabase y el checklist `references/security/checklist.md` señalan huecos:

- `public.rls_auto_enable()` es `SECURITY DEFINER` y `anon` y `authenticated` pueden ejecutarla en `/rest/v1/rpc/rls_auto_enable` (avisos `anon_/authenticated_security_definer_function_executable`).
- La protección contra contraseñas filtradas está desactivada (`auth_leaked_password_protection`).
- La longitud mínima de contraseña y el límite de registros por IP dependen de la configuración del panel y nadie los ha revisado.
- Next.js no envía cabeceras de seguridad.
- Las rutas de cuenta solo se protegen dentro de cada página (`redirect()` en `app/auth/*`). El proxy refresca la sesión pero no decide nada.

RLS ya está activa en `games`, `scores` y `profiles`. Aquí solo se verifica y se documenta.

## Alcance

**Dentro:**

- **Verificar RLS** en `games`, `scores` y `profiles`, y que sus políticas son las esperadas (tabla en "Modelo de datos"). No se cambian políticas.
- **Migración `revoke_rls_auto_enable_execute`**: `revoke execute on function public.rls_auto_enable() from public, anon, authenticated;`. El event trigger `ensure_rls` sigue activando RLS en tablas nuevas.
- **Contraseña fuerte en el panel**: Authentication → Providers → Email (o Attack Protection, según la versión del panel):
  - *Minimum password length* = 8, alineado con `PASSWORD_MIN`.
  - *Password requirements* = "Lowercase, uppercase letters, digits and symbols".
- **Contraseña fuerte en la app** con `PASSWORD_RE` en `lib/auth/validation.ts`:
  - Se aplica al registro (pestaña CREAR CUENTA de `components/auth-form.tsx`) y a la contraseña nueva (`ResetForm` en `components/password-forms.tsx`).
  - **UI:** bajo el campo, una línea de ayuda fija con los requisitos ("Mín. 8 caracteres con mayúscula, minúscula, número y símbolo"). Al enviar, un `onSubmit` comprueba `isValidPassword`. Si no cumple, hace `preventDefault`, no llama a la Server Action ni a Supabase y muestra en `.auth-error` (`role="alert"`) qué falta, p. ej. "La contraseña debe incluir: una mayúscula, un símbolo". El error se borra al editar el campo.
  - **Servidor:** `signUp` y `updatePassword` repiten la comprobación con `isValidPassword` antes de llamar a Supabase y devuelven el mismo mensaje.
  - `weak_password` de Supabase se traduce al mensaje de requisitos completo.
  - **Login sin regex:** INICIAR SESIÓN no valida el formato; las cuentas creadas antes de esta spec siguen entrando.
- **Límite de sign-ups y sign-ins por IP** en el panel (Authentication → Rate Limits → *Sign-ups and sign-ins*): 30 solicitudes cada 5 minutos por IP.
- **Traducir `over_request_rate_limit`** en `translateError` (`app/auth/actions.ts`): "Demasiados intentos. Espera unos minutos e inténtalo de nuevo".
- **Cabeceras de seguridad** en `next.config.ts` con `headers()` para `source: "/(.*)"`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- **Protección de rutas en `proxy.ts`** (en Next 16 `middleware.ts` se llama `proxy.ts`; ya existe y refresca la sesión, así que no se crea un `middleware.ts`):
  - Sin sesión, `/auth/alias` y `/auth/reset` → redirect a `/auth`.
  - Con sesión, `/auth` y `/auth/forgot` → redirect a `/`.
  - `/auth/callback` no se toca: es público, canjea el código y decide su propio destino.
  - Siempre a un destino fijo, sin `?next=` (sigue fuera de alcance, como en la SPEC 12).
  - La sesión sale de `getClaims()` en `updateSession`. La redirección conserva las cookies que Supabase haya refrescado.
  - Las comprobaciones de las páginas y de las Server Actions se mantienen: el proxy es la primera capa, no la única.
  - Se conserva el `matcher` actual (excluye estáticos e imágenes). Las rutas protegidas son una lista cerrada en `lib/auth/routes.ts`.
- **Contraseñas filtradas**: se documenta como limitación del plan Free. El aviso 3 queda abierto a propósito.
- **Actualizar `references/security/checklist.md`**: marcar los puntos resueltos y anotar el de contraseñas filtradas como pendiente (plan Free).

**Fuera de alcance (para specs futuras):**

- Content-Security-Policy (con nonce en `proxy.ts`); afecta a Supabase, OAuth y las fuentes.
- Captcha (Turnstile/hCaptcha) en el registro.
- Exigir login para `/games/*`, `/salon` o jugar: contradice la SPEC 12 (jugar libre) y el guardado de puntuaciones como invitado.
- Volver a la página de origen tras el login (`?next=`).
- Comprobación propia contra HaveIBeenPwned.
- Medidor de fortaleza en vivo y botón de mostrar/ocultar contraseña.
- Obligar a las cuentas existentes a cambiar una contraseña que no cumpla los requisitos.
- Cambiar las políticas RLS (p. ej. ligar `scores` al usuario, que va en su spec).
- Validación anti-trampas de puntuaciones o rate limit de `scores`.
- `revoke` sobre `handle_new_user()` u otras funciones; el advisor no las señala.
- Pasar al plan Pro.
- MFA, SMTP propio y dominio de producción.
- Tests automatizados.

## Modelo de datos

No hay tablas ni columnas nuevas. Cambia un permiso:

```sql
-- migración revoke_rls_auto_enable_execute
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Políticas RLS esperadas (se verifican, no se cambian):

| Tabla | Política | Comando | Roles | Condición |
| --- | --- | --- | --- | --- |
| `games` | `games_select_public` | SELECT | anon, authenticated | `true` |
| `scores` | `scores_select_public` | SELECT | anon, authenticated | `true` |
| `scores` | `scores_insert_public` | INSERT | anon, authenticated | `with check (user_id is null)` |
| `profiles` | `profiles_select_public` | SELECT | anon, authenticated | `true` |
| `profiles` | `profiles_insert_own` | INSERT | authenticated | `with check (id = (select auth.uid()))` |

Validación de contraseña (compartida cliente/servidor):

```ts
// lib/auth/validation.ts
export const PASSWORD_MIN = 8; // ya existe
// Mismo conjunto de símbolos que Supabase: !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";
export const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]).{8,}$/;
export const PASSWORD_HINT = "Mín. 8 caracteres con mayúscula, minúscula, número y símbolo";
export function isValidPassword(v: string): boolean;
// Lista de requisitos que faltan, en español, para el mensaje de error:
// "8 caracteres" | "una minúscula" | "una mayúscula" | "un número" | "un símbolo"
export function missingPasswordRules(v: string): string[];
```

Cabeceras en código:

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
// nextConfig.headers = async () => [{ source: "/(.*)", headers: securityHeaders }]
```

Rutas de cuenta (`lib/auth/routes.ts`, lista cerrada):

```ts
export const REQUIRES_SESSION = ["/auth/alias", "/auth/reset"] as const; // sin sesión → /auth
export const GUEST_ONLY = ["/auth", "/auth/forgot"] as const;            // con sesión → /
// Comparación por igualdad exacta de pathname (sin prefijos): /auth/callback queda fuera.
```

```ts
// proxy.ts (esquema)
export async function proxy(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const target =
    !hasSession && REQUIRES_SESSION.includes(pathname) ? "/auth"
    : hasSession && GUEST_ONLY.includes(pathname) ? "/"
    : null;
  if (!target) return response;
  const redirect = NextResponse.redirect(new URL(target, request.url));
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c)); // cookies refrescadas
  return redirect;
}
```

`updateSession` pasa a devolver `{ response, hasSession }` (`hasSession = !!claims`).

Archivos modificados:

| Archivo | Cambio |
| --- | --- |
| `proxy.ts` | Decide el redirect según `hasSession` y las listas de rutas. |
| `lib/supabase/proxy.ts` | `updateSession` devuelve `{ response, hasSession }`. |
| `lib/auth/routes.ts` | Nuevo. `REQUIRES_SESSION` y `GUEST_ONLY`. |
| `next.config.ts` | `securityHeaders` y `headers()`, junto a los `redirects()` actuales. |
| `lib/auth/validation.ts` | `PASSWORD_RE`, `PASSWORD_HINT`, `isValidPassword`, `missingPasswordRules`. |
| `app/auth/actions.ts` | `over_request_rate_limit` en `translateError`; `weak_password` con el mensaje de requisitos; `signUp` y `updatePassword` validan con `isValidPassword`. |
| `components/auth-form.tsx` | En CREAR CUENTA: ayuda bajo la contraseña, `onSubmit` que bloquea el envío y error local. |
| `components/password-forms.tsx` | Lo mismo en `ResetForm`. |
| `app/globals.css` | Estilo de la línea de ayuda (`.field-hint`) si hace falta. |
| `references/security/checklist.md` | Casillas marcadas y nota del plan Free. |

## Plan de implementación

1. **Verificar RLS (solo lectura).** Con `execute_sql`, `pg_class.relrowsecurity` y `pg_policies` de `public`. Verificación: las 3 tablas con RLS y las políticas coinciden con la tabla de arriba.
2. **Migración `revoke_rls_auto_enable_execute`** con `apply_migration`. Verificación:
   - `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` y lo mismo para `authenticated` devuelven `false`.
   - Prueba del event trigger en una transacción con `rollback`: `create table public._rls_probe(id int)` deja `relrowsecurity = true`.
   - `get_advisors` de seguridad ya no muestra los avisos 0028/0029.
3. **Configuración manual en el panel de Supabase** (la hace el usuario; el MCP no puede):
   - *Minimum password length* = 8.
   - *Password requirements* = "Lowercase, uppercase letters, digits and symbols".
   - Authentication → Rate Limits → *Sign-ups and sign-ins* = 30 cada 5 min por IP.
   - Authentication → Attack Protection → *Leaked password protection*: no disponible en Free; no se toca.

   Verificación: revisión visual del panel por el usuario.
4. **Validación en servidor.** En `lib/auth/validation.ts`: `PASSWORD_RE`, `PASSWORD_HINT`, `isValidPassword` y `missingPasswordRules`. En `app/auth/actions.ts`:
   - `signUp` y `updatePassword` sustituyen el `length < PASSWORD_MIN` por `isValidPassword`;
   - `weak_password` devuelve el mensaje de requisitos;
   - se añade `over_request_rate_limit`.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
5. **Validación en la UI** de CREAR CUENTA y `ResetForm`, con el diseño revisado con `/frontend-design`:
   - la línea de ayuda bajo el campo;
   - el `onSubmit` que bloquea el envío y muestra lo que falta en `.auth-error`;
   - el error local se limpia al escribir.

   Verificación: `abcdefgh` muestra el error sin petición de red (pestaña Network vacía). `Abcdef1!` envía.
6. **Cabeceras en `next.config.ts`.** Consultar antes `node_modules/next/dist/docs/` (`headers` en `next.config`). Verificación: `npm run build`, `npm start` y `curl -I` a `/`, `/games` y `/auth` muestran las 5 cabeceras.
7. **Protección de rutas en `proxy.ts`.** Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` y `.../03-file-conventions/proxy.md`. Crear `lib/auth/routes.ts`, hacer que `updateSession` devuelva `{ response, hasSession }` y añadir el redirect en `proxy.ts`. Verificación:
   - Sin sesión, `curl -I /auth/alias` y `/auth/reset` devuelven 307 a `/auth`.
   - Con sesión, `/auth` y `/auth/forgot` redirigen a `/` y `/auth/alias` sin alias sigue funcionando.
   - `/`, `/games`, `/salon`, `/games/<id>/play` y `/auth/callback` no redirigen en ningún caso.
   - Tras un redirect, la cookie de sesión refrescada sigue en la respuesta.
8. **Regresión.** Login con email, login con GitHub/Google, `/auth/callback`, recuperación de contraseña, jugar y guardar puntuación como invitado. Verificación: todo funciona como antes y la consola no muestra errores.
9. **Checklist.** Marcar RLS, contraseña mínima (y requisitos de caracteres), rate limit y cabeceras; dejar *Leaked password protection* sin marcar con la nota "Requiere plan Pro (proyecto en Free)". Verificación: `git diff` del archivo.

Cada paso deja la app funcionando y se puede commitear por separado.

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games`, `scores` y `profiles` tienen `relrowsecurity = true` y sus políticas coinciden con la tabla del modelo de datos.
- [ ] `has_function_privilege` de `anon` y `authenticated` sobre `public.rls_auto_enable()` devuelve `false`.
- [ ] Una llamada `POST /rest/v1/rpc/rls_auto_enable` con la clave publishable devuelve error de permisos.
- [ ] Una tabla creada en `public` dentro de una transacción de prueba nace con RLS activa (el event trigger sigue funcionando).
- [ ] `get_advisors` de seguridad solo muestra `auth_leaked_password_protection`.
- [ ] El panel muestra *Minimum password length* = 8, *Password requirements* = "Lowercase, uppercase letters, digits and symbols" y el límite de sign-ups y sign-ins = 30 cada 5 min.
- [ ] `isValidPassword`: `Abcdef1!` → `true`; `abcdef1!`, `ABCDEF1!`, `Abcdefg!`, `Abcdefg1` y `Abc1!` → `false`.
- [ ] En CREAR CUENTA y en `/auth/reset`, una contraseña que no cumple muestra en `.auth-error` qué falta y no genera ninguna petición de red (no se llama a la Server Action ni a Supabase).
- [ ] La línea de ayuda con los requisitos se ve bajo el campo de contraseña en CREAR CUENTA y en `/auth/reset`, también a ancho móvil.
- [ ] Al editar la contraseña tras un error, el mensaje desaparece.
- [ ] Una petición directa a la Server Action `signUp` o `updatePassword` con una contraseña débil devuelve el error sin llamar a Supabase.
- [ ] INICIAR SESIÓN no aplica la regex: una cuenta existente con contraseña antigua (p. ej. solo minúsculas) sigue entrando.
- [ ] Al superar el límite por IP, `/auth` muestra "Demasiados intentos. Espera unos minutos e inténtalo de nuevo".
- [ ] `curl -I http://localhost:3000/` (con `npm start`) devuelve `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y `Strict-Transport-Security` con los valores de la spec. Lo mismo en `/games` y `/auth`.
- [ ] Sin sesión, `/auth/alias` y `/auth/reset` responden con redirect a `/auth` desde el proxy (comprobable con `curl -I`, sin ejecutar la página).
- [ ] Con sesión, `/auth` y `/auth/forgot` redirigen a `/`.
- [ ] `/`, `/games`, `/games/<id>`, `/games/<id>/play`, `/salon` y `/auth/callback` no redirigen con ni sin sesión.
- [ ] Un redirect del proxy conserva las cookies de sesión refrescadas (no hay cierres de sesión aleatorios al navegar).
- [ ] Las páginas `app/auth/*` y las Server Actions siguen comprobando la sesión por su cuenta.
- [ ] No existe un `middleware.ts`; la lógica vive en `proxy.ts`.
- [ ] Login con email, con GitHub y con Google, la confirmación por correo y la recuperación de contraseña siguen funcionando.
- [ ] Se puede jugar y guardar puntuación como invitado; el mando táctil funciona a ancho móvil.
- [ ] La consola no muestra errores nuevos en `/`, `/auth`, `/salon` y `/games/<id>/play`.
- [ ] `references/security/checklist.md` tiene marcados los puntos resueltos y anotado el pendiente.

## Decisiones

- **Sí:** `REVOKE EXECUTE` sobre `rls_auto_enable()`. Es el cambio mínimo; Postgres no comprueba `EXECUTE` al disparar un event trigger. **No:** moverla a un schema privado (más piezas) ni borrarla (se pierde el RLS automático).
- **Sí:** aceptar el aviso de contraseñas filtradas porque el proyecto está en el plan Free (decisión del usuario). **No:** comprobación propia contra HIBP (dependencia externa en tiempo de ejecución).
- **Sí:** contraseña con minúscula, mayúscula, dígito y símbolo, mínimo 8 (decisión del usuario). Se valida en tres capas:
  - **UI:** evita enviar a autenticar algo que se sabe que fallará.
  - **Server Action:** cubre a quien se salte la UI.
  - **Panel de Supabase:** cubre a quien llame a la API de Auth directamente.
- **Sí:** el conjunto de símbolos es el mismo que acepta Supabase, para que la UI y el servidor no discrepen. **No:** `[^A-Za-z0-9]`, que aceptaría espacios o `ñ` que Supabase rechaza.
- **Sí:** el error se muestra al enviar, junto con una línea de ayuda fija. **No:** un medidor en vivo, que añade UI sin cambiar la regla.
- **Sí:** el login no valida el formato. **No:** bloquear a las cuentas creadas con la regla anterior (8 caracteres sin requisitos).
- **Sí:** el límite por IP se configura en el panel, con 30 solicitudes cada 5 min, y el error se traduce. **No:** captcha, que va en su propia spec.
- **Sí:** las 3 cabeceras del checklist más `Permissions-Policy` y HSTS. **No:** CSP, que exige nonce en `proxy.ts` y probar Supabase, OAuth y `next/font`; va en otra spec.
- **Sí:** HSTS sin `preload`. Solo tiene efecto sobre HTTPS; en `localhost` por HTTP el navegador lo ignora.
- **Sí:** `X-Frame-Options: DENY`. El Vault no se incrusta en iframes, y el OAuth usa redirecciones, no iframes.
- **Sí:** cabeceras en `next.config.ts`. **No:** en `proxy.ts`; su `matcher` excluye los estáticos y las cabeceras deben ir en todas las respuestas.
- **Sí:** protección de rutas en `proxy.ts`, la convención de Next 16 para lo que antes era `middleware.ts`. **No:** crear un `middleware.ts` aparte, que Next 16 marca como obsoleto y duplicaría la lectura de sesión.
- **Sí:** proteger solo las rutas de cuenta, con listas cerradas y comparación exacta. **No:** exigir login para jugar o ver el salón; la SPEC 12 y el guardado de puntuaciones como invitado lo impiden.
- **Sí:** redirects a destinos fijos (`/auth`, `/`). **No:** `?next=`; evita el riesgo de open redirect y sigue fuera de alcance.
- **Sí:** mantener las comprobaciones en páginas y Server Actions. **No:** fiarse solo del proxy; la doc de Next lo desaconseja y el `matcher` podría dejar rutas fuera.
- **Sí:** `getClaims()` para saber si hay sesión en el proxy; ya se llama en `updateSession` y valida el JWT sin otra petición.
- **Sí:** RLS solo se verifica. Ya está activa; cambiar políticas es de otra spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El `revoke` rompe el event trigger `ensure_rls` | Prueba en transacción con `rollback` (paso 2) antes de dar el paso por cerrado. |
| Una tarea de Supabase vuelve a dar `EXECUTE` a `public` | El criterio de `has_function_privilege` y `get_advisors` lo detectan; se repite la migración. |
| HSTS con `includeSubDomains` afecta a otros subdominios del dominio de producción | Hoy solo hay `localhost`. Revisarlo cuando exista un dominio, antes de desplegar. |
| `Permissions-Policy` bloquea una API que use un juego en el futuro | Solo se desactivan cámara, micrófono y geolocalización; ningún juego las usa. |
| El rate limit de 30 cada 5 min molesta en pruebas manuales intensivas | Subirlo temporalmente en el panel durante las pruebas. |
| La regex de la app y la regla de Supabase no coinciden y la UI deja pasar algo que el servidor rechaza | Mismo conjunto de símbolos; `weak_password` se traduce al mensaje de requisitos. |
| Los gestores de contraseñas generan contraseñas sin símbolos | La línea de ayuda avisa antes de enviar. Se acepta. |
| `onSubmit` con `preventDefault` interfiere con `useActionState` | Solo se previene si la validación falla; si pasa, el `action` del form sigue igual. |
| El redirect del proxy pierde las cookies refrescadas y cierra la sesión | Se copian las cookies de la respuesta de `updateSession` al redirect; hay criterio de aceptación. |
| Bucle de redirects (`/auth` ↔ `/`) | Las listas son disjuntas y `/` no está protegida; se prueba con y sin sesión. |
| Un usuario con sesión pero sin alias entra en `/auth` y no puede volver a `/auth/alias` | `/auth/alias` no está en `GUEST_ONLY`; el nav muestra "ELIGE TU ALIAS". |
| Una ruta de cuenta nueva queda fuera de las listas | Las páginas siguen validando por su cuenta (defensa en profundidad). |
| Las cuentas pueden usar contraseñas filtradas | Limitación aceptada del plan Free; documentada en el checklist. |
| La configuración del panel no queda en el repo | Checklist en esta spec y criterios verificados a mano por el usuario. |

## Qué **no** está en esta spec

- CSP y captcha.
- Rutas de juego protegidas y `?next=`.
- Comprobación propia de contraseñas filtradas, medidor de fortaleza y forzar el cambio de contraseña a cuentas antiguas.
- Cambios en políticas RLS y anti-trampas de puntuaciones.
- MFA, SMTP propio, dominio de producción y plan Pro.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
