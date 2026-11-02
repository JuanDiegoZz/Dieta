# Dieta — iPad horizontal como escenario principal

## Estado

Implementación y regresión automatizada completas. Lista para revisión física, no aprobada todavía en Safari del iPad.

Rama local `feat/ipad-landscape`, derivada de `feat/ux-ipad-iterations`, cuyo árbol inicial estaba limpio. Se conservaron las siete iteraciones previas. Sin push, merge a main, despliegues, dependencias nuevas ni cambios de datos, credenciales, permisos o esquemas.

## Defectos y decisiones

| Prioridad | Defecto confirmado | Pantallas y tamaños | Corrección |
| --- | --- | --- | --- |
| P1 | Al cruzar 1100 px, la navegación quitaba 245 px de ancho: tarjetas de 290 px a 1024 pasaban a 238 px a 1112 | Navegación, Hoy, Explorar y Favoritos | Rail de 104 px desde 1000 px en horizontal, siete destinos directos; móvil y vertical conservan Más |
| P1 | Barra inferior desde y=699 tapaba acciones de tarjetas que terminaban en y=764 | Explorar, 1024×768 | Sin navegación inferior en horizontal; navegación lateral compacta y tarjetas equilibradas |
| P1 | Calendario de 1122 px dentro de 740–994 px útiles y 1330 px de altura | Semana, cinco horizontales | Siete fechas seleccionables; cinco franjas del día elegido, sin scroll horizontal de comidas |
| P1 | Terminé quedaba en y=1487–1535 con nueve ingredientes | Cocina, cinco horizontales | Contexto/confirmación a la izquierda; componentes y cantidades a la derecha; acción en y≈402 |
| P2 | Ingredientes de detalle comenzaban en y=583–629 | Detalle, horizontales | Resumen y acciones separados de componentes, con columnas basadas en ancho disponible |
| P2 | Filtros de 778 px dentro de 740 px; repetición comprimida | Explorar, 1112×834 | Envoltura de controles, ancho mínimo del selector y texto sin partición |
| P1/P2 | Formulario largo separaba edición y guardado; acciones laterales comprimían los nombres del catálogo | Administración, horizontales | Guardado al inicio y sticky; títulos con todo el ancho; acciones debajo y un solo scroll interno del catálogo |
| P2 | Margen negativo generaba scroll interno en el resumen y toolbar semanal partía botones por pocos píxeles | Detalle y Semana | Márgenes corregidos; botones con una línea y distribución ajustada |
| P2 | Paginación solicitaba scroll suave explícito incluso con movimiento reducido | Explorar | Respeta matchMedia antes de usar comportamiento smooth |
| P2 | Disponibilidad cero usaba tono verde de éxito | Detalle | Tono neutro para disponibilidad baja, sin cambiar el cálculo |
| Riesgo | Teclado real y barras de Safari no reproducibles en escritorio | Diálogos y formularios | VisualViewport con fallback innerHeight; simulación automatizada, validación física pendiente |

No se encontraron desbordamientos horizontales de página en la base medida. Las correcciones atienden densidad, comodidad y continuidad, además de los límites geométricos.

## Distribución final

- Rail: 104 px, destinos con nombre e icono y objetivos amplios; ruta activa visible. No usa identificación comercial ni user-agent.
- Tarjetas: auto-fit con mínimo de 260 px; tres columnas en horizontales medianos y cuatro cuando caben sin comprimirlas.
- Despensa: dos columnas en horizontal, conservando controles y nombres.
- Historial: mantiene orden cronológico y una anchura de lectura cómoda; no se convirtió arbitrariamente en una cuadrícula.
- Semana: conserva las 35 entradas y todas sus operaciones. Solo cambia la presentación; fechas, bloqueos, cambios, limpieza, compras y exportación siguen actuando sobre la semana completa. Día seleccionado persiste al rotar y al regresar de un detalle.
- Cocina y detalle: columnas de contexto e ingredientes; componentes pueden distribuirse en más de una columna si hay espacio. Sin inventar pasos ni modificar cantidades/notas.
- Administración: búsqueda y catálogo separados del formulario, guardado persistente y campos de 16 px. Se mantienen confirmaciones y protección de borradores.
- Modales: altura ajustada al viewport visible, scroll interno, cierre accesible, fondo bloqueado y foco contenido/restaurado.

