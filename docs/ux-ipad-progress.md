# Registro de implementación UX/UI

## Preparación

- Base limpia: `chore/supabase-diagnostics`.
- Rama local creada: `feat/ux-ipad-iterations`.
- Línea base: 91 pruebas en 20 archivos; lint, typecheck, build y diff --check aprobados.
- Estrategia: ejecución inline de siete iteraciones; sin dependencias adicionales, migraciones, push ni despliegue.
- Navegador: datos sintéticos e interceptación de todos los endpoints. Emulación de tamaños; no Safari físico.

## Iteración 1 — Guardado de cocina

- UUID estable por preparación; reintentos usan la clave primaria existente y no sobrescriben conflictos. Estados inicial/guardando/confirmado/rechazado/desconocido.
- Historial se actualiza solo con respuesta validada; bootstrap entrega su modelo de dominio coherente.
- Rojo inicial: tres pruebas nuevas fallaron. Verde: 94 pruebas; lint, typecheck, build legacy y diff --check aprobados.
- Navegador: cuatro tamaños; 503, doble toque, respuesta perdida después de guardar, reintento con el mismo ID e historial único aprobados. Errores HTTP simulados esperados; sin excepciones JS.
- Sin migración. El almacenamiento de sesión es opcional; si está bloqueado, conserva el evento durante el montaje de cocina.

## Iteración 2 — Continuidad

- Navegación hash con ID de platillo, origen y controles de UI en history.state. Pantalla de origen permanece montada durante detalle/cocina; retorno restaura scroll y foco.
- Respaldo seguro de enlaces directos: Hoy; ID inválido no abre otro platillo. Páginas y filtros sobreviven recarga/atrás.
- 101 pruebas; lint, typecheck, build y diff --check aprobados. Suite de navegador acumulada en cuatro tamaños: cinco orígenes, atrás/adelante, recarga de detalle, filtro y página 2.
- Durante desarrollo se corrigieron referencias e imports obsoletos detectados por typecheck; sin fallos pendientes de esas correcciones.

## Iteración 3 — Navegación completa

- Acceso Más separado de las cinco secciones inferiores. Historial y Administrar accesibles y ruta secundaria activa. Diálogo compartido con foco contenido, Escape y restauración.
- 101 pruebas; todos los comandos del protocolo aprobados. Suite acumulada en cuatro tamaños aprobada, incluidos apertura/cierre y ambos destinos.
- Se detectó que el indicador de desarrollo tapaba Más; corregido su posicionamiento e interacción. Sin cambios en permisos o datos.

## Iteración 4 — Formularios y diálogos

- Semana y Administración usan Modal compartido: foco inicial, Tab/Shift+Tab, Escape, bloqueo del fondo y restauración.
- Ingredientes (nombre, categoría, aliases), creación pendiente y borradores de platillos participan en la protección. Atrás del navegador puede cancelarse sin desmontar el formulario; beforeunload ofrece aviso cuando el navegador lo admite.
- 101 pruebas; lint, typecheck, build, diff --check y suite acumulada en cuatro tamaños aprobados. Navegador verificó cancelación, descarte y guardado simulado sin avisos posteriores.
- Limitación de plataforma: iPadOS puede cerrar Safari sin emitir beforeunload; no se promete persistencia local de borradores ante cierre forzado.

## Iteración 5 — Accesibilidad y tacto

- Coral funcional más oscuro, texto secundario y placeholder con contraste AA; paleta decorativa cálida conservada. Foco visible sin depender de focus-visible.
- Controles frecuentes con área de 44 px, búsquedas de 16 px y estados aria-pressed. Franjas usan grupo de botones nativos en vez de un patrón tab incompleto. Nombres de despensa incluyen ingrediente.
- Rojo: cuatro contrastes originales fallaron. Verde: 105 pruebas; lint, typecheck, build y diff --check aprobados. Navegador acumulado en cuatro tamaños aprobó tamaños, selección y prefers-reduced-motion.
- No sustituye auditoría completa con VoiceOver ni certificación WCAG.

## Iteración 6 — Descubrimiento

- Hoy indica visibles/total y continúa en Explorar con consulta y franja conservadas. Explorar comunica alcance global; Hoy y alternativas siguen restringidos por franja.
- Despensa y alternativas usan normalización por palabra/prefijo; piña no coincide con espinaca. Se mantienen nombres, ingredientes, aliases y consultas múltiples.
- Rojo: cuatro casos nuevos de Despensa detectaron falsos positivos. Verde: 111 pruebas; lint, typecheck, build y diff --check aprobados. Navegador acumulado en cuatro tamaños verificó continuación 6/14 y búsquedas normalizadas.

## Iteración 7 — Planificación, cocina y recuperación

- Cocina conserva componentes, cantidades y notas. Semana añade indicación horizontal y día visible, con área desplazable enfocable.
- Eliminada espera artificial de Hoy. Ajustes abre Administración; retirados botones sin acción de cocina y perfil; textos de ingredientes aclarados.
- Semana distingue cargando/error/ausencia; permite reintento, conserva última versión y bloquea escrituras simultáneas. Revalidación al reconectar/recuperar visibilidad con deduplicación, límite de 15 s y protección frente a borradores/escrituras. Reloj actualizado cada minuto visible y al regresar.
- Favoritos y despensa se actualizan tras confirmación; historial no revierte otras operaciones al fallar un borrado. Se comunica guardado pendiente. Respuestas antiguas no sustituyen datos durante ediciones.
- Revisión adicional: el evento de cocina conserva valoración además de UUID/fecha; conflicto de contenido se rechaza sin sobrescritura. Estado de UI se persiste fuera del actualizador de React.
- 115 pruebas; lint, typecheck, build y diff --check aprobados. Suite acumulada en cuatro tamaños aprobó agrupación, favoritos, despensa, bloqueo semanal, 503 semanal/reintento, reconexión deduplicada y borrador protegido.
- Pruebas negativas esperadas: 503 y red abortada en mocks; cero excepciones JavaScript no esperadas. Sin escrituras reales.
