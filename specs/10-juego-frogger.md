# SPEC 10 — Juego Frogger

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05, SPEC 09
> **Fecha:** 2026-10-06
> **Objetivo:** Crear el juego Frogger en TypeScript como un motor de canvas que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `frogger` en la tabla `games` y guarda puntuaciones en el leaderboard.

## Por qué existe esta spec

Parte de la variante `specs/game-jam/frooger/01-frogger-core.md` (game jam), que planteaba un componente React propio con play-page dedicada. Esa arquitectura ya no se usa: desde SPEC 04 cada juego es un motor en `lib/games/<id>/` registrado en `ENGINES`, montado por `components/game-player.tsx`. Esta spec conserva las mecánicas, la puntuación y los criterios de la variante y reescribe la integración.

Frogger es el quinto juego de canvas y el primero con movimiento por saltos discretos sobre una rejilla combinado con entidades móviles que transportan al jugador (troncos y tortugas).

## Alcance

**Dentro:**

- Motor en TypeScript en `lib/games/frogger/` (constantes, lógica pura, skins, renderer y bucle), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas:
  - Rejilla de 20 × 15 celdas de 40 px (canvas 800×600), por filas: 0 HUD y barra de tiempo; 1 bocas destino; 2–7 río (6 carriles); 8 mediana segura; 9–13 carretera (5 carriles); 14 salida.
  - 5 bocas destino de 2 columnas (columnas 1‑2, 5‑6, 9‑10, 13‑14, 17‑18). Una boca ocupada no se reutiliza en la ronda; llegar a una ocupada o a un hueco entre bocas mata.
  - Salto discreto de 1 celda en 4 direcciones con animación de 120 ms; no se sale por los bordes laterales en tierra.
  - Carretera: coches y camiones (1–3 celdas) con velocidad y sentido por carril; colisión letal.
  - Río: troncos (2–4 celdas) y grupos de tortugas (2–3). La rana debe estar sobre un soporte visible; este la desplaza. Tortugas: 3 s visibles / 1,5 s sumergidas por grupo.
  - Muerte por: vehículo, agua, tortuga que se sumerge, ser arrastrada fuera del río por los bordes, tiempo agotado o boca ocupada/inválida.
  - 3 vidas. Al perder la última, `status: "gameover"`.
  - Ronda completa al ocupar las 5 bocas: sube el nivel, +15 % de velocidad y menos tiempo.
  - Temporizador de ronda: 15 s en nivel 1, `max(8, 15 − (nivel − 1))` s después.
- Puntuación: +10 por cada fila avanzada por primera vez en la vida; +50 por boca; +`segundos restantes × 10` por boca; +200 por ronda completa.
- API del motor: `createFrogger(canvas, callbacks, options)` devuelve `{ pause, resume, restart, destroy, setSkin }` y notifica con `onStateChange`.
- Registro `frogger: createFrogger` en `ENGINES` (`lib/games/registry.ts`).
- HUD y overlays dibujados en el canvas: puntuación, nivel, vidas (iconos de rana), barra de tiempo (verde → amarillo → rojo), PAUSA y GAME OVER.
- Todo se dibuja con primitivas canvas; no hay sprites ni imágenes.
- Pausa propia (`P` y `Escape`) enlazada a `pause`/`resume`.
- Skin `classic` (por defecto) en `lib/games/frogger/skins.ts` y `setSkin` operativo; `neon` y `retro` los completa `skin-designer`.
- Clase CSS `cover-frogger` en `app/globals.css`.
- Migración `seed_game_frogger` que inserta la fila `frogger` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña FROGGER en `/salon`, top 10 en `/games/frogger`.

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Controles táctiles (los porta `mobile-porter` tras esta spec).
- Sonido, sprites bitmap, animaciones de muerte elaboradas.
- Power-ups, mosca en las bocas, cocodrilos.
- Anti-trampas y validación en servidor.
- Componente genérico `CanvasGame`, play-page propia.
- Cambios en otros juegos y tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_frogger`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'frogger',
  'FROGGER',
  'Cruza la carretera y el río sin convertirte en papilla.',
  'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.',
  'ARCADE',
  'cover-frogger',
  'green'
);
```

