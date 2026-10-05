# SPEC 07 — Juego Arkanoid

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-05
> **Objetivo:** Portar el juego Arkanoid de `references/started-games/04-arkanoid/` a TypeScript como un motor de canvas que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `arkanoid` en la tabla `games` y guarda puntuaciones en el leaderboard.

## Por qué existe esta spec

Asteroids (SPEC 04) fijó la frontera motor ↔ React. SPEC 05 fijó el flujo de catálogo y leaderboard. Tetris (SPEC 06) confirmó que el patrón se repite sin tocar el reproductor.

Arkanoid es el tercer juego de canvas y trae tres novedades:

- Es el primero con assets: un spritesheet en `public/`.
- Es el primero con ratón.
- Es el primero con victoria además de game over.

El juego sigue siendo un motor imperativo que dibuja en un `<canvas>`. React lo monta, lo controla y escucha sus cambios. El catálogo y el leaderboard salen de Supabase.

## Alcance

**Dentro:**

- Port en TypeScript en `lib/games/arkanoid/` (constantes, niveles, spritesheet, física, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas del original:
  - Paleta de 81×14 en `y = 560`, a 400 px/s con teclado.
  - Bola de 16×16 con velocidad base `(200, −300)` px/s multiplicada por la del nivel.
  - Rebotes en las paredes izquierda, derecha y superior, y en la paleta.
  - Colisión AABB con bloques: un bloque por frame, invierte `vy`.
  - 10 puntos por bloque.
  - 3 vidas.
  - 5 niveles de `levels.js` con velocidades ×1.00, ×1.10, ×1.21, ×1.33 y ×1.46.
  - Explosión de 4 frames en 150 ms al romper un bloque.
- API del motor: `createArkanoid(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }` y notifica con `onStateChange`.
- Registro `arkanoid: createArkanoid` en `ENGINES` (`lib/games/registry.ts`).
- Spritesheet `spritesheet-breakout.png` copiado a `public/games/arkanoid/`, cargado dentro de la factory.
- Control de la paleta con ratón (`mousemove` en el canvas, coordenadas corregidas por escala), solo con `status: "playing"`.
- HUD del canvas (puntuación, nivel y vidas como bolas) y overlays PAUSA, GAME OVER y «¡COMPLETASTE EL JUEGO!» dibujados en el canvas y reestilizados con la paleta del Vault. Los sprites del juego no cambian.
- Pantalla de victoria que termina en `status: "gameover"`.
- Pausa propia del original (`P` y `Escape`) enlazada a `pause`/`resume`.
- Clase CSS `cover-arkanoid` en `app/globals.css`.
- Migración `seed_game_arkanoid` que inserta la fila `arkanoid` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña ARKANOID en `/salon`, top 10 en `/games/arkanoid`.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Selector de nivel 1–5 del overlay de pausa.
- Sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Cambios de física: ángulo de rebote según el punto de impacto, power-ups, bloques resistentes.
- Bonus por vidas restantes al ganar.
- Controles táctiles y gamepad.
- Anti-trampas y validación de partida en servidor.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_arkanoid`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'arkanoid',
  'ARKANOID',
  'Rompe todos los bloques con la paleta y no dejes caer la bola.',
  '<texto redactado en la implementación, mismo tono que el de asteroids y tetris>',
  'ARCADE',
  'cover-arkanoid',
  'magenta'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en ARKANOID |
| -------- | ----------------------- |
| `score`  | 10 puntos por bloque, acumulados entre niveles. Entero. El máximo es 2 080 (208 bloques en total). |
| `lives`  | 3 al empezar. Se pierde 1 cuando la bola sale por abajo. |
| `level`  | Nivel activo, de 1 a 5. |
| `status` | `playing` / `paused` / `gameover`. Llega a `gameover` al perder la última vida o al limpiar el nivel 5 (victoria). |

Estructura del motor:

```
lib/games/arkanoid/
  index.ts        ← createArkanoid(canvas, callbacks): GameEngine
  constants.ts    ← W, H, paleta, bola, rejilla de bloques, PADDLE_SPEED, BLOCK_POINTS, colores del Vault para HUD/overlays
  levels.ts       ← LEVELS (5 niveles: { speed, blocks: { col, row, color }[] }) como datos puros
  sprites.ts      ← SPRITES, EXPLOSION_FRAMES, EXPLOSION_DURATION y loadSpritesheet(src): devuelve un handle con estado loaded/error por instancia
  physics.ts      ← collideAABB, rebotes en paredes y paleta, colisión con bloques
  renderer.ts     ← bloques, explosiones, paleta, bola, HUD y overlays (recibe ctx y el handle del spritesheet)
public/games/arkanoid/
  spritesheet-breakout.png
```

Estado interno del motor (dentro de la factory):

```ts
type BlockColor = "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
type Block = { x: number; y: number; w: number; h: number; color: BlockColor; alive: boolean };
type Explosion = { x: number; y: number; w: number; h: number; color: BlockColor; elapsed: number };

let phase: "loading" | "playing" | "won" | "lost";
let paused: boolean;
let score: number, lives: number, level: number;
```

Registro:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  tetris: createTetris,
  arkanoid: createArkanoid,
};
```

Convenciones:

- **Canvas:** lógico 800×600 (4:3, igual que el original). El CSS lo escala dentro de `crt-screen`.
- **Bucle:** `dt` en segundos, limitado a 0,05 s (50 ms). El original no lo acota. `resume` y `restart` reinician `lastTime`.
- **Aleatoriedad:** el juego es determinista. No usa `Math.random`.
- **`onStateChange`:**
  - Se emite solo cuando cambian `score`, `lives`, `level` o `status`.
  - `restart` emite el estado inicial: 0 puntos, 3 vidas, nivel 1, `playing`.
  - `pause`/`resume` emiten `status`.
- **Status:**
  - Mientras se carga el spritesheet, `status` es `playing`, pero la partida no avanza.
  - `won` y `lost` se publican como `gameover`.
- **Teclado:**
  - Teclas del juego: `ArrowLeft`, `ArrowRight`, `KeyP`, `Escape`.
  - Llevan `preventDefault` mientras el motor está activo.
  - Listeners `keydown`/`keyup` en `window`; las teclas pulsadas se limpian en `blur`.
- **Pausa:**
  - `P` y `Escape` alternan `pause`/`resume`.
  - No hacen nada en `gameover`.
  - No hay tecla de reinicio: reinicia el botón JUGAR DE NUEVO del modal.
- **Ratón:**
  - `mousemove` en el canvas convierte `clientX` con `getBoundingClientRect` a la resolución lógica.
  - Centra la paleta en el cursor, acotada a `[0, W − paddle.w]`.
  - Se ignora si `status !== "playing"`.
  - No hay listener de `click`.
- **Spritesheet:**
  - Se carga con `new Image()` dentro de la factory, con `src = "/games/arkanoid/spritesheet-breakout.png"`.
  - El estado de carga vive en la instancia, no en el módulo.
  - Hasta `onload`, el canvas muestra «CARGANDO…» y la partida no avanza.
  - Si falla (`onerror`), la partida arranca y se dibuja con rectángulos de color planos. Para los bloques se usa el mapa `BLOCK_FALLBACK_COLORS` de `constants.ts`.
  - `destroy` anula `onload`/`onerror` para que una carga tardía no arranque una instancia destruida.
- **Explosiones:** el color `gray` usa los frames de `red`, como en el original.
- **Estética Vault en HUD y overlays:**
  - Fondo del canvas `#0a0a0f` (`--bg`).
  - Textos en `#e6e9ff` (`--ink`).
  - Acentos `#ff006e` (magenta, color del juego), `#00f5ff` (cyan) y `#f5ff00` (yellow), con brillo neón (`shadowBlur`).
  - Velo de los overlays: `rgba(10,10,15,0.7)`.
  - Los colores van como constantes en `constants.ts`.
  - Fuente pixel: el motor lee `--font-press-start` con `getComputedStyle(canvas)` dentro de la factory y usa `monospace` como respaldo.
  - El diseño concreto se cierra con `/frontend-design`.
- **Sin `localStorage`** dentro del motor.

## Plan de implementación

1. Crear `lib/games/arkanoid/constants.ts` y `levels.ts` con las constantes y los 5 niveles portados de `game.js` y `levels.js` como datos puros. Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/arkanoid/`. Crear `lib/games/arkanoid/sprites.ts` con `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y una carga por instancia, sin globals. Verificación: `/games/arkanoid/spritesheet-breakout.png` responde 200 en `npm run dev` y `npx tsc --noEmit` pasa.
3. Crear `lib/games/arkanoid/physics.ts` con `collideAABB` y la lógica de rebotes y bloques. Las funciones son puras sobre el estado que reciben. Verificación: `npx tsc --noEmit` pasa.
4. Crear `lib/games/arkanoid/renderer.ts`: bloques, explosiones, paleta y bola con sprites (o rectángulos de respaldo); HUD y overlays CARGANDO, PAUSA, GAME OVER y victoria con la estética del Vault. El diseño de HUD y overlays se hace con `/frontend-design`. Verificación: `npx tsc --noEmit` pasa.
5. Implementar `createArkanoid(canvas, callbacks)` en `lib/games/arkanoid/index.ts`:
   - Input de teclado en `window` y ratón en el canvas.
   - `blur`.
   - Bucle con `requestAnimationFrame` y `dt` acotado.
   - Paso de nivel y victoria.
   - `pause`/`resume`/`restart`/`destroy` y `onStateChange`.

   Verificación: `destroy` cancela el frame y desregistra `keydown`, `keyup`, `blur` y `mousemove`.
6. Registrar `arkanoid` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
7. Añadir `cover-arkanoid` en `app/globals.css`, diseñado con `/frontend-design`. Verificación: la tarjeta se ve en `/games` tras el paso 8.
8. Aplicar la migración `seed_game_arkanoid`. Verificación: `select id from games` incluye `arkanoid`; `/games` muestra la tarjeta y `/games/arkanoid/play` arranca el juego.
9. Verificar el leaderboard: perder una partida, guardar `TESTER`, ver la posición y el top 5 en el modal, la fila en la pestaña ARKANOID de `/salon` y en el top 10 de `/games/arkanoid`.
10. Probar:
    - StrictMode en `npm run dev`, sin doble bucle ni listeners duplicados.
    - Ancho móvil y portátil (1366×768).
    - El ratón con el canvas escalado.
    - Que `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/`, en particular la guía de la carpeta `public/`, según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `arkanoid` y las filas `asteroids` y `tetris` sin cambios.
- [ ] `/games` muestra la tarjeta ARKANOID con `cover-arkanoid` y `/games/arkanoid` su detalle con botón para jugar.
- [ ] `/games/arkanoid/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas y nivel 1 con el nivel 1 completo; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'arkanoid'` y la puntuación real; el modal muestra la posición y el top 5.
- [ ] `/salon` tiene la pestaña ARKANOID y su top coincide con el top 10 de `/games/arkanoid`; la pestaña GENERAL mezcla puntuaciones de todos los juegos.
- [ ] `best` y `plays` de ARKANOID reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/arkanoid/play`.
- [ ] Asteroids y Tetris se comportan igual que antes; `lib/games/asteroids/` y `lib/games/tetris/` no tienen cambios.

Específicos de ARKANOID:

- [ ] La consola no muestra 404 del spritesheet; los bloques, la paleta, la bola y las explosiones se dibujan con sprites.
- [ ] Con la ruta del spritesheet rota a propósito, el juego se puede jugar con rectángulos de color y no hay excepciones.
- [ ] `←` y `→` mueven la paleta a 400 px/s sin salirse del canvas.
- [ ] El ratón sobre el canvas centra la paleta en el cursor también con el canvas escalado (a ancho móvil y a 1366×768).
- [ ] En pausa y en `gameover`, mover el ratón no mueve la paleta.
- [ ] La bola rebota en las paredes izquierda, derecha y superior y en la paleta.
- [ ] Romper un bloque suma exactamente 10 puntos, invierte `vy` y muestra la explosión de 4 frames durante 150 ms.
- [ ] Al limpiar un nivel se carga el siguiente con su patrón. La bola se recoloca sobre la paleta con velocidad `(200, −300) ×` la del nivel. `level` sube en el HUD de React.
- [ ] Los 5 niveles tienen los patrones del original: parrilla 10×6 (60 bloques), pirámide (40), ajedrez (30), filas con huecos (39) y marco con cruz (39).
- [ ] Si la bola sale por abajo, `lives` baja 1 y la bola se recoloca sobre la paleta.
- [ ] Con 0 vidas, el canvas muestra GAME OVER y `status` pasa a `gameover`.
- [ ] Al limpiar el nivel 5, el canvas muestra «¡COMPLETASTE EL JUEGO!», `status` pasa a `gameover` y el modal se abre con 2 080 puntos (si no se ha perdido puntuación por otra vía).
- [ ] `P` y `Escape` pausan y reanudan. El canvas dibuja el overlay PAUSA sin selector de nivel. `status` pasa a `paused` y `playing`. En `gameover` no hacen nada.
- [ ] Clicar en el canvas no cambia de nivel ni de estado.
- [ ] El HUD y los overlays del canvas usan la paleta del Vault (fondo `#0a0a0f`, texto `#e6e9ff`, acentos neón) y la fuente pixel del Vault.
- [ ] Las teclas dejan de estar pulsadas tras `blur`: la paleta se detiene.
- [ ] Un `dt` grande (cambiar de pestaña y volver) no hace atravesar bloques ni paredes a la bola.
- [ ] El motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04 sin cambios. **No:** `iframe` ni copiar `game.js` con globals.
- **Sí:** conservar HUD y overlays en el canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila en `games`. **No:** una fila sin motor (el reproductor quedaría vacío).
- **Sí:** el leaderboard de SPEC 05 se reutiliza sin código nuevo. **No:** tablas o componentes de ranking propios del juego.
- **Sí:** `arkanoid`, `ARCADE`, `magenta`, `cover-arkanoid`. ARCADE no tiene juego aún y magenta no lo usa nadie (asteroids `cyan`, tetris `green`). **No:** `yellow`.
- **Sí:** `lives` = vidas reales (3) y `level` = nivel activo (1–5). Mapeo directo, sin equivalentes.
- **Sí:** eliminar el selector de nivel 1–5 de la pausa. Tiene dos problemas:
  - El overlay «EN PAUSA» de `game-player` tapa los clics.
  - Saltar de nivel recarga los bloques sin poner la puntuación a cero, lo que permite farmear puntos para el ranking.

  **No:** selector con teclas 1–5 ni con clic (este último exigiría cambiar `game-player.tsx`).
- **Sí:** victoria en el nivel 5 → overlay en el canvas y `status: "gameover"` para guardar la puntuación. **No:** bonus por vidas restantes; sería una regla nueva fuera del original.
- **Sí:** `P` y `Escape` pausan, como en el original. **No:** solo `P`.
- **Sí:** ratón solo con `status: "playing"`. **No:** mover la paleta en pausa como el original; cambiaría el estado congelado.
- **Sí:** spritesheet en `public/games/arkanoid/`, cargado por instancia dentro de la factory. Se espera a la carga y, si falla, se dibuja con rectángulos de respaldo. **No:** caché global de módulo del original (`ssImg`, `ssLoaded`); viola la regla de motor aislado. **No:** pantalla de error sin juego.
- **Sí:** sonido fuera de alcance; los mp3 no se copian a `public/`. **No:** portar `cloneNode().play()` en esta spec.
- **Sí:** reestilizar el HUD y los overlays del canvas con la paleta y la fuente pixel del Vault. Los sprites del juego se mantienen. **No:** conservar el HUD blanco en `monospace` del original. **No:** recolorear los sprites.
- **Sí:** leer la fuente con `getComputedStyle(canvas).getPropertyValue("--font-press-start")` dentro de la factory, con respaldo `monospace`. **No:** cargar la fuente aparte; `next/font` ya la carga en el layout.
- **Sí:** conservar la física del original: rebote vertical puro en la paleta, un bloque por frame, `vy` invertido. **No:** ángulo según el punto de impacto; es un cambio de juego que va en otra spec.
- **Sí:** fuera de alcance táctil/gamepad y `CanvasGame`.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode monta el efecto dos veces y duplica bucles o listeners | `destroy` completo en el cleanup; criterio de aceptación en StrictMode. |
| `onStateChange` en cada frame provoca renders a 60 fps | Emitir solo cuando cambia algún campo de `GameState`. |
| Las flechas hacen scroll o activan botones | `preventDefault` en las teclas del juego y `blur` del botón tras pulsarlo (ya en `game-player`). |
| El motor accede a `window`/`document` y rompe el SSR | Instanciarlo solo dentro de la factory, llamada desde `useEffect`. |
| Fila en `games` sin motor en `ENGINES` | Orden fijo: registrar el motor (paso 6) antes de la migración (paso 8). |
| Puntuación no entera o por encima de 10 000 000 | 10 puntos enteros por bloque, máximo 2 080; el `CHECK` de `scores` rechaza el resto. |
| Ratón con coordenadas desplazadas por el escalado CSS del canvas | Convertir con `getBoundingClientRect` a la resolución lógica 800×600. |
| El spritesheet no carga, o carga después de `destroy` y arranca una instancia muerta | Ruta absoluta `/games/arkanoid/…`. Respaldo con rectángulos en `onerror`. `destroy` anula `onload`/`onerror`. |
| Con un `dt` grande la bola atraviesa la paleta o los bloques (el original no acota `dt`) | `dt` ≤ 50 ms. A ×1.46, la bola recorre como máximo ~22 px por frame, menos que la altura de un bloque (24 px) más la de la bola. |
| `Escape` también lo usa el navegador (salir de pantalla completa) o un modal futuro | El motor solo actúa en `playing`/`paused`; el modal de fin de partida ya hace `stopPropagation` en su input. |
| El overlay PAUSA del canvas coincide con el «EN PAUSA» de `game-player` | El de React lo tapa con un fondo semitransparente; ambos dicen lo mismo. No se toca `game-player.tsx`. |
| La fuente pixel aún no está lista al primer frame y el HUD sale en `monospace` | Se lee la familia en cada dibujado del HUD; el navegador la aplica en cuanto `next/font` termina. Es un parpadeo aceptable. |
| `INITIAL_STATE` de `game-player` asume 3 vidas antes del primer `emit` | Coincide con las 3 vidas de Arkanoid; el motor emite el estado inicial al crearse. |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Selector de nivel y bonus de victoria.
- Sonido.
- Cambios de física, power-ups o bloques resistentes.
- Controles táctiles y gamepad.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
