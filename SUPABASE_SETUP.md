# Supabase setup

Esta fase no usa autenticación, usuarios ni RLS basada en identidad. El proyecto representa una sola instalación personal; la privacidad depende del deployment de Vercel. Cualquier persona con acceso efectivo a una URL pública podría llamar al BFF.

## Configuración

1. Crea un proyecto de Supabase y copia el Project URL y la secret/service-role key.
2. Crea `.env.local` a partir de `.env.example`:

   ```text
   # Solo la URL base; no agregues /rest/v1/
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

3. Ejecuta `supabase/migrations/001_initial.sql` desde el SQL Editor o mediante Supabase CLI.
4. Para Macrofase C, ejecuta después `supabase/migrations/002_macrofase_c.sql`. Es aditiva y no vuelve a importar ni borra los datos existentes.
5. Genera el resultado revisable:

   ```bash
   pnpm diet:parse
   pnpm diet:validate
   ```

6. Revisa `scripts/import-output/import-report.json`, `warnings.json` y `validation-report.json`.
7. Importa explícitamente cuando el reporte esté aprobado:

   ```bash
   pnpm diet:import
   ```

   El comando carga `.env.local` automáticamente mediante `tsx --env-file=.env.local`, usa upserts por `source_key`/IDs deterministas y no borra registros. `pnpm diet:import -- --dry-run` solo muestra el tamaño del seed.

`SUPABASE_URL` debe ser únicamente la URL base del proyecto, con este formato:

```text
https://<project-ref>.supabase.co
```

No incluyas `/rest/v1/`: el importador y el BFF agregan esa ruta internamente.

`SUPABASE_SECRET_KEY` es la credencial principal para scripts controlados y Vercel Functions. Nunca debe tener prefijo `VITE_`, aparecer en `public/`, entrar en respuestas API o llegar al navegador. Durante la transición, el código acepta `SUPABASE_SERVICE_ROLE_KEY` como fallback legacy si `SUPABASE_SECRET_KEY` no está definida; no la uses en configuraciones nuevas.
## Administrar v2

Después de revisar el schema, aplica `supabase/migrations/003_admin_v2.sql` después de `001` y `002`. La migración define las RPCs transaccionales de administración y no modifica datos existentes por sí sola. Usa `db push --dry-run` antes de aplicarla.

Administrar usa `admin_save_meal`, `admin_update_ingredient`, `admin_merge_ingredients` y `admin_delete_meal` mediante el BFF. La importación de backup solo valida el JSON y muestra un resumen; no escribe en DB.

## Desarrollo local completo

El comando normal levanta Vite y los mismos handlers `api/*.ts` en un único proceso:

```bash
pnpm dev
```

Abre `http://localhost:5173`. El adaptador local carga `.env.local` server-side y atiende `/api/*` sin exponer `SUPABASE_SECRET_KEY`. `pnpm dev:vite` queda reservado para trabajo visual aislado; en ese modo las rutas `/api` no están disponibles.

Para comprobar el BFF sin modificar datos:

```bash
pnpm smoke:api
```

El fallback `public/catalog.json` solo sirve lecturas. Cuando aparece `Data source: Fallback local` en desarrollo, favoritos, despensa, historial, semana y CRUD hacen rollback y muestran que la API no está disponible; nunca simulan persistencia. El indicador no se renderiza en producción.

## Migración 002

No se ejecuta automáticamente desde este repositorio. En el proyecto remoto usado por esta validación, `001`, `002` y `003_admin_v2.sql` ya aparecen aplicadas y sincronizadas. Para otro proyecto, revisa primero el estado:

```bash
pnpm dlx supabase db push --dry-run
pnpm dlx supabase db push
```

Si `002` falta en otro proyecto, revisa el SQL y ejecuta `db push` solo después del `--dry-run`. La aplicación requiere `002` para despensa, semana y CRUD.
## Headers de la Data API

Con `SUPABASE_SECRET_KEY` (`sb_secret_...`), el BFF y el importador envían la clave únicamente como `apikey`. No se envía `Authorization: Bearer` porque la secret key no es un JWT. El fallback temporal `SUPABASE_SERVICE_ROLE_KEY` conserva Bearer solo cuando la variable nueva no existe.

## Verificación end-to-end

`pnpm verify` ejecuta la calidad local y pruebas reales contra Supabase. Comprueba el acceso de las 12 tablas, bootstrap, preferencias, despensa, historial y semana con payloads válidos; limpia los registros temporales al terminar. No usa `public/catalog.json` como sustituto de Supabase.

La migración remota se comprobó con:

```bash
pnpm dlx supabase migration list --linked
```

El proyecto remoto tiene `001`, `002` y `003_admin_v2.sql` aplicadas y sincronizadas. Si se modifica el esquema en el futuro, revisar primero con `pnpm dlx supabase db push --dry-run`.
