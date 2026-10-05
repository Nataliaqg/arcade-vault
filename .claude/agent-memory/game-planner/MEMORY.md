# Memoria de game-planner

## Catálogo implementado (2026-10-05, verificado en Supabase = registry)

| id | cat | color |
|---|---|---|
| asteroids | SHOOTER | cyan |
| tetris | PUZZLE | green |
| arkanoid | ARCADE | magenta |
| snake | ARCADE | yellow |

## Huecos detectados

- Categoría `VERSUS` sin ningún juego (prioridad).
- Los 4 colores están usados una sola vez (ARCADE tiene 2 juegos, PUZZLE y SHOOTER 1).
- `references/started-games/` solo contiene asteroids, tetris y arkanoid (ya implementados): no hay referencias pendientes.

## Historial de sugerencias

Formato: `- YYYY-MM-DD · <id> · <estado: sugerido|aceptado|descartado|implementado> · <motivo>`

- 2026-10-05 · pong · sugerido (recomendado) · primer VERSUS, esfuerzo mínimo, solo teclado, score por victorias/rallies
- 2026-10-05 · tron · sugerido · VERSUS alternativo, más original, IA de giro algo más compleja
- 2026-10-05 · space-invaders · sugerido · SHOOTER clásico de alta rejugabilidad, color green
- 2026-10-05 · tanda de 19 (4 agentes en paralelo, uno por categoría; detalle y pitch en `references/game-suggestions-todo.md`):
  - ARCADE: sky-hopper (28/30, top), frogger (27), maze-chomper (23), bomber-maze (22) · sugeridos
  - PUZZLE: merge-2048 (27, top), columns (26), buscaminas (26), lights-out (25), sokoban (21) · sugeridos
  - SHOOTER: centipede (27, top), missile-command (26), galaga-lite (25), scramble-lite (23), defender-lite (21) · sugeridos
  - VERSUS: air-hockey (24), boxing-ring (24), tank-duel (23), artillery-duel (23), connect-four (23) · sugeridos
  - `crawler-zone` (ARCADE) se fusionó con `centipede` (SHOOTER): mismo juego.

## Notas de proceso

- Los agentes de la tanda no consultaron Supabase ni `registry.ts`; el padre verificó que `registry.ts` y `specs/` no tienen nada nuevo.
- Solapes a vigilar: pong/air-hockey, space-invaders/galaga-lite, buscaminas/lights-out (yellow repetido).

## Preferencias del usuario

(sin datos todavía; el usuario no ha aceptado ni descartado nada)
