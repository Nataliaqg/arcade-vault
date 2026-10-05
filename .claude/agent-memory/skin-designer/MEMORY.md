# Memoria de skin-designer

## Contrato

- Compartido: `lib/games/skins.ts` (`SkinId`, `SKIN_IDS`, `DEFAULT_SKIN = "classic"`, `SKIN_LABELS`, `contrastRatio`).
- Por juego: `lib/games/<id>/skins.ts` con `SKINS: Record<SkinId, Palette>`.
- `GameFactory(canvas, callbacks, options?: { skin })` y `GameEngine.setSkin(skin)`.
- Persistencia: localStorage `arcade-vault:skin:v1`.
- Modo oscuro: fondo luminancia ≤ 0.05, texto ≥ 4.5:1, entidades ≥ 3:1.

## Decisiones de paleta

- Retro: asteroids y arkanoid en ámbar (`#0d0800`, `#a8650f`, `#d98a1c`, `#ffb327`, `#ffd98a`); tetris y snake en verde (`#050f07`, `#2e8b3f`, `#4fb862`, `#7bd88f`, `#c8ffd0`). Sin glow, bloques "ring" en tetris, esquinas rectas.
- Neón: tokens del Vault; glow con multiplicador `glow` en la paleta (0 = sin glow). Clásico de asteroids/tetris/arkanoid usa glow 0 (o ninguno en fallback) para no cambiar nada.
- Clásico = colores originales extraídos tal cual (asteroids `#000`/`#fff`, tetris azul-gris, arkanoid/snake Vault + sprites).
- Arkanoid: solo clásico usa sprites; neón/retro dibujan formas (`blockInset`, `rounded`).
- Paletas con campos extra de estilo (`glow`, `pixel`, `block`, `segmentRadius`, `fruit`) además de colores.
- Colores rgba permitidos en la paleta para overlays/veils; el script de contraste los compone sobre el fondo.

## Implementación

- Cada motor: `options.skin`, variable `skin`, `setSkin(next)`, paleta `SKINS[skin]` leída por frame (asteroids: dentro del closure; los demás la pasan en `RenderView`).
- UI: `components/game-player.tsx` con `useSyncExternalStore` (snapshot servidor = classic) y selector `.skin-picker` dentro del bisel CRT; `--player-chrome` subido a 280px. `setState` en efecto lo prohíbe el lint (react-hooks/set-state-in-effect).
- Script de contraste: se reescribe en el scratchpad con `typescript.transpileModule` + require stub (no hay tsx).

## Historial

- 2026-10-05: creado contrato (`lib/games/skins.ts`, `types.ts`), skins de asteroids, tetris, arkanoid y snake, selector en el player. lint/tsc/build OK. Único fallo de contraste: etiqueta de tetris clásico (2.65:1), mantenida por fidelidad. Sin verificación visual.

## Preferencias del usuario

- Quiere que el agente implemente directamente, no solo que escriba specs.
- Las 3 skins deben verse bien en modo oscuro.
- Clásico debe verse idéntico al juego actual (prima sobre el contraste).