## Medidas comparables

Datos sintéticos iguales al inicio de cada comparación. Valores aproximados en CSS px; el scrollbar del navegador automatizado puede restar 15 px al ancho útil.

| Ancho | Navegación antes → después | Tarjeta antes → después | Altura de comidas semanal después | Y de Terminé después |
| --- | --- | --- | --- | --- |
| 1024 | 0 → 104 | 290 → 270 | 499 | 402 |
| 1112 | 245 → 104 | 238 → 299 | 455 | 402 |
| 1180 | 245 → 104 | 261 → 322 | 455 | 402 |
| 1194 | 245 → 104 | 265 → 326 | 455 | 402 |
| 1366 | 245 → 104 | 323 → 284 | 455 | 402 |

A 1024 se intercambia algo de ancho por altura útil y acceso a siete destinos; a 1366 caben cuatro tarjetas. No se presenta cada reducción de anchura como mejora aislada: se verificaron legibilidad y controles. Semana todavía puede necesitar un desplazamiento vertical corto con nombres largos; no se redujeron las tarjetas hasta volverlas ilegibles.

## Evidencia antes/después

Capturas con catálogo sintético, sin registros privados. Se conservaron 43 capturas por estado: cinco pantallas y un diálogo en cada tamaño, más altura reducida. Hoy, Despensa, Favoritos e Historial también se midieron y recorrieron; las medidas están en JSON.

| Caso | Antes | Después |
| --- | --- | --- |
| Explorar, 1112 px | [Antes](evidence/landscape/before/explore-1112.png) | [Después](evidence/landscape/after/explore-1112.png) |
| Semana, 1024 px | [Antes](evidence/landscape/before/week-1024.png) | [Después](evidence/landscape/after/week-1024.png) |
| Cocina, 1366 px | [Antes](evidence/landscape/before/kitchen-1366.png) | [Después](evidence/landscape/after/kitchen-1366.png) |
| Detalle, 1180 px | [Antes](evidence/landscape/before/detail-1180.png) | [Después](evidence/landscape/after/detail-1180.png) |
| Administración, 1180 px | [Antes](evidence/landscape/before/admin-1180.png) | [Después](evidence/landscape/after/admin-1180.png) |
| Diálogo, 1024×380 | [Antes](evidence/landscape/before/dialog-short.png) | [Después](evidence/landscape/after/dialog-short.png) |

[Medidas iniciales](evidence/landscape/before/metrics.json) · [Medidas finales](evidence/landscape/after/metrics.json).

## Archivos intervenidos

- `src/styles/landscape.css`: reglas específicas, sin reescribir el diseño general de index.css.
- `src/main.tsx`: carga de la hoja después de los estilos base.
- `src/features/WeeklyScreen.tsx`: selección de día y distribución de franjas.
- `src/domain/weekly.ts`: exporta el cálculo de fecha existente para compartirlo con la pantalla.
- `src/features/MealDetailScreen.tsx`, `KitchenModeScreen.tsx`: estructura en columnas y presentación de disponibilidad.
- `src/features/AdminScreen.tsx`: ubicación de acciones de guardado; mismas operaciones y validación.
- `src/components/Modal.tsx`: altura visible y limpieza de listeners.
- `src/features/ExploreScreen.tsx`: paginación con reducción de movimiento.
- `src/domain/weekly-date.test.ts`, `tests/browser/landscape.cjs`, `tests/browser/ux.cjs`: prueba de fechas, auditoría/funciones nuevas y regresión previa ampliada.

No se modificaron BFF, esquemas, lógica de coincidencias de ingredientes, idempotencia ni controles de acceso.

## Pruebas y resultados

