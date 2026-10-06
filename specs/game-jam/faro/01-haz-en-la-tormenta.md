# JAM faro · Variante 01 — FARO: Haz en la tormenta

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-06
> **Objetivo:** Crear FARO, un juego de canvas en el que giras el haz de un faro en una noche de tormenta para guiar barcos a dos puertos sin que choquen con rocas casi invisibles. Es un motor en TypeScript que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `faro` en la tabla `games` y guarda puntuaciones en el leaderboard.
> **Alternativa a:** `02-faro-contra-raqueros.md`. Solo se implementa una. Las dos comparten `id` (`faro`), `title` (`FARO`), `cover-faro` y la migración `seed_game_faro`.

## Por qué existe esta spec

Tema de la jam: «Guardián del faro: gira el haz de luz de un faro durante una noche de tormenta para guiar barcos hasta el puerto y evitar que se estrellen contra las rocas».

Asteroids (SPEC 04) fijó la frontera motor ↔ React y SPEC 05 el flujo de catálogo y leaderboard. Tetris, Arkanoid, Snake y Frogger (SPEC 06, 07, 08 y 10) confirmaron que el patrón se repite sin tocar el reproductor. FARO sería el sexto juego de canvas y trae dos novedades:

- **Control indirecto.** El jugador no mueve a ningún personaje. Mueve una fuente de luz, y son los barcos los que reaccionan a ella.
- **Información oculta.** La noche esconde las rocas. Solo el haz y los relámpagos las muestran por completo, así que el jugador tiene que recordar el mapa.

**Qué aporta esta variante frente a la 02:** es la lectura más directa del tema. Hay un solo jugador contra la tormenta, controles de teclado (dos teclas y un botón), 3 vidas que son 3 naufragios y una dificultad que sube sin rondas. Es la variante de menor riesgo y la más fácil de jugar con el mando táctil. En cambio, sería el cuarto juego `ARCADE` del catálogo.

El juego sigue siendo un motor imperativo que dibuja en un `<canvas>`. React lo monta, lo controla y escucha sus cambios. El catálogo y el leaderboard salen de Supabase.

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/faro/` (constantes, lógica pura de barcos, haz y rocas, skins, sprites en caché, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas:
  - Mar de 800×480 px (franja `y ∈ [40, 520]`), costa en `y = 520` y un faro sobre un promontorio central.
  - Dos bocanas de puerto en la costa: izquierda `x ∈ [90, 190]` y derecha `x ∈ [610, 710]`.
  - El haz es un cono que gira con `←`/`→` (o `A`/`D`). Tiene una semiapertura de 12° y un alcance de 620 px.
  - Destello (`Espacio`): abre el haz a 30° durante 800 ms, con una recarga de 6 s.
  - Rocas circulares fijas: 5 al empezar y 1 más en cada nivel, hasta 12.
  - Barcos que entran por arriba y por los laterales. Mientras están iluminados, y durante 1,5 s después, navegan hacia la bocana más cercana y esquivan las rocas. A oscuras, derivan con la tormenta.
  - Viento lateral que cambia de sentido cada 15 s y empuja a todos los barcos.
  - Relámpagos cada 7–12 s que muestran todas las rocas durante 150 ms.
  - Atracar suma puntos y alarga la racha. Un naufragio (roca o costa fuera de bocana) cuesta 1 vida y corta la racha.
  - 3 vidas. Con 0 vidas, `status: "gameover"`.
  - El nivel sube cada 8 barcos atracados y aumenta la velocidad, el número de barcos, el viento y las rocas.
  - Cuenta atrás 3-2-1 al empezar y en JUGAR DE NUEVO, como Snake.
- API del motor: `createFaro(canvas, callbacks, options)` devuelve `{ pause, resume, restart, destroy, setSkin }` y notifica con `onStateChange`.
- Registro `faro: createFaro` en `ENGINES` (`lib/games/registry.ts`).
- `lib/games/faro/touch.ts` con `TOUCH_LAYOUT` y su entrada en `TOUCH_LAYOUTS`.
- `lib/games/faro/skins.ts` con las 3 skins `classic` (por defecto), `neon` y `retro`, y `setSkin` operativo.
- HUD y overlays dibujados en el canvas: puntuación, nivel, vidas (iconos de faro), racha, indicador de viento, barra de recarga del destello, cuenta atrás, PAUSA y GAME OVER.
- Todo se dibuja con primitivas canvas: no hay imágenes ni sprites bitmap externos.
- Rendimiento con el patrón de SPEC 11 desde el principio: capa estática, haz, barcos y HUD en caché, y bucle parado en pausa y en game over.
- Pausa propia (`P` y `Escape`) enlazada a `pause`/`resume`.
- Clase CSS `cover-faro` en `app/globals.css`.
- Migración `seed_game_faro` que inserta la fila `faro` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña FARO en `/salon` y top 10 en `/games/faro`.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Control con ratón (es el eje de la variante 02).
- Rival controlado por la CPU (variante 02).
- Sonido (sirena, trueno, lluvia).
- Colisiones entre barcos, tipos de barco con tamaños o velocidades distintos, y mareas.
- Mapas de costa diseñados a mano.
- Anti-trampas y validación de partida en servidor.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_faro`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'faro',
  'FARO',
  'Gira el haz en plena tormenta y lleva cada barco a puerto.',
  'Es noche cerrada, llueve a mares y los barcos no ven las rocas. Tú eres el farero: gira el haz para mostrarles el camino a los dos puertos, suelta un destello cuando se te escapen varios a la vez y aprovecha cada relámpago para memorizar los arrecifes. Cada barco atracado alarga tu racha; tres naufragios y se acabó la guardia.',
  'ARCADE',
  'cover-faro',
  'yellow'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en FARO |
