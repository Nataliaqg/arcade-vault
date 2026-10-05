# SPEC 08 — Juego Snake

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-05
> **Objetivo:** Crear el juego Snake en TypeScript como un motor de canvas que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `snake` en la tabla `games` y guarda puntuaciones en el leaderboard.

## Por qué existe esta spec

Asteroids (SPEC 04) fijó la frontera motor ↔ React y SPEC 05 el flujo de catálogo y leaderboard. Tetris (SPEC 06) y Arkanoid (SPEC 07) confirmaron que el patrón se repite sin tocar el reproductor.

Snake es el cuarto juego de canvas y trae dos novedades:

- Es el primero que se crea desde cero: no hay `game.js` de referencia, solo una hoja de frutas en `references/source-assets/snake-assets/` (`fruits.png` y `sprites.js`).
- Es el primero con movimiento por pasos discretos (tick sobre una rejilla) en lugar de física continua.

El juego sigue siendo un motor imperativo que dibuja en un `<canvas>`. React lo monta, lo controla y escucha sus cambios. El catálogo y el leaderboard salen de Supabase.

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/snake/` (constantes, lógica pura, sprites, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas:
  - Rejilla de 20 × 15 celdas de 40 px (canvas 800×600).
  - Cuenta atrás 3-2-1 antes de cada partida (al cargar y en JUGAR DE NUEVO).
  - Serpiente inicial de 3 segmentos en el centro, avanzando hacia la derecha al terminar la cuenta atrás.
  - Comer una fruta alarga la serpiente 1 segmento y suma puntos.
  - Salir por un borde hace entrar por el opuesto (las paredes no matan); solo chocar con el propio cuerpo termina la partida.
  - Una sola fruta a la vez, en una celda libre aleatoria y con un sprite aleatorio.
  - El nivel sube cada 5 frutas y acelera el paso.
  - Victoria al llenar la rejilla.
- API del motor: `createSnake(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }` y notifica con `onStateChange`.
- Registro `snake: createSnake` en `ENGINES` (`lib/games/registry.ts`).
- Asset `fruits.png` copiado a `public/games/snake/`, cargado dentro de la factory. Solo se usa la fila central (pixel art).
- HUD y overlays dibujados en el canvas con la estética del Vault: puntuación, nivel, CARGANDO, cuenta atrás, PAUSA, GAME OVER y victoria.
- Pantalla de victoria que termina en `status: "gameover"`.
- Pausa propia (`P` y `Escape`) enlazada a `pause`/`resume`.
- Clase CSS `cover-snake` en `app/globals.css`.
- Migración `seed_game_snake` que inserta la fila `snake` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña SNAKE en `/salon`, top 10 en `/games/snake`.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Sonido.
- Las filas plana y realista de `fruits.png`.
- Frutas con valores distintos, power-ups y obstáculos.
- Interpolación suave del movimiento entre celdas.
- Controles táctiles (swipe) y gamepad.
- Anti-trampas y validación de partida en servidor.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_snake`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'snake',
  'SNAKE',
  'Come fruta, crece sin parar y no te muerdas la cola.',
  '<texto redactado en la implementación, mismo tono que el de asteroids, tetris y arkanoid; sin mencionar que la pared mata>',
  'ARCADE',
  'cover-snake',
  'yellow'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en SNAKE |
| -------- | -------------------- |
| `score`  | 10 × nivel vigente por fruta, acumulado. Entero. Muy por debajo de 10 000 000 (la rejilla tiene 300 celdas, así que como máximo 297 frutas). |
| `lives`  | Fijo en `1` (el juego no tiene vidas). |
| `level`  | `floor(frutas / 5) + 1`. |
| `status` | `playing` / `paused` / `gameover`. Llega a `gameover` al chocar (derrota) o al llenar la rejilla (victoria). |

Estructura del motor:

```
lib/games/snake/
  index.ts        ← createSnake(canvas, callbacks): GameEngine
  constants.ts    ← COLS, ROWS, CELL, W, H, INITIAL_LENGTH, FRUIT_POINTS, FRUITS_PER_LEVEL,
                    BASE_STEP_MS, STEP_DEC_MS, MIN_STEP_MS, MAX_DT, COUNTDOWN_MS, colores del Vault
  snake.ts        ← lógica pura: avanzar un paso (con paso por los bordes), colisión con el cuerpo, giro válido y colocar fruta (recibe `rng`)
  sprites.ts      ← FRUIT_SPRITES (22 recortes), SPRITESHEET_SRC y loadFruitSheet(src, onSettle): handle por instancia
  renderer.ts     ← rejilla, serpiente, fruta, HUD y overlays (recibe ctx y el handle)
public/games/snake/
  fruits.png
```

Estado interno del motor (dentro de la factory):

```ts
type Cell = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

let body: Cell[];            // body[0] es la cabeza
let dir: Dir;
let turnQueue: Dir[];        // máximo 2 giros pendientes
let fruit: { cell: Cell; sprite: number };
let phase: "loading" | "countdown" | "playing" | "won" | "lost";
let paused: boolean;
let score: number, level: number, eaten: number;
let stepAccum: number;       // ms acumulados hacia el siguiente paso
let countdownMs: number;     // ms que faltan para empezar (cuenta atrás)
```

Recortes de `fruits.png` (fila central, `y = 136`, alto 160). Los nombres de `sprites.js` no coinciden con la imagen (por ejemplo, el recorte `banana` en `x = 34` es una manzana), así que `FRUIT_SPRITES` usa los 22 `{ x, y, w, h }` del atlas sin nombre y se verifican contra la imagen en el paso 2.

Registro:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
  arkanoid: createArkanoid,
  snake: createSnake,
};
```

Convenciones:

- **Canvas:** lógico 800×600 (4:3). La rejilla de 20 × 15 celdas de 40 px lo llena exactamente. El CSS lo escala dentro de `crt-screen`.
- **Bucle:** `dt` en ms, limitado a 50 ms. El acumulador `stepAccum` avanza un paso cuando alcanza `stepMs = max(100, 220 − (nivel − 1) × 10)`. Como el paso mínimo (100 ms) supera el tope de `dt`, hay como mucho un paso por frame. `resume` y `restart` reinician `lastTime`.
- **Aleatoriedad:** `Math.random` solo dentro del motor, para elegir la celda y el sprite de la fruta.
- **`onStateChange`:** solo cuando cambian `score`, `lives`, `level` o `status`. `restart` emite el estado inicial: 0 puntos, 1 vida, nivel 1, `playing`. `pause`/`resume` emiten `status`.
- **Cuenta atrás:**
  - Empieza cuando el spritesheet se resuelve (`onload` u `onerror`) y en `restart`. Dura `COUNTDOWN_MS = 3000` ms y el canvas muestra `ceil(countdownMs / 1000)` (3, 2, 1) en cian grande sobre el tablero.
  - Mientras dura, `status` es `playing`, la serpiente no avanza y los giros se pueden encolar.
  - La pausa la congela; al reanudar continúa por donde iba, sin reiniciarse.
- **Bordes:** `advance` envuelve la cabeza con módulo (`(x + COLS) % COLS`, `(y + ROWS) % ROWS`). Las paredes no matan.
- **Status:** mientras carga el spritesheet, `status` es `playing`, pero la partida no avanza. `won` y `lost` se publican como `gameover`.
- **Teclado:**
  - Teclas del juego: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyP`, `Escape`, todas con `preventDefault` mientras el motor está activo.
  - Listeners `keydown` en `window`; la cola de giros se vacía en `blur`.
  - Un giro se encola solo si no es la dirección contraria ni igual a la del último giro encolado (o a `dir` si la cola está vacía). Así dos giros rápidos dentro del mismo paso nunca producen una vuelta de 180°.
