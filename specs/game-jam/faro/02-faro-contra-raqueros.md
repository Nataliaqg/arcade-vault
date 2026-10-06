# JAM faro · Variante 02 — FARO: Faro contra raqueros

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-06
> **Objetivo:** Crear FARO como un duelo nocturno contra la CPU. Tú apuntas el haz del faro con el ratón (o el teclado) para llevar barcos a puerto, mientras los raqueros mueven un farol falso por los arrecifes para hacerlos naufragar. Gana la noche quien llegue antes a 7 barcos. Es un motor de canvas en TypeScript que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `faro` en la tabla `games` y guarda puntuaciones en el leaderboard.
> **Alternativa a:** `01-haz-en-la-tormenta.md`. Solo se implementa una. Las dos comparten `id` (`faro`), `title` (`FARO`), `cover-faro` y la migración `seed_game_faro`.

## Por qué existe esta spec

Tema de la jam: «Guardián del faro: gira el haz de luz de un faro durante una noche de tormenta para guiar barcos hasta el puerto y evitar que se estrellen contra las rocas».

Asteroids (SPEC 04) fijó la frontera motor ↔ React y SPEC 05 el flujo de catálogo y leaderboard. Tetris, Arkanoid, Snake y Frogger (SPEC 06, 07, 08 y 10) confirmaron que el patrón se repite sin tocar el reproductor. FARO sería el sexto juego de canvas.

**Qué aporta esta variante frente a la 01:** convierte la tormenta en un rival. Se inspira en los «raqueros» de la costa cantábrica, que según la leyenda encendían luces falsas para atraer barcos a las rocas y saquearlos. Con eso:

- **Primer juego `VERSUS` del catálogo.** La categoría está vacía y la prioriza la memoria del `game-planner`.
- **Primer juego con ratón como control principal.** Apuntar el haz es natural con el puntero. El teclado sigue funcionando para el mando táctil.
- **Rondas con marcador.** Cada noche es una carrera a 7, `lives` son las noches que aún puedes perder y `level` es la noche. Es un mapeo de `GameState` distinto al de la 01.
- **Duelo de habilidad.** La CPU elige a qué barco atraer y desde la noche 3 esquiva tu haz. Tú puedes cegar su farol con un destello.

El precio es más esfuerzo (IA, ratón, rondas) y más riesgo de equilibrio que en la 01.

