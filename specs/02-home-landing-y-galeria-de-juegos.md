# SPEC 02 — Home landing e independencia de la galería de juegos en `/games`

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-01
> **Objetivo:** Reemplazar el home actual por la landing de `references/templates/home-about/` (sin la sección Acerca de) y mover el listado completo de juegos a una nueva ruta `/games`, accesible desde "Juegos disponibles ahora".

## Por qué existe esta spec

Hoy `/` es la Biblioteca completa (hero + buscador + chips + 8 tarjetas). La plantilla `home-about` define un Inicio tipo landing y deja la Biblioteca como pantalla aparte. Esta spec separa ambas: `/` pasa a ser Inicio y la Biblioteca se muda a `/games`, sin cambiar su contenido.

## Alcance

**Dentro:**

- Nueva ruta `/games` con exactamente el contenido actual de `app/page.tsx` (hero "ARCADE VAULT", buscador y chips inertes, grid de 8 `GameCard`).
- Nuevo `/` con las secciones de `home.jsx`: Hero (con siluetas flotantes), ¿Por qué Arcade Vault?, Juegos disponibles ahora, Stats, Actividad en vivo, Precios + FAQ y CTA final.
- Componentes nuevos para el Inicio: siluetas flotantes, iconos de features, mini-tarjeta de juego y wrapper de animación `reveal` (client component con `IntersectionObserver`).
- Portar a `app/globals.css` los estilos faltantes de `references/templates/home-about/styles.css`: bloques `HOME PAGE`, `ACTIVITY` y `PRICING`.
- Enlaces reales con `next/link`:
  - "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" → `/games`.
  - "CREAR CUENTA" y "EMPEZAR GRATIS →" → `/auth`.
  - Mini-tarjetas (primeros 6 de `GAMES`) → `/juego/[id]`.
  - "VER SALÓN →" → `/salon`.
- `Nav` (escritorio y panel móvil): Inicio (`/`), Biblioteca (`/games`), Salón de la Fama (`/salon`). Biblioteca activa en `/games` y `/juego/*`; Inicio activo solo en `/`.
- Los enlaces "volver a la biblioteca" que hoy apuntan a `/` pasan a `/games`: detalle de juego, VOLVER AL VAULT del reproductor y el botón de `hall-of-fame.tsx`.

**Fuera de alcance (para specs futuras):**

- Página y enlace "Acerca de" (`about.jsx`): se excluye por decisión explícita.
- Búsqueda y filtro por categoría funcionales en `/games` (siguen inertes, como en SPEC 01).
- Datos reales en "Actividad en vivo" y "Top jugadores · hoy": son mock fijo.
- Cuentas, sesión y planes reales detrás de la sección Precios. Es solo texto de la plantilla.
- Contadores reales en Stats ("12+ JUEGOS", etc.): texto fijo.
- Variantes de tema y bloques de CSS de la plantilla no usados por el Inicio (`ABOUT PAGE`, `GAMEPAD`, `Theme variants`).
- Cambiar las URLs en español existentes (`/juego`, `/salon`, `/auth`).
- Tests automatizados.

## Modelo de datos

Esta feature no introduce estructuras nuevas. Reutiliza `GAMES` y `Game` de `lib/data.ts` (SPEC 01).

Los datos de "Actividad en vivo" (7 puntuaciones recientes) y "Top jugadores" (5 filas) son constantes locales del componente del Inicio, tomadas de `home.jsx`. No se mueven a `lib/data.ts` porque son decorativas y se reemplazarán por datos reales en otra spec.

Convenciones:

- Números con `toLocaleString("es-ES")`, como en SPEC 01.
- Sin `Math.random` ni `localStorage` en el render.

## Plan de implementación

