# JAM frooger · Variante 01 — FROOGER: Neón, 3 vidas y reloj por intento

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-05
> **Objetivo:** Crear FROOGER, un cruce de carriles y río estilo Frogger con estética neón del Vault, 3 vidas y un reloj por intento, como motor de canvas registrado como `frooger` que guarda puntuaciones en el leaderboard.
> **Alternativa a:** `02-ranas-en-cola.md`. Solo se implementa una; las dos comparten `id`, `title`, `cover-frooger` y la migración `seed_game_frooger`.

## Por qué existe esta spec

Tema de la jam: «Frooger: cruza carriles de tráfico y un río hasta llenar 5 nidos con reloj por intento». Es un clon de Frogger.

El catálogo (asteroids, tetris, arkanoid, snake) no tiene ningún juego de cruce de carriles ni de movimiento por saltos de rejilla con objetos móviles que transportan al jugador. `frogger` figura como pendiente en `references/game-suggestions-todo.md` (ARCADE/green, 27/30); esta jam lo desarrolla con el nombre propio `frooger`.

Qué aporta esta variante frente a la 02:

- Modelo clásico: 3 vidas; cada intento tiene su reloj y morir cuesta una vida.
- Estética neón del Vault con formas vectoriales y `shadowBlur` (sin assets).
- Un salto por pulsación (sin repetición al mantener la tecla).
- La dificultad crece por ronda (cada 5 nidos llenos).

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/frooger/` (constantes, carriles, lógica pura, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas:
  - Rejilla de 16 × 12 celdas de 50 px (canvas 800×600).
  - Fila 0: 5 nidos; filas 1-5: río; fila 6: mediana segura; filas 7-10: carretera; fila 11: salida segura.
  - La rana salta una celda por pulsación (arriba, abajo, izquierda, derecha).
  - Carretera: coches y camiones; tocarlos mata.
  - Río: troncos y tortugas; hay que montarse encima y el agua mata. La plataforma arrastra a la rana.
  - Algunas tortugas se hunden de forma cíclica.
  - Llenar los 5 nidos completa la ronda y sube el nivel.
  - Reloj de 30 s por intento (disminuye por ronda).
  - 3 vidas y vida extra a los 20 000 puntos.
- API del motor: `createFrooger(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }`.
- Registro `frooger: createFrooger` en `ENGINES`.
- HUD y overlays dibujados en el canvas con la estética del Vault: puntuación, vidas, nivel, barra de reloj, PAUSA y GAME OVER.
- Pausa propia (`P`, `Escape`) enlazada a `pause`/`resume`.
- Clase CSS `cover-frooger` en `app/globals.css`.
- Migración `seed_game_frooger`.
- Leaderboard verificado (modal, `/salon`, `/games/frooger`).

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Sonido y assets de imagen.
- Moscas, cocodrilos, serpientes, nutrias y otros enemigos del original.
- Modo de dos jugadores.
- Controles táctiles (swipe) y gamepad.
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
  'Cruza el tráfico, salta el río y llena los 5 nidos antes de que se agote el reloj.',
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
| `lives`  | Vidas restantes; empieza en 3; +1 al cruzar 20 000 puntos (una vez). |
| `level`  | Ronda actual: `floor(nidosLlenosTotales / 5) + 1`. |
| `status` | `playing` / `paused` / `gameover`. `gameover` al perder la última vida. |

Puntos:

| Evento | Puntos |
| ------ | ------ |
| Alcanzar una fila más avanzada que nunca en este intento | +10 |
| Llenar un nido | +50 + 10 × segundos enteros que quedan en el reloj |
| Completar los 5 nidos (ronda) | +1000 × nivel que se completa |

Estructura del motor:

```
lib/games/frooger/
  index.ts        ← createFrooger(canvas, callbacks): GameEngine
  constants.ts    ← COLS, ROWS, CELL, W, H, NEST_COLS, LANES, BASE_TIME_S, EXTRA_LIFE_AT, MAX_DT, colores del Vault
  lanes.ts        ← definición de carriles y avance de objetos (posición por módulo del ancho del carril)
  logic.ts        ← lógica pura: salto válido, colisión con vehículos, soporte de plataforma, llegada a nido, speedMul y timeS
  renderer.ts     ← rejilla, carriles, rana, HUD, barra de reloj y overlays (recibe ctx)
