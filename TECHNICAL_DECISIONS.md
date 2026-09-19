# Technical Decisions

## 1. Producto y navegación

La unidad de valor es decidir qué comer a partir de la dieta real, la franja, la despensa, el historial y las preferencias. No se construirá una biblioteca genérica de recetas ni se usará IA para inventar platos en V1.

La hora se implementará como una función de sugerencia configurable: selecciona inicialmente una franja, modifica saludo y recomendaciones, pero nunca filtra las cinco franjas principales. `Al despertar` se conserva como slot de datos, no necesariamente como tab principal.

## 2. Fuente y provenance

`dieta.docx` es ahora la fuente canónica de importación. `DietaCompleta.docx` y los DOCX separados permiten comparar franjas y detectar pérdidas; `Dieta.pdf` se usa para revisión visual y no como parser primario. El importador debe guardar fuente, bloque diario, posición, hash y texto original para poder rastrear cualquier dato hasta el documento.

La fuente real contiene 55 bloques diarios, múltiples opciones con más de un plato, encabezados `Acompañamiento`, bebidas dentro de comidas, notas de preparación, opcionales y líneas fusionadas por formato. Por ello no se debe asumir que cada franja tiene exactamente un título y que cada párrafo es un ingrediente.

## 3. Modelo de dominio

Se conserva la jerarquía solicitada:

```text
SourceMenu -> MealOption -> DishComponent -> DishIngredient
```

`SourceMenu` es necesario porque el documento organiza alternativas como bloques diarios; el `source_index` aislado de la propuesta original no permite reconstruir esa procedencia con suficiente claridad.

`MealOption` representa la elección completa de una franja. Sus componentes pueden ser plato principal, ensalada, acompañamiento, bebida, vinagreta o fruta. Cuando el documento no etiqueta un componente, se conserva un `source_label` vacío y se muestra un nombre de presentación derivado solo en la UI; no se escribe una etiqueta inventada en los datos fuente.

## 4. Fidelidad de ingredientes

Se conservarán simultáneamente:

- cantidad y unidad principal, sin cambiar gramos/ml;
- medida doméstica como texto separado;
- marca, preparación y variante en `original_text`;
- nombre canónico, aliases y relación opcional de agrupación para búsqueda.

`Yogurt griego`, `Yogur griego`, `Yogur griego OIKOS` y `Yogur griego alto en proteína` no deben fusionarse silenciosamente. Una agrupación sirve para buscar o recomendar, no para alterar el plan ni sumar inventario. Cantidades ausentes, “aproximadamente”, unidades extrañas y textos dudosos producen warnings y quedan revisables.

## 5. Separación de catálogo y estado personal

El esquema inicial mezcla `favorite` en `meal_options` con `meal_preferences`. Se decide que el catálogo contiene la dieta y su `active` administrativo; favoritos, rating, ocultamiento, historial, pantry y “No quiero esto hoy” son estado del usuario. El último necesita `dismissed_until`, no `hidden`, porque es una acción temporal.

El esquema inicial tampoco incluye `weekly_plans` ni sus celdas bloqueadas. Se añadirán `weekly_plans` y `weekly_plan_items` con fecha, franja, opción, posición, `locked` y estado. La lista del súper será una vista derivada, no otra copia editable de ingredientes.

## 6. API y Supabase sin autenticacion de aplicacion

Se mantiene la arquitectura:

```text
Vite + React + TypeScript -> Vercel Functions / BFF -> Supabase
```

La ausencia de login es consciente: esta es una aplicacion personal, privada y de un solo usuario real. No habra usuarios, roles, registro, recuperacion, sesiones, JWT, cookies de sesion ni RLS basada en identidad. El BFF es la unica frontera de datos.

### Flujo server-side

