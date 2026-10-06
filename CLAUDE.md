# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: a platform for playing retro canvas games online and competing for the highest score. UI text is in Spanish (`<html lang="es">`, numbers via `toLocaleString("es-ES")`).

Current state: specs, UI screens, home landing + gallery, Supabase integration, leaderboard, and playable games like: `asteroids`, `tetris`, `arkanoid`... and more. 
(See  `references/implemented-games.md`when you need to check which games are implemented) 
Real auth is NOT implemented yet (`/auth` is a UI mock; the player HUD shows "INVITADO").

## Commands

- `npm run dev` — dev server (also regenerates the AGENTS.md block)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`; ignores `references/**`)
- `npm run format` — Prettier (`.prettierrc.json`, `.prettierignore`)
- No test runner. Verify with `npm run lint`, `npx tsc --noEmit` and `npm run build`.

## Architecture

- Next.js 16.3 App Router, React 19, TypeScript (strict), Tailwind CSS v4. Path alias `@/*` → repo root.
- Next.js docs for the installed version live in `node_modules/next/dist/docs/` — consult them before writing code (see AGENTS.md).
- `app/layout.tsx` uses the global `LayoutProps<"/">` type; fonts Press Start 2P / JetBrains Mono / Courier Prime via `next/font/google`.

### Routes (`app/`)

- `/` home landing · `/games` gallery · `/games/[id]` detail + top 10 · `/games/[id]/play` player · `/salon` Hall of Fame · `/auth` mock form
- `app/api/health/supabase/route.ts` — Supabase health check
- `next.config.ts` redirects legacy `/juego/:id(/jugar)` → `/games/:id(/play)`
- `app/error.tsx` global error boundary; `components/home/` holds the landing pieces.

### Data (Supabase)

- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (copy `.env.example` → `.env.local`).
- Clients: `lib/supabase/server.ts` (Server Components, `cookies()`), `lib/supabase/client.ts` (browser). Generated types in `lib/supabase/database.types.ts`.
- Tables: `games(id, title, short, long, cat, cover, color)` and `scores(game_id, player_name, score, user_id?)`. No local `supabase/` dir — migrations are applied via the Supabase MCP (`.mcp.json`).
- Reads (server): `lib/db/games.ts` (`getGames`, `getGame`), `lib/db/scores.ts` (`getTopScores`). Writes (browser, anonymous): `lib/db/submit-score.ts`.
- Shared types in `lib/data.ts`; player name persisted in localStorage via `lib/player-name.ts`.
- `lib/format.ts` `formatDate`: fixed UTC dd/mm/yyyy to avoid server/browser hydration mismatches.

### Game engines

- Contract in `lib/games/types.ts`: `GameFactory(canvas, callbacks, options?: { skin }) → GameEngine { pause, resume, restart, destroy, setSkin }`, `GameState { score, lives, level, status }`.
- Each game lives in `lib/games/<id>/` (`index.ts` exports `create<Name>`), owns its rAF loop (dt capped at 50 ms), keyboard listeners and canvas HUD, and calls `onStateChange` only on changes.
- `lib/games/registry.ts` maps `id → factory` (`ENGINES`). `components/game-player.tsx` mounts the engine (800×600 canvas in `.crt-screen`) and opens `components/game-over-modal.tsx` for score submission. Leaderboards need no per-game code.
- Skins: shared contract in `lib/games/skins.ts` (`SkinId` = `classic|neon|retro`, `DEFAULT_SKIN`, `SKIN_LABELS`, WCAG `contrastRatio`); each game defines its palette in `lib/games/<id>/skins.ts`. The player shows the `.skin-picker`, persists the choice in localStorage (`arcade-vault:skin:v1`) and applies it live via `setSkin`.
- Touch: shared types in `lib/games/touch.ts` (`TouchLayout`, `DPAD_CODES`, auto-repeat timings); `TOUCH_LAYOUTS` lives in `registry.ts` next to `ENGINES`; rendered by `components/touch-gamepad.tsx`.
- Assets go in `public/games/<id>/`. `references/` holds source material only (templates, vanilla JS games in `references/started-games/`, assets) — do not import from it.

### Styling

- All styles in `app/globals.css`: neon/CRT theme tokens on `:root` (`--bg`, `--ink`, `--cyan`, `--magenta`, `--yellow`, `--green`, `--pixel`, `--mono`…) exposed to Tailwind via `@theme inline`.
- Class conventions: `av-*` layout, `crt*`, `btn` (+ `yellow|magenta|ghost|lg|xl|pulse`), `neon-*`, `lb-row`, and one `.cover-<id>` per game.

## Spec workflow

- Specs in `specs/NN-slug.md` (games: `NN-juego-<id>.md`). Header fields: Estado (`Borrador` → `Aprobado` → `Implementado`), Depende de, Fecha, Objetivo.
- `specs/.spec-config.yml` has `AutoCreateBranch: true`: `/spec-impl` creates a `spec-NN-slug` branch; each spec is merged via PR.

## Skills

- Usa siempre /frontend-design para diseñar la interfaz de usuario.
- `/spec` crea una spec y `/spec-impl` implementa una spec aprobada (instaladas con `npx skills@latest add Klerith/fernando-skills`).
- `/spec-impl-game <NN-juego-id>` es la forma recomendada de implementar una spec de juego aprobada: ejecuta `/spec-impl` y, al terminar, lanza en secuencia `skin-designer` y luego `mobile-porter` (`.claude/skills/spec-impl-game/`).
- Para añadir un juego nuevo (desde `references/started-games/` o desde cero), genera primero su spec con /add-game (`.claude/skills/add-game/`) y luego implementa con /spec-impl. Integrar un juego implica: motor en `lib/games/<id>/`, registro en `ENGINES` (antes de insertar la fila), `lib/games/<id>/touch.ts` (exporta `TOUCH_LAYOUT`: botones A/B y autorrepetición del mando táctil) y su entrada en `TOUCH_LAYOUTS` (`lib/games/registry.ts`), clase `.cover-<id>` en `globals.css` y migración Supabase `seed_game_<id>` en la tabla `games`.
- El mando táctil (`components/touch-gamepad.tsx`, visible solo con `pointer: coarse`) despacha `KeyboardEvent` sintéticos en `window`: los motores deben escuchar el teclado en `window` y leer `e.code`.
- Todo juego debe incluir `lib/games/<id>/skins.ts` con las 3 skins `classic` (por defecto), `neon` y `retro`, legibles en modo oscuro. Tras añadir un juego, ejecuta el agente `skin-designer`.

## Agents

- `game-planner` (`.claude/agents/game-planner.md`): decide qué juego encaja como siguiente incorporación al catálogo. Mantiene memoria de sus sugerencias en `.claude/agent-memory/game-planner/MEMORY.md` (versionada) y la lista de pendientes en `references/game-suggestions-todo.md`. Solo recomienda: la spec se genera después con `/add-game`.
- `game-jam` (`.claude/agents/game-jam.md`): recibe un tema y escribe un juego con ≥2 specs alternativas (variantes completas) en `specs/game-jam/<game-id>/`, más un `README.md` comparativo. Solo specs en `Borrador`; la elegida se mueve a `specs/NN-juego-<id>.md` y se implementa con `/spec-impl`.
- `mobile-porter` (`.claude/agents/mobile-porter.md`): porta un juego al mando táctil (spec 09): crea o valida `lib/games/<id>/touch.ts` y su entrada en `TOUCH_LAYOUTS`. Un juego por invocación.
- `game-performance` (`.claude/agents/game-performance.md`): audita y optimiza el rendimiento de un juego (id recibido como parámetro) aplicando el patrón de la spec 11 (sprites con brillo en caché, capa estática, HUD en caché, recorte, bucle parado en pausa). Implementa directamente, sin spec intermedia. Un juego por invocación.
- `skin-designer` (`.claude/agents/skin-designer.md`): audita que cada juego tenga ≥3 skins (clásico por defecto, neón, retro), legibles en modo oscuro, e implementa directamente las que falten (`lib/games/<id>/skins.ts`, `setSkin`, selector en el player). Estado en `references/skins-status.md` y memoria en `.claude/agent-memory/skin-designer/MEMORY.md`.
