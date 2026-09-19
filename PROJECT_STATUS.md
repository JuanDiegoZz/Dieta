# Project Status

## Macrofase actual

**Macrofase C — Despensa + recomendaciones + planificación + CRUD** está implementada en código. La Macrofase B fue validada con Supabase real y la Macrofase A permanece aprobada.

## Completado

- Documentación y fuentes recibidas: `00_contexto/`–`12_fuentes_dieta/`. `DietaCompleta.docx` fue analizada sin modificar documentos originales.
- Parser reproducible DOCX basado en XML directo con JSZip; `pnpm diet:parse`, `pnpm diet:validate` y `pnpm diet:import`.
- Provenance, cantidades originales, medidas domésticas, texto fuente, aliases conservadores y warnings.
- Migración `supabase/migrations/001_initial.sql`, seed idempotente y `SUPABASE_SETUP.md`.
- BFF server-side: `/api/bootstrap`, `/api/preferences/:id`, `/api/history` y `/api/history/:id`. El navegador no recibe claves Supabase ni usa `supabase-js`.
- Hoy, Explorar, detalle, Modo Cocina, Favoritos e Historial usan el catálogo real generado; preferencias e historial tienen actualización optimista y rollback.
- Cache de sesión/memoria y fallback generado `public/catalog.json`. Las escrituras offline todavía no se encolan.

## Macrofase C completada

- Migración aditiva `supabase/migrations/002_macrofase_c.sql` con `pantry_items`, `app_settings`, `weekly_plans`, `weekly_plan_entries` y `meal_options.edited`.
- Despensa persistente con búsqueda por canonical name y aliases, `Tengo`, `No tengo` y `Usar pronto`.
- Compatibilidad ponderada por importancia; faltantes visibles en cards y detalle.
- Motor determinista de recomendaciones, filtros combinables, configuración local de no repetir y “No sé qué comer”.
- Semana persistente con cinco franjas diarias, regeneración, cambio, limpieza y bloqueo.
- Lista del súper agrupada por categoría; suma solo unidades compatibles y permite marcar comprado para actualizar despensa.
- Administración para crear, editar, duplicar, desactivar/reactivar opciones y modificar componentes/ingredientes sin perder provenance.

## Estadísticas reales de `DietaCompleta.docx`

| Métrica | Resultado |
| --- | ---: |
| Planes diarios | 55 |
| MealOptions | 276 |
| Despertar / Desayuno / Medio día / Comida / Media tarde / Cena | 3 / 55 / 55 / 54 / 54 / 55 |
| DishComponents | 312 |
| DishIngredients | 1,367 |
| Ingredientes únicos | 323 |
| Aliases | 25 |
| Notas | 50 |
| Duplicados potenciales | 16 |
| Warnings | 6 |

Warnings reales: 1 cantidad principal no interpretada, 2 medidas domésticas ambiguas/no interpretadas, 2 cantidades aproximadas y 1 cantidad declarada como no especificada; el texto original se conserva y no se inventan valores.

## Verificación

- `pnpm lint`: pasa.
- `pnpm typecheck`: pasa, incluyendo `api/` y `scripts/`.
- `pnpm test`: pasa, 5 archivos / 13 tests.
- `pnpm build`: pasa. Moderno: 77.87 kB gzip JS + 4.43 kB gzip CSS; legacy: 81.19 kB gzip JS + 4.43 kB gzip CSS. Polyfills: 29.08 kB moderno y 26.48 kB legacy gzip.

## Pendiente manual

La lista remota confirma que `supabase/migrations/002_macrofase_c.sql` ya está aplicada. No es necesario ejecutar `db push` para esta corrección. Falta validar físicamente Semana, Despensa y Administrar en el iPad Air real con Safari iOS 12.5.8.

## Verificación C

La verificación de Macrofase C incluye tests de compatibilidad, aliases, recomendaciones, no repetir, planificación, bloqueos, agregación de compras, normalización y validación CRUD.

- `pnpm lint`: pasa.
- `pnpm typecheck`: pasa.
- `pnpm test`: pasa, 9 archivos / 21 tests.
- `pnpm build`: pasa. JS moderno inicial: 80.71 kB gzip; JS legacy inicial: 84.67 kB gzip; CSS: 5.54 kB gzip. Chunks lazy: Semana 2.84 kB gzip moderno / 2.86 kB legacy; Administrar 2.50 kB moderno / 2.51 kB legacy.

## Siguiente macrofase

Macrofase D: optimización, IndexedDB, auditoría física iPad legacy y pulido final. No se inicia automáticamente.

## Auditoría de reparación de dieta — dry-run

`12_fuentes_dieta/dieta.docx` queda documentado como la fuente principal actual. La primera etapa de reparación está limitada a parser, comparación y dry-run; no se ejecutó ninguna escritura en Supabase ni se modificaron datos personales.

