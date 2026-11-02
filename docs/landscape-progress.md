# Iteración especial — iPad horizontal

## Base y restricciones

Rama `feat/ipad-landscape`, derivada de `feat/ux-ipad-iterations` con árbol limpio. Base ejecutada: 115 pruebas aprobadas. Sin dependencias nuevas, cambios de producción, permisos, datos o credenciales. Navegador con todas las API interceptadas y datos sintéticos.

## Fase 1 — Auditoría reproducida

Se recorrieron nueve pantallas más diálogos a 1024×768, 1112×834, 1180×820, 1194×834, 1366×1024, 768×1024 y 375×812. Se guardaron capturas y medidas en `docs/evidence/landscape/before/`.

| Prioridad | Evidencia | Impacto |
| --- | --- | --- |
| P1 | A 1112 px, sidebar de 245 px y tarjetas de 238 px; a 1024 px las tarjetas tenían 290 px | Un iPad más ancho ofrece menos espacio útil y comprime nombres |
| P1 | A 1024 px la tarjeta de Explorar termina en y=764; navegación fija comienza en y=699 | Acciones inicialmente tapadas por la navegación inferior |
| P1 | Semana: 1122 px de contenido dentro de 740–994 px útiles en horizontales con sidebar; altura de 1330 px | Cruce de desplazamientos, días fuera de vista y controles repetidos |
| P1 | Cocina: botón Terminé comienza en y=1487–1535 con fixture de nueve ingredientes | Requiere desplazamiento largo para confirmar; ancho desaprovechado |
| P2 | Detalle: ingredientes comienzan en y=583–629 | Introducción y disponibilidad desplazan el contenido principal |
| P2 | Filtros: 778 px de contenido en 740 px a 1112 | Controles y ajuste de repetición recortados internamente |
| P2 | Administración: formulario de prueba de unos 5300 px, catálogo y acciones sin contexto persistente | Mucho recorrido entre edición y guardado |
| Riesgo | Teclado virtual y visualViewport real no disponibles en navegador de escritorio | Se probará altura reducida como aproximación; Safari físico pendiente |

No hubo desbordamiento horizontal de página en las medidas iniciales; los problemas incluyen densidad, altura y contexto, no solo overflow.

## Diseño autorizado dentro del alcance

- Navegación compacta con siete destinos desde 1000 px en horizontal; mantener móvil/vertical y Más. No usar identificación comercial ni user-agent.
- Tarjetas basadas en ancho disponible, filtros que envuelven y menos espacio vertical improductivo.
- Semana: selector de los siete días y cinco franjas del día seleccionado, conservando generación, bloqueos, cambios, limpieza, compras y exportación de toda la semana. Una sola estructura y estado que sobrevive rotación.
- Detalle y cocina: contexto/acciones a la izquierda e ingredientes a la derecha cuando hay ancho; columna única en vertical/móvil.
- Formularios: tipografía de 16 px, acciones accesibles y modales ajustados a altura visible con fallback legacy.
- Tras cada fase: diff, pruebas pertinentes y comprobación visual/funcional. Regresión general al cierre con la suite previa de 115 pruebas y ambos runners de navegador.

## Fases 2–3 — Navegación y densidad

- Rail fijo de 104 px con siete destinos desde 1000 px en horizontal; desaparecen barra inferior y Más solo en ese contexto. Vertical/móvil conservan su navegación.
- Tarjetas auto-fit con mínimo 260 px; márgenes verticales moderados, franjas y filtros que envuelven sin recortar controles. Despensa en dos columnas y catálogo administrativo con contexto persistente. Campos editables a 16 px.
- 23 pruebas pertinentes y typecheck aprobados; diff revisado. Auditoría de las nueve pantallas y modales en los siete tamaños aprobó navegación, ancho mínimo de tarjetas y ausencia de overflow de página. Las comprobaciones estructurales de Semana/cocina permanecen rojas hasta fases 4–5.

## Fase 4 — Semana por día

