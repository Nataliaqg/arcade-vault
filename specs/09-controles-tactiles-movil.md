# SPEC 09 — Controles táctiles para móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Fecha:** 2026-10-06
> **Objetivo:** Hacer jugables los 4 juegos en dispositivos táctiles. En `/games/[id]/play` se muestra un mando virtual (cruceta + botones A/B) bajo el canvas, que envía a los motores los mismos eventos de teclado que un teclado físico.

## Por qué existe esta spec

Todos los motores leen `keydown`/`keyup` en `window` por `e.code`. En un móvil no hay teclado, así que ningún juego se puede jugar. Solo PAUSA y FIN responden al toque. SPEC 08 dejó fuera los controles táctiles a propósito.

La solución es un mando virtual que despacha `KeyboardEvent` sintéticos. Los motores no cambian. Cualquier juego futuro que use teclado en `window` funciona en táctil con solo declarar su mapeo de A/B.

## Alcance

**Dentro:**

- Componente `components/touch-gamepad.tsx`: cruceta de 4 direcciones y botones A y B. Usa eventos de puntero con multitáctil: cada botón sigue su propio `pointerId`.
- La cruceta es una única zona con 4 sectores. Deslizar el dedo cambia de dirección: suelta la tecla anterior y pulsa la nueva. No hay diagonales.
- La cruceta emite siempre `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`. A y B emiten el `code` que declara cada juego.
- Mapeo por juego en `lib/games/<id>/touch.ts`, registrado en `TOUCH_LAYOUTS` (`lib/games/registry.ts`):

  | Juego | Cruceta | A | B | Autorrepetición |
  | --- | --- | --- | --- | --- |
  | ASTEROIDS | ←/→ girar, ↑ propulsar | `Space` (DISPARAR) | `ArrowUp` (PROPULSAR) | No |
  | TETRIS | ←/→ mover, ↓ bajar, ↑ rotar | `KeyX` (ROTAR) | `Space` (CAÍDA) | ←, →, ↓ |
  | ARKANOID | ←/→ paleta | — (atenuado) | — (atenuado) | No |
  | SNAKE | ↑↓←→ girar | — (atenuado) | — (atenuado) | No |

- Autorrepetición que imita al teclado en los botones que la declaran. Tras mantener 170 ms, se envía `keydown` con `repeat: true` cada 50 ms.
- Un botón sin función se dibuja atenuado, con `aria-disabled="true"`, y no despacha eventos.
- Al soltar, cancelar el puntero, en `blur`, en `visibilitychange` (oculto) y al desmontar, se envía `keyup` de toda tecla pulsada.
- Visibilidad solo por CSS con `@media (pointer: coarse)`. En escritorio el mando no se ve y el reproductor queda igual que hoy.
- En táctil:
  - Se ocultan `.player-hud` (jugador, puntuación, vidas, nivel, PAUSA/FIN/SALIR) y `.crt-bottom`. El canvas ya dibuja puntuación y nivel.
  - Bajo el mando hay una fila con el botón PAUSA/REANUDAR y el selector de skins.
  - El overlay «EN PAUSA» añade los botones REANUDAR, FIN (abre el modal de puntuación) y SALIR (va a `/games/[id]`).
  - La nav y el footer del sitio se mantienen.
- Disposición vertical: canvas 4:3 a todo el ancho arriba; debajo el mando (cruceta a la izquierda, A/B a la derecha); debajo PAUSA y skins.
- Disposición horizontal (`(pointer: coarse) and (orientation: landscape)`): cruceta a la izquierda, canvas al centro limitado por la altura, A/B a la derecha. PAUSA y skins van en una fila fina bajo A/B.
- Protección contra gestos del navegador en el mando:
  - `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none`.
  - `contextmenu` anulado.
  - Las pulsaciones no hacen scroll, zoom ni selección de texto.
- Diseño del mando (estilo neón/CRT del Vault, letras A/B y etiqueta de acción bajo cada botón) hecho con `/frontend-design`.
- `CLAUDE.md`: integrar un juego nuevo incluye `lib/games/<id>/touch.ts` y su entrada en `TOUCH_LAYOUTS`.

**Fuera de alcance (para specs futuras):**

- Cambios en los motores (`lib/games/<id>/index.ts`) o en el contrato `lib/games/types.ts`.
- Gestos sobre el canvas (swipe en Snake, arrastrar la paleta en Arkanoid).
- Diagonales en la cruceta.
- Vibración háptica.
- Interruptor manual para mostrar u ocultar el mando (tablets con teclado, portátiles táctiles con `pointer: fine`).
- Gamepad físico (Gamepad API).
- Ocultar la nav o el footer, pantalla completa (Fullscreen API) y bloqueo de orientación.
- Mapeo de botones configurable por el jugador.
- PWA o instalación en el móvil.
- Cambios en `/games`, `/salon`, el detalle o el modal de fin de partida más allá de que funcionen en táctil.
- Tests automatizados.