- **Pausa:** `P` y `Escape` alternan `pause`/`resume` (se ignora `e.repeat`). No hacen nada en `gameover`. No hay tecla de reinicio: reinicia el botón JUGAR DE NUEVO del modal.
- **Colisión con la cola:** la cola se retira antes de comprobar el cuerpo, salvo que el paso coma fruta. Moverse a la celda que la cola deja libre en ese mismo paso no mata.
- **Fruta:** se dibuja con el recorte elegido, a 32 px de alto, centrada en su celda y conservando la relación de aspecto. Nunca aparece sobre la serpiente.
- **Spritesheet:**
  - Se carga con `new Image()` dentro de la factory, con `src = "/games/snake/fruits.png"`; el estado de carga vive en la instancia.
  - Hasta `onload`, el canvas muestra «CARGANDO…» y la partida no avanza.
  - Si falla (`onerror`), la partida arranca y la fruta se dibuja como un círculo de color plano.
  - `destroy` anula `onload`/`onerror`.
- **Estética Vault:**
  - Fondo del canvas `#0a0a0f` con rejilla sutil.
  - Serpiente `#f5ff00` (yellow, color del juego) con brillo neón (`shadowBlur`) y la cabeza algo más clara.
  - Textos en `#e6e9ff`, acentos `#00f5ff` y `#ff006e`.
  - Velo de overlays `rgba(10,10,15,0.7)`.
  - Los colores van como constantes en `constants.ts`.
  - Fuente pixel leída con `getComputedStyle(canvas).getPropertyValue("--font-press-start")` dentro de la factory, con respaldo `monospace`.
  - El diseño concreto se cierra con `/frontend-design`.
- Sin `localStorage` dentro del motor.

## Plan de implementación

