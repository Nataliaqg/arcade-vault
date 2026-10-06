# SPEC 11 — Rendimiento de Frogger

> **Estado:** Implementado
> **Depende de:** SPEC 10
> **Fecha:** 2026-10-06
> **Objetivo:** Que Frogger corra fluido en escritorio sin cambiar su aspecto, cacheando lo estático y el brillo, y parando el bucle cuando el juego no avanza.

## Por qué existe esta spec

Frogger da tirones en escritorio. La auditoría no encontró fugas: hay un solo `requestAnimationFrame`, `destroy()` lo cancela y `onStateChange` solo se llama con cambios. El coste está en el dibujo:

- **Brillo (`shadowBlur`), la operación 2D más cara.** Se usa en casi todo, en las 3 skins (`glow: 1`):
  - el cuerpo de 10 coches y las cabinas de 5 camiones;
  - la rana entera, porque el brillo se activa antes de `frogShape()` y difumina sus ~10 subformas;
  - cada rana en una desembocadura;
  - el HUD.
  - Son ~30 dibujos difuminados por frame, y llegan a 70–80 con las desembocaduras llenas.
- **Fondo estático redibujado en cada frame.** `drawZones` repinta en cada frame el seto, el río, las franjas seguras y la carretera discontinua.
- **Entidades fuera del canvas.** Los carriles giran sobre `LANE_SPAN = 28` columnas y solo se ven 20, así que ~30 % de lo que se dibuja queda fuera.
- **`getComputedStyle(canvas)` en cada frame** para leer la fuente (`index.ts:121`, llamado desde `:331`).
- **El bucle sigue dibujando en pausa y en game over**, incluido el título difuminado del overlay.
- **CSS de la página `/play`.** `.av-bg::before` anima `background-position` (`gridscroll`) a pantalla completa y repinta en cada frame. `.crt-screen::after` usa `mix-blend-mode: multiply` sobre el canvas.

## Alcance

**Dentro:**

- **Capa estática en caché.** Un canvas offscreen por skin con el fondo y `drawZones` sin las ondas del río. Se compone con un solo `drawImage`. Las ondas siguen animadas y se dibujan encima.
- **Sprites en caché para el brillo.** Mismo aspecto, sin `shadowBlur` por frame. Cada sprite se genera una vez por skin, con su brillo, y se dibuja con `drawImage`:
  - **Coche:** sprite completo (cuerpo con brillo, cristal y ruedas) por color, ancho en celdas y dirección.
  - **Camión:** sprite completo por ancho y dirección.
  - **Rana viva:** sprites mirando arriba en reposo y en N fases del salto (N = 4). La orientación se aplica con `rotate` al componer.
  - **Rana en la desembocadura:** sprite a escala 0,9.
  - **Rana muerta (aspa):** sprite.
- **HUD en caché.** El texto de puntuación y nivel y las vidas se pintan en un canvas offscreen. Se regenera solo cuando cambian `score`, `level`, `lives` o la skin. La barra de tiempo se sigue dibujando en cada frame, con un único `shadowBlur`.
- **Recorte.** No se dibuja una entidad si `x + w < 0` o `x > W`.
- **Fuente leída una vez.** `--font-press-start` se lee al crear el motor, no en cada frame.
- **Bucle parado.** En pausa o en game over se dibuja un frame (con el overlay) y no se pide otro rAF. Lo reanudan `resume()` o `restart()`. `setSkin()` con el bucle parado redibuja un frame.
- **Menos asignaciones por frame en Frogger:**
  - Se reutiliza un único `RenderView`.
  - `emit()` compara antes de crear el objeto.
  - Se sacan de la función los arrays literales (`[ROW_MEDIAN, ROW_START]`, `[16, 16]`, `[-1, 1]`, `[x+10, x+w-14]`).
  - `roundTime(level)` se calcula solo cuando cambia el nivel.
  - `GAME_KEYS` pasa a ser un `Set`.
- **CSS solo en la página de juego.** Se detecta con `body:has(.av-player)`.
  - `.av-bg::before` usa `animation: none`. La rejilla sigue visible, pero quieta.
  - `.crt-screen::after` pasa de `mix-blend-mode: multiply` a mezcla normal. Con un degradado negro semitransparente, el resultado es igual a la vista.

**Fuera de alcance (para specs futuras):**

- Asteroids, Tetris, Arkanoid y Snake (brillo, capas estáticas, bucle en pausa, `getComputedStyle`). Irán en otra spec con lo aprendido aquí.
- Un helper compartido en `lib/games/` para el bucle, el brillo o la caché.
- Un contador de FPS o un modo de depuración.
- Un ajuste de calidad ALTA/BAJA para el jugador.
- Escalado por `devicePixelRatio` y nitidez en pantallas HiDPI.
- Rendimiento en móvil.
- El mando táctil de Frogger: no tiene entrada en `TOUCH_LAYOUTS`. Lo resuelve el agente `mobile-porter`.
- Cambiar el aspecto de las skins o diseñar `neon` y `retro` (`skin-designer`).
- Cambios en el contrato `lib/games/types.ts`, en `components/game-player.tsx` o en la lógica de juego (`frogger.ts`).
- Separar el código por juego (bundle splitting) en `registry.ts`.

