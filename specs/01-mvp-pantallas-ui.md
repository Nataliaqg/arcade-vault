# SPEC 01 — MVP de Arcade Vault: pantallas de UI

> **Estado:** Approved
> **Depende de:** ninguna
> **Fecha:** 2026-10-01
> **Objetivo:** Portar a Next.js (App Router) las 5 pantallas de `references/templates/` como UI navegable con datos mock, sin funcionalidad real.

## Por qué existe esta spec

`references/templates/` contiene un prototipo SPA (React por CDN + Babel, rutas por hash). El proyecto es Next.js 16 App Router. Esta spec traduce el prototipo a rutas reales y componentes TypeScript para tener el esqueleto visual completo antes de construir lógica de juego, cuentas o puntuaciones.

`app/globals.css` (estilos del prototipo + tokens de Tailwind) y `app/layout.tsx` (fuentes Press Start 2P, JetBrains Mono, Courier Prime y capas `av-bg` / `av-noise`) ya están portados. Esta spec no los rehace.

## Alcance

**Dentro:**

- 5 pantallas como rutas de App Router: Biblioteca, Detalle de juego, Reproductor, Auth y Salón de la Fama.
- Componentes compartidos: `Nav` (con menú móvil) y footer, montados en el layout.
- Datos mock tipados en `lib/data.ts` (port de `data.jsx`).
- Navegación real entre pantallas con `next/link`.
- Interactividad visual mínima: menú móvil, tabs de Auth (iniciar sesión / crear cuenta), tabs de juego en el Salón, pausa y fin de juego en el Reproductor (solo cambian la vista).
- Efecto tilt de las tarjetas de la Biblioteca (es puramente visual).
- Textos en español, tal como en las plantillas.

**Fuera de alcance (para specs futuras):**