El juego sigue siendo un motor imperativo que dibuja en un `<canvas>`. React lo monta, lo controla y escucha sus cambios. El catálogo y el leaderboard salen de Supabase.

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/faro/` (constantes, lógica pura de barcos y haz, IA de los raqueros, skins, sprites en caché, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas:
  - Mar en la franja `y ∈ [40, 520]`, con una única bocana central en la costa (`x ∈ [340, 460]`) y el faro al fondo del puerto.
  - Dos arrecifes costeros, en `x ∈ [0, 300]` y `x ∈ [500, 800]` (`y ∈ [440, 520]`), y 3 rocas sueltas por noche. Rocas y arrecifes siempre visibles.
  - Haz con semiapertura de 11° y alcance de 660 px. Apunta hacia el ratón girando a un máximo de 240°/s; con `←`/`→` (o `A`/`D`) gira a 110°/s.
  - Destello con clic izquierdo o `Espacio`: 28° durante 600 ms, con una recarga de 5 s. Si el farol falso queda dentro, se apaga 3 s.
  - Los barcos iluminados, y durante 1 s después, navegan a la bocana esquivando rocas y arrecifes. Los no iluminados que estén cerca del farol falso giran hacia él. El resto deriva con el viento.
  - Raqueros (CPU): un farol que recorre el borde superior de cada arrecife, elige a qué barco atraer, cambia de arrecife y, desde la noche 3, esquiva el haz.
  - Noche al mejor de 7: ganas con 7 barcos atracados y pierdes cuando los raqueros suman 7 naufragios.
  - 3 noches perdidas = `status: "gameover"`. El juego es infinito: no hay victoria final.
  - Cada noche, ganada o perdida, sube la dificultad: velocidad de los barcos, número de barcos, IA y alcance del farol falso.
  - Cuenta atrás 3-2-1 al empezar y en JUGAR DE NUEVO, y banner de 2500 ms entre noches.
- API del motor: `createFaro(canvas, callbacks, options)` devuelve `{ pause, resume, restart, destroy, setSkin }` y notifica con `onStateChange`.
- Registro `faro: createFaro` en `ENGINES` (`lib/games/registry.ts`).
- `lib/games/faro/touch.ts` con `TOUCH_LAYOUT` y su entrada en `TOUCH_LAYOUTS`.
- `lib/games/faro/skins.ts` con las 3 skins `classic` (por defecto), `neon` y `retro`, y `setSkin` operativo.
- HUD y overlays dibujados en el canvas: puntuación, noche, vidas (iconos de faro), marcador de la noche `PUERTO n/7 · RAQUEROS m/7`, barra de recarga del destello, cuenta atrás, banner NOCHE GANADA / NOCHE PERDIDA, PAUSA y GAME OVER.
- Ratón con coordenadas convertidas a la resolución lógica con `getBoundingClientRect`.
- Todo se dibuja con primitivas canvas: no hay imágenes ni sprites bitmap externos.
- Rendimiento con el patrón de SPEC 11 desde el principio: capa estática, haz, barcos, farol y HUD en caché, y bucle parado en pausa y en game over.
- Pausa propia (`P` y `Escape`) enlazada a `pause`/`resume`.
- Clase CSS `cover-faro` en `app/globals.css`.
- Migración `seed_game_faro` que inserta la fila `faro` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña FARO en `/salon` y top 10 en `/games/faro`.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Dos jugadores humanos (local u online).
- Rocas ocultas y relámpagos (eje de la variante 01).
- Sonido.
- Colisiones entre barcos, tipos de barco y varias bocanas.
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
  'Tu faro contra el farol de los raqueros: gana la noche a 7 barcos.',
  'En plena tormenta, los raqueros mueven un farol falso por los arrecifes para atraer barcos a las rocas. Tú guardas el faro: apunta el haz para llevar cada barco a puerto, ciega su farol con un destello y no dejes que lleguen antes a siete naufragios. Cada noche son más astutos; pierde tres y se acabó la guardia.',
  'VERSUS',
  'cover-faro',
  'magenta'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en FARO |
| -------- | ------------------- |
| `score`  | Puntos acumulados: `100 × noche` por barco atracado, `+50` por cegar el farol y, al ganar una noche, `500 × noche + 100 × (7 − naufragios de esa noche)`. Entero, acotado con `min(score, 10 000 000)`. |
| `lives`  | Noches que aún puedes perder: 3 al inicio. Baja 1 al perder una noche. |
| `level`  | Noche actual: 1 al inicio. Sube 1 al terminar cada noche, ganada o perdida. |
| `status` | `playing` / `paused` / `gameover`. Pasa a `gameover` al perder la 3.ª noche, cuando termina su banner (1500 ms). |

Estructura del motor:

```
lib/games/faro/
  index.ts        ← createFaro(canvas, callbacks, options): GameEngine
  constants.ts    ← W, H, SEA_TOP, COAST_Y, MOUTH, LIGHTHOUSE, REEFS, RAILS, BEAM_*, FLASH_*, STUN_MS,
                    SHIP_*, LURE_*, AI_*, WIND_*, NIGHT_TARGET, puntos, MAX_DT, COUNTDOWN_MS, BANNER_MS
  sea.ts          ← lógica pura: placeRocks(rng, 3), spawnShip(rng, night), isInCone(point, beam, half),
                    steerGuided, steerLured, steerAdrift, applyWind, hitsRockOrReef, hitsCoast, docks
  wreckers.ts     ← IA pura: pickTarget(ships, lantern, night), stepLantern(lantern, target, beam, night, dt),
                    shouldDodge, switchSide
  input.ts        ← mapeo de puntero (pointer events con pointerType "mouse") y teclado a ángulo objetivo y destello
  skins.ts        ← FaroPalette y SKINS: Record<SkinId, FaroPalette>; `classic` por defecto
  sprites.ts      ← cachés por skin: capa estática, haz (normal y destello), barco (apagado/iluminado/atraído),
                    farol (encendido/apagado), HUD
  renderer.ts     ← compone capas, lluvia, barcos, farol, HUD y overlays (recibe ctx, vista y paleta)
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
  heading: number;      // radianes; 0 = derecha, π/2 = abajo
  turnRate: number;     // rad/s de la deriva
  wanderMs: number;
  guidedMs: number;     // 0..1000
  lured: boolean;       // dentro del radio del farol falso y sin guía
  state: "sailing" | "docked" | "wrecked";
  fxMs: number;
};
type Lantern = {
  side: "left" | "right";
  x: number;            // sobre el raíl y = 432
  state: "lit" | "stunned" | "switching";
  stateMs: number;      // ms restantes de apagado o de cambio de arrecife
  thinkMs: number;      // ms hasta la próxima decisión
  dodgeMs: number;      // retardo de reacción al haz (300 ms)
  targetId: number | null;
};