## Modelo de datos

No hay datos persistidos nuevos ni cambios en Supabase. Solo hay estructuras internas del renderer, en `lib/games/frogger/`:

```ts
// lib/games/frogger/sprites.ts
export type FroggerSprites = {
  background: HTMLCanvasElement;              // W×H: bg + zonas sin ondas
  car: Map<string, HTMLCanvasElement>;        // clave `${colorIdx}:${width}:${dir}`
  truck: Map<string, HTMLCanvasElement>;      // clave `${width}:${dir}`
  frog: HTMLCanvasElement[];                  // FROG_FRAMES fases del salto, mirando arriba
  mouthFrog: HTMLCanvasElement;
  deadFrog: HTMLCanvasElement;
};

export const FROG_FRAMES = 4;
export const SPRITE_PAD = 16; // margen para que el brillo no se recorte

export function buildSprites(p: FroggerPalette): FroggerSprites;
```

- Los sprites se crean con `document.createElement("canvas")`, porque los motores solo corren en el navegador. Cada uno lleva `SPRITE_PAD` de margen, y al componer se resta el margen a la posición.
- **Caché por skin.** `Partial<Record<SkinId, FroggerSprites>>` vive dentro del motor. Se genera la primera vez que se usa una skin y se libera en `destroy()`. `setSkin` no regenera una skin ya construida.
- **HUD en caché.** Es un canvas de `W × 40` con su firma `${score}|${level}|${lives}|${skin}`. Se repinta cuando la firma cambia.
- **`RenderView`** recibe los sprites y la capa del HUD como campos nuevos. `fontFamily` se lee una vez.

## Plan de implementación

1. **Bucle parado en pausa y game over.** En `index.ts`, el bucle no se reprograma si `paused || phase === "over"`. Hace falta un `ensureRunning()` que `resume()` y `restart()` llaman (limpia `lastTime`). `setSkin` llama a `drawOnce()` si el bucle está parado. Verificación: la grabación de Performance de DevTools, en pausa, no muestra `Animation Frame Fired`. P/Esc reanuda y se puede reiniciar tras game over.
2. **Fuente leída una vez y menos asignaciones.** Esto incluye:
   - `fontFamily` como constante del motor;
   - un `RenderView` reutilizado;
   - `emit()` sin asignar si no hay cambio;
   - los arrays literales sacados de las funciones;
   - `roundMs` en caché por nivel;
   - `GAME_KEYS` como `Set`.

   Verificación: `npx tsc --noEmit` y `npm run lint` pasan y el juego se ve igual.
3. **Recorte en `drawLanes`.** Se salta la entidad si `e.col * CELL + e.width * CELL < 0` o `e.col * CELL > W`. Verificación: los coches y troncos entran y salen por los bordes sin parpadeo.
4. **Capa estática.** Crear `lib/games/frogger/sprites.ts` con `buildSprites` que, por ahora, solo genere `background`. Dividir `drawZones` en `paintStaticZones` (va a la caché) y `drawRipples` (se dibuja en cada frame). `draw()` pasa a usar `drawImage(background)` y después `drawRipples`. Verificación: el fondo es idéntico en las 3 skins y cambiar de skin en vivo regenera la capa.
5. **Sprites de coche y camión.** Ampliar `buildSprites` con `car` y `truck`, y hacer que `drawCar` y `drawTruck` compongan con `drawImage`. Verificación: comparar a ojo con una captura previa al cambio, sin diferencias visibles en el brillo.
6. **Sprites de la rana.** Añadir `frog[FROG_FRAMES]`, `mouthFrog` y `deadFrog`. `drawFrog` elige la fase por `Math.round(jump * (FROG_FRAMES - 1))`, rota y compone. `drawMouthFrogs` compone el sprite. Verificación: el salto se ve continuo en las 4 direcciones, y la muerte y la desembocadura se ven igual que antes.
7. **HUD en caché.** Usar el canvas del HUD con su firma. En cada frame se dibujan solo la capa del HUD y la barra de tiempo. Verificación: puntuación, nivel y vidas se actualizan al instante.
8. **CSS de `/play`.** En `app/globals.css` añadir:
   - `body:has(.av-player) .av-bg::before { animation: none; }`;
   - `body:has(.av-player) .crt-screen::after { mix-blend-mode: normal; }`.

   Verificación: en `/` y `/games` la rejilla sigue moviéndose. En `/games/frogger/play` está quieta y las scanlines se ven igual.

