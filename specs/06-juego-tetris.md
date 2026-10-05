# SPEC 06 — Juego Tetris

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-05
> **Objetivo:** Portar el juego Tetris de `references/started-games/03-tetris/` a TypeScript como un motor de canvas que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `tetris` en la tabla `games` y guarda puntuaciones en el leaderboard.

## Por qué existe esta spec

Asteroids (SPEC 04) fijó la frontera motor ↔ React y SPEC 05 el flujo de datos de catálogo y leaderboard. Tetris es el segundo juego de canvas y el primero que se añade con ese patrón ya cerrado: el juego es un motor imperativo que dibuja en un `<canvas>`; React lo monta, lo controla y escucha sus cambios; el catálogo y el leaderboard salen de Supabase. Es también la primera prueba de que el contrato `GameState` aguanta un juego sin vidas y con un canvas que no es 4:3.

## Alcance

**Dentro:**

- Port en TypeScript en `lib/games/tetris/` (piezas, tablero, constantes, utilidades y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas del original: tablero de 10 × 20, las 8 piezas de `game.js` (I, O, T, S, Z, J, L y la N «tuerca» de anillo 3×3 gris), rotación horaria con wall kicks `[0, -1, 1, -2, 2]`, soft drop, hard drop, pieza fantasma, vista previa de la siguiente pieza, limpieza de líneas, puntuación y niveles que aceleran la caída.
- API del motor: `createTetris(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }` y notifica con `onStateChange`.
- Registro `tetris: createTetris` en `ENGINES` (`lib/games/registry.ts`).
- Canvas lógico 800×600 con el tablero (300×600) y un panel lateral dibujado en el canvas: SCORE, LINES, LEVEL, NEXT y lista de controles. El HTML del original (panel y overlay) se pasa al canvas.
- Overlays PAUSA y GAME OVER dibujados en el canvas.
- Pausa propia del original (`P`) enlazada a `pause`/`resume`.
- Estética del original (fondo `#1a1a25`, colores de piezas, azul `#7aa2f7` en el panel).
- Clase CSS `cover-tetris` en `app/globals.css`.
- Migración `seed_game_tetris` que inserta la fila `tetris` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña TETRIS en `/salon`, top 10 en `/games/tetris`.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Controles táctiles y gamepad.
- Anti-trampas y validación de partida en servidor.
- Sonido (el original no tiene).
- Toggle claro/oscuro del original (dependía de `localStorage('tetris-theme')`).
- Reestilizar el juego con la paleta neón del Vault.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_tetris`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'tetris',
  'TETRIS',
  'Encaja las piezas, completa líneas y aguanta cada vez más rápido.',
  '<texto redactado en la implementación, mismo tono que el de asteroids>',
  'PUZZLE',
  'cover-tetris',
  'green'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en TETRIS                                                                        |
| -------- | -------------------------------------------------------------------------------------------- |
| `score`  | Puntos de líneas (`[0,100,300,500,800][n] × nivel`) más 1 por fila de soft drop y 2 por celda de hard drop. Entero 0..10 000 000. |
| `lives`  | Fijo en `1` (el juego no tiene vidas).                                                       |
| `level`  | `floor(líneas / 10) + 1`, como en el original. Las líneas solo se ven en el canvas.          |
| `status` | `playing` / `paused` / `gameover` (se llega a `gameover` cuando la pieza nueva colisiona al aparecer). |

Estructura del motor:

```
lib/games/tetris/
  index.ts        ← createTetris(canvas, callbacks): GameEngine
  constants.ts    ← COLS, ROWS, BLOCK, COLORS, PIECES, LINE_SCORES, geometría del canvas 800×600
  board.ts        ← createBoard, collide, merge, clearLines
  piece.ts        ← randomPiece, rotateCW, tryRotate
  renderer.ts     ← grid, bloques, ghost, panel lateral y overlays (recibe ctx)
```

Registro:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
};
```

Convenciones:

- Canvas lógico 800×600; el tablero (300×600) se dibuja en una posición fija definida en `constants.ts` y el panel a su lado. El CSS escala el canvas dentro de `crt-screen`.
- `dt` limitado a 50 ms (el original no lo acota). El acumulador `dropAccum` sigue en ms contra `dropInterval = max(100, 1000 − (level − 1) × 90)`.
- `Math.random` solo dentro del motor (`randomPiece`), nunca durante el render de React.
- El color de la rejilla (`--grid-line` en el original) pasa a constante `#22222e`; el motor no llama a `getComputedStyle`.
- `onStateChange` solo cuando cambian `score`, `lives`, `level` o `status`; `restart` emite el estado inicial; `pause`/`resume` emiten `status`.
- Teclas del juego (`ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `KeyX`, `Space`, `KeyP`) con `preventDefault` mientras el motor está activo; listeners en `window`; estado de teclas limpiado en `blur`.
- `P` alterna `pause`/`resume`. En `gameover` no hay tecla de reinicio: reinicia el botón JUGAR DE NUEVO del modal (`Espacio` es hard drop).
- Sin assets y sin `localStorage` dentro del motor.

## Plan de implementación

1. Crear `lib/games/tetris/constants.ts`, `board.ts` y `piece.ts` con las constantes, piezas y funciones puras portadas de `game.js` (el tablero se pasa por parámetro, sin globales). Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Crear `lib/games/tetris/renderer.ts` con el dibujo de rejilla, bloques, fantasma, panel lateral (SCORE, LINES, LEVEL, NEXT, controles) y overlays PAUSA y GAME OVER sobre el canvas 800×600. El contexto 2D se recibe por parámetro. Verificación: `npx tsc --noEmit` pasa.
3. Implementar `createTetris(canvas, callbacks)` en `lib/games/tetris/index.ts`: input en `window`, bucle con `requestAnimationFrame` y `dt` acotado, `pause`/`resume`/`restart`/`destroy` y `onStateChange`. Verificación: `destroy` cancela el frame y desregistra `keydown`, `keyup` y `blur`.
4. Registrar `tetris` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
5. Añadir `cover-tetris` en `app/globals.css`, diseñado con `/frontend-design`. Verificación: la tarjeta se ve en `/games` tras el paso 6.
6. Aplicar la migración `seed_game_tetris`. Verificación: `select id from games` incluye `tetris`; `/games` muestra la tarjeta y `/games/tetris/play` arranca el juego.
7. Verificar el leaderboard: perder una partida, guardar `TESTER`, ver la posición y el top 5 en el modal, la fila en la pestaña TETRIS de `/salon` y en el top 10 de `/games/tetris`.
8. Probar StrictMode en `npm run dev` (sin doble bucle ni listeners duplicados), ancho móvil y portátil (1366×768), y confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` antes de tocar componentes, según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `tetris` y la fila `asteroids` sin cambios.
- [ ] `/games` muestra la tarjeta TETRIS con `cover-tetris` y `/games/tetris` su detalle con botón para jugar.
- [ ] `/games/tetris/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas o `Espacio`.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 1 vida y nivel 1; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'tetris'` y la puntuación real; el modal muestra la posición y el top 5.
- [ ] `/salon` tiene la pestaña TETRIS y su top coincide con el top 10 de `/games/tetris`; la pestaña GENERAL mezcla puntuaciones de todos los juegos.
- [ ] `best` y `plays` de TETRIS reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/tetris/play`.
- [ ] Asteroids se comporta igual que antes y `lib/games/asteroids/` no tiene cambios.

Específicos de TETRIS:

- [ ] El tablero es de 10 × 20 y el canvas es 800×600 con el panel (SCORE, LINES, LEVEL, NEXT y controles) dibujado en el canvas.
- [ ] `←` y `→` mueven la pieza una columna sin salirse del tablero ni atravesar bloques.
- [ ] `↑` y `X` rotan en sentido horario y, si chocan, aplican los kicks `[0, -1, 1, -2, 2]` o descartan el giro.
- [ ] `↓` baja una fila y suma 1 punto; con colisión debajo fija la pieza.
- [ ] `Espacio` hace hard drop: suma 2 puntos por celda recorrida y fija la pieza al instante.
- [ ] La pieza fantasma se dibuja con `globalAlpha = 0.2` en la posición de aterrizaje.
- [ ] NEXT muestra la pieza siguiente y coincide con la que aparece después.
- [ ] Se generan las 8 piezas, incluida la N (anillo 3×3 gris `#9e9e9e`).
- [ ] Limpiar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 multiplicado por el nivel vigente antes de subir de nivel.
- [ ] El nivel sube cada 10 líneas y la caída automática pasa a `max(100, 1000 − (nivel − 1) × 90)` ms; a nivel 1 es 1000 ms.
- [ ] `P` pausa y reanuda, el canvas dibuja el overlay PAUSA y `status` pasa a `paused` y `playing`.
- [ ] `P` en `gameover` no hace nada.
- [ ] Si una pieza nueva colisiona al aparecer, el estado pasa a `gameover`, el canvas muestra GAME OVER con la puntuación y se abre el modal.
- [ ] Las teclas dejan de estar pulsadas tras `blur`.
- [ ] El motor no usa `localStorage`; no existe toggle claro/oscuro.

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04 sin cambios. **No:** `iframe` ni copiar `game.js` con globals.
- **Sí:** conservar HUD y overlays en el canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila en `games`. **No:** una fila sin motor (el reproductor quedaría vacío).
- **Sí:** el leaderboard de SPEC 05 se reutiliza sin código nuevo. **No:** tablas o componentes de ranking propios del juego.
- **Sí:** canvas lógico 800×600 con el tablero y un panel lateral dibujado en el canvas. Conserva SCORE, LINES, LEVEL, NEXT y controles del original. **No:** letterbox 300×600 (pierde el panel) ni panel en HTML/React (rompe la regla de HUD en el canvas).
- **Sí:** `lives` fijo en `1` y `level = floor(líneas / 10) + 1`. El contrato no se amplía; las líneas solo se ven en el canvas. **No:** `level` como número de líneas.
- **Sí:** las 8 piezas de `game.js`, incluida la N. Fidelidad al código del original. **No:** recortar a las 7 clásicas del README.
- **Sí:** `tetris`, `PUZZLE`, `green`, `cover-tetris`. Asteroids ya usa `cyan`. **No:** `ARCADE` ni `magenta`/`yellow`.
- **Sí:** estética del original (fondo oscuro, colores de pieza, azul `#7aa2f7`). **No:** reestilizar con neón del Vault.
- **Sí:** eliminar el toggle claro/oscuro. Depende de `localStorage('tetris-theme')`, y SPEC 05 limita `localStorage` a `arcade-vault:player-name:v1`.
- **Sí:** `P` pausa y reanuda; el reinicio en `gameover` lo hace solo JUGAR DE NUEVO del modal. **No:** reiniciar con `Espacio`, que es hard drop y reiniciaría la partida por un golpe de tecla al perder.
- **Sí:** fuera de alcance sonido, táctil/gamepad y `CanvasGame`.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode monta el efecto dos veces y duplica bucles o listeners | `destroy` completo en el cleanup; criterio de aceptación en StrictMode. |
| `onStateChange` en cada frame provoca renders a 60 fps | Emitir solo cuando cambia algún campo de `GameState`. |
| Las flechas y `Espacio` hacen scroll o activan botones | `preventDefault` en las teclas del juego y `blur` del botón tras pulsarlo (ya en `game-player`). |
| El motor accede a `window`/`document` y rompe el SSR | Instanciarlo solo dentro de la factory, llamada desde `useEffect`. |
| Fila en `games` sin motor en `ENGINES` | Orden fijo: registrar el motor (paso 4) antes de la migración (paso 6). |
| Puntuación no entera o por encima de 10 000 000 | Puntos enteros; el `CHECK` de `scores` rechaza el resto y el modal muestra error. |
| El original no acota `dt`: tras una pausa o un cambio de pestaña acumula un salto grande y puede caer varias filas de golpe | `dt` ≤ 50 ms; `resume` y `restart` reinician `lastTime`. |
| La repetición automática de teclas encadena rotaciones o hard drops (el original los dispara en cada `keydown`) | Se conserva el comportamiento del original. Si resulta incómodo al probar, ignorar `e.repeat` en `Espacio` y rotación en una spec posterior. |
| El overlay PAUSA del canvas coincide con el «EN PAUSA» que ya dibuja `game-player` | El de React lo tapa con un fondo semitransparente; ambos dicen lo mismo. No se toca `game-player.tsx`. |
| Al perder, la pieza que colisiona queda dibujada y el último frame no muestra GAME OVER si el bucle se detiene | El bucle sigue dibujando mientras `status` sea `gameover`; el overlay se dibuja cada frame. |
| El canvas 800×600 deja el tablero pequeño en móvil | Se acepta; sin controles táctiles en esta spec. Revisión a ancho móvil. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Controles táctiles y gamepad.
- Anti-trampas, rate limit y moderación.
- Sonido.
- Toggle claro/oscuro y reestilizado con la paleta neón del Vault.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