```

Estado interno del motor (dentro de la factory):

```ts
type Dir = "up" | "down" | "left" | "right";
type LaneObj = { x: number; w: number };               // x en px (esquina izquierda); se envuelve por módulo
type Lane = { row: number; kind: "road" | "log" | "turtle"; speed: number; objs: LaneObj[]; dive?: boolean };

let frog: { col: number; row: number; x: number };      // x en px: se desplaza al ir sobre plataformas
let lanes: Lane[];
let nests: boolean[];                                    // 5 nidos llenos / vacíos
let phase: "playing" | "dying" | "gameover";             // dying: 600 ms de animación de muerte
let paused: boolean;
let score: number, lives: number, level: number, filled: number;
let bestRow: number;                                     // fila más avanzada del intento (11 al aparecer)
let timeLeft: number;                                    // segundos del intento
let extraGiven: boolean;
let diveClock: number;                                   // ms dentro del ciclo de tortugas
```

Carriles (velocidades base en px/s; signo + = hacia la derecha; se multiplican por `speedMul(level)`):

| Fila | Tipo | Velocidad | Objetos |
| ---- | ---- | --------- | ------- |
| 1 | tronco | +60 | 3 troncos de 200 px, separación 150 px |
| 2 | tortuga | −80 | 4 grupos de 3 tortugas (150 px), separación 100 px, se hunden |
| 3 | tronco | +110 | 2 troncos de 300 px, separación 250 px |
| 4 | tronco | +50 | 4 troncos de 150 px, separación 100 px |
| 5 | tortuga | −70 | 4 grupos de 2 tortugas (100 px), separación 150 px, se hunden |
| 7 | carretera | −90 | 3 coches de 50 px, separación 200 px |
| 8 | carretera | +70 | 3 camiones de 100 px, separación 200 px |
| 9 | carretera | −140 | 3 coches de 50 px, separación 250 px |
| 10 | carretera | +100 | camiones de 100 px y coches de 50 px alternados, separación 200 px |

`speedMul(level) = min(2, 1 + 0.1 × (level − 1))`. `timeS(level) = max(15, 30 − 2 × (level − 1))`.

Convenciones:

- **Canvas:** lógico 800×600 (4:3); la rejilla 16 × 12 de 50 px lo llena. El CSS lo escala dentro de `crt-screen`.
- **Nidos:** 5 nidos de 2 celdas en las columnas `[1,2] [4,5] [7,8] [10,11] [13,14]`. Saltar a la fila 0 fuera de un nido, o a un nido ya lleno, mata.
- **Salto:** una celda por pulsación, con bloqueo de 90 ms entre saltos; `e.repeat` se ignora. En los bordes del canvas el salto lateral se ignora. Si una plataforma arrastra a la rana y su centro sale de `[0, W]`, muere.
- **Salto desde plataforma:** el salto horizontal mueve 50 px desde la `x` actual (no se ajusta a la rejilla); el vertical conserva `x`. La columna se calcula como `floor((x + 25) / 50)`.
- **Soporte:** al terminar el salto en fila de río, la rana vive si su centro está dentro de un tronco o de una tortuga no hundida; si no, muere. Después, cada frame se desplaza con la plataforma.
- **Tortugas que se hunden:** ciclo de 6 s: 3,5 s en superficie, 0,5 s de parpadeo de aviso, 2 s hundidas (no sostienen). Una rana encima cuando se hunden muere.
- **Colisión con vehículos:** rectángulo del vehículo contra el de la rana (36 × 36 px centrado en la celda). Tocarlo mata.
- **Muerte:** `dying` dura 600 ms con animación; luego, si quedan vidas, la rana reaparece en (columna 8, fila 11) con el reloj lleno; si no, `gameover`. Los carriles siguen moviéndose durante la animación.
- **Bucle:** `dt` en ms, limitado a 50 ms. Con la velocidad máxima (140 × 2 = 280 px/s) un frame mueve ≤ 14 px, así que no hay túnel con vehículos de 50 px.
- **Aleatoriedad:** `Math.random` solo dentro del motor, una llamada por carril en cada reinicio para el desfase inicial.
- **`onStateChange`:** solo cuando cambian `score`, `lives`, `level` o `status`. `restart` emite 0 puntos, 3 vidas, nivel 1, `playing`. `pause`/`resume` emiten `status`.
- **Teclado:** `ArrowUp/Down/Left/Right`, `KeyW/A/S/D`, `KeyP`, `Escape` con `preventDefault`; listeners en `window`; teclas limpiadas en `blur`. `P`/`Escape` alternan pausa y no hacen nada en `gameover`.
- **Estética Vault:** fondo `#0a0a0f`; río `#06103a` con ondas cian tenues; carretera `#14141c` con líneas discontinuas; rana `#39ff14` (green, color del juego) con `shadowBlur`; coches `#ff006e` y `#f5ff00`; troncos `#8a5a2b`; tortugas `#00f5ff`; texto `#e6e9ff`; velo de overlays `rgba(10,10,15,0.7)`. Constantes en `constants.ts`. Fuente pixel leída con `getComputedStyle(canvas).getPropertyValue("--font-press-start")`, respaldo `monospace`. El diseño concreto se cierra con `/frontend-design`.
- **Barra de reloj:** franja de 10 px al pie de la fila 11, verde → amarillo (< 10 s) → magenta (< 5 s).
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

