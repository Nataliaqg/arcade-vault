# JAM frooger · Variante 02 — FROOGER: Ranas en cola, fósforo verde y cocodrilos

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-05
> **Objetivo:** Crear FROOGER como una ronda de 5 ranas (una por nido) con reloj por rana, estética monocroma de fósforo verde, moscas y cocodrilos, como motor de canvas registrado como `frooger` que guarda puntuaciones en el leaderboard.
> **Alternativa a:** `01-neon-3-vidas.md`. Solo se implementa una; las dos comparten `id`, `title`, `cover-frooger` y la migración `seed_game_frooger`.

## Por qué existe esta spec

Tema de la jam: «Frooger: cruza carriles de tráfico y un río hasta llenar 5 nidos con reloj por intento». Es un clon de Frogger.

Esta variante convierte el «intento» del tema en la unidad de juego: cada ronda dispone de 5 ranas, cada rana tiene un único intento con su reloj, y se gasta tanto si llega a un nido como si muere. No hay un número de vidas independiente.

Qué aporta frente a la 01:

- Mapeo distinto de `lives`: ranas que quedan en la ronda (5 → 0), no vidas globales.
- Condición de fin distinta: la partida acaba al terminar una ronda con menos de 3 nidos llenos, no al agotar vidas.
- Mecánica central ampliada: moscas (bonus) y cocodrilos en los nidos (riesgo), con la rana en hold-to-repeat (saltos repetidos al mantener la tecla).
- Estética distinta: monitor de fósforo verde de 4 tonos con sprites hechos de mapas de píxeles dibujados en código (sin imágenes).
- Rejilla de carriles distinta: río de 4 filas y carretera de 5.

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/frooger/` (constantes, sprites en código, carriles, lógica pura, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas:
  - Rejilla de 16 × 12 celdas de 50 px (canvas 800×600).
  - Fila 0: 5 nidos; filas 1-4: río; fila 5: mediana segura; filas 6-10: carretera (5 carriles); fila 11: salida segura.
  - Cada ronda da 5 ranas en cola. La rana activa tiene 25 s (reloj por intento). Llegar a un nido o morir gasta la rana.
  - Saltos de una celda por pulsación; mantener la tecla repite el salto cada 140 ms.
  - Coches, camiones y motos en la carretera; troncos y tortugas (algunas se hunden) en el río.
  - Mosca bonus en un nido aleatorio; cocodrilo que ocupa un nido y mata si se salta a él.
  - Al gastar las 5 ranas se evalúa la ronda: con ≥ 3 nidos llenos se pasa a la siguiente ronda (más rápida); con menos, GAME OVER.
- API del motor: `createFrooger(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }`.
- Registro `frooger: createFrooger` en `ENGINES`.
- HUD y overlays dibujados en el canvas: puntuación, ranas en cola, ronda, reloj, nidos, PAUSA, RESUMEN DE RONDA y GAME OVER.
- Pausa propia (`P`, `Escape`) enlazada a `pause`/`resume`.
- Clase CSS `cover-frooger` en `app/globals.css`.
- Migración `seed_game_frooger`.
- Leaderboard verificado.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Sonido y assets de imagen.
- Serpientes, nutrias y otros enemigos.
- Modo de dos jugadores.
- Controles táctiles y gamepad.
- Anti-trampas y validación en servidor.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_frooger`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'frooger',
  'FROOGER',
  'Cinco ranas, cinco nidos y un reloj implacable: cruza el tráfico y el río.',
  '<texto redactado en la implementación, mismo tono que el de asteroids, tetris, arkanoid y snake>',
  'ARCADE',
  'cover-frooger',
  'green'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en FROOGER |
| -------- | ---------------------- |
| `score`  | Entero acumulado según la tabla de puntos. Máximo teórico muy inferior a 10 000 000. |
| `lives`  | Ranas que quedan en la ronda, contando la activa: 5 al empezar la ronda, 0 al gastarlas todas (momento de evaluar la ronda). |
| `level`  | Ronda actual (empieza en 1). |
| `status` | `playing` / `paused` / `gameover`. `gameover` al evaluar una ronda con < 3 nidos llenos. |

