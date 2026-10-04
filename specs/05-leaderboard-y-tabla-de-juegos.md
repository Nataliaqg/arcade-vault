# SPEC 05 — Tabla de juegos y leaderboard en Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02, SPEC 03, SPEC 04
> **Fecha:** 2026-10-03
> **Objetivo:** Crear en Supabase las tablas `games` y `scores`, hacer que el catálogo se lea de `games` (solo `asteroids`) y que Asteroids guarde puntuaciones anónimas con nombre que se muestran en un leaderboard general y uno por juego.

## Por qué existe esta spec

SPEC 03 dejó la conexión con Supabase lista sin tablas. SPEC 04 dejó fuera guardar puntuaciones, el ranking real y `best` real. Esta spec cierra ese hueco con el primer flujo de datos completo: jugar, guardar y ver el ranking. El catálogo pasa de mock a base de datos porque `scores` necesita una clave foránea a un juego real.

## Alcance

**Dentro:**

- Migración que crea la tabla `games` con RLS (lectura pública) y un seed con una sola fila: `asteroids`.
- Migración que crea la tabla `scores` con RLS (lectura pública, inserción pública con `CHECK`, sin `UPDATE` ni `DELETE`).
- `user_id` nullable en `scores` (referencia a `auth.users`). Siempre `NULL` en esta spec porque no hay auth.
- Tipos generados de Supabase en `lib/supabase/database.types.ts`.
- Funciones de acceso a datos en `lib/db/games.ts` y `lib/db/scores.ts`.
- El catálogo (`/`, `/games`, `/games/[id]`, `/games/[id]/play`) lee de `games`. Los 8 juegos mock se eliminan de la UI y de `lib/data.ts`.
- Se elimina el mockup del reproductor (`game-player.tsx`) y su fallback: todo juego del catálogo tiene motor en `ENGINES`.
- `best` y `plays` de cada juego se calculan desde `scores` (máximo y número de filas).
- Modal de fin de partida de Asteroids: pide `player_name` (3 a 12 caracteres), inserta en `scores` y muestra la posición obtenida y el top 5 del juego. Se puede omitir el guardado.
- El nombre escrito se guarda tal cual en `scores.player_name` y también en `localStorage` (`arcade-vault:player-name:v1`). Cuando el modal vuelve a aparecer, la caja de texto viene rellena con ese nombre y basta pulsar GUARDAR; el jugador puede editarlo.
- Leaderboard general (mejores puntuaciones de cualquier juego, con columna de juego) y leaderboard por juego, ambos en `/salon` mediante pestañas.
- Top 10 del juego en `/games/[id]`.
- `app/error.tsx`: pantalla de error con el estilo del Vault (REINTENTAR y VOLVER AL INICIO) para cuando Supabase no responde al cargar una página.

**Fuera de alcance (para specs futuras):**

- Autenticación, sesión y `proxy.ts`. `user_id` queda sin usar.
- Anti-trampas, rate limit, validación de partida en servidor. El insert público es falsificable y se acepta.
- Moderación de nombres.
- Ranking agregado por jugador (sin identidad estable no tiene sentido).
- Realtime (actualizar el ranking en vivo).
- Paginación o filtros por fecha del leaderboard.
- Nuevos juegos reales o restaurar los mockups eliminados.
- Tests automatizados.

## Modelo de datos

Tabla `games` (esquema `public`):

```sql
create table public.games (
  id         text primary key,                 -- 'asteroids'
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                    -- clase CSS, p. ej. 'cover-asteroids'
  color      text not null check (color in ('cyan','magenta','green','yellow')),
  created_at timestamptz not null default now()
);
```

Seed: una fila con los valores actuales de `asteroids` en `lib/data.ts`.

Tabla `scores`:

```sql
create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games(id),
  player_name text not null check (char_length(player_name) between 3 and 12),
  score       integer not null check (score >= 0 and score <= 10000000),
  user_id     uuid references auth.users(id),  -- siempre null en esta spec
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_score_idx on public.scores (score desc);
```

RLS (activada en ambas tablas):

- `games`: `select` para `anon` y `authenticated`. Sin insert, update ni delete.
- `scores`: `select` para `anon` y `authenticated`. `insert` para `anon` y `authenticated` con `with check (user_id is null)`. Sin update ni delete.

Tipos de la app (`lib/data.ts`, se conservan `GameCategory`, `GameColor` y `CATS`):