1. El navegador usa `fetch` contra endpoints propios del mismo deployment.
2. Cada Function valida metodo, cuerpo, IDs, limites y operaciones permitidas.
3. La Function lee `SUPABASE_URL` y `SUPABASE_SECRET_KEY` desde variables de entorno runtime de Vercel.
4. La Function llama a Supabase con `fetch` server-side o con un cliente Supabase que nunca se incluya en el bundle del navegador.
5. La respuesta se transforma a DTO compacto; claves privadas, SQL, stack traces y errores internos nunca salen de la Function.

El esquema no depende de `auth.uid()` ni de `user_id`. Las tablas de preferencias, historial, despensa y plan semanal representan el estado de esta unica instalacion.

### Endpoints

No existen rutas protegidas por usuario. El BFF expone solo las operaciones necesarias: bootstrap, busqueda opcional, historial, preferencias, despensa, planificacion y CRUD. Todas validan payloads aunque no haya login. El acceso privado depende del deployment de Vercel: si una URL publica queda accesible, cualquiera que la conozca podria llamar al BFF. Si eso no es aceptable, se debe usar proteccion de proyecto/deployment de Vercel o mantener el deployment privado; no se agregara un login dentro de la app.

### Credenciales y secret key

El navegador nunca recibe `service_role`, una Supabase secret key ni ninguna credencial privada. No se usaran nombres `VITE_SUPABASE_*` para secretos, porque Vite los puede incorporar al bundle.

Las Vercel Functions y el importador controlado usan `SUPABASE_SECRET_KEY`, que permanece exclusivamente server-side y no se usa como identidad de navegador. Por compatibilidad temporal, `SUPABASE_SERVICE_ROLE_KEY` se acepta como fallback si la variable nueva no existe; las configuraciones nuevas deben usar siempre `SUPABASE_SECRET_KEY`. Nunca se crea un endpoint público que devuelva esta clave.

### Safari iOS 12.5.8

El iPad solo ejecuta UI, `fetch`, JSON y el cache pequeño de sesión. No ejecuta Supabase SDK, login, refresh JWT, Web Crypto propio ni almacenamiento de credenciales. El BFF evita cargar lógica de base de datos en el navegador.

### Offline

Offline no hay llamadas al BFF ni escrituras. La primera cache usa memoria/sessionStorage y `public/catalog.json` permite cargar el catálogo generado; las mutaciones requieren conectividad. IndexedDB y una cola offline quedan para Macrofase D.

## 7. Legacy build

Vite y `@vitejs/plugin-legacy` generarán chunks modernos y legacy con targets explícitos para Safari/iOS 12.5. La compatibilidad no se dará por resuelta solo por transpilar: se probarán `fetch`, IndexedDB, almacenamiento, fechas, formularios, modales, observers y CSS en el iPad real. Los efectos visuales pueden reducirse, pero las funciones no.

## 8. Cache y sincronización

El catálogo se lee desde memoria/sessionStorage primero y se revalida llamando a `/api/bootstrap`. La UI puede mostrar contenido cacheado durante una caída temporal. V1 limita las escrituras offline a modo online; una cola posterior requiere idempotency keys, reintentos, estado pendiente y rollback.

El historial se guarda como `timestamptz`; las reglas de recencia se calculan en la zona horaria del usuario. “Evitar repetir” reduce score, no bloquea opciones.

## 9. Importador y revisión

El importador será local, separado del bundle y con salida revisable antes de insertar en Supabase. Debe detectar headings de franja, títulos, componentes, notas, opcionales, bullets y párrafos fusionados. Cada línea no interpretada conserva texto y ubicación. No se harán correcciones silenciosas ni sustituciones.

## 10. Contradicciones y riesgos

