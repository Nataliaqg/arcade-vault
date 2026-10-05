# Game jam · FROOGER

- **Tema:** «Frooger: cruza carriles de tráfico y un río hasta llenar 5 nidos con reloj por intento».
- **Fecha:** 2026-10-05
- **game-id:** `frooger` (no existe en `games`, `ENGINES` ni `specs/game-jam/`). Ficha: `ARCADE` / `green` / `cover-frooger`.

## Pitch

Una rana, una carretera, un río y cinco nidos. Cada salto es una celda, el tráfico no perdona y las plataformas del río te arrastran. Cada intento tiene su reloj: o llegas a tiempo o pierdes la rana. Sesiones de 2-4 minutos, «una más» garantizado. Desarrolla el pendiente `frogger` del game-planner (ARCADE/green) con nombre propio.

## Variantes

Todas son alternativas completas: se implementa una sola.

| | 01 · Neón, 3 vidas | 02 · Ranas en cola |
| --- | --- | --- |
| Archivo | `01-neon-3-vidas.md` | `02-ranas-en-cola.md` |
| Eje que cambia | Modelo clásico: vidas globales, un salto por pulsación, neón del Vault con formas vectoriales | Intento = unidad de juego: 5 ranas por ronda, hold-to-repeat, moscas y cocodrilos, fósforo verde con sprites de píxeles |
| cat / color | ARCADE / green | ARCADE / green |
| `score` | Filas +10, nido 50 + 10 × s, ronda 1000 × nivel | Filas +10, nido 100 + 10 × s, mosca +200, cierre de ronda 300 × nidos × ronda |
| `lives` | 3 vidas (+1 a 20 000) | Ranas que quedan en la ronda (5 → 0) |
| `level` | Ronda (cada 5 nidos) | Ronda |
| Fin | Perder la 3.ª vida | Cerrar una ronda con < 3 nidos |
| Rejilla | 16×12, río 5 filas, carretera 4 | 16×12, río 4 filas, carretera 5 |
| Esfuerzo | Medio | Medio-alto (sprites, mosca, cocodrilo, evaluación de ronda) |
| Riesgo principal | Imprecisión de saltos desde plataformas | `lives = 0` sin ser game over en el HUD; duración de partidas de jugadores buenos |

## Recomendación

**Variante 01.** Es la más fiel al tema (reloj por intento que cuesta una vida), tiene el menor riesgo de integración (`lives` con significado normal y el `INITIAL_STATE` de 3 vidas del reproductor ya coincide) y encaja con la estética del Vault. La 02 es más original y rejugable, pero cuesta más y reinterpreta `lives`; es buena segunda opción si se prefiere un juego más distintivo.

## Siguiente paso

Elige una variante, cambia su Estado a `Aprobado`, muévela a `specs/NN-juego-frooger.md` e impleméntala con `/spec-impl`.