| -------- | ------------------- |
| `score`  | Puntos acumulados: atracar suma `100 × nivel + 25 × racha`. Entero, acotado con `min(score, 10 000 000)`. |
| `lives`  | 3 al inicio. Baja 1 por barco naufragado. |
| `level`  | `floor(atracados / 8) + 1`. |
| `status` | `playing` / `paused` / `gameover`. Pasa a `gameover` al naufragar con la última vida, cuando termina la animación del naufragio (800 ms). |

Estructura del motor:

```
lib/games/faro/
  index.ts        ← createFaro(canvas, callbacks, options): GameEngine
  constants.ts    ← W, H, SEA_TOP, COAST_Y, PORTS, LIGHTHOUSE, BEAM_*, FLASH_*, SHIP_*, ROCK_*,
                    WIND_*, LIGHTNING_*, LEVEL_SHIPS, puntos, MAX_DT, COUNTDOWN_MS
  sea.ts          ← lógica pura: placeRocks(rng, n, avoid), spawnShip(rng, level), isLit(ship, beam),
                    steerGuided(ship, ports, rocks, dt), steerAdrift(ship, rng, level, dt),
                    applyWind, hitsRock, hitsCoast, docksAt
  skins.ts        ← FaroPalette y SKINS: Record<SkinId, FaroPalette>; `classic` por defecto
  sprites.ts      ← cachés por skin: capa estática, haz (normal y destello), barco (apagado/iluminado), roca, HUD
  renderer.ts     ← compone capas, lluvia, relámpago, barcos, HUD y overlays (recibe ctx, vista y paleta)
  touch.ts        ← TOUCH_LAYOUT
```

Registro:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
  arkanoid: createArkanoid,
  snake: createSnake,
  frogger: createFrogger,
  faro: createFaro,
};

export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
  asteroids: asteroidsTouch,
  tetris: tetrisTouch,
  arkanoid: arkanoidTouch,
  snake: snakeTouch,
  faro: faroTouch,
};
```

```ts
// lib/games/faro/touch.ts
export const TOUCH_LAYOUT: TouchLayout = {
  a: { code: "Space", label: "DESTELLO" },
  repeat: ["left", "right"],
};
```

Estado interno del motor (dentro de la factory):

```ts
type Vec = { x: number; y: number };
type Rock = { x: number; y: number; r: number };
type Ship = {
  id: number;
  pos: Vec;
  heading: number;      // radianes; 0 = derecha, π/2 = abajo (eje y del canvas)
  turnRate: number;     // rad/s de la deriva a oscuras
  wanderMs: number;     // ms hasta elegir otra deriva
  guidedMs: number;     // ms de «memoria» tras salir del haz (0..1500)
  state: "sailing" | "docked" | "wrecked";
  fxMs: number;         // animación de atraque o naufragio
};