1. **Privacidad sin login:** cualquier persona con acceso a una URL publica podria llamar al BFF. La privacidad debe depender de controles de deployment de Vercel o de mantener el proyecto privado; no se disfraza este limite con una clave en el frontend.
2. **Origen diario perdido:** `MealOption.source_index` no basta; se añade `SourceMenu`.
3. **Componentes ambiguos:** `Acompañamiento`, bebidas y varios títulos dentro de una franja requieren warnings y agrupación revisable.
4. **Unidades incompatibles:** no se pueden sumar automáticamente gramos, ml, piezas y medidas caseras; la lista debe separar lo que no sea convertible con seguridad.
5. **Duplicación de preferencias:** `favorite`/`hidden` deben salir del catálogo o definirse como campos exclusivamente administrativos.
6. **PDF no equivalente como entrada:** tiene 83 páginas y streams con texto codificado; usarlo para comparación visual hasta contar con extracción fiable.
7. **Complejidad del BFF:** para una app personal es más código que acceso directo. Se acepta porque mantiene Supabase fuera del cliente legacy y centraliza las validaciones; se reevalúa solo si el coste operativo supera ese beneficio.
8. **Presupuesto de bundle:** iconos, router, SDK y librerías de UI pueden incumplirlo; cada dependencia necesita una justificación medible.

## Referencias técnicas consultadas

