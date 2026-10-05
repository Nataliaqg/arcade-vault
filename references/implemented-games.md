# Juegos implementados

Listado de los juegos disponibles actualmente en Arcade Vault. Fuente: tabla `games` de Supabase (consultada el 2026-10-05). Todos tienen motor en `lib/games/<id>/`, están registrados en `ENGINES` (`lib/games/registry.ts`) y cuentan con su spec.

Total: **4 juegos**.

## Resumen

| ID | Título | Categoría | Color | Cover | Spec |
|---|---|---|---|---|---|
| `asteroids` | ASTEROIDS | SHOOTER | cyan | `.cover-asteroids` | [04-juego-asteroids](../specs/04-juego-asteroids.md) |
| `tetris` | TETRIS | PUZZLE | green | `.cover-tetris` | [06-juego-tetris](../specs/06-juego-tetris.md) |
| `arkanoid` | ARKANOID | ARCADE | magenta | `.cover-arkanoid` | [07-juego-arkanoid](../specs/07-juego-arkanoid.md) |
| `snake` | SNAKE | ARCADE | yellow | `.cover-snake` | [08-juego-snake](../specs/08-juego-snake.md) |

## Detalle

### ASTEROIDS
- **Descripción:** Destruye asteroides en el vacío antes de que te alcancen.
- **Categoría / color:** SHOOTER / cyan
- **Motor:** `lib/games/asteroids/`
- **Rutas:** `/games/asteroids` · `/games/asteroids/play`

### TETRIS
- **Descripción:** Encaja las piezas, completa líneas y aguanta cada vez más rápido.
- **Categoría / color:** PUZZLE / green
- **Motor:** `lib/games/tetris/`
- **Rutas:** `/games/tetris` · `/games/tetris/play`

### ARKANOID
- **Descripción:** Rompe todos los bloques con la paleta y no dejes caer la bola.
- **Categoría / color:** ARCADE / magenta
- **Motor:** `lib/games/arkanoid/`
- **Rutas:** `/games/arkanoid` · `/games/arkanoid/play`

### SNAKE
- **Descripción:** Come fruta, crece sin parar y no te muerdas la cola.
- **Categoría / color:** ARCADE / yellow
- **Motor:** `lib/games/snake/`
- **Rutas:** `/games/snake` · `/games/snake/play`

## Añadir un juego nuevo

Genera primero su spec con `/add-game` y luego impleméntala con `/spec-impl`.
