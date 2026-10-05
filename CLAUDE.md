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

### Data (Supabase)

- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (copy `.env.example` → `.env.local`).
- Clients: `lib/supabase/server.ts` (Server Components, `cookies()`), `lib/supabase/client.ts` (browser). Generated types in `lib/supabase/database.types.ts`.
- Tables: `games(id, title, short, long, cat, cover, color)` and `scores(game_id, player_name, score, user_id?)`. No local `supabase/` dir — migrations are applied via the Supabase MCP (`.mcp.json`).
- Reads (server): `lib/db/games.ts` (`getGames`, `getGame`), `lib/db/scores.ts` (`getTopScores`). Writes (browser, anonymous): `lib/db/submit-score.ts`.
- Shared types in `lib/data.ts`; player name persisted in localStorage via `lib/player-name.ts`.

### Game engines

- Contract in `lib/games/types.ts`: `GameFactory(canvas, callbacks) → GameEngine { pause, resume, restart, destroy }`, `GameState { score, lives, level, status }`.
- Each game lives in `lib/games/<id>/` (`index.ts` exports `create<Name>`), owns its rAF loop (dt capped at 50 ms), keyboard listeners and canvas HUD, and calls `onStateChange` only on changes.
- `lib/games/registry.ts` maps `id → factory` (`ENGINES`). `components/game-player.tsx` mounts the engine (800×600 canvas in `.crt-screen`) and opens `components/game-over-modal.tsx` for score submission. Leaderboards need no per-game code.
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
- Para añadir un juego nuevo (desde `references/started-games/` o desde cero), genera primero su spec con /add-game (`.claude/skills/add-game/`) y luego implementa con /spec-impl. Integrar un juego implica: motor en `lib/games/<id>/`, registro en `ENGINES` (antes de insertar la fila), clase `.cover-<id>` en `globals.css` y migración Supabase `seed_game_<id>` en la tabla `games`.

## Agents

- `game-planner` (`.claude/agents/game-planner.md`): decide qué juego encaja como siguiente incorporación al catálogo. Mantiene memoria de sus sugerencias en `.claude/agent-memory/game-planner/MEMORY.md` (versionada) y la lista de pendientes en `references/game-suggestions-todo.md`. Solo recomienda: la spec se genera después con `/add-game`.