## Modelo de datos

Tipos nuevos en `lib/games/touch.ts`:

```ts
export type PadButton = "up" | "down" | "left" | "right" | "a" | "b";

export type ActionButton = { code: string; label: string }; // p. ej. { code: "Space", label: "DISPARAR" }

export type TouchLayout = {
  a?: ActionButton;           // ausente → botón atenuado sin función
  b?: ActionButton;
  repeat?: PadButton[];       // botones con autorrepetición
};

export const DPAD_CODES: Record<"up" | "down" | "left" | "right", string> = {
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
};
export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;
```

Un archivo por juego, `lib/games/<id>/touch.ts`, que exporta `TOUCH_LAYOUT: TouchLayout`. En el registro:

```ts
// lib/games/registry.ts
export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
  asteroids: asteroidsTouch, tetris: tetrisTouch, arkanoid: arkanoidTouch, snake: snakeTouch,
};
```

Convenciones:

- **Despacho:** `window.dispatchEvent(new KeyboardEvent("keydown" | "keyup", { code, key, repeat, bubbles: true, cancelable: true }))`. Los motores leen `e.code` y no miran `isTrusted`.
- **Estado del mando:** cada botón lleva la cuenta de los punteros que lo pulsan. `keydown` sale con el primero y `keyup` con el último. Así B y ↑ en Asteroids (los dos `ArrowUp`) no se sueltan el uno al otro: se cuenta por `code`, no por botón.
- **Sin persistencia nueva.** El selector de skins sigue usando `arcade-vault:skin:v1`.
- **Sin cambios** en Supabase, el esquema ni los tipos generados.

## Plan de implementación

1. Crear `lib/games/touch.ts` (tipos y constantes) y `lib/games/<id>/touch.ts` para los 4 juegos con el mapeo de la tabla. Añadir `TOUCH_LAYOUTS` en `lib/games/registry.ts`. Verificación: `npx tsc --noEmit` pasa.
2. Crear `components/touch-gamepad.tsx` (`"use client"`, props `{ layout: TouchLayout }`) con la lógica de punteros, el conteo por `code`, la autorrepetición y la liberación en `blur`/`visibilitychange`/desmontaje. Todavía no se monta. Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
3. Montar `TouchGamepad` en `components/game-player.tsx` con `TOUCH_LAYOUTS[game.id]`. Añadir la fila táctil (PAUSA + selector de skins) y los botones REANUDAR/FIN/SALIR en el overlay de pausa, reutilizando `togglePause`, `finish` y `chooseSkin`. Verificación: en escritorio el reproductor se ve igual que antes.
4. Estilos en `app/globals.css`, diseñados con `/frontend-design`:
   - `.touch-pad`, `.dpad`, `.pad-btn` y la fila táctil.
   - `@media (pointer: coarse)`: ocultar `.player-hud`, `.crt-bottom` y el `.skin-picker` del CRT; mostrar el mando.
   - Variante `orientation: landscape` en rejilla de 3 columnas.

   Verificación: en Chrome DevTools, con un dispositivo móvil emulado, el mando aparece en vertical y en horizontal.
5. Probar los 4 juegos en un móvil real por la IP de la LAN (`npm run dev`) y en DevTools. Ajustar tamaños y zonas de la cruceta.
6. Actualizar `CLAUDE.md` (sección Skills / integrar un juego) para incluir `touch.ts` y `TOUCH_LAYOUTS`. Verificación: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado. Antes de tocar componentes se consulta `node_modules/next/dist/docs/`, según `AGENTS.md`.

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `git diff` no toca `lib/games/types.ts` ni ningún `lib/games/<id>/index.ts`.
- [ ] En escritorio (`pointer: fine`), `/games/<id>/play` se ve y funciona igual que antes: el HUD de React es visible, no hay mando y el teclado y el ratón siguen igual.
- [ ] Con puntero táctil, en vertical:
  - El canvas 4:3 ocupa el ancho arriba.
  - El mando (cruceta izquierda, A/B derecha) va debajo, y PAUSA y skins debajo del mando.
  - El HUD de React y `.crt-bottom` no se ven.
  - La nav y el footer siguen visibles.
- [ ] Con puntero táctil, en horizontal: cruceta a la izquierda, canvas al centro y A/B a la derecha, con PAUSA y skins bajo A/B.
- [ ] ASTEROIDS:
  - ←/→ giran la nave y ↑ propulsa.
  - A dispara y B propulsa.
  - Mantener ← y B a la vez gira y propulsa al mismo tiempo (multitáctil).
  - Soltar B con ↑ aún pulsado no corta la propulsión.
- [ ] TETRIS:
  - ←/→ mueven la pieza, ↓ la baja y ↑ y A la rotan.
  - B hace caída dura.
  - Mantener ← o → mueve la pieza de forma repetida tras ~170 ms.
