---
name: add-game
description: Genera la spec para portar o crear un juego de canvas e integrarlo en Arcade Vault (motor TypeScript, registro en ENGINES, fila en la tabla games de Supabase y leaderboard). Puede partir de una carpeta de references/started-games/ o de una idea desde cero. Solo escribe la spec; la implementación se hace luego con /spec-impl.
disable-model-invocation: true
argument-hint: 'carpeta de references/started-games (p. ej. 03-tetris) o descripción corta del juego'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), mcp__supabase__list_tables, mcp__supabase__execute_sql
---

# /add-game — Spec para añadir un juego a Arcade Vault

## Contexto de sesión

Fecha de hoy (úsala en el encabezado de la spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay juegos de referencia"`

Motores registrados hoy:
!`cat lib/games/registry.ts`

Carpetas de motores:
!`ls lib/games/`

Archivos del skill `/spec` (referencia obligatoria; si aparece un error, no está instalado en `~/.claude/skills/spec/`):
!`ls ~/.claude/skills/spec/`

---

Este skill produce **una sola cosa**: un archivo `specs/NN-juego-<id>.md` que describe cómo añadir un juego nuevo a Arcade Vault siguiendo el patrón fijado por `specs/04-juego-asteroids.md` (motor ↔ React) y `specs/05-leaderboard-y-tabla-de-juegos.md` (catálogo y leaderboard en Supabase).

**No escribes código, no aplicas migraciones y no tocas Supabase** (salvo consultas de solo lectura para conocer el catálogo actual). Al terminar, el usuario implementa con `/spec-impl`.

Responde siempre en el idioma del prompt inicial (normalmente español). La spec se escribe en el mismo idioma que las specs existentes.

## Argumento

`$ARGUMENTS` puede ser:

- El nombre de una carpeta de `references/started-games/` (p. ej. `03-tetris`, `04-arkanoid`) → el juego se **porta** desde esa referencia.
- Una descripción corta de un juego → el juego se **crea desde cero**.
- Vacío → pregunta si el juego viene de una referencia (ofrece las carpetas del contexto de sesión que aún no tienen motor) o es nuevo.

## Fase 0 — Leer el skill `/spec` (obligatorio, antes de todo)

Antes de leer el proyecto, de preguntar y de escribir nada, lee completos con `Read` los dos archivos del skill `/spec`, en `~/.claude/skills/spec/` (ruta absoluta del directorio home del usuario; si no existe, prueba `~/.agents/skills/spec/`):

1. `SKILL.md` — el método spec-driven: fases, cómo preguntar, cuándo redactar por secciones y cuándo escribir la spec completa de una vez, cómo numerar, qué estado poner y cómo cerrar.
2. `template.md` — la forma de cada sección de una spec (encabezado, alcance, modelo de datos, plan, criterios, decisiones, riesgos) con su propósito y ejemplos.

Ese skill es **la referencia para crear cualquier archivo de especificación**. Este skill (`/add-game`) lo especializa para juegos:

- **Proceso y forma** (fases, preguntas, redacción, atajo de escritura completa, numeración, estado, mensaje final, estructura y calidad de cada sección): manda `/spec`.
- **Contenido específico de juegos** (inventario de la referencia, checklist de preguntas de juego, `template.md` de este directorio con los valores pre-rellenados y las **Reglas de integración**): manda `/add-game`. Si `/spec` no dice nada sobre algo, también manda `/add-game`.
- Si ambos chocan en forma, sigue a `/spec` y adapta el contenido de juego a esa forma; nunca elimines una regla de integración.

Si no se encuentra el skill `/spec`, avisa al usuario (se instala con `npx skills@latest add Klerith/fernando-skills`) y pregunta si continuar solo con este skill.

## Fase 1 — Contexto

1. Lee `CLAUDE.md` y `AGENTS.md`.
2. Lee las dos specs más recientes de `specs/` para copiar idioma, estados y encabezados.
3. Lee **siempre** las specs canónicas y los archivos de la frontera motor ↔ plataforma:
   - `specs/04-juego-asteroids.md`, `specs/05-leaderboard-y-tabla-de-juegos.md`
   - `lib/games/types.ts` (contrato `GameState`, `GameEngine`, `GameFactory`)
   - `lib/games/registry.ts` (`ENGINES`)
   - `lib/games/asteroids/index.ts` (motor de ejemplo: input, bucle, `emit`, `destroy`)
   - `components/game-player.tsx` y `components/game-over-modal.tsx`
   - `lib/db/games.ts`, `lib/data.ts` (`GameCategory`, `GameColor`)
4. Consulta el catálogo actual con `execute_sql` (`select id, title, cat, color from public.games`) para evitar ids duplicados. Solo `select`.
5. **Si hay referencia**, lee de su carpeta: `README.md`, `CLAUDE.md`, `index.html`, `style.css`, `game.js` y cualquier módulo extra (`levels.js`, `spritesheet.js`, …); lista `assets/`. Ignora `.github/`, `.claude/`, `.Claude/`, `.agents/`, `specs/` y `skills-lock.json` de la referencia: no forman parte del juego.
   Presenta al usuario un **inventario** breve:
   - Tamaño del canvas y relación de aspecto.
   - Controles (teclado, ratón, clics) y dónde se registran los listeners (`document`, `window`, `canvas`).
   - Variables globales y accesos a `document`/`window` que habrá que encapsular.
   - Bucle (`requestAnimationFrame`, `setInterval`) y cálculo de `dt`.
   - Estados internos: pausa propia, game over, victoria, selección de nivel.
   - HUD y overlays dibujados en el canvas o en el HTML (estos últimos habrá que pasarlos al canvas).
   - Puntuación, vidas, nivel o equivalentes (líneas, oleadas…).
   - Assets (sprites, sonidos, fuentes) y cómo se cargan.
   - Teclas que reinician la partida o que chocan con el reproductor.
6. **Si es desde cero**, pide una descripción de una frase de las mecánicas. Si no cabe en una frase, propón recortar.

## Fase 2 — Preguntas

Nunca la saltes. Pregunta en bloques de 3 a 5 con `AskUserQuestion`, espera respuesta y sigue. Propón siempre una opción recomendada basada en el inventario y en las decisiones de las specs 04/05.

Checklist de temas (pregunta solo lo que no esté claro ya):

- **Registro en `games`:** `id` (kebab-case, único), `title` (mayúsculas), `short`, tono del `long`, `cat` ∈ `ARCADE | PUZZLE | SHOOTER | VERSUS`, `color` ∈ `cyan | magenta | green | yellow`, clase `cover-<id>`.
- **Mapeo a `GameState`** (contrato fijo, no se amplía): qué es `score`; qué es `lives` (si el juego no tiene vidas, valor fijo, p. ej. `1`); qué es `level` (nivel, o un equivalente como líneas/10 o velocidad). `score` debe ser entero entre 0 y 10 000 000 (el `CHECK` de `scores`).
- **Controles:** lista de teclas del juego (todas con `preventDefault` mientras el motor está activo); ratón con coordenadas corregidas por escala del canvas; pausa propia del original (`P`/`Esc`) → se enlaza a `pause`/`resume` del contrato y emite `status`.
- **Canvas:** si no es 800×600 (4:3), decidir entre adaptar la resolución lógica o letterbox dentro de `crt-screen`.
- **Fin de partida:** game over y, si existe, victoria. Ambos terminan en `status: "gameover"` para abrir el modal y permitir guardar la puntuación.
- **Assets y sonido:** dentro o fuera de alcance. Si dentro, van en `public/games/<id>/` y se cargan dentro de la factory, nunca al importar el módulo.
- **Estética:** conservar la del original (por defecto, como en SPEC 04) o reestilizar con la paleta del Vault.
- **Fuera de alcance por defecto** (confirmar): controles táctiles, gamepad, anti-trampas, cambios de esquema en `scores`, componente genérico `CanvasGame` (salvo que el usuario lo quiera ahora que hay un segundo juego de canvas).
- **Decisiones cerradas:** pregunta si hay algo que el usuario no quiere reabrir.

## Fase 3 — Redacción

Sigue la fase de redacción de `/spec` (leída en la Fase 0): su orden, su atajo de escribir la spec completa cuando la Fase 2 ya respondió todo, y las reglas de forma de su `template.md` para cada sección.

El contenido sale de `template.md` de este directorio: rellena todos los `<placeholders>` y elimina las secciones condicionales que no apliquen (assets, sonido, ratón, victoria). Además:

1. Añade a los criterios base los específicos de las mecánicas del juego (puntos por acción, subida de nivel, power-ups, etc.) con valores concretos sacados de la referencia.
2. Cada decisión tomada en la Fase 2 va a **Decisiones** con formato `**Sí:** … **No:** …`.
3. Antes de guardar, repasa la spec contra las comprobaciones de calidad de `/spec` y contra las **Reglas de integración** de abajo.

## Fase 4 — Guardar

Sigue la fase de guardado de `/spec` (numeración, estado inicial y mensaje final), con estas concreciones:

- Ruta: `specs/NN-juego-<id>.md`, con `NN` = siguiente número de dos dígitos tras la última spec.
- Estado: el estado inicial que indica `/spec`, con la palabra equivalente en el idioma de las specs del repo (p. ej. `Borrador`). Nunca `Aprobado` ni `Implementado`.
- `Depende de: SPEC 04, SPEC 05` (y las que apliquen); fecha del contexto de sesión.
- El mensaje final incluye: «Implementa con `/spec-impl specs/NN-juego-<id>.md`».

## Reglas de integración (toda spec generada debe exigirlas)

Estas reglas salen de las specs 04 y 05. No las negocies salvo que el usuario lo pida explícitamente; si lo pide, regístralo en **Decisiones**.

1. **Motor aislado:** código en `lib/games/<id>/` (clases/constantes en archivos separados) con `create<Nombre>(canvas, callbacks): GameEngine` exportado desde `index.ts`. Sin estado global de módulo. Sin acceso a `window`/`document` al importar; solo dentro de la factory. El contexto 2D se pasa por parámetro a las clases.
2. **Contrato:** `GameState { score, lives, level, status }` sin cambios en `lib/games/types.ts` ni en `components/game-player.tsx`. `onStateChange` solo cuando cambia algún campo (nunca por frame); `restart` emite el estado inicial; `pause`/`resume` emiten `status`.
3. **Ciclo de vida:** `destroy` cancela `requestAnimationFrame`/timers, quita todos los listeners (teclado, ratón, `blur`) y para los audios. Seguro en React StrictMode.
4. **Bucle:** `dt` acotado a 50 ms; `Math.random` solo dentro del motor.
5. **Input:** listeners de teclado en `window`, `preventDefault` en las teclas del juego, limpiar teclas en `blur`. Ratón relativo al canvas escalado (`getBoundingClientRect`). El modal ya hace `stopPropagation` en su input.
6. **HUD y overlays del canvas se conservan** (decisión de SPEC 04); el HUD de React se alimenta en paralelo con `onStateChange`. Overlays que en el original eran HTML se dibujan en el canvas.
7. **Orden de integración:** registrar el motor en `ENGINES` (`lib/games/registry.ts`) **antes** de insertar la fila en `games`. SPEC 05 eliminó el mockup: una fila sin motor deja el reproductor vacío.
8. **Base de datos:** migración `seed_game_<id>` con un único `insert into public.games (id, title, short, long, cat, cover, color) values (…)`. Sin cambios de esquema, sin tocar RLS ni `scores`, sin regenerar tipos. Verificación con `list_tables` y `select`.
9. **Leaderboard sin código nuevo:** la pestaña en `/salon`, el top 10 en `/games/<id>`, el modal con guardado y top 5, y `best`/`plays` salen solos de `getGames`/`getTopScores`. La spec solo los **verifica**.
10. **Assets:** en `public/games/<id>/`, referenciados con rutas absolutas (`/games/<id>/…`), cargados dentro de la factory.
11. **Diseño y docs:** la clase `cover-<id>` en `app/globals.css` se diseña con `/frontend-design` (regla de `CLAUDE.md`); antes de tocar componentes se consulta `node_modules/next/dist/docs/` (regla de `AGENTS.md`).
12. **Otros juegos intactos:** ningún cambio en `lib/games/asteroids/` ni en motores existentes.
