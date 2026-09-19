# Roadmap

El trabajo se organiza en cuatro macrofases. Se conserva la secuencia original de base, importación, core, personalización, despensa, planificación, administración, optimización y pulido.

## Macrofase A — Base técnica + frontend + core visual

Construir la base ejecutable y la primera experiencia navegable, inicialmente con fixtures controlados.

- Vite + React + TypeScript.
- Build legacy preparado para iPad Air iOS 12.5.8.
- BFF de Vercel y acceso server-side a Supabase, sin autenticación de aplicación.
- Layout principal y design tokens.
- Pantalla Hoy.
- Explorar.
- Tabs por franja sin bloquear ninguna opción.
- Detalle de comida.
- Buscador inicial.

## Macrofase B — Importación + datos reales + personalización

Convertir la dieta fuente en datos revisables y añadir el estado personal de la instalación.

- Parser de `DietaCompleta.docx`.
- Normalización conservadora y aliases.
- Warnings, revisión humana y validación contra los documentos separados.
- Seed de datos reales.
- Favoritos.
- Rating.
- Ocultar/desactivar opciones.
- Historial.
- Regla de no repetir.

## Macrofase C — Despensa + recomendaciones + planificación + CRUD

Completar las funciones que ayudan a decidir, organizar y mantener el plan.

- Ingredientes disponibles: Tengo, No tengo y Usar pronto.
- Compatibilidad con la despensa.
- Filtros y faltantes.
- Recomendaciones según franja, despensa, historial y preferencias.
- “No sé qué comer”.
- Semana.
- Regenerar sin modificar opciones bloqueadas.
- Bloquear opciones.
- Lista del súper.
- CRUD completo de opciones.
- CRUD de componentes.
- CRUD de ingredientes, cantidades y medidas domésticas.

## Macrofase D — Optimización + iPad legacy + pulido final

Validar el comportamiento real y completar la calidad visual sin comprometer velocidad.

- Optimización del bundle.
- Cache local.
- IndexedDB.
- Legacy QA en Safari iOS 12.5.8.
- Performance pass.
- Microinteracciones.
- Transiciones.
- Empty states.
- Skeleton states.
- Detalles responsive.

## Criterio de avance

No se considera una macrofase terminada hasta que sus entregables respeten `10_fases/DEFINITION_OF_DONE.md` y las pruebas correspondientes de `09_testing/TEST_PLAN.md`.