let rocks: Rock[];
let ships: Ship[];
let beamAngle: number;          // grados en [180, 360]; 270 = vertical hacia arriba
let flashMs: number, flashCooldownMs: number;
let windDir: 1 | -1, windMs: number;
let lightningInMs: number, lightningMs: number;
let spawnInMs: number;
let phase: "countdown" | "playing" | "lost";
let paused: boolean;
let score: number, lives: number, level: number, docked: number, streak: number;
let countdownMs: number;
let keys: { left: boolean; right: boolean };
```

Convenciones:

- **Canvas:** lógico 800×600 (4:3); el CSS lo escala dentro de `crt-screen`. Franjas:
  - `y ∈ [0, 40)`: HUD.
  - `y ∈ [40, 520)`: mar.
  - `y ≥ 520`: tierra, salvo las bocanas.
- **Geometría fija:**
  - El faro está en `(400, 508)`, sobre un promontorio semicircular de radio 44 centrado en `(400, 520)`. El promontorio cuenta como costa.
  - El haz nace en la linterna, en `(400, 496)`.
  - Bocanas: `PORTS = [{ x0: 90, x1: 190 }, { x0: 610, x1: 710 }]`, con centros de llegada `(140, 540)` y `(660, 540)`.
- **Haz:**
  - `beamAngle` empieza en 270° y queda acotado a `[180°, 360°]`.
  - Gira a 110°/s mientras se mantiene `←`/`A` (hacia 180°) o `→`/`D` (hacia 360°).
  - Un barco está iluminado si su distancia a la linterna es ≤ 620 px y la diferencia angular es ≤ la semiapertura: 12°, o 30° durante un destello.
- **Destello:**
  - `Espacio` lo activa si `flashCooldownMs = 0`. Dura 800 ms y la recarga es de 6000 ms; la recarga empieza al activarlo.
  - Se ignora `e.repeat`.
  - Una barra bajo el faro muestra la recarga.
- **Rocas:**
  - Radio de 16 a 28 px. Se colocan con `rng` en `x ∈ [60, 740]` e `y ∈ [150, 470]`.
  - Separación entre centros ≥ 70 px. A ≥ 90 px de los centros de bocana `(140, 520)` y `(660, 520)`, y a ≥ 80 px del faro.
  - Se empieza con 5. Cada subida de nivel añade 1 (hasta 12) en una posición a ≥ 100 px de cualquier barco. Si 50 intentos fallan, ese nivel no añade roca.
- **Barcos:**
  - Radio de colisión de 12 px. Se dibujan como un casco de 28×14 px orientado por `heading`, con una luz de navegación siempre visible.
  - Velocidad `min(36 + 4 × (nivel − 1), 80)` px/s.
  - Aparición:
    - El 60 % entra por arriba: `y = 44`, `x ∈ [80, 720]`, rumbo 90° ± 20°.
    - El 40 % entra por un lateral: `x = −10` u `810`, `y ∈ [60, 240]`, rumbo hacia dentro y abajo (30° ± 15° o 150° ± 15°).
  - Ritmo: un barco cada `max(1500, 5000 − 400 × (nivel − 1))` ms, si hay menos de `min(1 + nivel, 6)` navegando. El primero aparece 500 ms después de la cuenta atrás.
  - Los barcos no chocan entre sí.
- **Barco guiado** (iluminado, o con `guidedMs > 0`):
  - Rumbo deseado: hacia el centro de llegada de la bocana más cercana, más una repulsión de cada roca a ≤ 110 px por delante (semiplano frontal). La repulsión es inversamente proporcional a la distancia y siempre gira hacia el lado contrario al centro de la roca respecto al rumbo.
  - Giro máximo de 120°/s.
  - Mientras está iluminado, `guidedMs = 1500`. Fuera del haz, `guidedMs` se descuenta.
- **Barco a oscuras** (sin guía):
  - Cada 1000 ms elige `turnRate` uniforme en `[−D, D]`, con `D = min(20 + 2 × (nivel − 1), 40)` °/s.
  - Su rumbo se acota a `[20°, 160°]`: siempre avanza hacia la costa.
- **Viento:**
  - Desplazamiento lateral de `windDir × min(6 + 2 × (nivel − 1), 30)` px/s, aplicado a todos los barcos.
  - `windDir` cambia cada 15 000 ms. El HUD muestra una flecha con el sentido.
- **Fin de un barco:**
  - **Atraca** si su centro cruza `y ≥ 520` con `x` dentro de una bocana: suma `100 × nivel + 25 × min(racha, 20)` y luego `racha += 1`, `atracados += 1`.
  - **Naufraga** si su círculo toca una roca, el promontorio o la línea `y = 520` fuera de una bocana: `vidas −= 1` y `racha = 0`.
  - **Se pierde** si sale por arriba (`y < 30`) o por los lados (`x < −20` o `x > 820`) después de haber entrado: no suma, no quita vida y pone `racha = 0`.
  - Atraque y naufragio tienen una animación de 800 ms. Durante el naufragio el barco ya no colisiona.
- **Nivel:**
  - `nivel = floor(atracados / 8) + 1`.
  - Al subir: un banner «NIVEL N» de 1500 ms, sin pausar el juego, y 1 roca más.
- **Visibilidad:**
  - Mar oscuro con lluvia: 120 trazos precalculados, movidos por frame y dibujados en un solo `path`.
  - Las rocas fuera del haz solo dejan ver un anillo de espuma con alfa 0,18. Dentro del haz, o durante un relámpago, se ven enteras.
  - Los barcos a oscuras se dibujan con alfa 0,45. Los iluminados o guiados, enteros y con contorno claro.
- **Relámpago:**
  - Cada `7000–12000` ms (`rng`).
  - Destello blanco a pantalla completa con alfa 0,35 que se apaga en 150 ms. Mientras dura, todas las rocas se ven enteras.
- **Cuenta atrás:** `COUNTDOWN_MS = 3000`, con `ceil(countdownMs / 1000)` en grande sobre el mar.
  - Durante la cuenta atrás el haz ya se puede girar, pero no aparecen barcos ni corren el viento ni los relámpagos.
  - La pausa la congela.
- **Bucle:** `dt` en ms limitado a 50 ms; `resume` y `restart` reinician `lastTime`. La lógica pura recibe `dt` y `rng`.
- **Aleatoriedad:** `Math.random` solo dentro del motor, pasado como `rng` a `sea.ts`.
- **`onStateChange`:** solo cuando cambian `score`, `lives`, `level` o `status`. `restart` emite 0 puntos, 3 vidas, nivel 1 y `playing`. `pause`/`resume` emiten `status`.
- **Teclado:**
  - Listeners `keydown`/`keyup` en `window` que leen `e.code`: `ArrowLeft`, `ArrowRight`, `KeyA`, `KeyD`, `Space`, `KeyP`, `Escape`. Todas llevan `preventDefault` mientras el motor está activo.
  - `blur` suelta las teclas.
  - Así lo consume también el mando táctil (SPEC 09).
- **Pausa:** `P` y `Escape` alternan `pause`/`resume` (se ignora `e.repeat`). No hacen nada en `gameover`. No hay tecla de reinicio: reinicia JUGAR DE NUEVO.
- **Rendimiento (patrón SPEC 11):**
  - Capa estática por skin en un canvas offscreen: degradado del mar, costa, bocanas, promontorio y faro.
  - Haz como sprite en caché por skin y semiapertura (12° y 30°), dibujado con `rotate` y composición `lighter`.
  - Sprites de barco en caché por skin (apagado e iluminado), rotados al componer.
  - HUD en caché, regenerado solo cuando cambian `score`, `level`, `lives`, la racha o la skin.
  - Sin `shadowBlur` por frame.
  - En pausa y en `gameover` se dibuja un frame con el overlay y no se pide otro rAF. `setSkin` con el bucle parado redibuja un frame.
- **Skins** (`FaroPalette`, legibles en modo oscuro):
  - `classic` (por defecto): noche del Vault, con fondo `#0a0a0f`, mar `#0b1430`, haz `#f5ff00`, texto `#e6e9ff` y acentos `#00f5ff`/`#ff006e`.
  - `neon`: haz cian `#00f5ff` y espuma magenta.
  - `retro`: monocromo ámbar de fósforo.
  - Contraste del texto del HUD frente al fondo ≥ 4,5 (`contrastRatio`). `skin-designer` valida y afina `neon` y `retro`.
