# SPEC <NN> — Juego <TITLE>

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** <YYYY-MM-DD>
> **Objetivo:** <Portar el juego <Nombre> de `references/started-games/<carpeta>/` | Crear el juego <Nombre>> a TypeScript como un motor de canvas que vive dentro del marco CRT del reproductor, publica su estado al HUD de React, se registra como `<id>` en la tabla `games` y guarda puntuaciones en el leaderboard.

## Por qué existe esta spec

<Por qué este juego ahora. Recordar que sigue la frontera motor ↔ React de SPEC 04 y el flujo de datos de SPEC 05: el juego es un motor imperativo que dibuja en un `<canvas>`; React lo monta, lo controla y escucha sus cambios; el catálogo y el leaderboard salen de Supabase.>

## Alcance

**Dentro:**

- <Port | Implementación> en TypeScript en `lib/games/<id>/` (<clases/módulos>), sin estado global de módulo ni acceso a `document`/`window` fuera de la factory.
- Mecánicas: <lista concreta de mecánicas del juego>.
- API del motor: `create<Nombre>(canvas, callbacks)` devuelve `{ pause, resume, restart, destroy }` y notifica con `onStateChange`.
- Registro `<id>: create<Nombre>` en `ENGINES` (`lib/games/registry.ts`).
- HUD y overlays propios del canvas conservados (<qué dibuja>); el HUD de React se alimenta en paralelo.
- Clase CSS `cover-<id>` en `app/globals.css`.
- Migración `seed_game_<id>` que inserta la fila `<id>` en `games`.
- Leaderboard verificado: modal de fin de partida con guardado y top 5, pestaña `<TITLE>` en `/salon`, top 10 en `/games/<id>`.
- <Condicional: assets en `public/games/<id>/` (sprites, sonidos).>
- <Condicional: controles de ratón con coordenadas corregidas por escala.>
- <Condicional: pantalla de victoria que termina en `status: "gameover"`.>

**Fuera de alcance (para specs futuras):**

- Cambios en `lib/games/types.ts`, `components/game-player.tsx` o el esquema de `scores`.
- Controles táctiles y gamepad.
- Anti-trampas y validación de partida en servidor.
- <Sonido | Reestilizar con la paleta neón del Vault | Componente genérico `CanvasGame`> (según lo decidido).
- Cambios en otros juegos.
- Tests automatizados.

## Modelo de datos

Fila nueva en `games` (migración `seed_game_<id>`):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  '<id>',
  '<TITLE>',
  '<short>',
  '<long>',
  '<ARCADE|PUZZLE|SHOOTER|VERSUS>',
  'cover-<id>',
  '<cyan|magenta|green|yellow>'
);
```

Sin cambios de esquema, RLS ni tipos generados.

Mapeo al contrato `GameState` (SPEC 04, sin cambios):

| Campo    | Significado en <TITLE>                    |
| -------- | ----------------------------------------- |
| `score`  | <cómo se suma; entero 0..10 000 000>      |
| `lives`  | <vidas iniciales, o valor fijo si no hay> |
| `level`  | <nivel, o equivalente>                    |
| `status` | `playing` / `paused` / `gameover` (<incluye victoria si aplica>) |

Estructura del motor:

```
lib/games/<id>/
  index.ts        ← create<Nombre>(canvas, callbacks): GameEngine
  constants.ts
  <clase>.ts
  ...
```

Registro:

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameFactory> = {
  asteroids: createAsteroids,
  <id>: create<Nombre>,
};
```

Convenciones:

- Canvas lógico <800×600 | W×H con letterbox>; el CSS lo escala dentro de `crt-screen`.
- `dt` limitado a 50 ms. `Math.random` solo dentro del motor.
- `onStateChange` solo cuando cambian `score`, `lives`, `level` o `status`; `restart` emite el estado inicial; `pause`/`resume` emiten `status`.
- Teclas del juego (<lista>) con `preventDefault` mientras el motor está activo; teclas limpiadas en `blur`.
- <Pausa propia del original (`P`/`Esc`) enlazada a `pause`/`resume`.>
- <Ratón: coordenadas convertidas con `getBoundingClientRect` a la resolución lógica.>
- <Assets en `public/games/<id>/`, cargados dentro de la factory; `destroy` pausa los audios.>

## Plan de implementación

