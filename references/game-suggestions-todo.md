# Sugerencias de juegos (game-planner)

Lista mantenida por el agente `game-planner` (`.claude/agents/game-planner.md`). Cada sugerencia se convierte en spec con `/add-game` y se implementa con `/spec-impl`.

## Pendientes

- [ ] **pong** (VERSUS/cyan) — Duelo de palas contra una IA con dificultad creciente; la bola acelera en cada rebote y el score premia victorias y rallies largos. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Pong clásico contra la CPU, categoría VERSUS, color cyan"` (RECOMENDADO)
- [ ] **tron** (VERSUS/magenta) — Motos de luz contra una IA: deja estela, encierra al rival sin chocar; el score sube por rivales derrotados y tiempo vivo. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Tron light cycles contra la CPU, categoría VERSUS, color magenta"`
- [ ] **space-invaders** (SHOOTER/green) — Oleadas de invasores que descienden; dispara desde la base y usa los búnkeres. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Space Invaders con oleadas y búnkeres, categoría SHOOTER, color green"`

### ARCADE

- [ ] **sky-hopper** (ARCADE/cyan) — Personaje que rebota solo y sube por plataformas con wrap lateral; score = altura. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Sky Hopper estilo Doodle Jump, categoría ARCADE, color cyan"`
- [ ] **frogger** (ARCADE/green) — Cruza carriles de tráfico y un río hasta llenar 5 nidos con reloj por intento. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Frogger con tráfico, río y nidos, categoría ARCADE, color green"`
- [ ] **maze-chomper** (ARCADE/yellow) — Laberinto con puntos, fantasmas y píldoras de poder; nombre y arte propios por riesgo de marca. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Maze Chomper laberinto con fantasmas, categoría ARCADE, color yellow"`
- [ ] **bomber-maze** (ARCADE/cyan) — Bombas en laberinto de bloques destructibles contra enemigos errantes. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Bomber Maze estilo Bomberman, categoría ARCADE, color cyan"`

### PUZZLE

- [ ] **merge-2048** (PUZZLE/cyan) — Desliza fichas numeradas y fusiona iguales; score = suma de fusiones. Sugerido: 2026-10-05. Siguiente paso: `/add-game "2048 con fusiones de fichas, categoría PUZZLE, color cyan"`
- [ ] **columns** (PUZZLE/magenta) — Columnas de 3 gemas que se alinean con cascadas de combos. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Columns de gemas con cascadas, categoría PUZZLE, color magenta"`
- [ ] **buscaminas** (PUZZLE/yellow) — Cuadrícula de minas con cursor por teclado, 3 vidas y tableros crecientes. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Buscaminas con teclado, categoría PUZZLE, color yellow"`
- [ ] **lights-out** (PUZZLE/yellow) — Rejilla 5×5 de luces que se apagan con pocos movimientos y tiempo limitado (valorar mover a otro color). Sugerido: 2026-10-05. Siguiente paso: `/add-game "Lights Out 5x5 contrarreloj, categoría PUZZLE, color yellow"`
- [ ] **sokoban** (PUZZLE/green) — Empuja cajas a objetivos; exige diseñar niveles y el score tiene techo bajo (menos prioritario). Sugerido: 2026-10-05. Siguiente paso: `/add-game "Sokoban con deshacer, categoría PUZZLE, color green"`

### SHOOTER

- [ ] **centipede** (SHOOTER/magenta) — Ciempiés segmentado que baja entre setas y se parte al disparar (absorbe a `crawler-zone`). Sugerido: 2026-10-05. Siguiente paso: `/add-game "Centipede con setas y ciempiés segmentado, categoría SHOOTER, color magenta"`
- [ ] **missile-command** (SHOOTER/yellow) — Contramisiles con cursor de teclado para defender 6 ciudades; el más original. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Missile Command defendiendo ciudades, categoría SHOOTER, color yellow"`
- [ ] **galaga-lite** (SHOOTER/magenta) — Enjambres en formaciones curvas con picados; solapa con space-invaders. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Galaga-lite con formaciones y picados, categoría SHOOTER, color magenta"`
- [ ] **scramble-lite** (SHOOTER/yellow) — Scroll horizontal automático con terreno, bombas y combustible. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Scramble-lite scroll horizontal con combustible, categoría SHOOTER, color yellow"`
- [ ] **defender-lite** (SHOOTER/green) — Scroll en mundo envolvente protegiendo humanoides; el más caro de implementar. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Defender-lite con humanoides, categoría SHOOTER, color green"`

### VERSUS

- [ ] **air-hockey** (VERSUS/cyan) — Mazo 2D contra IA, gana quien marca 7; solapa con pong. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Air Hockey contra la CPU, categoría VERSUS, color cyan"`
- [ ] **tank-duel** (VERSUS/magenta) — Duelo de tanques en laberinto con balas que rebotan. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Tank Duel en laberinto contra la CPU, categoría VERSUS, color magenta"`
- [ ] **boxing-ring** (VERSUS/green) — Boxeo cenital 1 contra 1 con golpes y guardia; el más distinto de pong. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Boxing Ring contra la CPU, categoría VERSUS, color green"`
- [ ] **artillery-duel** (VERSUS/yellow) — Duelo por turnos con ángulo, potencia, viento y terreno destructible; el más caro. Sugerido: 2026-10-05. Siguiente paso: `/add-game "Artillery Duel por turnos, categoría VERSUS, color yellow"`
- [ ] **connect-four** (VERSUS/cyan) — 4 en raya contra IA minimax; el más barato pero el menos arcade (valorar color yellow). Sugerido: 2026-10-05. Siguiente paso: `/add-game "Cuatro en Raya contra la CPU, categoría VERSUS, color yellow"`

## En spec / implementados

- [x] **asteroids** (SHOOTER/cyan) — spec 04, implementado.
- [x] **tetris** (PUZZLE/green) — spec 06, implementado.
- [x] **arkanoid** (ARCADE/magenta) — spec 07, implementado.
- [x] **snake** (ARCADE/yellow) — spec 08, implementado.

## Descartados