- [ ] ARKANOID: ←/→ mueven la paleta mientras se mantienen y se para al soltar. A y B se ven atenuados y no hacen nada.
- [ ] SNAKE: la cruceta gira la serpiente en las 4 direcciones. A y B se ven atenuados y no hacen nada.
- [ ] Deslizar el dedo por la cruceta de una dirección a otra cambia la dirección sin levantarlo.
- [ ] Al levantar el dedo fuera del botón, al cambiar de pestaña o al bloquear la pantalla, ninguna tecla queda pulsada (Arkanoid no sigue moviéndose).
- [ ] Pulsar el mando no hace scroll, zoom, selección de texto ni abre el menú contextual.
- [ ] PAUSA pausa el juego y el overlay «EN PAUSA» muestra REANUDAR, FIN y SALIR:
  - REANUDAR continúa la partida.
  - FIN abre el modal de puntuación.
  - SALIR navega a `/games/<id>`.
- [ ] El selector de skins bajo el mando cambia la skin en vivo y se recuerda en `arcade-vault:skin:v1`.
- [ ] En el modal de fin de partida se puede escribir el nombre con el teclado del móvil y guardar la puntuación.
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/<id>/play`.
- [ ] Navegar fuera de la página no deja temporizadores de autorrepetición activos (StrictMode incluido).

## Decisiones

- **Sí:** un único mando virtual igual para todos los juegos (cruceta + A/B), como en la imagen de referencia del usuario. **No:** gestos sobre el canvas; exigen lógica por juego y tocar los motores.
- **Sí:** dos botones de acción. La mayoría de juegos arcade no necesitan más. **No:** más botones.
- **Sí:** `KeyboardEvent` sintéticos en `window`. Los motores y el contrato no cambian, y los juegos futuros funcionan solos. **No:** ampliar `GameEngine` con `input()`; obliga a tocar los 4 motores.
- **Sí:** mapeo A/B por juego en `lib/games/<id>/touch.ts` + `TOUCH_LAYOUTS`, como `ENGINES`. **No:** un mapeo global fijo; Tetris y Asteroids necesitan acciones distintas.
- **Sí:** A/B sin función se ven atenuados. **No:** ocultarlos; el mando cambiaría de forma entre juegos.
- **Sí:** se cuenta por `code`. Asteroids tiene dos botones con `ArrowUp` (↑ y B).
- **Sí:** autorrepetición solo donde el motor la espera (Tetris ←, →, ↓). Los motores con estado mantenido (Asteroids, Arkanoid) no la necesitan. Snake encola giros y no la quiere.
- **Sí:** se muestra con `@media (pointer: coarse)` solo por CSS. Evita desajustes de hidratación. **No:** detección en JS ni interruptor manual (fuera de alcance).
- **Sí:** ocultar el HUD de React en táctil. El canvas ya dibuja puntuación y nivel, y así gana espacio. **No:** HUD compacto.
- **Sí:** FIN y SALIR dentro del overlay de pausa. **No:** quitarlos; sin FIN no se podría guardar una partida a mitad.
- **Sí:** mantener la nav y el footer. **No:** pantalla completa en el reproductor.
- **Sí:** ambas orientaciones; en horizontal, cruceta | canvas | A/B.
- **No:** vibración háptica (decisión del usuario).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una tecla queda pulsada si se pierde el `pointerup` (Arkanoid se mueve solo) | `keyup` en `pointercancel`, `lostpointercapture`, `blur`, `visibilitychange` y desmontaje. |
| Doble toque o pulsación larga hace zoom, selecciona texto o abre el menú contextual | `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` anulado en el mando. |
| En horizontal, con la nav visible, el canvas queda muy bajo en móviles pequeños | El canvas se limita por la altura disponible (`dvh`). Se acepta; ocultar la nav queda para otra spec. |
| Un portátil táctil o una tablet con teclado reporta `pointer: fine` y no muestra el mando | Aceptado; el interruptor manual queda fuera de alcance. |
| Un motor futuro escucha en `document` o en el canvas y no recibe los eventos de `window` | Convención documentada en `CLAUDE.md`: teclado en `window`, como los 4 motores actuales. |
| Los eventos sintéticos llegan mientras el modal está abierto | El modal tapa el mando; además los motores ya están en `gameover` o en pausa. |
| Temporizadores de autorrepetición duplicados en StrictMode | Se limpian en el cleanup del efecto y al soltar. |

## Qué **no** está en esta spec

- Cambios en los motores o en el contrato `GameEngine`.
- Gestos sobre el canvas y diagonales.
- Vibración, Gamepad API y mapeo configurable.
- Interruptor manual del mando.
- Pantalla completa, ocultar la nav o el footer y bloqueo de orientación.
- PWA.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