```ts
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;   // calculado: max(score) o 0
  plays: number;  // calculado: count(scores)
};

export type ScoreRow = {
  rank: number;
  name: string;      // player_name
  score: number;
  date: string;      // created_at formateado dd/mm/yyyy
  gameId: string;
  gameTitle: string;
};
```

Contrato de las funciones de acceso:

```ts
// lib/db/games.ts (servidor)
getGames(): Promise<Game[]>
getGame(id: string): Promise<Game | null>

// lib/db/scores.ts (servidor)
getTopScores(opts: { gameId?: string; limit: number }): Promise<ScoreRow[]>

// lib/db/submit-score.ts (navegador; archivo aparte porque lib/db/scores.ts
// importa next/headers y no puede entrar en un client component)
submitScore(input: { gameId: string; playerName: string; score: number }):
  Promise<{ rank: number }>   // rank 0 = guardado, posición desconocida
```

Convenciones:

- `plays` cambia de `string` ("12.4K") a `number`; el formato visible se resuelve al renderizar.
- Orden del leaderboard: `score` descendente, desempate por `created_at` ascendente. `rank` se calcula en la consulta, no se guarda.
- Los componentes de servidor usan `lib/supabase/server.ts`. El guardado desde el modal usa `lib/supabase/client.ts`.
- `player_name` se recorta (`trim`) antes de validar y enviar.
- El leaderboard solo se renderiza con datos leídos de Supabase; no queda `seededScores` ni `Math.random` en el render.
- `localStorage` se usa solo para recordar el nombre del jugador, en la clave `arcade-vault:player-name:v1` (valor: el texto ya recortado). Las lecturas y escrituras van en `try/catch` y se leen en un `useEffect` o al abrir el modal, nunca durante el render, para evitar errores de hidratación. La fuente de verdad del nombre en el ranking es la BD; `localStorage` es solo comodidad.
- El nombre se actualiza en `localStorage` solo tras un guardado exitoso en la BD.
- Sin claves de servicio.

## Plan de implementación

