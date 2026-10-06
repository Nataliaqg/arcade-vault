---
name: audit-notes
description: Falsos positivos y hallazgos BAJA conocidos de security-guard en Arcade Vault (grants por defecto de Supabase, getOrigin, enumeración en signUp)
metadata:
  type: project
---

Falsos positivos / contexto a no re-reportar como nuevo:
- `has_table_privilege` devuelve true para UPDATE/DELETE/TRUNCATE en las 3 tablas: son los grants por defecto de Supabase; RLS (sin políticas UPDATE/DELETE) los bloquea. Se reporta solo como BAJA B1 (defensa en profundidad), no como regresión.
- Event triggers `issue_*`, `pgrst_*` y triggers de `storage.*`/`realtime.*` son de la plataforma.
- `unused_index scores_user_id_idx` (INFO): esperable mientras no haya scores con `user_id`.
- `.env.template` está ignorado por `.gitignore` (`.env*`) y solo tiene placeholders.
- `/auth/reset` page redirige a `/auth/forgot` y el proxy a `/auth`: inconsistencia sin impacto.

Hallazgos BAJA abiertos desde 2026-10-06 (seguir su estado): B1 grants/default privileges, A1 `getOrigin()` por cabeceras (contenido por allow-list de Redirect URLs del panel), A2 `signUp` revela emails existentes, A3 `provider` sin validar en runtime.

**Why:** evitar repetir análisis y distinguir regresiones reales de lo ya conocido.
**How to apply:** en la próxima auditoría, compara contra esta lista; si alguno se cierra o el usuario lo acepta, muévelo a riesgos aceptados en MEMORY.md.

Panel de Supabase: sin confirmación del usuario registrada (2026-10-06). Si el usuario confirma, anota aquí la fecha.
