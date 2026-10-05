# Estado de skins

Última auditoría: 2026-10-05 (primera pasada: contrato + 4 juegos). Mantenido por el agente `skin-designer`.

Objetivo: todo juego con 3 skins (clásico por defecto, neón, retro), legibles en modo oscuro.
Contraste medido con `contrastRatio` (WCAG) sobre el fondo de cada skin; los colores rgba se componen sobre el fondo.

| Juego | Clásico | Neón | Retro | Contraste texto mín. (clásico / neón / retro) | Contraste entidades mín. (clásico / neón / retro) |
|---|---|---|---|---|---|
| asteroids | ✅ | ✅ | ✅ | 8.63 / 5.15 / 11.15 | 16.75 / 5.15 / 11.15 |
| tetris | ✅ | ✅ | ✅ | 2.65 ⚠️ / 5.15 / 7.76 | 4.84 / 4.78 / 4.20 |
| arkanoid | ✅ | ✅ | ✅ | 5.15 / 5.15 / 11.15 | 4.67 / 4.89 / 4.31 |
| snake | ✅ | ✅ | ✅ | 5.15 / 5.15 / 11.19 | 5.15 / 5.15 / 7.76 |

Luminancia de fondo (límite 0.05): todas las skins entre 0.0000 y 0.0051.

## Avisos

- tetris clásico: la etiqueta `#555570` (SCORE, LINES, LEVEL, NEXT, CONTROLS) da 2.65:1 sobre `#0f0f17`. Se mantiene para que clásico sea idéntico al original; si se acepta un cambio visual leve, subir a ~`#8a8fb5`.
- Sin verificación visual en navegador en esta pasada (solo lint, tsc, build y contraste).
- Arkanoid y snake: en clásico los sprites siguen siendo imágenes; el contraste medido es el de los colores de reserva.