1. Crear `app/games/page.tsx` copiando el contenido actual de `app/page.tsx` (la Biblioteca). Verificación: `/games` se ve igual que el `/` actual; `/` sigue funcionando sin cambios.
2. Actualizar `components/nav.tsx`: añadir "Inicio" → `/`, apuntar "Biblioteca" a `/games` y ajustar `isActive` (Inicio solo en `/`; Biblioteca en `/games` y `/juego/*`). Hacerlo en la barra y en el panel móvil. Verificación: ambos enlaces navegan y la marca activa es correcta en `/` y `/games`.
3. Cambiar a `/games` los enlaces de vuelta: `app/juego/[id]/page.tsx`, `components/game-player.tsx` y `components/hall-of-fame.tsx`. Verificación: desde el detalle y el reproductor se vuelve a `/games`.
4. Portar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` de `styles.css`, sin tocar los estilos existentes. Verificación: `npm run lint` y `npm run dev` sin errores; la app no cambia visualmente.
5. Crear los componentes del Inicio en `components/home/`: `floating-silhouettes.tsx`, `feature-icon.tsx`, `mini-card.tsx` (enlace a `/juego/[id]`) y `reveal.tsx` (client component que añade la clase `in` con `IntersectionObserver`). Verificación: `npm run lint` pasa.
6. Reemplazar `app/page.tsx` por el Inicio, con las 7 secciones de `home.jsx` y los enlaces definidos en el alcance, usando los componentes del paso 5. Verificación: `/` muestra todas las secciones y los CTAs navegan a `/games`, `/auth`, `/salon` y `/juego/<id>`.
7. Revisar `/`, `/games`, `/juego/caida`, `/salon` y `/auth` en escritorio y ancho móvil, y confirmar que `npm run build` compila.

Cada paso deja la app ejecutable y es commiteable por separado. Consultar `node_modules/next/dist/docs/` antes de escribir las páginas, según `AGENTS.md`. La interfaz se diseña siguiendo la plantilla, con `/frontend-design` según `CLAUDE.md`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra el hero con el título "EL ARCADE CLÁSICO ESTÁ DE VUELTA" y las secciones 01 a 04 de la plantilla, las stats y el CTA final "¿LISTO PARA JUGAR?".
- [ ] `/` no contiene ninguna sección, enlace ni texto de "Acerca de", y no existe la ruta `/about`.
- [ ] "Juegos disponibles ahora" muestra 6 mini-tarjetas; clic en una navega a `/juego/<id>` del juego correcto.
- [ ] "VER TODOS LOS JUEGOS →" navega a `/games`.
- [ ] "EXPLORAR JUEGOS" e "INSERTAR MONEDA →" navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`; "VER SALÓN →" navega a `/salon`.
- [ ] `/games` muestra el hero "ARCADE VAULT", buscador, chips y las 8 tarjetas de juego, igual que el `/` anterior.
- [ ] El `Nav` tiene Inicio, Biblioteca y Salón de la Fama (barra y panel móvil), sin "Acerca de".
- [ ] Inicio está activo solo en `/`; Biblioteca está activa en `/games` y `/juego/*`, y no en `/`.
- [ ] El botón "volver" del detalle, VOLVER AL VAULT del reproductor y el botón de `/salon` navegan a `/games`.
- [ ] El logo del `Nav` navega a `/`.
- [ ] A ancho móvil, `/` no tiene scroll horizontal y el panel móvil abre/cierra.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/` ni `/games`.
- [ ] Ninguna ruta usa `localStorage` ni `Math.random` en el render.

## Decisiones

- **Sí:** `/games` en inglés, tal como pidió el usuario, aunque el resto de URLs están en español (`/juego`, `/salon`). Es una decisión cerrada; no se renombran las demás.
- **Sí:** Nav con Inicio / Biblioteca / Salón. Es la estructura de la plantilla sin Acerca de. **No:** renombrar Biblioteca a "Juegos"; se mantiene el nombre de la plantilla.
- **Sí:** los enlaces "volver a la biblioteca" van a `/games`. El usuario que viene de la galería no pierde contexto. **No:** dejarlos en `/`, que ahora es la landing.
- **Sí:** incluir todas las secciones de `home.jsx`, incluidas Precios y FAQ. El usuario pidió excluir solo Acerca de.
- **Sí:** contenido de actividad, top y stats como mock fijo, como en SPEC 01. **No:** simular actividad en vivo con timers o aleatoriedad.
- **Sí:** mantener la animación `reveal` con un client component pequeño. Es puramente visual y fiel a la plantilla. **No:** convertir todo el Inicio en client component; el resto se renderiza en servidor.
- **Sí:** mover `app/page.tsx` actual a `app/games/page.tsx` sin cambios de contenido. **No:** activar el buscador y los chips aquí; eso va en su propia spec.
- **Sí:** portar solo los bloques de CSS que usa el Inicio. **No:** copiar `ABOUT PAGE`, `GAMEPAD` ni `Theme variants`, que no se usan.

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Enlaces antiguos a `/` como biblioteca quedan sin migrar                     | Paso 3 y criterios de aceptación listan cada enlace; buscar `href="/"` en `app/` y `components/`.       |
| Clases CSS del Inicio chocan con las ya portadas en `globals.css`            | Portar solo los bloques `HOME PAGE`, `ACTIVITY` y `PRICING` y revisar nombres duplicados antes de pegar. |
| `reveal` deja secciones invisibles si el observer falla o JS no carga        | Probar con scroll en `/` y confirmar que todas las secciones pasan a `in`.                              |
| Hidratación: fechas o números distintos entre servidor y cliente             | Datos constantes y `toLocaleString("es-ES")` fijo; criterio de aceptación en consola.                   |

## Qué **no** está en esta spec

- Página "Acerca de" y su enlace en el Nav.
- Búsqueda y filtros funcionales en `/games`.
- Datos reales de actividad, ranking, stats o planes.
- Autenticación, sesión o créditos reales.
- Renombrar las URLs en español existentes.
- Tests automatizados.

Cada una de estas cosas, si se aborda, va en su propia spec.