`color` es `green` porque `GameColor` (`lib/data.ts`) solo admite `cyan | magenta | green | yellow`; la variante de game-jam usaba `lime`, que no existe. Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en FROGGER |
| -------- | ---------------------- |
| `score`  | Puntos acumulados. Entero, muy por debajo de 10 000 000. |
| `lives`  | 3 al inicio; baja 1 por muerte. |
| `level`  | Ronda actual (1 + rondas completadas). |
| `status` | `playing` / `paused` / `gameover`. `gameover` al perder la última vida. |

Estructura del motor:

```
lib/games/frogger/
  index.ts      ← createFrogger(canvas, callbacks, options): GameEngine
  constants.ts  ← COLS, ROWS, CELL, W, H, filas por zona, JUMP_MS, ROUND_MS, TURTLE_*, MAX_DT, puntos
  frogger.ts    ← lógica pura: buildLanes(level), advanceLanes, getSupport, hitsVehicle, resolveGoal, roundTime
  renderer.ts   ← zonas, entidades, rana, bocas, HUD y overlays (recibe ctx y la paleta de la skin)
  skins.ts      ← SKINS: Record<SkinId, palette>; `classic` por defecto
```

Convenciones:

- **Canvas:** lógico 800×600; el CSS lo escala dentro de `crt-screen`.
- **Bucle:** `dt` en ms limitado a 50 ms; `resume` y `restart` reinician `lastTime`. Las posiciones se expresan en celdas y se avanzan con `velocidad × dt`.
- **Aleatoriedad:** solo para desfases iniciales de carriles; `rng` por parámetro en la lógica pura.
- **`onStateChange`:** solo cuando cambian `score`, `lives`, `level` o `status`. `restart` emite 0 puntos, 3 vidas, nivel 1, `playing`.
- **Teclado:** listeners `keydown` en `window` leyendo `e.code`: `ArrowUp/Down/Left/Right`, `KeyW/A/S/D`, `KeyP`, `Escape`, con `preventDefault` mientras el motor está activo. Un salto pulsado durante otro se encola (1 como máximo). `P` y `Escape` alternan `pause`/`resume` (se ignora `e.repeat`; no hacen nada en `gameover`). Así lo consume también el mando táctil (SPEC 09).
- **Pausa:** congela `update` pero sigue dibujando el overlay.
- **Fuente pixel:** leída con `getComputedStyle(canvas).getPropertyValue("--font-press-start")`, con respaldo `monospace`.
- Sin `localStorage` ni audio dentro del motor.

## Plan de implementación