- Fuente corregida: 55 planes, 276 MealOptions, 314 componentes, 1,358 relaciones, 323 ingredientes únicos y 50 notas.
- Cobertura: 276/276 MealOptions con ingredientes; 0 sin franja; 0 líneas no clasificadas; 0 ingredientes huérfanos.
- Advertencias restantes: 3, todas explícitas: 2 cantidades aproximadas y 1 cantidad no especificada.
- Comparación read-only: 266 coincidencias exactas y 10 MealOptions con diferencias; 0 ambiguas, 0 nuevas y 0 actuales sin encontrar.
- El dry-run propone 9 eliminaciones de relaciones, 7 cambios de cantidad y 5 cambios de componentes. No propone borrar MealOptions ni tocar tablas personales.
- Reportes: `scripts/import-output/diet-repair-dry-run.json` y `.txt`.
## Corrección de integración de Macrofase C

Completada la corrección del entorno local y UX de listados:

- `pnpm dev` ejecuta Vite y el BFF local en un único proceso mediante `scripts/dev.ts`; `pnpm dev:vite` queda solo para trabajo visual.
- El adaptador carga `.env.local` exclusivamente server-side y enruta los handlers reales de `api/` sin mocks.
- `pnpm smoke:api` valida `GET /api/bootstrap`, `GET /api/weekly` y que PATCH/POST inválidos lleguen a sus handlers sin 404 ni escrituras reales.
- El fallback `public/catalog.json` es de solo lectura; el indicador `API`/`Cache`/`Fallback local` solo aparece en development y las mutaciones fallidas hacen rollback con feedback visible.
- Explorar pagina 12 resultados después de búsqueda, filtros y ranking. Favoritos, Historial, Administrar y Despensa también limitan sus listas; Hoy y Semana permanecen resumidos.
- Se mantienen la arquitectura, el modelo, Supabase, el importador y la compatibilidad legacy; no se inicia Macrofase D.

La migración remota `002_macrofase_c.sql` ya está aplicada y sincronizada; no se ejecutó `db push` durante esta auditoría.
## Verificación final de esta corrección

- `pnpm lint`: pasa.
- `pnpm typecheck`: pasa.
- `pnpm test`: pasa, 10 archivos / 24 tests.
- `pnpm build`: pasa. JS moderno inicial: 81.64 kB gzip; JS legacy inicial: 85.70 kB gzip; CSS: 5.74 kB gzip. Chunks lazy: Semana 2.84 kB gzip moderno / 2.86 kB legacy; Administrar 2.61 kB gzip moderno / 2.63 kB legacy.
- `pnpm smoke:api`: pasa con `GET /api/bootstrap` y `GET /api/weekly` en 200; PATCH/POST de validación en 400, sin 404 ni escrituras.
- No se añadieron dependencias de runtime ni `supabase-js` al frontend.

## Stabilization / end-to-end integration pass

- Causa del `401` de `meal_history`: el helper enviaba `SUPABASE_SECRET_KEY` (`sb_secret_...`, no JWT) también como `Authorization: Bearer`. Ahora la clave nueva se envía únicamente como `apikey`; Bearer queda solo para el fallback legacy `SUPABASE_SERVICE_ROLE_KEY`.
- Se mantiene una única implementación REST en `api/_lib/supabase.ts`, reutilizada por el BFF y el importador.
- Preferencias y despensa usan upsert por `meal_option_id`/`ingredient_id`; funcionan aunque la fila no exista. La validación UUID acepta el formato PostgreSQL completo sin imponer bits RFC que rechazaban algunas opciones importadas.
- `pnpm verify` ejecuta lint, typecheck, tests, build, lectura real de las 12 tablas, BFF y escrituras E2E con limpieza: favoritos 10/10, despensa, historial, semana y supervivencia ante errores de handler/proveedor.
- `pnpm dlx supabase migration list --linked` confirma `001` y `002` aplicadas remotamente y sincronizadas. No fue necesaria una migración `003`; no se ejecutó `db push` automáticamente.

### Resultado comprobado

Las tablas `daily_plans`, `meal_options`, `dish_components`, `ingredients`, `ingredient_aliases`, `dish_ingredients`, `meal_preferences`, `meal_history`, `pantry_items`, `app_settings`, `weekly_plans` y `weekly_plan_entries` respondieron `PASS`. `GET /api/bootstrap`, preferencias, despensa, historial y semana también respondieron `PASS` contra Supabase real.

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 12 archivos / 28 tests.
- `pnpm build`: PASS. JS moderno inicial 81.64 kB gzip; legacy 85.70 kB gzip; CSS 5.74 kB gzip.
- Servidor local: PASS; un 500 de handler y un 502 del proveedor no terminan `pnpm dev`.
## Corrección Supabase Secret Key