1. Portar a `lib/games/<id>/` las clases, utilidades y constantes (archivos tipados, sin `document` ni `window` globales; el contexto 2D se recibe por parámetro). Verificación: `npm run lint` y `npx tsc --noEmit` pasan.
2. Implementar `create<Nombre>(canvas, callbacks)` en `lib/games/<id>/index.ts`: input, bucle con `requestAnimationFrame`, `pause`/`resume`/`restart`/`destroy` y `onStateChange`. Mantener el HUD y los overlays del canvas. Verificación: `destroy` cancela el frame y desregistra los listeners.
3. <Condicional: copiar assets a `public/games/<id>/` y cargarlos desde la factory. Verificación: sin 404 en la consola.>
4. Registrar `<id>` en `ENGINES`. Verificación: `npx tsc --noEmit` pasa.
5. Añadir `cover-<id>` en `app/globals.css`, diseñado con `/frontend-design`. Verificación: la tarjeta se ve en `/games` tras el paso 6.
6. Aplicar la migración `seed_game_<id>`. Verificación: `select id from games` incluye `<id>`; `/games` muestra la tarjeta y `/games/<id>/play` arranca el juego.
7. Verificar el leaderboard: perder una partida, guardar `TESTER`, ver la posición y el top 5 en el modal, la fila en la pestaña `<TITLE>` de `/salon` y en el top 10 de `/games/<id>`.
8. Probar StrictMode en `npm run dev` (sin doble bucle ni listeners duplicados), ancho móvil y portátil (1366×768), y confirmar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` antes de tocar componentes, según `AGENTS.md`. Cualquier ajuste visual se diseña con `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

Base (heredados de SPEC 04 y 05):

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `games` contiene la fila `<id>` y las filas anteriores sin cambios.
- [ ] `/games` muestra la tarjeta `<TITLE>` con `cover-<id>` y `/games/<id>` su detalle con botón para jugar.
- [ ] `/games/<id>/play` muestra el canvas dentro del marco CRT, sin deformarse, y el juego arranca sin acción adicional.
- [ ] Los controles funcionan y la página no hace scroll al pulsar las teclas del juego.
- [ ] El HUD de React (puntuación, vidas, nivel) coincide en todo momento con el del canvas.
- [ ] PAUSA congela el juego; REANUDAR continúa donde estaba.
- [ ] FIN abre el modal con la puntuación actual; al llegar a `gameover` el modal se abre solo con la puntuación real.
- [ ] JUGAR DE NUEVO reinicia a <estado inicial>; VOLVER AL VAULT navega a `/games`.
- [ ] Guardar con un nombre válido inserta una fila en `scores` con `game_id = '<id>'` y la puntuación real; el modal muestra la posición y el top 5.
- [ ] `/salon` tiene la pestaña `<TITLE>` y su top coincide con el top 10 de `/games/<id>`; la pestaña GENERAL mezcla puntuaciones de todos los juegos.
- [ ] `best` y `plays` de `<TITLE>` reflejan `scores`; con 0 filas muestran 0.
- [ ] Navegar fuera de la página detiene el bucle y los listeners (StrictMode y cambio de ruta).
- [ ] La consola no muestra errores ni warnings de hidratación en `/games/<id>/play`.
- [ ] Los demás juegos se comportan igual que antes.

Específicos de <TITLE>:

- [ ] <Puntos por acción con valores concretos.>
- [ ] <Condición de perder vida / fin de partida.>
- [ ] <Subida de nivel y su efecto.>
- [ ] <Power-ups, victoria, sonido, ratón… según aplique.>

## Decisiones

- **Sí:** motor TypeScript aislado de React con el contrato de SPEC 04 sin cambios. **No:** `iframe` ni copiar `game.js` con globals.
- **Sí:** conservar HUD y overlays del canvas; React solo escucha. **No:** quitar el HUD del canvas.
- **Sí:** registrar el motor antes de insertar la fila en `games`. **No:** una fila sin motor (el reproductor quedaría vacío).
- **Sí:** el leaderboard de SPEC 05 se reutiliza sin código nuevo. **No:** tablas o componentes de ranking propios del juego.
- <Decisiones de la Fase 2: mapeo de `lives`/`level`, canvas, assets, sonido, estética, categoría y color…>

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| StrictMode monta el efecto dos veces y duplica bucles o listeners | `destroy` completo en el cleanup; criterio de aceptación en StrictMode. |
| `onStateChange` en cada frame provoca renders a 60 fps | Emitir solo cuando cambia algún campo de `GameState`. |
| Las teclas del juego hacen scroll o activan botones | `preventDefault` en las teclas del juego y `blur` del botón tras pulsarlo (ya en `game-player`). |
| El motor accede a `window`/`document` y rompe el SSR | Instanciarlo solo dentro de la factory, llamada desde `useEffect`. |
| Fila en `games` sin motor en `ENGINES` | Orden fijo: registrar el motor (paso 4) antes de la migración (paso 6). |
| Puntuación no entera o por encima de 10 000 000 | Puntos enteros; el `CHECK` de `scores` rechaza el resto y el modal muestra error. |
| <Ratón con coordenadas desplazadas por el escalado CSS> | <Convertir con `getBoundingClientRect` a la resolución lógica.> |
| <Assets que no cargan o se cargan en servidor> | <Rutas `/games/<id>/…` y carga dentro de la factory.> |
| <Riesgos propios del juego> | <Mitigación> |

## Qué **no** está en esta spec

- Cambios en el contrato del motor, el reproductor o el esquema de `scores`.
- Controles táctiles y gamepad.
- Anti-trampas, rate limit y moderación.
- <Lo que se haya dejado fuera en la Fase 2.>
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