1. Crear `lib/games/frogger/constants.ts` y `frogger.ts` con constantes y lógica pura. Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Crear `lib/games/frogger/skins.ts` (paleta `classic`) y `renderer.ts` con zonas, vehículos, troncos, tortugas, rana, bocas, HUD y overlays. El diseño se hace con `/frontend-design`. Verificación: `npx tsc --noEmit` pasa.
3. Implementar `createFrogger` en `index.ts`: input, bucle con `requestAnimationFrame`, salto, muertes, rondas, `pause`/`resume`/`restart`/`destroy`/`setSkin` y `onStateChange`. Verificación: `destroy` cancela el frame y desregistra `keydown` y `blur`.
4. Registrar `frogger` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
5. Añadir `cover-frogger` en `app/globals.css`, diseñado con `/frontend-design`. Verificación: la tarjeta se ve en `/games` tras el paso 6.
6. Aplicar la migración `seed_game_frogger`. Verificación: `select id from games` incluye `frogger`; `/games` muestra la tarjeta y `/games/frogger/play` arranca el juego.
7. Verificar el leaderboard (perder una partida, guardar `TESTER`, modal con posición y top 5, `/salon` pestaña FROGGER, top 10 de `/games/frogger`), probar StrictMode en `npm run dev`, ancho móvil y 1366×768, y confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable. Antes de tocar componentes se consulta `node_modules/next/dist/docs/` según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `frogger` y las filas existentes sin cambios.
- [ ] `/games` muestra la tarjeta FROGGER con `cover-frogger` y `/games/frogger` su detalle con botón para jugar.
- [ ] `/games/frogger/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las flechas.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] Al llegar a `gameover` el modal se abre solo con la puntuación real; FIN lo abre con la actual.
- [ ] JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas y nivel 1; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = 'frogger'`; el modal muestra posición y top 5.
- [ ] `/salon` tiene la pestaña FROGGER y su top coincide con el top 10 de `/games/frogger`.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/frogger/play`.
- [ ] Los demás juegos se comportan igual y sus carpetas en `lib/games/` no tienen cambios.

Específicos de FROGGER:

- [ ] El canvas es 800×600 y se distinguen carretera, río, zonas seguras y bocas destino.
- [ ] La rana aparece centrada en la fila de salida.
- [ ] Cada pulsación de dirección (flechas o WASD) mueve exactamente una celda con animación de 120 ms.
- [ ] La rana no sale por los bordes laterales en tierra.
- [ ] Coches, camiones, troncos y tortugas se mueven en bucle y reaparecen por el lado opuesto.
- [ ] Las tortugas alternan visible (3 s) y sumergida (1,5 s).
- [ ] La rana muere por vehículo, agua, tortuga sumergida, arrastre fuera del río y tiempo agotado.
- [ ] Sobre un tronco o tortuga visible, la rana se desplaza con él.
- [ ] Al morir se pierde 1 vida y la rana vuelve a la salida con el temporizador reiniciado.
- [ ] Llegar a una boca libre la marca y suma 50 + tiempo restante × 10; llegar a una ocupada o entre bocas mata.
- [ ] Avanzar a una fila nueva suma 10 una sola vez por vida.
- [ ] Llenar las 5 bocas suma 200, sube el nivel, reconstruye los carriles con +15 % de velocidad y reduce el tiempo.
- [ ] Con 0 vidas, `status` pasa a `gameover` y se abre el modal.
- [ ] `P` y `Escape` pausan y reanudan; el canvas dibuja el overlay PAUSA. En `gameover` no hacen nada.
- [ ] Un `dt` grande (cambiar de pestaña y volver) no produce saltos ni muertes espurias.
- [ ] `setSkin` cambia la paleta en vivo sin reiniciar la partida.
- [ ] El motor no reproduce audio ni usa `localStorage`.

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04. **No:** componente `FroggerGame.tsx` ni play-page propia (decisión de la variante de game-jam, descartada).
- **Sí:** canvas 800×600 con rejilla 20×15 de 40 px, como el resto de juegos. **No:** 640×560.
- **Sí:** `color: 'green'`. **No:** `lime`, que no existe en `GameColor`.
- **Sí:** modal, nombre del jugador y leaderboard reutilizados de `game-player` y `lib/player-name.ts`. **No:** modal propio ni `av_player_name`.
- **Sí:** `P` y `Escape` pausan, como en los demás motores. **No:** que solo pause el botón.
- **Sí:** primitivas canvas sin imágenes. **No:** sprites bitmap.
- **Sí:** salto discreto de 1 celda con animación de 120 ms. **No:** movimiento continuo.
- **Sí:** tortugas con ciclo de inmersión, temporizador de ronda y 5 bocas. **No:** cocodrilos ni moscas.
- **Sí:** registrar el motor antes de insertar la fila en `games`.
- **Sí:** táctil y skins `neon`/`retro` los aportan `mobile-porter` y `skin-designer` tras esta spec.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode duplica bucles o listeners | `destroy` completo en el cleanup. |
| Arrastre fuera del río o muerte espuria con `dt` grande | `dt` ≤ 50 ms; la rana solo se comprueba al terminar el salto y en cada `update` sobre un soporte. |
| Rana sobre tortuga que se sumerge en el instante del salto | El soporte se evalúa en la celda destino al completar el salto. |
| Carriles imposibles de cruzar | Huecos mínimos de 1 celda en carretera y río; `buildLanes` validado en el paso 1. |
| Fila en `games` sin motor | Orden fijo: registro (paso 4) antes de la migración (paso 6). |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Controles táctiles, sonido, power-ups, cocodrilos, moscas.
- Anti-trampas, rate limit y moderación.
- Componente genérico `CanvasGame`.
- Cambios en otros juegos y tests automatizados.
