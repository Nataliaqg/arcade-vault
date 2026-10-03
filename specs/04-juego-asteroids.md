# SPEC 04 — Primer juego jugable: Asteroids

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-03
> **Objetivo:** Portar el juego Asteroids de `references/started-games/02-asteroids/` a TypeScript como un motor de canvas que vive dentro del marco CRT del reproductor, publica su estado (puntuación, vidas, nivel) al HUD de React y se registra como un juego nuevo `asteroids` en la galería.

## Por qué existe esta spec

Hasta ahora `/juego/[id]/jugar` es un mockup con valores fijos (SPEC 01). Asteroids es el primer juego real y fija el patrón que seguirán Tetris, Arkanoid y el resto: el juego es un motor imperativo que dibuja en un `<canvas>` y React solo lo monta, lo controla y escucha sus cambios de estado. Acertar con esa frontera ahora evita rehacer el reproductor con cada juego.

## Alcance

**Dentro:**

- Nuevo registro `asteroids` en `GAMES` (`lib/data.ts`), independiente de `rocas`, que no se toca.
- Port a TypeScript de `game.js` en `lib/games/asteroids/` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, utilidades, constantes y bucle), sin variables globales ni acceso a `document`/`window` fuera de la función de arranque.
- Mecánicas completas del original: nave con inercia y envolvimiento toroidal, disparo, división de asteroides en 3 tamaños, partículas, 3 vidas con invencibilidad al reaparecer, niveles progresivos y power-up de triple disparo (`3x`).
- API del motor: `createAsteroids(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }`. Los `callbacks` notifican a React los cambios de estado del juego.
- Registro de motores por id (`lib/games/registry.ts`): `game-player.tsx` monta el motor si el juego tiene uno y conserva el mockup actual si no.
- `game-player.tsx` conecta el HUD de React (puntuación, vidas, nivel) y los botones PAUSA / FIN / SALIR y el modal de fin de partida al motor real cuando existe.
- El canvas (800×600) se renderiza dentro de `crt-screen`, con la estética vectorial blanca sobre negro del original, escalado con CSS al ancho disponible sin deformarse.
- El HUD interno del canvas se conserva tal como está en el original (SCORE, NIVEL, vidas, indicador `3x`) y el overlay GAME OVER también. El juego es autónomo: tiene su canvas, sus controles y su HUD. React no sustituye esa capa: la HUD de React se alimenta de las notificaciones del motor y se muestra en paralelo.

**Fuera de alcance (para specs futuras):**

- Guardar puntuaciones, ranking real y `best` real (requiere tablas, RLS y auth en Supabase).
- Extraer un componente genérico `CanvasGame`. Se hará cuando llegue el segundo juego de canvas, con dos casos reales a la vista. Por ahora el montaje del motor vive en `game-player.tsx`.
- Reestilizar el juego con la paleta neón del Vault.
- Controles táctiles / gamepad. Solo teclado: `←` `→` rotar, `↑` propulsar, `Espacio` disparar.
- Sonido.
- Tetris, Arkanoid y demás juegos; sustituir sus mockups.
- Cambiar el registro `rocas` ni sus enlaces.
- Tests automatizados.

## Modelo de datos

Nuevo registro en `GAMES` (campos de `Game`, SPEC 01):

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Destruye asteroides en el vacío antes de que te alcancen.",
  long: "<texto redactado en la implementación, mismo tono que los demás juegos>",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 0,      // mock; sin puntuaciones reales todavía
  plays: "0",   // mock
}
```

Contrato del motor (`lib/games/types.ts`):

```ts
export type GameStatus = "playing" | "paused" | "gameover";

export type GameState = {
  score: number;
  lives: number;
  level: number;
  status: GameStatus;
};

export type GameCallbacks = {
  onStateChange: (state: GameState) => void; // solo cuando algún campo cambia
};

export type GameEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void; // cancela requestAnimationFrame y quita listeners
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
```

Registro de motores:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
};
```

Convenciones:

- Canvas lógico fijo 800×600; las posiciones se envuelven con `wrap`. El CSS lo escala.
- `dt` limitado a 50 ms (como el original).
- `Math.random` se usa solo dentro del motor (en el bucle y al iniciar), nunca durante el render de React.
- El motor guarda su estado en el cierre de `createAsteroids` y en clases; no hay estado global de módulo.
- `onStateChange` no se llama en cada frame, solo cuando cambian `score`, `lives`, `level` o `status`.
- La tecla `Espacio` y las flechas llaman a `preventDefault` mientras el motor está activo para que la página no haga scroll.

## Plan de implementación

1. Añadir el juego `asteroids` a `GAMES` en `lib/data.ts` y la clase CSS `cover-asteroids` en `app/globals.css`. Verificación: aparece en `/games`, en `/juego/asteroids` y en el Salón de la Fama; `/juego/asteroids/jugar` muestra el mockup actual.
2. Crear `lib/games/types.ts` con `GameState`, `GameCallbacks`, `GameEngine` y `GameFactory`. Verificación: `npx tsc --noEmit` pasa.
3. Portar a `lib/games/asteroids/` las clases, utilidades y constantes de `game.js` (archivos tipados, sin `document` ni `window` globales; el contexto 2D se recibe por parámetro). Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
4. Implementar `createAsteroids(canvas, callbacks)` en `lib/games/asteroids/index.ts`: input por `keydown`/`keyup` en `window`, bucle con `requestAnimationFrame`, `pause`/`resume`/`restart`/`destroy`, y `onStateChange` en los cambios descritos. Mantener intacto el HUD del canvas (SCORE, NIVEL, vidas, `3x`) y el overlay GAME OVER. Verificación: `destroy` cancela el frame y desregistra los listeners.
5. Crear `lib/games/registry.ts` con `ENGINES` y refactorizar `components/game-player.tsx`: si `ENGINES[game.id]` existe, montar un `<canvas>` dentro de `crt-screen` con `useEffect` (arranca el motor, `destroy` en el cleanup), guardar `GameState` en `useState` y alimentar el HUD de React; PAUSA → `pause`/`resume`, FIN → abre el modal con la puntuación actual, JUGAR DE NUEVO → `restart`; si no existe motor, conservar el mockup actual sin cambios. Verificación: otros juegos (p. ej. `/juego/caida/jugar`) se ven y se comportan como antes.
6. Mostrar el modal de fin de partida también cuando el motor reporta `status: "gameover"`, con la puntuación real. Verificación: perder las 3 vidas abre el modal con el puntaje correcto.
7. Revisar `/juego/asteroids/jugar` en escritorio y ancho móvil, probar React StrictMode en `npm run dev` (sin doble bucle ni listeners duplicados) y confirmar `npm run lint` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` antes de escribir los componentes, según `AGENTS.md`. Cualquier ajuste visual del reproductor se diseña con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `GAMES` contiene `asteroids` y sigue conteniendo `rocas`, sin cambios en este último.
- [ ] `/games` muestra la tarjeta ASTEROIDS y `/juego/asteroids` muestra su detalle con botón para jugar.
- [ ] `/juego/asteroids/jugar` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] `←` `→` rotan, `↑` propulsa con inercia, `Espacio` dispara; la página no hace scroll al pulsar `Espacio` o las flechas.
- [ ] Un asteroide grande destruido da 20 puntos, uno mediano 50 y uno pequeño 100, y la puntuación del HUD de React coincide con la del motor.
- [ ] Al chocar con un asteroide se pierde una vida, el HUD de React la descuenta y la nave reaparece parpadeando e invencible; tras 3 choques el estado es `gameover`.
- [ ] Destruir todos los asteroides sube el nivel y el HUD de React lo refleja.
- [ ] El power-up `3x` aparece, se recoge y dispara tres balas durante 5 s, con el contador visible en el canvas.
- [ ] El canvas dibuja su propio HUD (SCORE, NIVEL, iconos de vidas, `3x`) y el HUD de React muestra los mismos valores en todo momento.
- [ ] PAUSA congela asteroides, balas y nave; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; JUGAR DE NUEVO reinicia a 0 puntos, 3 vidas y nivel 1; VOLVER AL VAULT navega a `/games`.
- [ ] Al llegar a `gameover` aparece el modal de fin con la puntuación real.
- [ ] Navegar fuera de la página deja de ejecutar el bucle y de escuchar teclas (comprobado en StrictMode y al cambiar de ruta).
- [ ] `/juego/caida/jugar` y los demás juegos sin motor muestran el mockup igual que antes.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/juego/asteroids/jugar`.
- [ ] No se usa `localStorage` ni se escribe en Supabase.