- Siete fechas accesibles y cinco franjas del día seleccionado; distribución de tres tarjetas por fila en horizontal, dos en vertical y una en móvil. Se preservan las 35 entradas y operaciones originales.
- El calendario horizontal pasa de 1122 px de contenido a ajustarse al ancho disponible. Altura de la zona de comidas de 1330 px a aproximadamente 455–499 px con el fixture.
- Prueba nueva de fechas entre meses (rojo y verde); tres pruebas de dominio semanales y typecheck aprobados. Navegador: siete tamaños, selección, Home/End, bloqueo persistente, limpiar/añadir y rotación sin perder día; todas aprobadas.
- La medición excluye las pantallas de origen ocultas que React mantiene montadas; no se consideran tarjetas de ancho cero como defectos visibles.

## Fase 5 — Detalle y cocina

- Estructura en dos columnas: contexto/acciones e ingredientes. En horizontal el botón Terminé pasa de y=1487–1535 a y=398–402; las cantidades y notas originales siguen en sus componentes. Vertical/móvil conservan columna única.
- Contexto con sticky y scroll propio si el texto es largo; componentes usan columnas solo cuando hay ancho real. No se tocaron estados de guardado ni idempotencia.
- Rojo: acción fuera de viewport. Verde: cinco pruebas de preparación/idempotencia, typecheck y auditoría de siete tamaños aprobados. Capturas revisadas de cocina, detalle y Semana.
- En la prueba de bloqueo semanal se normalizó el estado sintético entre tamaños: un bloqueo de un caso anterior no debe confundirse con un defecto del producto.

## Fase 6 — Formularios y altura disponible

- Acciones de guardado movidas al inicio del editor y sticky en horizontal; catálogo lateral mantiene contexto. Se comprobó guardar visible tanto al inicio como tras 1400 px de scroll.
- Modal sigue visualViewport (resize/scroll) cuando existe y usa innerHeight/resize como fallback. Encabezado/cierre y confirmación quedan accesibles en altura reducida. Listeners se limpian al cerrar.
- Se corrigió un margen negativo que producía scroll horizontal interno en el resumen del detalle y un ajuste de pocos píxeles que partía el toolbar semanal.
- Doce pruebas pertinentes y typecheck aprobados; diff revisado. Navegador aprobó siete tamaños, contención del foco, 1024×380 y visualViewport simulado de 280/240 px con offset. No se afirma teclado físico.

## Fase 7 — Interacción y regresión

- Se detectó y corrigió scrollIntoView suave explícito que ignoraba prefers-reduced-motion. Prueba de navegador roja antes y verde después.
- Detalle ya no presenta disponibilidad cero con tono de éxito. No se cambió el cálculo de disponibilidad.
- La suite funcional anterior se amplió de cuatro a ocho tamaños (incluye todos los solicitados y desktop 1366×900). Pasó guardado confirmado/idempotente, red/503, navegación, historial, favoritos, despensa, semana, borradores, modales y recuperación.
- Auditoría horizontal nueva: las nueve pantallas, menús y diálogos; sin overflow de página; siete días y cinco franjas; rotación, teclado, guardado sticky, altura 380 px, visualViewport simulado y paginación con movimiento reducido.
- 116 pruebas unitarias/integración en 26 archivos. Se corrigieron tres declaraciones globales de prueba sobrantes detectadas por lint. Después pasaron lint, typecheck, build legacy y diff --check.

## Cierre de regresión

- Pasada final contra build compilado con vite preview: runner horizontal completo y runner funcional previo ampliado a ocho tamaños aprobados. 116 pruebas, lint, typecheck, build y diff --check aprobados.
- Se validaron también selección de alternativas, compras/filtro y descarga de la imagen semanal. Todas las API fueron simuladas.
- Las capturas finales vuelven explícitamente a scroll cero y cada resolución comienza con la misma semana sintética para mantener comparaciones válidas.
- Revisión visual final: catálogo largo requirió acciones debajo del nombre; se comprobó ancho legible mínimo de 180 px y un solo scroll interno.
- Incidencia de entorno: watcher Windows EBUSY al observar descarga del test. Se repitieron suites contra preview compilado sin watcher, sin fallo.
- Informe completo, evidencias antes/después y guía física/Preview: docs/landscape-review.md. Safari físico pendiente.