1. Crear `constants.ts`, `lanes.ts` y `logic.ts` con constantes, carriles y lógica pura (salto, colisión, soporte, fórmulas). Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Crear `renderer.ts`: rejilla, carriles, rana, HUD, barra de reloj y overlays con la estética del Vault (diseñado con `/frontend-design`). Verificación: `npx tsc --noEmit` pasa.
3. Implementar `createFrooger` en `index.ts`: input, bucle `requestAnimationFrame`, reloj, muerte, nidos, `pause`/`resume`/`restart`/`destroy` y `onStateChange`. Verificación: `destroy` cancela el frame y quita `keydown` y `blur`.
4. Registrar `frooger` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
5. Añadir `cover-frooger` en `app/globals.css` con `/frontend-design`. Verificación: visible en `/games` tras el paso 6.
6. Aplicar la migración `seed_game_frooger`. Verificación: `select id from games` incluye `frooger`; `/games/frooger/play` arranca.
7. Verificar el leaderboard: perder, guardar `TESTER`, ver posición y top 5, pestaña FROOGER en `/salon` y top 10 en `/games/frooger`.
8. Probar StrictMode, ancho móvil y 1366×768; confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/` (`AGENTS.md`); lo visual se diseña con `/frontend-design` (`CLAUDE.md`).

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `frooger` y las filas `asteroids`, `tetris`, `arkanoid` y `snake` sin cambios.
- [ ] `/games` muestra la tarjeta FROOGER con `cover-frooger` y `/games/frooger` su detalle con botón para jugar.
- [ ] `/games/frooger/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego (carriles y reloj incluidos); REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas y nivel 1; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'frooger'` y la puntuación real; el modal muestra posición y top 5.
- [ ] `/salon` tiene la pestaña FROOGER y su top coincide con el top 10 de `/games/frooger`; GENERAL mezcla todos los juegos.
- [ ] `best` y `plays` de FROOGER reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/frooger/play`.
- [ ] Asteroids, Tetris, Arkanoid y Snake se comportan igual que antes; sus carpetas en `lib/games/` no tienen cambios.

Específicos de FROOGER:

- [ ] El canvas es 800×600 y la rejilla de 16 × 12 celdas de 50 px lo llena entera.
- [ ] La rana aparece en columna 8, fila 11, con el reloj en 30 s (nivel 1).
- [ ] Cada pulsación de dirección mueve la rana una celda; mantener la tecla no encadena saltos.
- [ ] En los bordes del canvas el salto lateral se ignora.
- [ ] Avanzar a una fila nueva suma +10 una sola vez por fila y por intento; retroceder y volver a avanzar no suma.
- [ ] Tocar un vehículo mata a la rana; pasar entre vehículos sin tocarlos no.
- [ ] Saltar a una fila de río sin plataforma debajo mata; sobre un tronco o tortuga no.
- [ ] Sobre una plataforma, la rana se desplaza a la velocidad del carril; si su centro sale de `[0, 800]` muere.
- [ ] Las tortugas de las filas 2 y 5 parpadean 0,5 s antes de hundirse y no sostienen durante 2 s; una rana encima muere.
- [ ] Saltar a la fila 0 en las columnas de un nido lo llena (+50 + 10 × s restantes); fuera de un nido, o en uno lleno, mata.
- [ ] Tras llenar un nido la rana reaparece en la salida con el reloj lleno.
- [ ] Al llegar el reloj a 0 la rana muere y se pierde una vida.
- [ ] Llenar los 5 nidos da +1000 × nivel, sube el nivel, vacía los nidos y aplica `speedMul` y `timeS` nuevos (nivel 2: ×1,1 y 28 s; nivel 9: ×1,8 y 15 s; nivel 11 en adelante: ×2).
- [ ] La vida extra se concede una sola vez al cruzar 20 000 puntos.
- [ ] Perder la 3.ª vida muestra GAME OVER y `status` pasa a `gameover`.
- [ ] Un `dt` grande (cambiar de pestaña y volver) no hace atravesar un vehículo a la rana.
- [ ] `P` y `Escape` pausan y reanudan y no hacen nada en `gameover`.
- [ ] HUD y overlays usan la paleta del Vault y la fuente pixel; el motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado con el contrato de SPEC 04 sin cambios. **No:** `iframe` ni globals en `window`.
- **Sí:** HUD y overlays en el canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila. **No:** fila sin motor.
- **Sí:** leaderboard de SPEC 05 sin código nuevo. **No:** tablas propias del juego.
- **Sí:** id `frooger` (nombre del tema; evita la marca Frogger), `ARCADE`, `green`, `cover-frooger`. El pendiente `frogger` del game-planner ya proponía green; es el color con menos peso junto a cyan. **No:** `cyan`, que se confundiría con el agua.
- **Sí:** definición rápida sin aclaraciones: la jam no puede preguntar y se tomaron las opciones recomendadas.
- **Sí:** 3 vidas y reloj por intento (agotarlo mata y quita una vida). **No:** reloj global; es la variante 02.
- **Sí:** formas dibujadas con neón, sin assets. **No:** sprites.
- **Sí:** un salto por pulsación. **No:** repetición al mantener (la variante 02 la usa).
- **Sí:** nidos de 2 celdas (margen asumible con saltos de 50 px). **No:** nidos de 1 celda, demasiado estrictos.
- **Sí:** rana libre de rejilla en horizontal sobre plataformas, como el original. **No:** reajustar a la rejilla al bajar.
- **Sí:** bonificación de tiempo en el nido y de ronda 1000 × nivel. **No:** puntos por vida restante.
- **Sí:** sonido, moscas, cocodrilos y serpientes fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode duplica bucles o listeners | `destroy` completo; criterio de aceptación en StrictMode. |
| `onStateChange` por frame | Emitir solo si cambia algún campo. |
| Las flechas hacen scroll | `preventDefault` en las teclas del juego. |
| El motor accede a `window` y rompe el SSR | Solo dentro de la factory, desde `useEffect`. |
| Fila en `games` sin motor | Registrar (paso 4) antes de la migración (paso 6). |
| Puntuación fuera de rango | Enteros; máximo teórico muy inferior a 10 000 000. |
| Imprecisión al saltar desde plataformas (rana entre celdas) | Columna por el centro; soporte con rectángulos, no con rejilla; probar los 5 carriles de río. |
| Túnel con `dt` grande | `dt` ≤ 50 ms y velocidad máxima 280 px/s (≤ 14 px por frame). |
| Dificultad inviable en niveles altos | Topes `speedMul` 2 y `timeS` 15 s; ajustar tras jugar. |
| Reloj y animación de muerte avanzan en pausa | Reloj, carriles y temporizador de muerte solo avanzan si `!paused`. |
| El overlay PAUSA del canvas coincide con el de `game-player` | El de React lo tapa; no se toca `game-player.tsx`. |
| `INITIAL_STATE` de `game-player` asume 3 vidas | Coincide con esta variante; sin parpadeo. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o `scores`.
- Sonido y sprites de imagen.
- Moscas, cocodrilos, serpientes, nutrias.
- Dos jugadores, táctil y gamepad.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos y tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