let rocks: Rock[];
let ships: Ship[];
let lantern: Lantern;
let beamAngle: number, aimAngle: number;   // grados en [190, 350]
let aimMode: "mouse" | "keys";
let flashMs: number, flashCooldownMs: number, flashHitDone: boolean;
let windDir: 1 | -1, windMs: number;
let spawnInMs: number;
let phase: "countdown" | "playing" | "banner" | "lost";
let bannerMs: number, bannerText: "NOCHE GANADA" | "NOCHE PERDIDA";
let paused: boolean;
let score: number, lives: number, night: number;
let portCount: number, wreckCount: number;   // marcador de la noche (0..7)
let countdownMs: number;
let keys: { left: boolean; right: boolean };
```

Convenciones:

- **Canvas:** lógico 800×600 (4:3); el CSS lo escala dentro de `crt-screen`. Franjas:
  - `y ∈ [0, 40)`: HUD.
  - `y ∈ [40, 520)`: mar.
  - `y ≥ 520`: tierra, salvo la bocana, que es un canal hasta el puerto.
- **Geometría fija:**
  - Bocana `MOUTH = { x0: 340, x1: 460 }`, con centro de llegada `(400, 540)`.
  - El faro está al fondo del puerto, en `(400, 560)`; la linterna, en `(400, 548)`.
  - Arrecifes `REEFS`: rectángulos `x ∈ [0, 300]` y `x ∈ [500, 800]`, ambos con `y ∈ [440, 520]`, dibujados con borde dentado.
  - Raíles del farol falso `RAILS`: `y = 432`, `x ∈ [30, 290]` (izquierdo) y `x ∈ [510, 770]` (derecho).
- **Rocas sueltas:**
  - 3 por noche, de radio 20, en `x ∈ [100, 700]` e `y ∈ [160, 380]`.
  - Separación entre centros ≥ 120 px y a ≥ 80 px de la vertical `x = 400`, para que la entrada central siempre esté libre.
  - Se regeneran al empezar cada noche.
- **Haz:**
  - `beamAngle` empieza en 270° y queda acotado a `[190°, 350°]`.
  - En modo ratón, `aimAngle` es el ángulo de la linterna al puntero (acotado) y el haz gira hacia él a ≤ 240°/s.
  - En modo teclado, `←`/`A` y `→`/`D` giran a 110°/s. Pulsar una tecla de giro pasa a modo teclado; mover el ratón vuelve al modo ratón.
  - Un punto está iluminado si está a ≤ 660 px de la linterna y su diferencia angular es ≤ 11°, o ≤ 28° durante un destello.
- **Destello:**
  - Se activa con clic izquierdo sobre el canvas o con `Espacio` (se ignora `e.repeat`) si `flashCooldownMs = 0`.
  - Dura 600 ms; la recarga, de 5000 ms, empieza al activarlo.
  - Si el farol está encendido y entra en el cono del destello, se apaga 3000 ms (`stunned`) y suma 50. Como máximo una vez por destello (`flashHitDone`).
- **Barcos:**
  - Radio de colisión de 12 px y casco de 28×14 px.
  - Velocidad `min(34 + 4 × (noche − 1), 76)` px/s.
  - Aparecen por arriba (`y = 44`, `x ∈ [60, 740]`, rumbo 90° ± 25°), uno cada `max(1600, 4000 − 250 × (noche − 1))` ms, si hay menos de `min(2 + noche, 6)` navegando. El primero aparece 500 ms después de la cuenta atrás o del banner.
  - Los barcos no chocan entre sí.
- **Prioridad de rumbo** en cada `update`:
  1. **Guiado** (iluminado, o `guidedMs > 0`):
     - Va hacia `(400, 540)` con repulsión de las rocas y de los arrecifes a ≤ 110 px por delante, girando a ≤ 120°/s.
     - Mientras está iluminado, `guidedMs = 1000`.
     - El farol falso no le afecta.
  2. **Atraído:** el farol está encendido (`lit`) y el barco está a ≤ `min(260 + 10 × (noche − 1), 360)` px.
     - Rumbo hacia el farol, girando a ≤ `min(50 + 5 × (noche − 1), 90)` °/s.
     - Se dibuja con un reflejo magenta en el casco.
  3. **A la deriva:**
     - Cada 1000 ms elige `turnRate` uniforme en `[−20, 20]` °/s.
     - Su rumbo se acota a `[20°, 160°]`.
- **Viento:** desplazamiento lateral de `windDir × min(4 + 2 × (noche − 1), 24)` px/s a todos los barcos. `windDir` cambia cada 15 000 ms y el HUD muestra su flecha.
- **Fin de un barco:**
  - **Atraca** si su centro cruza `y ≥ 520` con `x ∈ [340, 460]`: suma `100 × noche` y `portCount += 1`.
  - **Naufraga** si su círculo toca una roca, un arrecife o la costa fuera de la bocana: `wreckCount += 1`, da igual la causa (los raqueros saquean cualquier naufragio).
  - **Se pierde** si sale por arriba o por los lados: no cuenta para nadie.
  - Atraque y naufragio tienen una animación de 800 ms; durante ella el barco ya no colisiona.
- **IA de los raqueros** (`wreckers.ts`, pura, recibe `dt` y el estado):
  - **Decisión:** cada `max(200, 600 − 50 × (noche − 1))` ms elige como objetivo el barco que navega, sin guía, con menor distancia al raíl más cercano.
  - **Movimiento:** desplaza el farol por su raíl hacia la proyección `x` de la posición del objetivo dentro de 1,5 s, a `min(90 + 15 × (noche − 1), 220)` px/s.
  - **Cambio de arrecife:** si esa proyección cae del otro lado de `x = 400`, el farol pasa a `switching`: apagado 1200 ms y reaparece en el extremo interior del otro raíl (`x = 510` o `290`).
  - **Esquiva** (desde la noche 3):
    - Se activa si el farol está a menos de 25° del eje del haz durante más de 300 ms seguidos.
    - Huye por el raíl en el sentido que aumenta la diferencia angular, a toda velocidad.
    - Si llega al extremo, cambia de arrecife.
  - **Apagado:** en `stunned` y `switching` no atrae ni se mueve.
  - La IA solo usa `rng` para desempatar objetivos.
- **Noche:**
  - **Gana el jugador** con `portCount = 7`: suma `500 × noche + 100 × (7 − wreckCount)`.
  - **Gana la CPU** con `wreckCount = 7`: `lives −= 1`.
  - En ambos casos:
    - Banner de 2500 ms con NOCHE GANADA o NOCHE PERDIDA y el marcador.
    - Se retiran los barcos y se regeneran las rocas.
    - El farol vuelve a `x = 160` del raíl izquierdo.
    - `noche += 1` y el marcador vuelve a 0–0.
  - Si `lives` llega a 0, el banner dura 1500 ms y después `status` pasa a `gameover`.
  - Durante el banner no aparecen barcos y el haz se puede mover.
- **Cuenta atrás:** `COUNTDOWN_MS = 3000`, con `ceil(countdownMs / 1000)` en grande.
  - El haz ya se puede mover y el farol aún no aparece.
  - La pausa la congela.
- **Bucle:** `dt` en ms limitado a 50 ms; `resume` y `restart` reinician `lastTime`.
- **Aleatoriedad:** `Math.random` solo dentro del motor, pasado como `rng` a `sea.ts` y `wreckers.ts`.
- **`onStateChange`:** solo cuando cambian `score`, `lives`, `level` o `status`. `restart` emite 0 puntos, 3 vidas, nivel 1 y `playing`. `pause`/`resume` emiten `status`. El marcador de la noche no forma parte del contrato y solo se ve en el canvas.
- **Teclado:**
  - Listeners `keydown`/`keyup` en `window` que leen `e.code`: `ArrowLeft`, `ArrowRight`, `KeyA`, `KeyD`, `Space`, `KeyP`, `Escape`. Todas llevan `preventDefault` mientras el motor está activo.
  - `blur` suelta las teclas.
  - Así lo consume también el mando táctil (SPEC 09).
- **Ratón:**
  - `pointermove` y `pointerdown` sobre el canvas, solo con `e.pointerType === "mouse"`, para que los toques no apunten ni disparen y el táctil quede en el mando.
  - Coordenadas convertidas con `getBoundingClientRect` a 800×600.
  - `pointerdown` con `button === 0` dispara el destello.
  - La factory pone `canvas.style.cursor = "crosshair"` y `destroy` lo restaura.
- **Pausa:** `P` y `Escape` alternan `pause`/`resume` (se ignora `e.repeat`). No hacen nada en `gameover`. En pausa se ignora el ratón. No hay tecla de reinicio: reinicia JUGAR DE NUEVO.
- **Rendimiento (patrón SPEC 11):**
  - Capa estática por skin: mar, costa, arrecifes, bocana y faro.
  - Sprites en caché del haz (11° y 28°), los barcos (3 estados) y el farol (encendido y apagado).
  - HUD en caché, regenerado al cambiar `score`, `level`, `lives`, el marcador o la skin.
  - Lluvia en un solo `path` y sin `shadowBlur` por frame.
  - En pausa y en `gameover` se dibuja un frame y no se pide otro rAF.
- **Skins** (`FaroPalette`, legibles en modo oscuro):
  - `classic` (por defecto): noche del Vault, con fondo `#0a0a0f`, mar `#0b1430`, haz `#f5ff00`, farol falso `#ff006e` (magenta, color del juego), texto `#e6e9ff` y acento `#00f5ff`.
  - `neon`: haz cian `#00f5ff` y farol magenta.
  - `retro`: fósforo verde monocromo, con el farol falso en un tono distinguible por patrón (parpadeo de 2 Hz) y no solo por el color.
  - Contraste del texto del HUD ≥ 4,5. `skin-designer` valida y afina `neon` y `retro`.
