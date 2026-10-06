# Game jam · FARO

- **Tema:** «Guardián del faro: gira el haz de luz de un faro durante una noche de tormenta para guiar barcos hasta el puerto y evitar que se estrellen contra las rocas».
- **Fecha:** 2026-10-06
- **game-id:** `faro`. No existe en `games` (según `references/implemented-games.md`), en `ENGINES` ni en `specs/game-jam/`. Comparten `title` `FARO`, `cover-faro` y la migración `seed_game_faro`.
- **Catálogo de referencia:** asteroids (SHOOTER/cyan), tetris (PUZZLE/green), arkanoid (ARCADE/magenta), snake (ARCADE/yellow) y frogger (ARCADE/green). Sale de `references/implemented-games.md` y `lib/games/registry.ts`. No se consultó `public.games` porque el MCP de Supabase no estaba conectado.
- **Método:** el skill `/spec` no está instalado (`~/.claude/skills/spec/` ni `~/.agents/skills/spec/`). Las specs siguen `/add-game` (plantilla y 12 Reglas de integración) y la forma de las specs 06, 07, 08 y 10.

## Pitch

Noche cerrada, lluvia y un faro en la costa. No pilotas nada: mueves la luz. Los barcos que tocan el haz ven el camino a puerto y esquivan las rocas. Los que quedan a oscuras derivan con el viento hacia la costa. Cada barco atracado suma, cada naufragio duele, y la pregunta constante es a quién iluminar ahora. Son sesiones de 2 a 5 minutos con dos teclas y un botón: «una más» garantizado. No se parece a nada del catálogo ni de la lista del `game-planner`. Lo más cercano, `missile-command`, también defiende la costa, pero allí se dispara y aquí solo se guía.

## Variantes

Todas son alternativas completas: se implementa una sola.

| | 01 · Haz en la tormenta | 02 · Faro contra raqueros |
| --- | --- | --- |
| Archivo | `01-haz-en-la-tormenta.md` | `02-faro-contra-raqueros.md` |
| Eje que cambia | Solitario contra la tormenta. Rocas ocultas que revelan el haz y los relámpagos (memoria), dos bocanas y solo teclado. | Duelo contra la CPU, que mueve un farol falso para atraer barcos. Noches al mejor de 7, ratón como control principal y una bocana. |
| cat / color | ARCADE / yellow | VERSUS / magenta |
| `score` | Atraque `100 × nivel + 25 × racha` (racha hasta 20) | Atraque `100 × noche`; cegar el farol +50; noche ganada `500 × noche + 100 × (7 − naufragios)` |
| `lives` | 3 = naufragios permitidos | 3 = noches que puedes perder |
| `level` | `floor(atracados / 8) + 1` | Noche actual (sube al ganar o perder) |
| Fin | 3.er naufragio | 3.ª noche perdida |
| Control | `←`/`→` (`A`/`D`) giran el haz y `Espacio` lanza el destello | Ratón apunta y clic lanza el destello; `←`/`→` y `Espacio` como alternativa |
| Táctil | D-pad izquierda/derecha + A = DESTELLO (encaja tal cual) | Igual, por teclado sintético; el puntero táctil se ignora |
| Esfuerzo | Medio (dirección de barcos, visibilidad, cachés) | Medio-alto (lo de la 01 + IA, ratón, rondas y paso de equilibrio) |
| Riesgo principal | Legibilidad de la oscuridad (sobre todo en `retro`) y barcos guiados que oscilan ante una roca | Equilibrio de la IA en las primeras noches y conflicto entre el ratón y el táctil |

## Recomendación

**Variante 02 · Faro contra raqueros.** Hay tres motivos:

1. **Equilibrio del catálogo.** Sería el primer `VERSUS`, la categoría vacía que la memoria del `game-planner` marca como prioridad. La 01 añadiría un 4.º `ARCADE` a un catálogo de 5 juegos.
2. **Originalidad y rejugabilidad.** Los raqueros dan al tema un antagonista con historia. El marcador por noche crea tensión de «una más» y la esquiva de la IA desde la noche 3 da profundidad de habilidad.
3. **Riesgo acotado.** Su núcleo (haz, barcos guiados, deriva, viento y cachés) es el mismo que el de la 01. Si la IA no termina de equilibrarse en el paso 7, se puede volver a la 01 reutilizando casi todo `sea.ts`, `sprites.ts` y `renderer.ts`.

La **variante 01** es la buena opción si se prefiere el menor esfuerzo y la lectura más fiel y contemplativa del tema. Es más simple de implementar, solo usa teclado y su mecánica de memoria (rocas que solo se ven con el haz o un relámpago) es muy distintiva.

## Siguiente paso

Elige una variante, cambia su Estado a `Aprobado`, muévela a `specs/NN-juego-faro.md` (hoy sería `specs/12-juego-faro.md`) e impleméntala con `/spec-impl` (o con `/spec-impl-game`, que además lanza `skin-designer` y `mobile-porter`).