- Autenticación real, sesión y `localStorage` (`av_user`). El `Nav` siempre muestra el estado de invitado ("Iniciar Sesión").
- Guardado de puntuaciones (`av_scores`) y leaderboards reales o persistencia de cualquier tipo.
- Lógica de juego: los 8 juegos no se implementan. La arena del Reproductor es decorativa.
- Puntuación, vidas y nivel simulados con `setInterval` / `Math.random`. Los valores del HUD son fijos.
- Búsqueda por nombre y filtro por categoría en la Biblioteca (se muestran, pero no filtran).
- Botones sociales (Google, GitHub) y "Jugar como invitado" con función; envío del formulario de Auth.
- Contador de créditos real (se muestra el texto fijo `CRÉDITOS · 03`).
- Estado "tu mejor marca" del usuario en el Salón (requiere sesión).
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Solo datos mock estáticos, en `lib/data.ts`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export type Game = {
  id: string;          // slug de la URL: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // clase CSS existente: "cover-bricks", "cover-tetro", ...
  color: GameColor;
  best: number;
  plays: string;       // ya formateado: "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };

export const GAMES: Game[];                 // los 8 juegos de data.jsx
export const CATS: ("TODOS" | GameCategory)[];
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista
```

Convenciones:

- `seededScores` es determinista (misma semilla, mismas filas), para evitar errores de hidratación.
- Números con `toLocaleString("es-ES")`.
- Los ids de `GAMES` son los de `data.jsx`.

## Plan de implementación

1. Crear `lib/data.ts` con los tipos, `GAMES`, `CATS` y `seededScores` portados de `data.jsx`. Verificación: `npm run lint` pasa.
2. Crear `components/nav.tsx` (client component por el menú móvil) y `components/footer.tsx`, y montarlos en `app/layout.tsx` alrededor de `<main className="av-main">`. Verificación: `npm run dev` muestra nav y footer sobre la página actual.
3. Biblioteca en `app/page.tsx` con `components/game-card.tsx` (client component por el tilt). Cada tarjeta enlaza a `/juego/[id]`. Buscador y chips renderizados sin lógica. Verificación: se ven las 8 tarjetas y clic navega al detalle (404 aún).
4. Detalle en `app/juego/[id]/page.tsx`: portada, etiquetas, stats, leaderboard con `seededScores(id.length * 17 + 3, 10)`. Botón JUGAR a `/juego/[id]/jugar`, volver a `/`. Id inexistente llama a `notFound()`. Verificación: `/juego/caida` se ve igual que la plantilla.
5. Auth en `app/auth/page.tsx` con tabs (client component `components/auth-form.tsx`). El submit hace `preventDefault` sin efecto. Verificación: las tabs alternan el campo de correo.
6. Salón de la Fama en `app/salon/page.tsx` con tabs por juego (client component `components/hall-of-fame.tsx`), podio y tabla desde `seededScores(tab.length * 23 + 7, 12)`. Sin fila "tu mejor marca". Verificación: cambiar de tab cambia podio y tabla.
7. Reproductor en `app/juego/[id]/jugar/page.tsx` con `components/game-player.tsx` (client component): HUD con valores fijos, marco CRT, arena decorativa, PAUSA/REANUDAR, FIN abre el modal de fin de juego, SALIR vuelve al detalle. El modal muestra una puntuación fija, sin guardar. JUGAR DE NUEVO cierra el modal y VOLVER AL VAULT va a `/`. Verificación: el flujo Biblioteca → Detalle → Reproductor → Biblioteca funciona.
8. Limpiar el scaffold sobrante (`next.svg` y similares si ya no se usan) y confirmar que `npm run build` compila.

Cada paso deja la app ejecutable y es commiteable por separado. En Next 16 los `params` son asíncronos; consultar `node_modules/next/dist/docs/` antes de escribir las páginas dinámicas, según `AGENTS.md`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [X] `/` muestra el hero "ARCADE VAULT" y 8 tarjetas de juego.
- [X] Clic en una tarjeta o en su botón JUGAR navega a `/juego/<id>` del juego correcto.
- [X] `/juego/<id>` muestra título, descripción larga, etiquetas, partidas, mejor global, dificultad y 10 filas de leaderboard.
- [X] `/juego/no-existe` devuelve la página 404 de Next.
- [X] `/juego/<id>/jugar` muestra HUD, marco CRT y arena; PAUSA muestra el overlay "EN PAUSA" y REANUDAR lo quita.
- [X] FIN abre el modal "FIN DEL JUEGO"; VOLVER AL VAULT navega a `/`; SALIR navega a `/juego/<id>`.
- [X] La puntuación del Reproductor no cambia con el tiempo.
- [X] `/auth` alterna entre INICIAR SESIÓN y CREAR CUENTA; solo en CREAR CUENTA aparece el campo de correo.
- [X] Enviar el formulario de Auth no navega, no guarda nada y no escribe en `localStorage`.
- [X] `/salon` muestra un tab por cada uno de los 8 juegos, podio de 3 y tabla de 12 filas; cambiar de tab cambia el contenido.
- [X] El `Nav` aparece en todas las rutas con enlaces a Biblioteca y Salón de la Fama, marca activa correcta (Biblioteca activa en `/` y `/juego/*`) y botón "Iniciar Sesión" hacia `/auth`.
- [ ] A ancho móvil el `Nav` muestra el botón hamburguesa y abre/cierra el panel lateral.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en ninguna de las 5 rutas.
- [ ] Ninguna ruta usa `localStorage` ni `Math.random` en el render.

## Decisiones

- **Sí:** rutas reales de App Router (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon`). URLs compartibles y aprovecha el framework.
- **No:** SPA con estado y hash como `app.jsx`. Desaprovecha Next.js y no permite enlaces directos.
- **Sí:** solo UI y navegación; estado local solo para efectos visuales. Mantiene la spec acotada y deja la lógica para specs propias.
- **No:** replicar login falso en `localStorage` ni guardado de puntuaciones. Es lógica que se rediseñará con persistencia real.
- **Sí:** el Reproductor se incluye como maqueta, con valores fijos. Cubre "todas las pantallas" sin entrar en lógica de juego.
- **Sí:** mock data tipado en `lib/data.ts`. Fácil de sustituir por una API o BD real.
- **No:** datos incrustados en cada página. Duplicarían `GAMES`.
- **Sí:** buscador y chips de la Biblioteca visibles pero inertes. Se interpretó "solo UI y navegación" de forma estricta; se activan junto con la funcionalidad de la Biblioteca. Si se prefiere que filtren ya, es un cambio pequeño y se registra aquí.
- **Sí:** `Nav` siempre en estado invitado hasta que exista autenticación.
- **Sí:** URLs en español (`/juego`, `/salon`) por coherencia con el idioma de la interfaz.

## Riesgos

| Riesgo                                                                    | Mitigación                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Next 16 tiene cambios incompatibles (p. ej. `params` asíncronos)          | Leer `node_modules/next/dist/docs/` antes de cada página dinámica, como pide `AGENTS.md`.           |
| Errores de hidratación por datos aleatorios o `toLocaleString` distinto   | `seededScores` determinista, sin `Math.random`; formato fijo `es-ES`; criterio de aceptación en consola. |
| Las clases CSS portadas pueden no coincidir con el marcado de las plantillas | Mantener nombres de clase idénticos a los `.jsx` y comparar visualmente cada pantalla con el prototipo. |

## Qué **no** está en esta spec

- Autenticación, sesión y cuentas de usuario.
- Persistencia de puntuaciones y leaderboards reales.
- Lógica de cualquiera de los 8 juegos.
- Búsqueda y filtrado funcionales en la Biblioteca.
- Créditos reales, modo invitado funcional e inicio de sesión social.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
