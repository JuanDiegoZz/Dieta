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
