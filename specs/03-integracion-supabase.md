# SPEC 03 — Integración de Supabase con Next.js

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-03
> **Objetivo:** Conectar el proyecto Next.js con el proyecto Supabase existente (`dmvyjwmloioaxmzugzvk`) mediante clientes de navegador y de servidor y una ruta de salud que confirme la conexión, sin crear tablas ni lógica de negocio.

## Por qué existe esta spec

La app es hoy solo UI con datos mock (SPEC 01 y 02). Antes de construir autenticación, puntuaciones o leaderboards reales hace falta que la app hable con Supabase. Esta spec deja solo la tubería lista (dependencias, variables de entorno y clientes) para que las specs de auth y datos partan de una base ya probada.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Archivo `.env.example` versionado, con los nombres y sin valores. Ajustar `.gitignore` para que `.env.example` no se ignore.
- Cliente de navegador en `lib/supabase/client.ts` y cliente de servidor en `lib/supabase/server.ts` (con cookies de `next/headers`).
- Ruta `app/api/health/supabase/route.ts` que consulta Supabase y devuelve JSON `ok` / `error`.
- Documentar en `README.md` las variables necesarias y cómo comprobar la conexión.

**Fuera de alcance (para specs futuras):**

- Tablas, migraciones, RLS, políticas y tipos generados (`generate_typescript_types`). El usuario pidió explícitamente no crear tablas.
- Autenticación, sesión, `proxy.ts` (antes middleware) y refresco de sesión. Va con la spec de auth.
- Sustituir los datos mock de `lib/data.ts` por datos de Supabase.
- Realtime, Storage y Edge Functions.
- Clave `service_role` o cualquier secreto de servidor. No se usa y no se añade a `.env.local`.
- Tests automatizados.

## Modelo de datos

Esta feature no introduce estructuras de datos. No hay tablas ni tipos nuevos.

Contrato de variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=https://dmvyjwmloioaxmzugzvk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key del proyecto>
```

Contrato de la ruta de salud (`GET /api/health/supabase`):

```ts
type HealthResponse =
  | { status: "ok" }
  | { status: "error"; message: string };
```

Convenciones:

- Respuesta `200` con `status: "ok"`; `500` con `status: "error"` si faltan variables o Supabase no responde.
- La respuesta nunca incluye la URL completa ni la clave.
- La ruta no usa `Math.random` ni `localStorage`.

## Plan de implementación

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` con `npm install`. Verificación: aparecen en `package.json` y `npm run lint` pasa.
2. Crear `.env.example` con los dos nombres de variable sin valores y añadir `!.env.example` en `.gitignore` tras la línea `.env*`. Verificación: `git status` muestra `.env.example` como archivo nuevo y `.env.local` sigue ignorado.
3. Rellenar `.env.local` (lo hace el usuario) con la URL y la publishable key, conservando `SUPABASE_BD_PASSWORD`. Verificación: `npm run dev` arranca sin errores.
4. Crear `lib/supabase/client.ts` con `createBrowserClient` y `lib/supabase/server.ts` con `createServerClient` y el manejo de cookies de `next/headers`. Ambos leen las variables de entorno y lanzan un error claro si faltan. Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
5. Crear `app/api/health/supabase/route.ts`: instancia el cliente de servidor, hace una petición real a Supabase que no requiera tablas (endpoint `/auth/v1/health` con la publishable key) y devuelve `HealthResponse`. Verificación: `GET /api/health/supabase` devuelve `{"status":"ok"}`.
6. Añadir a `README.md` una sección corta con las variables y la ruta de comprobación. Verificación: un clon limpio puede configurarse siguiendo solo el README.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` antes de escribir el route handler y el uso de `cookies()`, según `AGENTS.md`; en Next 16 `cookies()` es asíncrono. Consultar también la guía vigente de Supabase SSR para Next.js (`search_docs` del MCP) para confirmar los nombres de la API.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` figuran en `dependencies`.
- [ ] `.env.example` está versionado, lista las dos variables y no contiene valores.
- [ ] `.env.local` sigue ignorado por git y no aparece en `git status`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y exportan una función que crea el cliente correspondiente.
- [ ] Con las variables correctas, `GET /api/health/supabase` devuelve `200` y `{"status":"ok"}`.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL` (o con una URL inválida), `GET /api/health/supabase` devuelve `500` y `status: "error"` sin filtrar la clave ni la URL.
- [ ] El proyecto Supabase no tiene tablas nuevas ni migraciones aplicadas por esta spec (`list_migrations` y `list_tables` del MCP no muestran cambios).
- [ ] Ninguna página existente (`/`, `/games`, `/juego/*`, `/salon`, `/auth`) cambia su comportamiento ni su apariencia.
- [ ] La clave publishable no aparece en ningún archivo versionado.
- [ ] El `README.md` documenta las variables y la ruta de comprobación.

## Decisiones

- **Sí:** `@supabase/ssr` además de `supabase-js`. Es el camino recomendado para App Router y evita rehacer los clientes cuando llegue la auth con sesión.
- **No:** solo `supabase-js`. Más mínimo, pero habría que migrarlo después.
- **Sí:** no incluir `proxy.ts` todavía. Sin auth no hay sesión que refrescar y sería código muerto; entra con la spec de auth.
- **Sí:** ruta `/api/health/supabase` como verificación permanente. Sirve también para comprobar despliegues.
- **No:** script temporal ni verificación solo por MCP. No dejan una comprobación repetible en el repo.
- **Sí:** el health check llama al endpoint `/auth/v1/health`. Es la forma de comprobar conectividad real sin depender de tablas.
- **Sí:** publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), pegada por el usuario en `.env.local`. **No:** obtenerla vía MCP ni usar la anon key legacy.
- **Sí:** `.env.example` versionado. Requiere la excepción en `.gitignore` porque `.env*` lo ignoraría.
- **Sí:** no tocar `SUPABASE_BD_PASSWORD` en `.env.local`. No se usa en esta spec y nunca debe prefijarse con `NEXT_PUBLIC_`.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| La API de `@supabase/ssr` o `cookies()` de Next 16 cambió respecto a lo conocido | Leer `node_modules/next/dist/docs/` y la doc vigente de Supabase (`search_docs`) antes del paso 4.            |
| El proyecto aún no tiene publishable keys y solo existe la anon key legacy       | El usuario lo verifica en el dashboard al rellenar `.env.local`; si falta, se registra el cambio de nombre aquí. |
| Filtrar la clave o la URL en la respuesta de error del health check              | La ruta devuelve mensajes genéricos; criterio de aceptación específico.                                       |
| Se versiona `.env.local` por error al tocar `.gitignore`                         | Solo se añade `!.env.example`; criterio de aceptación sobre `git status`.                                     |
| La ruta de salud queda pública en producción y expone estado interno             | Devuelve solo `ok` / `error` genérico, sin detalles. Revisar si se protege en la spec de despliegue.          |

## Qué **no** está en esta spec

- Tablas, migraciones, RLS y tipos generados.
- Autenticación, sesión, `proxy.ts` y refresco de cookies.
- Reemplazo de los datos mock por datos de Supabase.
- Realtime, Storage y Edge Functions.
- Claves `service_role` o secretos de servidor.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