1. Aplicar la migración `create_games_table` (tabla, RLS, política de lectura y seed de `asteroids`). Verificación: `list_tables` muestra `games` con RLS activa y un `select` devuelve una fila.
2. Aplicar la migración `create_scores_table` (tabla, índices, RLS, políticas de lectura e inserción). Verificación: `list_tables` muestra `scores` con RLS; un insert con `player_name` de 2 caracteres falla y uno válido pasa; `get_advisors` de seguridad no reporta tablas sin RLS.
3. Generar tipos con `generate_typescript_types` en `lib/supabase/database.types.ts` y tipar los clientes de `lib/supabase/`. Verificación: `npx tsc --noEmit` pasa.
4. Crear `lib/db/games.ts` (`getGames`, `getGame` con `best` y `plays` calculados). Verificación: `npx tsc --noEmit` pasa.
5. Migrar `app/page.tsx`, `app/games/page.tsx`, `app/games/[id]/page.tsx` y `app/games/[id]/play/page.tsx` a `getGames`/`getGame`; actualizar `Game.plays` a `number` en `game-card.tsx` y `home/mini-card.tsx`. Verificación: `/games` muestra solo ASTEROIDS; `/games/caida` devuelve 404.
6. Eliminar de `lib/data.ts` el array `GAMES`, `seededScores` y `PLAYERS`, y quitar el mockup de `components/game-player.tsx`. Verificación: `grep` de `GAMES` y `seededScores` sin resultados; `npm run lint` y `npm run build` pasan.
7. Crear `lib/db/scores.ts` con `getTopScores` y `submitScore`. Verificación: `npx tsc --noEmit` pasa.
8. Convertir `components/hall-of-fame.tsx` para recibir `games` y los rankings por props desde `app/salon/page.tsx`: pestaña GENERAL (top 20 de todos los juegos, con columna JUEGO) y una pestaña por juego (top 20). Verificación: `/salon` muestra las pestañas y datos reales (tras insertar filas de prueba).
9. Añadir el top 10 del juego en `app/games/[id]/page.tsx`. Verificación: coincide con la pestaña del juego en `/salon`.
10. Modificar el modal de fin de partida en `game-player.tsx`: campo de nombre (3 a 12 caracteres), botón GUARDAR que llama a `submitScore`, estados de carga y error, y vista posterior con posición y top 5. Se puede cerrar sin guardar. Al abrir el modal, rellenar el campo con el nombre de `localStorage` si existe; tras un guardado exitoso, escribir el nombre en `localStorage`. Verificación: perder la partida, guardar `TESTER` y verlo en `/salon` y en `/games/asteroids`; perder otra vez y ver `TESTER` ya escrito, pulsar GUARDAR y ver la segunda fila con ese nombre.
11. Revisar estados vacío y de error (sin puntuaciones, Supabase no disponible, nombre inválido) y crear `app/error.tsx` (en esta versión de Next el error boundary recibe `retry`, no `reset`) y probar a ancho móvil. Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` antes de escribir los componentes de servidor, según `AGENTS.md`, y la doc vigente de Supabase (`search_docs`) para RLS. Los cambios de interfaz (pestañas, tabla de ranking, modal) se diseñan con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `list_tables` muestra `games` y `scores` con RLS activa; `get_advisors` de seguridad no reporta tablas sin RLS.
- [ ] `games` contiene exactamente una fila: `asteroids`.
- [ ] `/games` muestra solo la tarjeta ASTEROIDS y el Inicio no muestra juegos mock.
- [ ] `/games/asteroids` y `/games/asteroids/play` cargan datos desde Supabase; `/games/caida` y cualquier id inexistente devuelven 404.
- [ ] No quedan `GAMES`, `seededScores` ni el mockup del reproductor en `app/`, `components/` ni `lib/`.
- [ ] Al llegar a `gameover` el modal pide un nombre; con menos de 3 o más de 12 caracteres el botón GUARDAR está desactivado.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'asteroids'`, la puntuación real de la partida y `user_id` nulo.
- [ ] Tras guardar, el modal muestra la posición obtenida y el top 5 del juego.
- [ ] Cerrar el modal sin guardar no inserta ninguna fila.
- [ ] Un insert directo con `score` negativo, `score` mayor de 10 000 000, nombre fuera de rango, `game_id` inexistente o `user_id` no nulo es rechazado por la base de datos.
- [ ] No se pueden hacer `UPDATE` ni `DELETE` sobre `scores` con la clave publishable.
- [ ] `/salon` tiene la pestaña GENERAL (mejores 20 puntuaciones de cualquier juego, con columna JUEGO) y una pestaña por juego del catálogo.
- [ ] Las filas se ordenan por puntuación descendente y, en empate, por fecha ascendente.
- [ ] `/games/asteroids` muestra el top 10 y coincide con la pestaña ASTEROIDS de `/salon`.
- [ ] `best` y `plays` de ASTEROIDS reflejan el máximo y el número de filas en `scores`; con la tabla vacía muestran 0.
- [ ] Con `scores` vacía, `/salon` y el detalle muestran un estado vacío, sin errores.
- [ ] Si Supabase falla al guardar, el modal muestra un error y permite reintentar sin perder la puntuación.
- [ ] Si Supabase no responde al cargar `/`, `/games` o `/salon`, se muestra `app/error.tsx` con REINTENTAR y VOLVER AL INICIO, no la pantalla de error genérica de Next.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/salon` y `/games/asteroids/play`.
- [ ] Tras un guardado exitoso, `localStorage["arcade-vault:player-name:v1"]` contiene el nombre guardado, sin espacios sobrantes.
- [ ] Al volver a abrir el modal en una partida nueva (o tras recargar la página), el campo ya contiene ese nombre y GUARDAR está activo sin escribir nada.
- [ ] El nombre prellenado se puede editar; si se cambia y se guarda, la fila en `scores` y `localStorage` tienen el nombre nuevo.
- [ ] Si el guardado en la BD falla, `localStorage` no se actualiza.
- [ ] Con `localStorage` bloqueado o lanzando excepción, el modal funciona con el campo vacío y sin errores en consola.
- [ ] `localStorage` solo contiene la clave `arcade-vault:player-name:v1`; no se usa la clave `service_role`.

## Decisiones

- **Sí:** `games` en Supabase como fuente de verdad del catálogo, con solo `asteroids`. **No:** mantener `GAMES` en `lib/data.ts`; el usuario pidió que la tabla guarde las referencias de los juegos reales.
- **Sí:** eliminar de la UI los 8 juegos mock y el mockup del reproductor. **No:** mezclar BD y mock; habría dos fuentes de verdad y enlaces a juegos sin `scores` posibles.
- **Sí:** `user_id` nullable y siempre `NULL`, sin auth todavía. **No:** exigir login; el usuario no quiere que todos jueguen autenticados por ahora.
- **Sí:** `player_name` de 3 a 12 caracteres escrito por el jugador. **No:** iniciales de 3 letras; menos expresivas.
- **Sí:** el valor escrito en la caja de texto va a la BD (`scores.player_name`) y se recuerda en `localStorage` (`arcade-vault:player-name:v1`) para prellenar el modal. **No:** guardar el nombre en una tabla de jugadores; sin auth no hay identidad real y `localStorage` basta como comodidad.
- **Sí:** clave versionada (`:v1`) y escritura solo tras guardado exitoso. Permite migrar el formato y evita recordar un nombre que no llegó a la BD.
- **Sí:** el jugador no queda ligado a su nombre: otro navegador o `localStorage` borrado empieza con el campo vacío. Es aceptado hasta que exista auth.
- **Sí:** insert público directo con `CHECK` en la base de datos. **No:** Route Handler `/api/scores`; el usuario aceptó RLS con checks básicos. La limitación (puntuaciones falsificables) queda declarada.
- **Sí:** `with check (user_id is null)` en el insert. Evita que alguien se atribuya una puntuación de un usuario real cuando exista auth.
- **Sí:** sin políticas de `UPDATE` ni `DELETE` en `scores`. Las puntuaciones son inmutables desde el cliente.
- **Sí:** leaderboard general como top global mezclado con columna de juego. **No:** ranking por jugador; sin identidad estable sería engañoso.
- **Sí:** `best` y `plays` calculados desde `scores`, no guardados en `games`. **No:** columnas desnormalizadas que se desincronizarían; con el volumen actual no hacen falta.
- **Sí:** `plays` cuenta puntuaciones guardadas, no partidas jugadas. Las partidas no guardadas no se registran.
- **Sí:** leaderboard en `/salon` (pestañas) y top 10 en `/games/[id]`. Se incluye también top 5 en el modal.
- **Sí:** tope de 10 000 000 puntos en el `CHECK`. Es una barrera simple contra valores absurdos; no es anti-trampas.
- **Sí:** tipos generados con `generate_typescript_types`. Evita mantener a mano el esquema.

## Riesgos

| Riesgo                                                                   | Mitigación                                                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar puntuaciones falsas desde la consola           | Riesgo aceptado. `CHECK` de rangos y tope; anti-trampas y rate limit van en otra spec.                         |
| Spam o nombres ofensivos en el leaderboard                               | Fuera de alcance. Sin moderación en esta spec; se podrá borrar filas desde el panel de Supabase.               |
| Un `anon` con `insert` sin `with check` adecuado permite `user_id` ajeno | Política con `user_id is null`; criterio de aceptación sobre inserts rechazados; revisar `get_advisors`.      |
| Páginas de servidor cacheadas muestran un ranking desactualizado          | Consultar la doc de caché de Next 16 en `node_modules/next/dist/docs/` y renderizar de forma dinámica.         |
| `plays: string` pasa a `number` y rompe tarjetas                         | Paso 5 actualiza `game-card.tsx` y `home/mini-card.tsx` con `tsc` como red.                                    |
| Eliminar los mocks deja el Inicio y la galería casi vacíos                | Consecuencia deseada y confirmada; probar estados con un solo juego.                                           |
| El usuario cierra la pestaña antes de guardar y pierde la puntuación      | Se acepta; la puntuación no se persiste en cliente (solo el nombre en `localStorage`).                         |
| `localStorage` deshabilitado o lleno (modo privado, datos bloqueados)     | `try/catch` en lectura y escritura; el modal sigue funcionando con el campo vacío.                             |
| Leer `localStorage` en el render causa mismatch de hidratación            | Leerlo en `useEffect` o al abrir el modal, nunca durante el render.                                            |
| Valor viejo o manipulado en `localStorage` (menos de 3 o más de 12 chars) | Se valida al leer; si no cumple, se ignora y el campo queda vacío. La BD valida igualmente con `CHECK`.        |
| La migración de `scores` falla si `games` no existe                       | Orden fijo: primero `games` (paso 1), luego `scores` (paso 2).                                                 |

## Qué **no** está en esta spec

- Autenticación, sesión y `proxy.ts`.
- Anti-trampas, rate limit y moderación de nombres.
- Ranking por jugador o por usuario.
- Realtime y paginación.
- Nuevos juegos o restaurar los mockups eliminados.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