Corregido el `401` del BFF local: `sb_secret_...` ya no se envía como Bearer. La request REST directa y `GET /api/bootstrap` fueron comprobados con `200`; el bootstrap devuelve los 276 `MealOptions` y 323 ingredientes reales. El importador y todos los handlers REST comparten la misma construcción segura de headers. `.env.local` se carga antes de importar dinámicamente los handlers; ninguna secret llega al navegador, respuesta o log.

## Macrofase D — estabilización y producción

Implementado:

- Cache persistente de bootstrap con IndexedDB nativo, fallback a sessionStorage/memoria y estrategia stale-while-revalidate.
- Versionado estable de catálogo/estado y ETag; `304` evita descargar nuevamente un bootstrap sin cambios.
- Lecturas REST paginadas en el helper común para conservar los 1,367 `dish_ingredients` completos.
- Offline de lectura para catálogo, búsqueda, detalle y Modo Cocina. Las escrituras se bloquean sin conexión y muestran feedback visible.
- `GET /api/health` confirma API y Supabase sin exponer información sensible.
- Detección legacy por capacidades, reducción de efectos, fallbacks de scroll, targets táctiles y mejoras de overflow responsive.
- Hoy limita el render inicial a seis cards; búsqueda usa índice normalizado memoizado; el ranking calcula cada score una sola vez.
- `README.md`, `IPAD_LEGACY_TEST.md`, configuración Vercel y reglas permanentes actualizadas.

Medición de datos: bootstrap BFF completo con 276 comidas, 312 componentes y 1,367 relaciones pesa 660,670 bytes sin comprimir, aproximadamente 113,557 bytes gzip y 68,324 bytes Brotli. La versión anterior estaba truncada a 1,000 relaciones; la comparación correcta es contra el catálogo completo.

## Verificación Macrofase D

- `pnpm verify`: PASS.
- 13 archivos de prueba / 30 tests PASS, incluyendo cache, headers, paginación REST, búsqueda y relaciones completas del catálogo.
- `GET /api/health`: PASS.
- Bootstrap ETag/304: PASS.
- Build previo a la última paginación: JS moderno 82.82 kB gzip, legacy 87.03 kB gzip, CSS 6.02 kB gzip; la validación final debe volver a registrar las cifras después de cualquier ajuste posterior.

Pendiente únicamente la prueba física en el iPad Air iOS 12.5.8 siguiendo `IPAD_LEGACY_TEST.md`. No se inició otra macrofase.

## Incidencia de produccion posterior al deployment

Detectada en `https://dieta-coral.vercel.app`: `/api/bootstrap`, `/api/weekly` y en ocasiones `/api/health` quedaban en estado `Pending`, dejando la pantalla inicial en skeletons.

Correccion preparada en codigo:

- Timeout central de Supabase de 8 segundos con `AbortController` y carrera explicita contra timeout.
- Timeout de health de 4 segundos, con respuesta `503 { status: "degraded", database: "timeout" }`.
- Bootstrap con consultas independientes en paralelo e instrumentacion por etapas.
- Weekly y health instrumentados con logs sanitizados.
- Paginacion REST limitada a 100 paginas, con avance por offset y terminacion por pagina corta/vacia/error/timeout.
- Cliente con timeout de API, cache stale-while-revalidate, fallback `public/catalog.json` y aviso de datos guardados.
- Tests de timeout, health degradado, bootstrap/weekly colgados, paginacion y fallback.

La correccion fue validada localmente con `pnpm verify`; falta hacer push y redeploy para comprobar los Runtime Logs de Vercel.

## Cierre final de Macrofase D

La estabilización, cache de lectura, auditoría legacy y preparación de producción están completas. Esta sección supersede los estados históricos anteriores de este documento.

- `pnpm verify`: **VERIFY PASS**.
- `pnpm build`: **PASS**.
- `pnpm lint`: **PASS**.
- `pnpm typecheck`: **PASS**.
- `pnpm test`: **PASS**, 13 archivos / 30 tests.
- E2E real: conectividad de las 12 tablas, bootstrap completo, ETag/304, favoritos 10/10, despensa, historial, semana y supervivencia ante errores del handler/proveedor: **PASS**.
- Build final: JS moderno inicial 82.84 kB gzip; JS legacy inicial 87.05 kB gzip; CSS 6.02 kB gzip. Chunks lazy: Semana 2.84 kB moderno / 2.86 kB legacy; Administrar 2.61 kB moderno / 2.63 kB legacy.
- `GET /api/health`: **PASS**; no expone secretos.
- Migraciones remotas 001 y 002: aplicadas y sincronizadas; no hay `db push` pendiente.
- El único paso externo pendiente es probar físicamente el iPad Air con `IPAD_LEGACY_TEST.md` y ejecutar un smoke test posterior al despliegue de Vercel.