Puntos:

| Evento | Puntos |
| ------ | ------ |
| Alcanzar una fila más avanzada que nunca con esta rana | +10 |
| Llenar un nido | +100 + 10 × segundos enteros restantes |
| Comer la mosca (saltar al nido con mosca) | +200 adicionales |
| Cierre de ronda con ≥ 3 nidos | +300 × nidos llenos × ronda |
| Ronda perfecta (5 nidos) | +2000 adicionales |

Estructura del motor:

```
lib/games/frooger/
  index.ts        ← createFrooger(canvas, callbacks): GameEngine
  constants.ts    ← COLS, ROWS, CELL, W, H, NEST_COLS, FROGS_PER_ROUND, MIN_NESTS, TIME_S, REPEAT_MS, MAX_DT, paleta de fósforo
  sprites.ts      ← mapas de píxeles (rana, coche, camión, moto, tronco, tortuga, cocodrilo, mosca) como arrays de strings y pintado a rejilla de 5 px
  lanes.ts        ← definición de carriles y avance de objetos
  logic.ts        ← lógica pura: salto, colisión, soporte, nidos, cocodrilo y mosca, speedMul, evaluación de ronda
  renderer.ts     ← rejilla, carriles, sprites, HUD, reloj y overlays (recibe ctx)
```

Estado interno del motor (dentro de la factory):

```ts
type Dir = "up" | "down" | "left" | "right";
type Lane = { row: number; kind: "road" | "log" | "turtle"; speed: number; objs: { x: number; w: number; sprite: string }[]; dive?: boolean };
type Nest = { filled: boolean; fly: boolean; croc: boolean };

let frog: { col: number; row: number; x: number };
let lanes: Lane[];
let nests: Nest[];                                     // 5 nidos
let phase: "playing" | "dying" | "roundEnd" | "gameover";
let paused: boolean;
let score: number, frogsLeft: number, round: number;   // frogsLeft → GameState.lives
let bestRow: number;
let timeLeft: number;                                  // segundos de la rana activa
let repeatAccum: number;                               // ms desde el último salto con la tecla mantenida
let heldDir: Dir | null;
let eventClock: number;                                // ms hasta cambiar mosca / cocodrilo de nido
let diveClock: number;
let roundEndMs: number;                                // ms que quedan del resumen de ronda
```

Carriles (velocidades base en px/s; + = derecha; se multiplican por `speedMul(round)`):

| Fila | Tipo | Velocidad | Objetos |
| ---- | ---- | --------- | ------- |
| 1 | tortuga | −75 | 4 grupos de 3 (150 px), separación 100 px, se hunden |
| 2 | tronco | +65 | 3 troncos de 200 px, separación 150 px |
| 3 | tronco | +105 | 2 troncos de 300 px, separación 250 px |
| 4 | tortuga | −60 | 4 grupos de 2 (100 px), separación 150 px, se hunden |
| 6 | carretera | −85 | 3 coches de 50 px, separación 200 px |
| 7 | carretera | +65 | 3 camiones de 100 px, separación 200 px |
| 8 | carretera | −130 | 3 motos de 50 px, separación 250 px |
| 9 | carretera | +95 | 2 camiones de 100 px, separación 300 px |
| 10 | carretera | −110 | 4 coches de 50 px, separación 150 px |

`speedMul(round) = min(1.8, 1 + 0.08 × (round − 1))`. El reloj por rana es fijo: `TIME_S = 25`.

Convenciones:

- **Canvas:** lógico 800×600 (4:3); la rejilla 16 × 12 de 50 px lo llena. El CSS lo escala dentro de `crt-screen`.
- **Nidos:** 5 nidos de 2 celdas en las columnas `[1,2] [4,5] [7,8] [10,11] [13,14]`. Saltar a la fila 0 fuera de un nido, o a uno lleno, mata.
- **Mosca:** a los 3 s de empezar cada rana aparece una mosca en un nido vacío aleatorio durante 6 s; luego desaparece y reaparece en otro cada 9 s.
- **Cocodrilo:** a partir de la ronda 2, un nido vacío aleatorio (distinto del de la mosca) tiene un cocodrilo durante 5 s; cambia de nido cada 8 s. Entrar a ese nido mata. Se dibuja con sus ojos y mandíbula asomando para que sea legible.
- **Salto repetido:** primer salto al pulsar; si la tecla sigue pulsada, repite cada 140 ms (`REPEAT_MS`). El estado `heldDir` se limpia en `keyup` y `blur`.
- **Cola de ranas:** `frogsLeft` empieza en 5 al comenzar cada ronda y baja en 1 al llegar a un nido o morir. La rana siguiente aparece en (columna 8, fila 11) con el reloj a 25 s. Al llegar a 0 pasa a `roundEnd` (resumen de 3 s con nidos llenos y bonus) y después se evalúa: ≥ 3 nidos → nueva ronda (nidos vacíos, `frogsLeft = 5`); < 3 → `gameover`.
- **Salto, soporte, colisión, plataformas y tortugas:** como en la variante 01 (rana libre de rejilla en horizontal sobre plataformas; rectángulo de vehículo contra rana de 36 × 36 px; ciclo de tortugas de 6 s: 3,5 s superficie, 0,5 s aviso, 2 s hundidas; muerte `dying` de 600 ms con los carriles activos). Toda la lógica se repite aquí, sin depender de la otra.
- **Bucle:** `dt` en ms, limitado a 50 ms. Velocidad máxima 130 × 1,8 = 234 px/s (≤ 12 px por frame).
- **Aleatoriedad:** `Math.random` solo dentro del motor (desfases de carriles y elección de nido de mosca y cocodrilo).
- **`onStateChange`:** solo cuando cambian `score`, `lives`, `level` o `status`. `restart` emite 0 puntos, 5 ranas, ronda 1, `playing`. `pause`/`resume` emiten `status`.
- **Teclado:** `ArrowUp/Down/Left/Right`, `KeyW/A/S/D`, `KeyP`, `Escape` con `preventDefault`; listeners `keydown` y `keyup` en `window`; `heldDir` y teclas limpiados en `blur`. `P`/`Escape` alternan pausa (se ignora `e.repeat`) y no hacen nada en `gameover` ni en `roundEnd`.
- **Estética de fósforo verde:** 4 tonos `#041a08` (fondo), `#0f5a1c`, `#33c24a`, `#b6ffbf` (primer plano); el agua es el tono 2 con ondas del 3; el texto usa el tono 4. Sprites en mapas de píxeles de 10 × 10 (celdas de 5 px) pintados con `fillRect`, sin suavizado. Velo de overlays `rgba(4,26,8,0.75)`. Constantes en `constants.ts`. Fuente pixel con `getComputedStyle(canvas).getPropertyValue("--font-press-start")`, respaldo `monospace`. Los reflejos de CRT los pone el marco del Vault. El diseño concreto se cierra con `/frontend-design`.
- Sin `localStorage` ni audio dentro del motor.