Cada paso deja el juego jugable y se puede commitear por separado. `npm run lint` y `npx tsc --noEmit` pasan tras cada paso.

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `git diff` no toca `lib/games/types.ts`, `lib/games/frogger/frogger.ts`, `components/game-player.tsx` ni los motores de otros juegos.
- [ ] Durante el juego, `lib/games/frogger/renderer.ts` no fija `shadowBlur` en ningún sitio salvo la barra de tiempo y el título del overlay.
- [ ] `getComputedStyle` no se llama dentro del bucle (solo al crear el motor).
- [ ] Prueba manual en escritorio (Chrome, DevTools → Performance, CPU sin throttling) con 10 s de juego y las desembocaduras con 3 ranas o más:
  - el FPS se mantiene en la frecuencia de la pantalla;
  - no hay frames marcados en rojo o como dropped.
- [ ] La misma prueba con CPU 4× slowdown no muestra tirones visibles al jugar.
- [ ] En pausa y en game over, una grabación de Performance de 5 s no muestra `Animation Frame Fired` del juego.
- [ ] REANUDAR (P/Esc o el botón) continúa la partida sin salto de posición. Reiniciar tras game over arranca una partida nueva.
- [ ] Cambiar de skin con el juego en pausa actualiza el canvas al momento.
- [ ] Una captura antes y otra después, en las 3 skins y en el mismo estado, no muestran diferencias visibles. Se comparan coches, camiones, rana (en reposo, saltando y muerta), ranas en la desembocadura, HUD y fondo.
- [ ] Coches, camiones, troncos y tortugas entran y salen por los bordes sin aparecer ni desaparecer de golpe.
- [ ] En `/games/frogger/play` la rejilla del fondo no se anima. En `/` y `/games` sí se anima.
- [ ] Las scanlines del CRT se ven igual que antes en `/play`.
- [ ] La consola no muestra errores en `/games/frogger/play`, y salir de la página no deja rAF activos (StrictMode incluido).

## Decisiones

- **Sí:** solo Frogger. Es donde se nota el problema y sirve de patrón. **No:** los 5 juegos a la vez. Va en otra spec cuando se haya validado la técnica.
- **Sí:** brillo prerenderizado en sprites por skin, con el mismo aspecto. **No:** reducir el brillo o quitarlo de la skin clásica, porque cambia el estilo neón. **No:** un ajuste de calidad para el jugador, porque añade UI y persistencia.
- **Sí:** 4 fases fijas para el salto de la rana. El salto dura 120 ms, así que 4 fases bastan y la caché es pequeña. **No:** generar un sprite por frame.
- **Sí:** sprite de coche completo por color, ancho y dirección. Son pocas combinaciones. **No:** cachear solo el cuerpo con brillo, que exige dos `drawImage` y más estado.
- **Sí:** la caché se genera la primera vez que se usa cada skin. **No:** generar las 3 al crear el motor, porque retrasa el arranque.
- **Sí:** el bucle para en pausa y game over y se reanuda con `resume`/`restart`. **No:** seguir con el rAF sin redibujar, porque se gasta igual en el planificador.
- **Sí:** `--font-press-start` se lee una vez al crear el motor. Viene de `next/font` y ya está en `<html>` cuando el player monta el motor.
- **Sí:** el CSS se limita a la página de juego con `body:has(.av-player)`. El resto del sitio mantiene la animación. **No:** quitar la animación en todo el sitio, porque es parte de la identidad visual de la landing.
- **Sí:** la verificación es manual con DevTools y capturas (decisión del usuario). **No:** un contador de FPS de depuración.
- **No:** un helper compartido todavía. Se extrae cuando haya un segundo juego que lo use.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El brillo del sprite se recorta en los bordes | `SPRITE_PAD = 16`, mayor que el blur máximo (14). |
| La rana rotada con `drawImage` se ve borrosa por el suavizado | Rotaciones de 90° exactas y origen en el centro del sprite; si se nota, `imageSmoothingEnabled = false` al componer. |
| Las 4 fases del salto se ven a saltos | Comprobación visual en el paso 6; si se nota, subir `FROG_FRAMES` a 6. |
| `restart()` desde el modal con el bucle parado no arranca | `restart()` llama a `ensureRunning()`; está en los criterios. |
| La fuente pixel aún no ha cargado al crear el motor y el HUD en caché usa la de respaldo | El HUD se regenera por firma. Se añade `document.fonts.ready.then(invalidar HUD)` en el motor. |
| `:has()` no existe en un navegador antiguo | Solo se pierde la optimización CSS; la página se ve igual. |
| Memoria de la caché de las 3 skins | Son unos pocos canvas pequeños más uno de 800×600 por skin. Se liberan en `destroy()`. |

## Qué **no** está en esta spec

- Optimizar Asteroids, Tetris, Arkanoid y Snake.
- Un helper compartido de bucle, brillo o caché.
- Un contador de FPS o un ajuste de calidad.
- HiDPI / `devicePixelRatio`.
- Rendimiento en móvil y el mando táctil de Frogger.
- Rediseñar las skins.
- Cambios en el contrato del motor, en el player o en la lógica de juego.

Cada una de estas cosas, si se aborda, va en su propia spec.