- **Fuente pixel:** se lee una vez al crear el motor con `getComputedStyle(canvas).getPropertyValue("--font-press-start")`, con respaldo `monospace`.
- Sin `localStorage` ni audio dentro del motor.

## Plan de implementación

1. Crear `lib/games/faro/constants.ts` y `sea.ts` con las constantes y la lógica pura (colocar rocas, aparición, iluminación, guiado con repulsión, deriva, viento, colisiones y atraque, con `rng` y `dt` por parámetro). Verificación: `npm run lint` y `npx tsc --noEmit` pasan; con una semilla fija, `placeRocks` devuelve 12 rocas que cumplen todas las distancias mínimas.
2. Crear `lib/games/faro/skins.ts` con las 3 paletas, y `sprites.ts` con las cachés (capa estática, haz ×2, barcos, rocas, HUD). Diseño con `/frontend-design`. Verificación: `npx tsc --noEmit` pasa y el contraste del texto del HUD es ≥ 4,5 en las 3 skins.
3. Crear `lib/games/faro/renderer.ts`: composición de capas, lluvia, relámpago, rocas según visibilidad, barcos, animaciones de atraque y naufragio, HUD y overlays (cuenta atrás, NIVEL N, PAUSA, GAME OVER). Verificación: `npx tsc --noEmit` pasa.
4. Implementar `createFaro(canvas, callbacks, options)` en `lib/games/faro/index.ts`: input en `window`, bucle con `requestAnimationFrame`, haz, destello, aparición, viento, relámpagos, puntuación, vidas, niveles, `pause`/`resume`/`restart`/`destroy`/`setSkin` y `onStateChange`. Verificación: `destroy` cancela el frame y desregistra `keydown`, `keyup` y `blur`.
5. Crear `lib/games/faro/touch.ts` y registrar `faro` en `ENGINES` y en `TOUCH_LAYOUTS`. Verificación: `npx tsc --noEmit` pasa.
6. Añadir `cover-faro` en `app/globals.css`, diseñado con `/frontend-design`: faro y cono amarillo sobre un mar oscuro con lluvia. Verificación: la tarjeta se ve en `/games` tras el paso 7.
7. Aplicar la migración `seed_game_faro`. Verificación: `select id from games` incluye `faro`; `/games` muestra la tarjeta y `/games/faro/play` arranca el juego.
8. Verificar el leaderboard: perder una partida, guardar `TESTER`, ver la posición y el top 5 en el modal, la fila en la pestaña FARO de `/salon` y en el top 10 de `/games/faro`.
9. Probar StrictMode en `npm run dev` (sin doble bucle ni listeners duplicados), el mando táctil con emulación `pointer: coarse`, el ancho móvil y un portátil (1366×768). Confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/`, según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`, según `CLAUDE.md`. Tras implementar se recomienda `/spec-impl-game`, que lanza `skin-designer` y `mobile-porter`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `faro` y las filas `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger` sin cambios.
- [ ] `/games` muestra la tarjeta FARO con `cover-faro` y `/games/faro` su detalle con botón para jugar.
- [ ] `/games/faro/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas ni `Espacio`.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas y nivel 1, con 5 rocas nuevas y sin barcos; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'faro'` y la puntuación real; el modal muestra la posición y el top 5.
- [ ] `/salon` tiene la pestaña FARO y su top coincide con el top 10 de `/games/faro`; la pestaña GENERAL mezcla puntuaciones de todos los juegos.
- [ ] `best` y `plays` de FARO reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/faro/play`.
- [ ] Los demás juegos se comportan igual que antes; sus carpetas en `lib/games/` no tienen cambios.

Específicos de FARO:

- [ ] El canvas es 800×600, con HUD en `y < 40`, mar hasta `y = 520`, el faro sobre el promontorio central y dos bocanas visibles en `x ∈ [90, 190]` y `[610, 710]`.
- [ ] Al abrir el juego y en JUGAR DE NUEVO aparece la cuenta atrás 3-2-1. No aparecen barcos hasta terminarla y el haz ya se puede girar.
- [ ] `←`/`A` y `→`/`D` giran el haz a 110°/s. Nunca baja de 180° ni pasa de 360°.
- [ ] Un barco dentro del cono (≤ 620 px y ≤ 12°) se dibuja entero y gira hacia la bocana más cercana; los barcos fuera del haz se ven atenuados.
- [ ] Al salir del haz, un barco mantiene el rumbo guiado durante 1,5 s y después deriva.
- [ ] Un barco guiado con una roca en su camino la rodea sin tocarla. Se comprueba con una roca entre el barco y la bocana.
- [ ] `Espacio` abre el haz a 30° durante 800 ms; pulsarlo otra vez antes de 6 s no hace nada y la barra de recarga lo refleja.
- [ ] Las rocas fuera del haz solo muestran el anillo de espuma; dentro del haz o durante un relámpago se ven enteras. Hay un relámpago cada 7–12 s.
- [ ] La flecha de viento del HUD cambia de sentido cada 15 s y los barcos a oscuras derivan en ese sentido.
- [ ] Atracar con racha 0 en nivel 1 suma exactamente 100; el siguiente atraque sin naufragios suma 125; la racha no aporta más de 500.
- [ ] Un naufragio (roca, promontorio o costa fuera de bocana) resta 1 vida, pone la racha a 0 y muestra la animación de 800 ms.
- [ ] Un barco que sale por arriba o por los lados no resta vida y pone la racha a 0.
- [ ] El 8.º atraque sube al nivel 2: aparece el banner NIVEL 2, hay 6 rocas y la velocidad pasa de 36 a 40 px/s.
- [ ] Nunca hay más de `min(1 + nivel, 6)` barcos navegando a la vez.
- [ ] Una roca nueva nunca aparece a menos de 100 px de un barco.
- [ ] Con 0 vidas, `status` pasa a `gameover` al terminar la animación del naufragio y se abre el modal.
- [ ] `P` y `Escape` pausan y reanudan; el canvas dibuja el overlay PAUSA y `status` pasa a `paused` y `playing`. En `gameover` no hacen nada.
- [ ] En pausa y en `gameover` no se piden más frames de rAF (se comprueba con el panel Performance).
- [ ] Un `dt` grande (cambiar de pestaña y volver) no produce naufragios espurios ni atraques dobles.
- [ ] `blur` suelta las teclas: el haz deja de girar.
- [ ] En el mando táctil, el D-pad izquierda/derecha gira el haz con autorrepetición y el botón A (DESTELLO) dispara el destello.
- [ ] `setSkin` cambia entre `classic`, `neon` y `retro` en vivo, sin reiniciar la partida; las 3 son legibles en modo oscuro.
- [ ] El motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04 sin cambios. **No:** componente React propio ni play-page dedicada.
- **Sí:** conservar HUD y overlays en el canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila en `games`. **No:** una fila sin motor (el reproductor quedaría vacío).
- **Sí:** el leaderboard de SPEC 05 se reutiliza sin código nuevo. **No:** tablas o componentes de ranking propios.
- **Sí:** `faro` / `FARO`, corto como el resto de títulos del catálogo. **No:** `guardian-del-faro` / `GUARDIÁN DEL FARO`, que no cabe en la tarjeta con la fuente pixel.
- **Sí:** `ARCADE`, porque es acción en tiempo real con reflejos. **No:** `PUZZLE`, ya que no hay solución que planificar. Se asume que sería el 4.º `ARCADE`; la variante 02 resuelve ese desequilibrio.
- **Sí:** `yellow`, el color de la luz del haz; está usado una sola vez (Snake). **No:** `green`, que ya tienen Tetris y Frogger.
- **Sí:** catálogo tomado de `references/implemented-games.md` y `lib/games/registry.ts` (asteroids, tetris, arkanoid, snake, frogger). **No:** consultar `public.games`, porque el MCP de Supabase no estaba conectado al redactar.
- **Sí:** control indirecto: el haz guía y el barco decide su rumbo. **No:** pilotar los barcos uno a uno.
- **Sí:** solo teclado (2 teclas de giro y `Espacio`), que encaja tal cual en el mando táctil. **No:** ratón, que es el eje de la variante 02.
- **Sí:** rocas casi invisibles, reveladas por el haz y los relámpagos. **No:** rocas siempre visibles, que quitan la memoria como habilidad.
- **Sí:** «memoria» de 1,5 s del barco guiado para que se pueda atender a varios barcos barriendo. **No:** guía solo mientras está iluminado, que obliga a seguir a un único barco.
- **Sí:** 3 vidas = 3 naufragios y `level = floor(atracados / 8) + 1`. **No:** rondas con marcador, que son el eje de la variante 02.
- **Sí:** racha que suma `25 × min(racha, 20)` para premiar la constancia en el ranking. **No:** puntos planos por barco.
- **Sí:** los barcos perdidos por los bordes no quitan vida y cortan la racha. **No:** contarlos como naufragio, que castiga igual un descuido y un choque.
- **Sí:** los barcos no chocan entre sí. **No:** colisiones barco-barco, que provocan dobles naufragios injustos con varios barcos guiados a la misma bocana.
- **Sí:** primitivas canvas y patrón de rendimiento de SPEC 11 desde el principio. **No:** sprites bitmap; no hay assets de referencia para este tema.
- **Sí:** las 3 skins definidas en la spec; `skin-designer` las valida y afina. **No:** dejar solo `classic`.
- **Sí:** `touch.ts` con A = DESTELLO y autorrepetición en izquierda/derecha. **No:** dejar el juego sin entrada en `TOUCH_LAYOUTS`.
- **Sí:** sonido fuera de alcance. **No:** sirena ni truenos en esta spec.
- **Sí:** se descartó una tercera variante `PUZZLE` por turnos sobre rejilla (barcos que avanzan una celda por turno y aceite limitado), porque con un único haz no se puede garantizar que cada noche tenga solución. **No:** incluirla como alternativa sin un generador validado.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode monta el efecto dos veces y duplica bucles o listeners | `destroy` completo en el cleanup; criterio de aceptación en StrictMode. |
| `onStateChange` en cada frame provoca renders a 60 fps | Emitir solo cuando cambia algún campo de `GameState`. La racha no forma parte del contrato y solo regenera el HUD del canvas. |
| Las flechas o `Espacio` hacen scroll o activan botones | `preventDefault` en las teclas del juego y `blur` del botón tras pulsarlo (ya en `game-player`). |
| El motor accede a `window`/`document` y rompe el SSR | Instanciarlo solo dentro de la factory, llamada desde `useEffect`. |
| Fila en `games` sin motor en `ENGINES` | Orden fijo: registrar el motor (paso 5) antes de la migración (paso 7). |
| Puntuación no entera o por encima de 10 000 000 | Puntos enteros y `min(score, 10 000 000)`; el `CHECK` de `scores` rechaza el resto. |
| Un barco guiado oscila delante de una roca entre la bocana y la repulsión | La repulsión siempre gira hacia el lado contrario al centro de la roca respecto al rumbo, sin cambiar de lado mientras la roca siga a ≤ 110 px. Criterio específico con una roca en medio. |
| Una roca nueva aparece encima de un barco | Distancia mínima de 100 px a los barcos y 50 intentos como máximo; si fallan, no se añade roca en ese nivel. |
| La oscuridad hace el juego ilegible, sobre todo en `retro` | Luces de navegación siempre visibles, anillo de espuma con alfa 0,18, relámpagos y contraste del HUD ≥ 4,5 verificado en las 3 skins. |
| Haz con degradado, lluvia y composición `lighter` dan tirones | Sprites del haz en caché, lluvia en un solo `path`, capa estática offscreen y bucle parado en pausa (patrón SPEC 11). |
| Con `dt` grande, un barco atraviesa una roca pequeña | `dt` ≤ 50 ms y velocidad ≤ 80 px/s: como mucho 4 px por frame, frente a un diámetro mínimo de roca de 32 px. |
| `INITIAL_STATE` de `game-player` asume 3 vidas, nivel 1 | Coincide con el estado inicial de FARO; no hay parpadeo. |
| Jugadores buenos alargan la partida sin límite | La dificultad sube hasta el nivel 13 (12 rocas desde el 8, 6 barcos desde el 5, un barco cada 1,5 s desde el 10, 80 px/s desde el 12, viento de 30 px/s desde el 13) y luego se mantiene; la racha y el `100 × nivel` hacen que el ranking premie aguantar. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Control con ratón y rival controlado por la CPU (variante 02).
- Sonido.
- Colisiones entre barcos, tipos de barco y mareas.
- Mapas de costa diseñados a mano.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