Registro:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
  arkanoid: createArkanoid,
  snake: createSnake,
  frooger: createFrooger,
};
```

## Plan de implementación

1. Crear `constants.ts`, `lanes.ts` y `logic.ts` con constantes, carriles y lógica pura (salto, colisión, soporte, nidos, evaluación de ronda). Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Crear `sprites.ts` con los mapas de píxeles y su pintado. Verificación: `npx tsc --noEmit` pasa.
3. Crear `renderer.ts`: rejilla, carriles, sprites, HUD, reloj y overlays (diseñado con `/frontend-design`). Verificación: `npx tsc --noEmit` pasa.
4. Implementar `createFrooger` en `index.ts`: input con repetición, bucle, cola de ranas, mosca, cocodrilo, evaluación de ronda, `pause`/`resume`/`restart`/`destroy` y `onStateChange`. Verificación: `destroy` cancela el frame y quita `keydown`, `keyup` y `blur`.
5. Registrar `frooger` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
6. Añadir `cover-frooger` en `app/globals.css` con `/frontend-design`. Verificación: visible en `/games` tras el paso 7.
7. Aplicar la migración `seed_game_frooger`. Verificación: `select id from games` incluye `frooger`; `/games/frooger/play` arranca.
8. Verificar el leaderboard: perder, guardar `TESTER`, ver posición y top 5, pestaña FROOGER en `/salon` y top 10 en `/games/frooger`.
9. Probar StrictMode, ancho móvil y 1366×768; confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/` (`AGENTS.md`); lo visual se diseña con `/frontend-design` (`CLAUDE.md`).

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `frooger` y las filas `asteroids`, `tetris`, `arkanoid` y `snake` sin cambios.
- [ ] `/games` muestra la tarjeta FROOGER con `cover-frooger` y `/games/frooger` su detalle con botón para jugar.
- [ ] `/games/frooger/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 5 ranas y ronda 1; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'frooger'` y la puntuación real; el modal muestra posición y top 5.
- [ ] `/salon` tiene la pestaña FROOGER y su top coincide con el top 10 de `/games/frooger`; GENERAL mezcla todos los juegos.
- [ ] `best` y `plays` de FROOGER reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/frooger/play`.
- [ ] Asteroids, Tetris, Arkanoid y Snake se comportan igual que antes; sus carpetas en `lib/games/` no tienen cambios.

Específicos de FROOGER:

- [ ] El canvas es 800×600 y la rejilla de 16 × 12 celdas de 50 px lo llena entera; el río ocupa las filas 1-4 y la carretera las filas 6-10.
- [ ] Cada ronda empieza con 5 ranas (`lives = 5` en el HUD) y la rana activa aparece en columna 8, fila 11, con el reloj en 25 s.
- [ ] Una pulsación mueve la rana una celda; mantener la tecla repite el salto cada 140 ms; soltarla o `blur` detiene la repetición.
- [ ] Llegar a un nido o morir baja `lives` en 1 y saca la siguiente rana con el reloj lleno.
- [ ] Avanzar a una fila nueva suma +10 una sola vez por fila y por rana.
- [ ] Tocar un vehículo mata a la rana; saltar al agua sin plataforma mata; sobre tronco o tortuga no.
- [ ] Sobre una plataforma, la rana se desplaza con ella; si su centro sale de `[0, 800]` muere.
- [ ] Las tortugas de las filas 1 y 4 parpadean 0,5 s y se hunden 2 s en ciclos de 6 s; una rana encima muere.
- [ ] Llenar un nido suma 100 + 10 × segundos restantes; si el nido tenía mosca suma además 200.
- [ ] Saltar a la fila 0 fuera de un nido, o a un nido lleno, mata.
- [ ] En la ronda 1 no hay cocodrilos; desde la ronda 2 hay un nido con cocodrilo que cambia cada 8 s, y saltar a él mata.
- [ ] La mosca aparece a los 3 s, dura 6 s y reaparece en otro nido cada 9 s; nunca coincide con el cocodrilo.
- [ ] Al llegar el reloj a 0 la rana muere y se gasta.
- [ ] Al gastar la 5.ª rana aparece el resumen de ronda 3 s; con ≥ 3 nidos llenos suma 300 × nidos × ronda (+2000 si son 5) y empieza la ronda siguiente con los nidos vacíos y `speedMul` mayor (ronda 2: ×1,08; ronda 11: ×1,8, tope).
- [ ] Con < 3 nidos llenos al cerrar la ronda se muestra GAME OVER y `status` pasa a `gameover`; solo ahí, nunca durante la ronda.
- [ ] Un `dt` grande no hace atravesar un vehículo a la rana.
- [ ] `P` y `Escape` pausan y reanudan; no hacen nada en `gameover` ni en el resumen de ronda.
- [ ] Todos los colores del canvas pertenecen a los 4 tonos de fósforo; los sprites se pintan sin suavizado.
- [ ] El motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado con el contrato de SPEC 04 sin cambios. **No:** `iframe` ni globals en `window`.
- **Sí:** HUD y overlays en el canvas. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila. **No:** fila sin motor.
- **Sí:** leaderboard de SPEC 05 sin código nuevo.
- **Sí:** id `frooger`, `ARCADE`, `green`, `cover-frooger`: el verde encaja con el fósforo verde y con el pendiente `frogger` del game-planner. **No:** `cyan`.
- **Sí:** definición rápida sin aclaraciones: la jam no puede preguntar y se tomaron las opciones recomendadas.
- **Sí:** `lives` = ranas que quedan en la ronda (5 → 0). Es el contrato fijo reinterpretado, y el intento del tema pasa a ser la unidad de juego. **No:** 3 vidas globales (variante 01).
- **Sí:** fin de partida al cerrar una ronda con < 3 nidos. **No:** fin por vidas; así morir una vez no acaba la partida y un buen jugador puede alargarla mucho.
- **Sí:** reloj fijo de 25 s por rana y dificultad solo por velocidad. **No:** reducir el reloj por ronda, que castigaría dos veces.
- **Sí:** hold-to-repeat a 140 ms. **No:** un salto por pulsación (variante 01).
- **Sí:** mosca y cocodrilo (desde ronda 2) como riesgo/recompensa. **No:** serpientes y nutrias.
- **Sí:** estética de fósforo verde de 4 tonos con sprites en mapas de píxeles dibujados en código. **No:** neón multicolor (variante 01) ni imágenes.
- **Sí:** 4 filas de río y 5 de carretera (distinto de la variante 01). **No:** copiar la distribución clásica 5 + 4.
- **Sí:** sonido fuera de alcance, y táctil y gamepad también.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode duplica bucles o listeners | `destroy` completo (`keydown`, `keyup`, `blur`, rAF). |
| `onStateChange` por frame | Emitir solo si cambia algún campo. |
| Las flechas hacen scroll | `preventDefault` en las teclas del juego. |
| El motor accede a `window` y rompe el SSR | Solo dentro de la factory, desde `useEffect`. |
| Fila en `games` sin motor | Registrar (paso 5) antes de la migración (paso 7). |
| Puntuación fuera de rango | Enteros; máximo teórico muy inferior a 10 000 000. |
| Partidas muy largas si el jugador es bueno (no hay vidas que agotar) | Velocidad creciente hasta ×1,8; el score crece también con la ronda, lo que premia la habilidad; revisar tras jugar. |
| `lives` pasa por 0 sin ser game over, y el HUD de React podría interpretarlo como fin | Comprobar que `game-player` solo abre el modal por `status`; verificarlo en el paso 8. |
| Hold-to-repeat provoca saltos accidentales al agua | Repetición a 140 ms y limpieza en `keyup`/`blur`; ajustar el intervalo tras jugar. |
| Cocodrilo ilegible | Ojos y mandíbula visibles y tono 4; parpadeo 1 s antes de cambiar de nido. |
| Con 4 tonos, vehículos y troncos se confunden | Silueta distinta por sprite y tono por tipo (vehículos tono 4, plataformas tono 3); validar en `/frontend-design`. |
| Túnel con `dt` grande | `dt` ≤ 50 ms y velocidad máxima 234 px/s. |
| El overlay PAUSA del canvas coincide con el de `game-player` | El de React lo tapa; no se toca `game-player.tsx`. |
| `INITIAL_STATE` de `game-player` asume 3 vidas y esta variante emite 5 | El motor emite 5 al crearse; el parpadeo inicial es aceptable. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o `scores`.
- Sonido e imágenes.
- Serpientes, nutrias y otros enemigos.
- Dos jugadores, táctil y gamepad.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos y tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
