---
name: spec-impl-game
description: Implementa una spec de juego aprobada siguiendo exactamente /spec-impl y, al terminar, ejecuta en secuencia (nunca en paralelo) los agentes skin-designer y mobile-porter sobre ese juego.
disable-model-invocation: true
argument-hint: <NN-juego-id>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementa un juego + skins + táctil

Es `/spec-impl` más dos agentes encadenados al final: `skin-designer` y después `mobile-porter`.

## Contexto de sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Configuración de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instrucciones

### Fases 1–4 — Delegadas en /spec-impl

`/spec-impl` no se puede invocar con la herramienta Skill (tiene `disable-model-invocation`). En su lugar:

1. Lee `~/.claude/skills/spec-impl/SKILL.md` (en Windows: `C:\Users\natal\.claude\skills\spec-impl\SKILL.md`).
2. Sigue sus **fases 1 a 4 al pie de la letra** con el argumento `$ARGUMENTS`. Usa el contexto de sesión de arriba en lugar de sus bloques `!`.
3. Se mantienen todas sus reglas: solo specs en estado Aprobado, rama `spec-NN-slug`, pausa y confirmación tras cada paso, y **nunca hacer commit automático**.

**Guarda adicional en la fase 1:** el fichero de la spec debe llamarse `NN-juego-<id>.md`. Extrae `<id>`. Si no encaja con ese patrón (no es una spec de juego), para y sugiere usar `/spec-impl`.

Cuando `/spec-impl` llegue a su mensaje final «All steps of the plan are implemented», **no lo des por cerrado todavía**: continúa con la fase 5.

---

### Fase 5 — Post-implementación (secuencial)

Antes de empezar, pregunta al usuario si quiere continuar con skins y táctil. Espera su confirmación.

Ejecuta los agentes **uno tras otro**: nunca en paralelo y nunca en el mismo mensaje. No lances el segundo hasta haber recibido el resultado del primero.

**5a. `skin-designer`**

Lanza el agente `skin-designer` (herramienta Agent) con este prompt:

> Acaba de implementarse el juego `<id>` (spec `specs/<archivo>.md`). Audita e implementa SOLO las skins de `<id>`: `lib/games/<id>/skins.ts` con `classic`, `neon` y `retro`, `setSkin` en el motor y legibilidad en modo oscuro. No modifiques otros juegos. Verifica con lint, tsc, build y contraste, y actualiza `references/skins-status.md` y tu memoria.

Espera a que termine y resume su salida. Si informa de fallos de verificación (lint, tsc, build o contraste), **para** y pregunta al usuario cómo seguir antes de lanzar el segundo agente.

**5b. `mobile-porter`**

Solo cuando 5a haya terminado bien, lanza el agente `mobile-porter` con este prompt:

> Porta a táctil el juego `<id>` (spec `specs/<archivo>.md`). Revisa o crea `lib/games/<id>/touch.ts` (`TOUCH_LAYOUT`) y su entrada en `TOUCH_LAYOUTS` (`lib/games/registry.ts`). No toques otros juegos ni `components/touch-gamepad.tsx`.

Espera a que termine y resume su salida.

---

### Cierre

Muestra un resumen combinado: ficheros de la spec, skins (resultado de `skin-designer`) y táctil (resultado de `mobile-porter`). Después recuerda:

```
Siguiente paso: verifica uno a uno los criterios de aceptación de la spec.
Si todos pasan, cambia su estado a "Implementado" y haz tú el commit
final antes de fusionar la rama.
```

No hagas commit ni cambies el estado de la spec por tu cuenta.
