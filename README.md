# Dieta personal

Asistente privado para decidir qué comer usando la dieta real, despensa, historial y preferencias. No tiene login ni usuarios: el BFF mantiene las credenciales de Supabase exclusivamente server-side.

## Desarrollo

```bash
pnpm install
pnpm dev
```

`pnpm dev` levanta Vite y las funciones `/api` en el mismo proceso. Usa `.env.local` con `SUPABASE_URL` (URL base, sin `/rest/v1/`) y `SUPABASE_SECRET_KEY`. `pnpm dev:vite` es solo para trabajo visual y no tiene persistencia.

## Verificación

```bash
pnpm verify
```

Ejecuta lint, typecheck, tests, build, health check, acceso real a Supabase y pruebas E2E con limpieza.

## Dieta

```bash
pnpm diet:parse
pnpm diet:validate
pnpm diet:import
```

El importador es reproducible y no modifica Supabase al parsear o validar.

## Build y producción

```bash
pnpm build
```

En Vercel selecciona este repositorio, configura `SUPABASE_URL` y `SUPABASE_SECRET_KEY` como variables server-side y despliega. El build produce `dist`; las rutas `api/` se sirven como Functions y el SPA conserva sus rutas de hash. No uses `VITE_` para secretos.

El deployment no tiene autenticación de aplicación. Cualquier persona que conozca una URL pública podría llamar al BFF; usa un deployment privado o controles de acceso de Vercel si esa exposición no es aceptable.
