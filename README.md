## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Configuración de Supabase

1. Copia `.env.example` a `.env.local`.
2. Rellena las variables con los datos de tu proyecto (Project Settings → API Keys en el dashboard de Supabase):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

3. Arranca la app con `npm run dev` y comprueba la conexión en `http://localhost:3000/api/health/supabase`. Si todo va bien responde `{"status":"ok"}`; si no, responde `500` con `{"status":"error", ...}`.

Los clientes están en `lib/supabase/client.ts` (navegador) y `lib/supabase/server.ts` (servidor).

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```