- **Fuente pixel:** se lee una vez al crear el motor con `getComputedStyle(canvas).getPropertyValue("--font-press-start")`, con respaldo `monospace`.
- Sin `localStorage` ni audio dentro del motor.

## Plan de implementación

1. Crear `lib/games/faro/constants.ts` y `sea.ts` con las constantes y la lógica pura de barcos, haz, rocas y arrecifes (`rng` y `dt` por parámetro). Verificación: `npm run lint` y `npx tsc --noEmit` pasan; con una semilla fija, `placeRocks` respeta la separación de 120 px y deja libre la franja central de 80 px.
2. Crear `lib/games/faro/wreckers.ts` con la IA pura (elegir objetivo, mover por el raíl, cambiar de arrecife, esquivar desde la noche 3, apagado). Verificación: `npx tsc --noEmit` pasa. En un escenario fijo con un solo barco sin guía a la izquierda, el farol se mueve hacia él y nunca sale de `[30, 290]`.
3. Crear `lib/games/faro/input.ts` (puntero y teclado a `aimAngle` y destello), `skins.ts` con las 3 paletas y `sprites.ts` con las cachés. Diseño con `/frontend-design`. Verificación: `npx tsc --noEmit` pasa y el contraste del HUD es ≥ 4,5 en las 3 skins.
4. Crear `lib/games/faro/renderer.ts`: capas, lluvia, barcos según estado, farol, haz, marcador, HUD y overlays (cuenta atrás, banner de noche, PAUSA, GAME OVER). Verificación: `npx tsc --noEmit` pasa.
5. Implementar `createFaro(canvas, callbacks, options)` en `lib/games/faro/index.ts`: input en `window` y en el canvas, bucle con `requestAnimationFrame`, haz, destello, cegado, aparición, viento, IA, noches, puntuación, `pause`/`resume`/`restart`/`destroy`/`setSkin` y `onStateChange`. Verificación: `destroy` cancela el frame, desregistra `keydown`, `keyup`, `blur`, `pointermove` y `pointerdown`, y restaura el cursor.
6. Crear `lib/games/faro/touch.ts` y registrar `faro` en `ENGINES` y en `TOUCH_LAYOUTS`. Verificación: `npx tsc --noEmit` pasa.
7. Ajuste de equilibrio de la noche 1 con 5 partidas de prueba. Un jugador que no toca nada debe perder la noche 1, y uno que barre de forma activa debe ganarla. Si no se cumple, solo se ajustan `LURE_*` y `AI_*` en `constants.ts`, y los valores finales se reflejan en esta spec.
8. Añadir `cover-faro` en `app/globals.css`, diseñado con `/frontend-design`: haz amarillo frente a un farol magenta sobre un mar oscuro. Verificación: la tarjeta se ve en `/games` tras el paso 9.
9. Aplicar la migración `seed_game_faro`. Verificación: `select id from games` incluye `faro`; `/games` muestra la tarjeta en el filtro VERSUS y `/games/faro/play` arranca el juego.
10. Verificar el leaderboard: perder una partida, guardar `TESTER`, ver la posición y el top 5 en el modal, la fila en la pestaña FARO de `/salon` y en el top 10 de `/games/faro`.
11. Probar StrictMode en `npm run dev` (sin doble bucle ni listeners duplicados), el mando táctil con emulación `pointer: coarse`, el ancho móvil y un portátil (1366×768). Confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/`, según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`, según `CLAUDE.md`. Tras implementar se recomienda `/spec-impl-game`, que lanza `skin-designer` y `mobile-porter`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `faro` y las filas `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger` sin cambios.
- [ ] `/games` muestra la tarjeta FARO con `cover-faro` (también en el filtro VERSUS) y `/games/faro` su detalle con botón para jugar.
- [ ] `/games/faro/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas ni `Espacio`.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas, noche 1 y marcador 0–0; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'faro'` y la puntuación real; el modal muestra la posición y el top 5.
- [ ] `/salon` tiene la pestaña FARO y su top coincide con el top 10 de `/games/faro`; la pestaña GENERAL mezcla puntuaciones de todos los juegos.
- [ ] `best` y `plays` de FARO reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/faro/play`.
- [ ] Los demás juegos se comportan igual que antes; sus carpetas en `lib/games/` no tienen cambios.

Específicos de FARO:

- [ ] El canvas es 800×600, con la bocana en `x ∈ [340, 460]`, el faro al fondo del puerto, los dos arrecifes y 3 rocas sueltas, todo visible.
- [ ] Al abrir el juego y en JUGAR DE NUEVO aparece la cuenta atrás 3-2-1. No hay barcos ni farol hasta terminarla y el haz ya se mueve.
- [ ] Con el ratón, el haz sigue al puntero a ≤ 240°/s, también con el canvas escalado (ventana 1366×768 y ancho móvil).
- [ ] `←`/`A` y `→`/`D` giran el haz a 110°/s. El haz nunca baja de 190° ni pasa de 350°.
- [ ] Clic izquierdo y `Espacio` disparan el destello (28°, 600 ms); repetirlo antes de 5 s no hace nada.
- [ ] Un toque en el canvas en un dispositivo táctil no mueve el haz ni dispara el destello (`pointerType !== "mouse"`).
- [ ] Un barco iluminado ignora el farol falso y va a la bocana rodeando rocas y arrecifes. Al salir del haz mantiene el rumbo durante 1 s.
- [ ] Un barco sin guía a ≤ 260 px del farol encendido (noche 1) gira hacia él y se dibuja con reflejo magenta.
- [ ] Un destello que alcanza el farol lo apaga 3 s y suma exactamente 50, una sola vez por destello. Apagado, el farol no atrae ni se mueve.
- [ ] El farol nunca sale de sus raíles. Al cambiar de arrecife pasa 1200 ms apagado y reaparece en el extremo interior del otro raíl.
- [ ] En las noches 1 y 2, el farol no esquiva el haz. Desde la noche 3, mantener el haz a < 25° del farol más de 300 ms lo hace huir.
- [ ] Atracar en la noche 1 suma exactamente 100, y en la noche 3, 300.
- [ ] Ganar la noche 1 con 2 naufragios suma `500 + 100 × 5 = 1000` de bonus, muestra NOCHE GANADA y empieza la noche 2 con el marcador 0–0 y `level = 2`.
- [ ] Perder una noche resta 1 vida, muestra NOCHE PERDIDA y también sube `level`.
- [ ] Cualquier naufragio (roca, arrecife o costa fuera de la bocana) suma 1 a RAQUEROS; un barco perdido por los bordes no suma a nadie.
- [ ] Nunca hay más de `min(2 + noche, 6)` barcos navegando a la vez.
- [ ] Al perder la 3.ª noche, `status` pasa a `gameover` tras 1500 ms de banner y se abre el modal.
- [ ] Un jugador que no toca ningún control pierde la noche 1 (criterio de equilibrio del paso 7).
- [ ] `P` y `Escape` pausan y reanudan; el canvas dibuja el overlay PAUSA y `status` pasa a `paused` y `playing`. En pausa el ratón no mueve el haz. En `gameover` no hacen nada.
- [ ] En pausa y en `gameover` no se piden más frames de rAF.
- [ ] Un `dt` grande (cambiar de pestaña y volver) no produce naufragios espurios ni saltos del farol.
- [ ] `blur` suelta las teclas.
- [ ] En el mando táctil, el D-pad izquierda/derecha gira el haz con autorrepetición y el botón A (DESTELLO) dispara el destello.
- [ ] `setSkin` cambia entre `classic`, `neon` y `retro` en vivo, sin reiniciar; en `retro` el farol falso se distingue por su parpadeo.
- [ ] El motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04 sin cambios. **No:** componente React propio ni play-page dedicada.
- **Sí:** conservar HUD y overlays en el canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila en `games`. **No:** una fila sin motor.
- **Sí:** el leaderboard de SPEC 05 se reutiliza sin código nuevo. **No:** tablas o componentes de ranking propios.
- **Sí:** `faro` / `FARO`. **No:** `guardian-del-faro`, demasiado largo para la tarjeta.
- **Sí:** `VERSUS`, porque hay un rival activo con marcador por noche y es la categoría vacía del catálogo. **No:** `ARCADE`, que ya tiene 3 juegos (Arkanoid, Snake, Frogger).
- **Sí:** `magenta`, el color del farol de los raqueros; está usado una sola vez (Arkanoid). **No:** `green`, ya repetido en Tetris y Frogger.
- **Sí:** catálogo tomado de `references/implemented-games.md` y `lib/games/registry.ts` (asteroids, tetris, arkanoid, snake, frogger). **No:** consultar `public.games`, porque el MCP de Supabase no estaba conectado al redactar.
- **Sí:** rival CPU (raqueros) con IA en un módulo puro y parámetros por noche. **No:** dos jugadores humanos; el leaderboard es individual.
- **Sí:** ratón como control principal y teclado completo como alternativa (el mando táctil usa el teclado). **No:** solo ratón, que dejaría el juego sin táctil.
- **Sí:** filtrar el puntero a `pointerType === "mouse"`. **No:** apuntar con el dedo sobre el canvas, que choca con el mando táctil.
- **Sí:** `lives` = noches que aún puedes perder (3) y `level` = noche. **No:** vidas por naufragio, que es el mapeo de la variante 01.
- **Sí:** la noche sube aunque se pierda, para que perder no estanque la puntuación ni la dificultad. **No:** repetir la noche perdida.
- **Sí:** cualquier naufragio cuenta para los raqueros. **No:** contar solo los atraídos por el farol, que es más difícil de leer en pantalla.
- **Sí:** rocas y arrecifes siempre visibles; la tensión está en el duelo. **No:** rocas ocultas y relámpagos (eje de la 01).
- **Sí:** una bocana central para que el haz y el farol compitan por los mismos barcos. **No:** dos bocanas como en la 01.
- **Sí:** cegar el farol con el destello (+50, 3 s) como herramienta ofensiva del jugador. **No:** un haz normal que ciegue, porque el duelo se volvería trivial.
- **Sí:** esquiva de la IA solo desde la noche 3. **No:** IA con esquiva desde el principio, que frustra al aprender.
- **Sí:** paso de equilibrio explícito (paso 7) acotado a `LURE_*` y `AI_*`. **No:** dejar los valores sin validar con partidas reales.
- **Sí:** primitivas canvas y patrón de rendimiento de SPEC 11. **No:** sprites bitmap.
- **Sí:** las 3 skins definidas en la spec, con el farol distinguible por parpadeo en `retro`; `skin-designer` las valida. **No:** distinguir el farol solo por el color.
- **Sí:** `touch.ts` con A = DESTELLO y autorrepetición en izquierda/derecha. **No:** dejar el juego sin entrada en `TOUCH_LAYOUTS`.
- **Sí:** sonido fuera de alcance.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode monta el efecto dos veces y duplica bucles o listeners | `destroy` completo en el cleanup (incluidos los pointer events y el cursor); criterio de aceptación en StrictMode. |
| `onStateChange` en cada frame provoca renders a 60 fps | Emitir solo cuando cambia algún campo de `GameState`; el marcador de la noche vive solo en el canvas. |
| Las flechas o `Espacio` hacen scroll o activan botones | `preventDefault` en las teclas del juego y `blur` del botón tras pulsarlo (ya en `game-player`). |
| El motor accede a `window`/`document` y rompe el SSR | Instanciarlo solo dentro de la factory, llamada desde `useEffect`. |
| Fila en `games` sin motor en `ENGINES` | Orden fijo: registrar el motor (paso 6) antes de la migración (paso 9). |
| Puntuación no entera o por encima de 10 000 000 | Puntos enteros y `min(score, 10 000 000)`; el `CHECK` de `scores` rechaza el resto. |
| Ratón con coordenadas desplazadas por el escalado CSS del `crt-screen` | Convertir con `getBoundingClientRect` a 800×600; criterio a 1366×768 y a ancho móvil. |
| Los toques en móvil generan eventos de ratón que apuntan o disparan sin querer | `pointerType === "mouse"`; el táctil va solo por el mando (teclado sintético). |
| IA demasiado fuerte o demasiado débil en las primeras noches | Paso 7 de equilibrio con criterio explícito; parámetros concentrados en `constants.ts`; esquiva solo desde la noche 3. |
| Un barco guiado y atraído a la vez cambia de rumbo de forma errática | Prioridad fija: guiado > atraído > deriva, y `guidedMs = 1000` como histéresis. |
| El clic sobre el canvas roba el foco o selecciona texto | `preventDefault` en `pointerdown` del canvas; el teclado se escucha en `window`. |
| Partidas largas en jugadores buenos | La dificultad escala hasta la noche 12 (la IA decide cada 200 ms desde la 9, se mueve a 220 px/s desde la 10, atrae a 360 px desde la 11 y los barcos van a 76 px/s desde la 12) y luego se mantiene; ganar noches es cada vez más difícil y el bonus crece con `noche`. |
| `INITIAL_STATE` de `game-player` asume 3 vidas, nivel 1 | Coincide con el estado inicial de esta variante. |
| `retro` monocromo hace indistinguibles el haz y el farol | El farol parpadea a 2 Hz y tiene otra forma (llama), no solo otro color. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Dos jugadores humanos.
- Rocas ocultas y relámpagos (variante 01).
- Sonido.
- Colisiones entre barcos, tipos de barco y varias bocanas.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