- Base: 115 pruebas. Final: **116 pruebas en 26 archivos**, todas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` moderno/legacy y `git diff --check`: aprobados.
- Runner horizontal: **63 estados de pantalla** en 1024×768, 1112×834, 1180×820, 1194×834, 1366×1024, 768×1024 y 375×812, más diálogos y alturas reducidas.
- Operaciones semanales probadas: siete días/cinco franjas, cambio real con respuesta simulada, bloquear/desbloquear, limpiar/añadir, compras/ocultar disponibles, exportación de imagen, Home/End y rotación sin perder selección. Las 35 entradas se conservan.
- Runner previo: aprobó ocho tamaños, incluidos los siete pedidos y desktop 1366×900. Cubre piña/espinaca, relevancia, contexto, favoritos, historial, despensa, cocina, 503, interrupción de red, respuesta perdida, reintento idempotente, Administración, borradores, modales y recuperación deduplicada.
- Paginación con movimiento reducido: prueba roja antes y verde tras la corrección.
- Catálogo administrativo: prueba roja por nombres estrechos; verde tras colocar las acciones debajo.
- Modal: se comprobó viewport 1024×380 y visualViewport simulado de 280/240 px con desplazamiento superior.
- Cero excepciones JS inesperadas en las suites finales. Los errores HTTP/abortos de la suite de recuperación son simulados y esperados.
- Todas las API y el catálogo alternativo estuvieron interceptados. No hubo escrituras reales.

La pasada final se ejecutó contra el **build compilado mediante vite preview**, además de las comprobaciones durante desarrollo. Un watcher de Vite en Windows se cerró con EBUSY al observar una descarga del test; se documenta como incidencia del entorno, no como fallo del producto. Preview no utiliza ese watcher y pasó la regresión.

La lista del súper conserva líneas textuales inciertas por separado. La prueba verifica que ocultar un ingrediente retire todas sus líneas, sin modificar esa regla de negocio.

## Comprobación física en Safari

Pendientes: teclado virtual real, barras de Safari, áreas seguras, VoiceOver, reflejos/distancia de lectura, suspensión prolongada y rendimiento del dispositivo. Las resoluciones no equivalen al viewport efectivo del iPad.

1. En horizontal, abrir las siete secciones desde el rail; comprobar selección inequívoca y objetivos táctiles.
2. Buscar piña, abrir detalle y regresar conservando consulta, filtros, página y scroll.
3. Leer un platillo largo en detalle/cocina; comprobar cantidades, notas y acceso a Terminé.
4. En un entorno con datos de prueba, recorrer los siete días, cambiar/bloquear/limpiar, abrir alternativas y exportar la semana completa.
5. Abrir un formulario largo, enfocar campos con teclado y comprobar guardado/cierre visibles, scroll interno y protección al salir.
6. Rotar a vertical y regresar; verificar que no cambie el día elegido ni se pierda el borrador.
7. Volver desde otra aplicación y comprobar recuperación sin duplicar acciones.

Para una revisión local de lectura sin BFF:

```powershell
pnpm build
pnpm exec vite preview --host 0.0.0.0 --port 4173
```

Abrir `http://IP-DEL-PC:4173/?diagnostics=1#/explore` en la misma red. Sin API habrá fallback; esta modalidad no valida guardados ni un plan semanal remoto. Para operaciones de escritura usar únicamente datos de prueba o el runner interceptado.

## Preview segura después de autorización

No se ejecutó ningún despliegue. Después de revisar y autorizar:

1. Usar el **proyecto Dieta existente**, ya desplegado; comprobar el vínculo antes de usar la CLI.
2. Revisar las variables del entorno Preview. Para probar escrituras, apuntar a una base de prueba; no reutilizar por comodidad credenciales de producción. Si no existe una base de prueba, limitar la revisión a lectura y mocks.
3. Crear solo un deployment Preview desde esta rama. Con la CLI ya instalada: `vercel deploy --target=preview`; nunca `--prod` ni promoción automática.
4. Revisar la URL Preview en Safari y mantener el despliegue de producción actual sin cambios.

La documentación de [entornos Vercel](https://vercel.com/docs/deployments/environments) indica que el primer despliegue de un proyecto nuevo es Production incluso solicitando Preview. Por eso estas instrucciones se limitan al proyecto Dieta existente; no crear un proyecto nuevo durante esta revisión.

## Límites

- No se declara aprobación física del iPad ni certificación WCAG completa.
- No se midieron FPS, autonomía o latencias reales del dispositivo. Sí se reduce la vista semanal de 35 franjas simultáneas a cinco.
- La causa de los 401 históricos sigue fuera de esta iteración; no se añadieron reintentos especulativos ni permisos.
- La protección de borradores y la persistencia del UUID conservan los límites de almacenamiento/cierre forzado documentados anteriormente.