## Decisiones

- **Sí:** juego nuevo `asteroids`. **No:** reutilizar `rocas`; el usuario pidió explícitamente añadir uno nuevo.
- **Sí:** port a TypeScript modular con el motor aislado de React. **No:** `iframe` ni copiar `game.js` con globals; complican el desmontaje, StrictMode y la comunicación con el HUD.
- **Sí:** el juego vive físicamente en el canvas (incluido su HUD) y notifica a React por callbacks (`onStateChange`); React controla el motor mediante `pause`/`resume`/`restart`/`destroy`. Es la frontera para todos los juegos futuros.
- **Sí:** mantener el HUD del canvas y notificar a React para que muestre también el suyo. El juego es autónomo (canvas, controles y HUD propios) y React solo recibe los cambios de estado. **No:** quitar el HUD del canvas para dejar a React como única capa de UI (decisión corregida por el usuario tras la primera versión).
- **Sí:** diferir el componente genérico `CanvasGame` al segundo juego de canvas. **No:** abstraerlo ahora con un único caso.
- **Sí:** `rocas` (id y datos distintos) no se toca.
- **Sí:** registro de motores por id (`ENGINES`), con mockup como fallback. **No:** componente aparte por juego, que duplicaría el marco CRT y el HUD.
- **Sí:** estética vectorial blanca del original dentro del CRT. **No:** reestilizar con neón del Vault en esta spec.
- **Sí:** sin guardar puntuaciones. El guardado va con la spec de tablas y auth en Supabase; `best` y `plays` del registro son mock.
- **Sí:** categoría `SHOOTER`, color `cyan` y cover propio `cover-asteroids`. Propuesta mía para el registro; puede ajustarse al revisar.

## Riesgos

| Riesgo                                                                          | Mitigación                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| React StrictMode monta el efecto dos veces y duplica bucles o listeners          | `destroy` completo en el cleanup del `useEffect`; criterio de aceptación en StrictMode.                       |
| `onStateChange` en cada frame provoca renders de React a 60 fps                  | Se emite solo cuando cambian `score`, `lives`, `level` o `status`.                                            |
| Las flechas y `Espacio` hacen scroll o activan botones enfocados                 | `preventDefault` en las teclas del juego mientras está activo y quitar el foco del botón tras pulsarlo.       |
| El canvas se deforma o se desborda en móvil                                      | Canvas 800×600 con `width: 100%; height: auto`; revisión a ancho móvil. Sin controles táctiles en esta spec.  |
| El motor depende de `window`/`document` y rompe el renderizado en servidor       | Se instancia solo dentro de `useEffect` en un client component; no se accede a globals al importar el módulo. |
| El estado del juego y el HUD de React se desincronizan tras pausa o reinicio     | `restart` emite el estado inicial; `pause`/`resume` emiten `status`; criterios de aceptación específicos.     |

## Qué **no** está en esta spec

- Guardado de puntuaciones, ranking real, auth y Supabase.
- Componente genérico `CanvasGame` (llega con el segundo juego de canvas).
- Estética neón del Vault para el juego.
- Controles táctiles, gamepad y sonido.
- Otros juegos reales (Tetris, Arkanoid, etc.).
- Cambios en `rocas`.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