- [Vite legacy plugin](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy)
- [Supabase server-side secrets](https://supabase.com/docs/guides/functions/secrets)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel Vite example](https://github.com/vercel/vercel/tree/main/examples/vite)
- [TypeScript compiler options](https://www.typescriptlang.org/tsconfig/)

## 11. Cierre de Macrofase B

- **Persistencia:** `meal_preferences` separa `favorite`, `hidden` y `rating` del catálogo; `meal_history` conserva cada preparación. El BFF expone únicamente `GET /api/bootstrap`, `PATCH /api/preferences/:id`, `POST /api/history` y `DELETE /api/history/:id` en esta fase.
- **Importación:** `dieta.docx` se lee directamente desde `word/document.xml` con JSZip. Se descartó Mammoth porque su extracción de este archivo introducía corrupción de caracteres. El proceso separado `diet:parse` → `diet:validate` → `diet:import` evita modificar Supabase durante el análisis; `diet:repair -- --dry-run` compara la nueva fuente sin escribir.
- **Identidad de ingredientes:** cada ocurrencia mantiene su `dish_ingredient` y enlaza al ingrediente canónico únicamente por nombre normalizado claro. El nombre del platillo nunca es una clave única; los `source_key` y UUID deterministas sí lo son.
- **Cache inicial:** el cliente usa memoria y `sessionStorage`, con `public/catalog.json` como fallback generado. Esto mantiene el bundle pequeño y evita exigir IndexedDB antes de la optimización de Macrofase D.
- **Credenciales:** `SUPABASE_SECRET_KEY` existe solo en Functions y en el script de importación controlado. El navegador solo llama al BFF; no se usa `supabase-js` en el cliente.

## 12. Cierre de Macrofase C

- **Despensa:** `pantry_items` es un estado booleano por ingrediente (`available`, `use_soon`), sin cantidades inventadas. La búsqueda usa nombre canónico y aliases.
- **Compatibilidad:** los pesos están centralizados en `src/domain/pantry.ts`: `primary=5`, `normal=3`, `minor=1`, `optional=0.25`. Un ingrediente principal faltante reduce la compatibilidad de forma visible; no se convierte en bloqueo.
- **Recomendaciones:** `src/domain/recommendations.ts` usa pesos explícitos para despensa, recencia, favorito, rating y `use_soon`. Filtra `hidden`, mantiene comidas existentes y usa una selección determinista para “No sé qué comer”.
- **Plan semanal:** `weekly_plans` y `weekly_plan_entries` conservan cinco franjas diarias. La regeneración mantiene entradas bloqueadas y solo selecciona `MealOption` existentes.
- **Compras:** la lista se deriva del plan. Solo suma cantidades numéricas con la misma unidad; gramos, mililitros, piezas y medidas domésticas incompatibles permanecen separados.
- **Administración:** `meal_options.edited` marca edición sin eliminar la provenance. Las claves originales de comida, componentes e ingredientes se conservan cuando se edita una opción importada; las nuevas opciones usan claves `manual:*`.
- **Configuración:** `avoidRepeatDays` se guarda localmente con valores permitidos 3, 5, 7, 10 y 14. No requiere tabla multiusuario.
## Corrección de desarrollo local y listados

### Adaptador local de Vite + BFF

`pnpm dev` usa `scripts/dev.ts`: Vite se monta como middleware y enruta `/api/*` a los mismos handlers `api/*.ts` que Vercel despliega. Esta solución mantiene una sola arquitectura de Functions, evita mocks y no exige login interactivo de Vercel CLI para trabajar localmente. `pnpm dev:vite` queda explícitamente aislado para tareas visuales.

### Fallback y mutaciones

`public/catalog.json` solo puede alimentar lecturas. El cliente conserva el origen de datos (`API`, `Cache` o `Fallback local`) únicamente en development/debug. Cualquier mutación sigue dependiendo del BFF; si falla, revierte el estado optimista y muestra un aviso visible.

### Paginación

La paginación se concentra en una utilidad pequeña y un control accesible de 44 px. Explorar ejecuta datos → búsqueda → filtros → ranking → paginación, con 12 MealOptions por página y regreso a la página 1 cuando cambia la consulta, franja o filtros. Favoritos, Historial, Administración y Despensa también limitan listas grandes; Hoy y Semana no se fuerzan a paginar.
## Corrección de secret keys Supabase

La implementación REST común en `api/_lib/supabase.ts` lee las variables en runtime y envía `SUPABASE_SECRET_KEY` exclusivamente en `apikey`. El importador reutiliza `upsertRows` del mismo helper, evitando que BFF e importador diverjan. `Authorization: Bearer` queda limitado al fallback legacy `SUPABASE_SERVICE_ROLE_KEY`, que sí puede ser un JWT.

## Administrar v2

Se conserva la separación de estados: `meal_preferences.hidden` es una preferencia personal y `meal_options.active` es una decisión administrativa. Restaurar y ocultar solo llaman a preferencias; reactivar e inactivar administrativamente solo modifican `active` mediante el guardado atómico del MealOption.

La edición de un MealOption completo no usa una secuencia cliente de PATCH/DELETE/INSERT. `003_admin_v2.sql` define `admin_save_meal`, que valida slot, nombre, IDs, ingredientes y cantidades dentro de una función PostgreSQL; la transacción revierte todos los cambios si falla una relación. Los componentes y DishIngredients existentes enviados por ID se actualizan conservando su identidad; los nuevos reciben UUIDs en DB.

La fusión de Ingredients usa `admin_merge_ingredients`: mueve DishIngredients, combina pantry cuando existe, conserva aliases no duplicados y elimina el origen solo después de comprobar que no quedan referencias. La eliminación permanente de comidas verifica historial, semana, preferencias y tags antes de borrar explícitamente el árbol; ante referencias devuelve conflicto y la UI recomienda ocultar.

El backup es un documento `mi-dieta-backup` versión 1 generado en cliente desde bootstrap, historial, despensa, semana y configuración. La validación de importación es pura y solo muestra errores/resumen; no existe todavía un endpoint de restauración porque no sería seguro hacer importación parcial.

## Macrofase D: cache, versionado y compatibilidad

Se elige IndexedDB nativo en lugar de una librería de estado o cache. El registro contiene únicamente el bootstrap y su ETag; si IndexedDB falla, la app cae a sessionStorage/memoria. El API se revalida en cada carga y un `304 Not Modified` evita descargar de nuevo el payload.

La versión estable combina conteos y timestamps de catálogo y estado personal. El helper REST pagina internamente en bloques de 1,000 filas porque Supabase puede truncar respuestas aunque se solicite un límite mayor. Esto conserva las 1,367 relaciones `dish_ingredients` sin cambiar el contrato del cliente.

El modo offline es solo de lectura. No existe cola de mutaciones: favoritos, despensa, historial, semana y CRUD requieren conexión y respuesta BFF. La compatibilidad legacy se detecta por capacidades CSS; no se usa un bloque grande de user-agent hacks. `GET /api/health` es el smoke check server-side de producción.