1. Crear `lib/games/snake/constants.ts` y `snake.ts` con las constantes y la lógica pura (avanzar un paso, colisiones, giro válido, colocar fruta con `rng` por parámetro). Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/`. Crear `lib/games/snake/sprites.ts` con los 22 recortes verificados contra la imagen y la carga por instancia, sin globals. Verificación: `/games/snake/fruits.png` responde 200 en `npm run dev` y `npx tsc --noEmit` pasa.
3. Crear `lib/games/snake/renderer.ts`: rejilla, serpiente, fruta con sprite (o círculo de respaldo), HUD y overlays CARGANDO, PAUSA, GAME OVER y victoria con la estética del Vault. El diseño se hace con `/frontend-design`. Verificación: `npx tsc --noEmit` pasa.
4. Implementar `createSnake(canvas, callbacks)` en `lib/games/snake/index.ts`: input en `window`, bucle con `requestAnimationFrame` y acumulador de paso, `pause`/`resume`/`restart`/`destroy` y `onStateChange`. Verificación: `destroy` cancela el frame y desregistra `keydown` y `blur`.
5. Registrar `snake` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
6. Añadir `cover-snake` en `app/globals.css`, diseñado con `/frontend-design`. Verificación: la tarjeta se ve en `/games` tras el paso 7.
7. Aplicar la migración `seed_game_snake`. Verificación: `select id from games` incluye `snake`; `/games` muestra la tarjeta y `/games/snake/play` arranca el juego.
8. Verificar el leaderboard: perder una partida, guardar `TESTER`, ver la posición y el top 5 en el modal, la fila en la pestaña SNAKE de `/salon` y en el top 10 de `/games/snake`.
9. Probar StrictMode en `npm run dev` (sin doble bucle ni listeners duplicados), ancho móvil y portátil (1366×768), y confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Tras probar el juego (pasos 1–9 hechos), se acordaron tres cambios: paso inicial de 220 ms (mínimo 100 ms), cuenta atrás 3-2-1 y bordes que se atraviesan. Se reflejan en esta spec y se implementan como ajuste sobre los pasos 1, 3 y 4 (más una migración `update_game_snake_long` que reescribe el `long`).

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/`, en particular la guía de la carpeta `public/`, según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `snake` y las filas `asteroids`, `tetris` y `arkanoid` sin cambios.
- [ ] `/games` muestra la tarjeta SNAKE con `cover-snake` y `/games/snake` su detalle con botón para jugar.
- [ ] `/games/snake/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 1 vida y nivel 1 con una serpiente de 3 segmentos; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'snake'` y la puntuación real; el modal muestra la posición y el top 5.
- [ ] `/salon` tiene la pestaña SNAKE y su top coincide con el top 10 de `/games/snake`; la pestaña GENERAL mezcla puntuaciones de todos los juegos.
- [ ] `best` y `plays` de SNAKE reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/snake/play`.
- [ ] Asteroids, Tetris y Arkanoid se comportan igual que antes; `lib/games/asteroids/`, `lib/games/tetris/` y `lib/games/arkanoid/` no tienen cambios.

Específicos de SNAKE:

- [ ] El canvas es 800×600 y la rejilla de 20 × 15 celdas de 40 px lo llena entero.
- [ ] La serpiente arranca con 3 segmentos en el centro y, al terminar la cuenta atrás, avanza hacia la derecha sin pulsar ninguna tecla.
- [ ] Al abrir el juego y en JUGAR DE NUEVO aparece la cuenta atrás 3-2-1 y la serpiente no se mueve hasta terminarla; pausar la congela y reanudar no la reinicia.
- [ ] Las flechas y `W`/`A`/`S`/`D` giran la serpiente.
- [ ] Pulsar la dirección contraria a la actual no tiene efecto.
- [ ] Dos giros pulsados dentro del mismo paso se aplican en orden, uno por paso, y nunca producen una vuelta de 180°.
- [ ] Comer una fruta suma exactamente 10 × nivel y alarga la serpiente 1 segmento.
- [ ] La fruta nunca aparece sobre la serpiente y siempre hay una sola.
- [ ] La fruta se dibuja con un sprite de la fila pixel art de `fruits.png`, sin 404 en la consola.
- [ ] Con la ruta de `fruits.png` rota a propósito, el juego se puede jugar con círculos de color y no hay excepciones.
- [ ] La 5.ª fruta sube a nivel 2 y el paso pasa de 220 ms a 210 ms; desde el nivel 13 el paso es 100 ms.
- [ ] Salir por cualquiera de los 4 bordes hace aparecer la cabeza en el borde opuesto, sin perder.
- [ ] Chocar con el propio cuerpo muestra GAME OVER y `status` pasa a `gameover`.
- [ ] Avanzar a la celda que la cola deja libre en ese mismo paso no mata.
- [ ] Llenar las 300 celdas muestra la victoria, `status` pasa a `gameover` y el modal se abre con la puntuación real.
- [ ] `P` y `Escape` pausan y reanudan; el canvas dibuja el overlay PAUSA y `status` pasa a `paused` y `playing`. En `gameover` no hacen nada.
- [ ] Un `dt` grande (cambiar de pestaña y volver) no hace avanzar a la serpiente más de una celda por frame.
- [ ] La cola de giros se vacía tras `blur`.
- [ ] El HUD y los overlays del canvas usan la paleta del Vault (fondo `#0a0a0f`, texto `#e6e9ff`, serpiente `#f5ff00`) y la fuente pixel del Vault.
- [ ] El motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04 sin cambios. **No:** `iframe` ni globals en `window`.
- **Sí:** conservar HUD y overlays en el canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila en `games`. **No:** una fila sin motor (el reproductor quedaría vacío).
- **Sí:** el leaderboard de SPEC 05 se reutiliza sin código nuevo. **No:** tablas o componentes de ranking propios del juego.
- **Sí:** `snake`, `ARCADE`, `yellow`, `cover-snake`. Yellow es el único color que ningún juego usa (asteroids `cyan`, tetris `green`, arkanoid `magenta`). **No:** `green`, que repetiría el de Tetris.
- **Sí:** definición rápida sin aclaración detallada. El usuario no respondió a las preguntas de la Fase 2 y se tomaron las opciones recomendadas; cualquiera de ellas se puede cambiar al revisar esta spec.
- **Sí:** el juego se crea desde cero y solo toma `fruits.png` de `references/source-assets/snake-assets/`. **No:** portar `sprites.js`, que define `window.SPRITE_ATLAS` (estado global).
- **Sí:** los 22 recortes de la fila central con coordenadas verificadas contra la imagen. **No:** fiarse de los nombres de `sprites.js`; no coinciden con la imagen (el recorte `banana` es una manzana).
- **Sí:** solo la fila pixel art de `fruits.png`, por encajar con la estética arcade. **No:** las filas plana y realista.
- **Sí:** rejilla 20 × 15 de 40 px: llena el canvas 800×600 sin letterbox. **No:** 32 × 24 de 25 px (fruta demasiado pequeña).
- **Sí:** los bordes se atraviesan: se sale por un lado y se entra por el opuesto, y solo morderse mata (petición del usuario tras probar el juego). **No:** que la pared mate, decisión inicial que se revierte.
- **Sí:** `lives` fijo en `1` y `level = floor(frutas / 5) + 1`. El contrato no se amplía. **No:** 3 vidas, que se aleja del Snake clásico.
- **Sí:** 10 × nivel por fruta y paso `max(100, 220 − (nivel − 1) × 10)` ms (más lento que el valor inicial de 150/60 ms, que resultó demasiado rápido). **No:** puntuación plana; el nivel tiene que tener consecuencia en el ranking.
- **Sí:** cuenta atrás automática de 3 s antes de cada partida, que no exige ninguna tecla y cumple el criterio base de arrancar sin acción adicional. **No:** pantalla de «pulsa una tecla».
- **Sí:** cola de hasta 2 giros y descarte de la vuelta de 180°. **No:** aplicar solo el último giro pulsado, que pierde giros rápidos y permite suicidarse al girar dos veces en un paso.
- **Sí:** victoria al llenar la rejilla, con `status: "gameover"` para guardar la puntuación. **No:** bonus de victoria; sería una regla nueva.
- **Sí:** `P` y `Escape` pausan. **No:** tecla de reinicio dentro del juego; reinicia JUGAR DE NUEVO.
- **Sí:** estética neón del Vault con la fuente pixel, como Arkanoid. **No:** estilo Google Snake.
- **Sí:** sonido fuera de alcance. **No:** portar audio en esta spec.
- **Sí:** fuera de alcance táctil, gamepad y `CanvasGame`.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode monta el efecto dos veces y duplica bucles o listeners | `destroy` completo en el cleanup; criterio de aceptación en StrictMode. |
| `onStateChange` en cada frame provoca renders a 60 fps | Emitir solo cuando cambia algún campo de `GameState`. |
| Las flechas hacen scroll o activan botones | `preventDefault` en las teclas del juego y `blur` del botón tras pulsarlo (ya en `game-player`). |
| El motor accede a `window`/`document` y rompe el SSR | Instanciarlo solo dentro de la factory, llamada desde `useEffect`. |
| Fila en `games` sin motor en `ENGINES` | Orden fijo: registrar el motor (paso 5) antes de la migración (paso 7). |
| Puntuación no entera o por encima de 10 000 000 | Puntos enteros; máximo teórico muy inferior; el `CHECK` de `scores` rechaza el resto. |
| Los nombres y anchos de `sprites.js` no coinciden con `fruits.png` | Verificar los 22 recortes contra la imagen en el paso 2 y usarlos sin nombres. |
| `fruits.png` mide 3790 × 442 y no carga, o carga después de `destroy` | Ruta absoluta `/games/snake/…`, respaldo con círculos en `onerror`, `destroy` anula `onload`/`onerror`. |
| Dos giros rápidos dentro de un paso provocan una vuelta de 180° | La cola valida cada giro contra el último encolado y se limita a 2. |
| Con un `dt` grande la serpiente avanza varias celdas de golpe | `dt` ≤ 50 ms, menor que el paso mínimo de 100 ms: como mucho un paso por frame. |
| La rejilla casi llena hace lenta la búsqueda de una celda libre para la fruta | Elegir entre las celdas libres calculadas, no por reintentos aleatorios. |
| El overlay PAUSA del canvas coincide con el «EN PAUSA» de `game-player` | El de React lo tapa con un fondo semitransparente; ambos dicen lo mismo. No se toca `game-player.tsx`. |
| `INITIAL_STATE` de `game-player` asume 3 vidas antes del primer `emit` | El motor emite 1 vida al crearse; el parpadeo inicial es aceptable. |
| El canvas 800×600 deja la rejilla pequeña en móvil | Se acepta; no hay controles táctiles en esta spec. Revisión a ancho móvil. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Sonido.
- Las filas plana y realista de `fruits.png`.
- Frutas con valores distintos, power-ups y obstáculos.
- Controles táctiles y gamepad.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
