# Administrar v2 — Diseño aprobado

## Objetivo

Completar la administración de comidas, componentes, relaciones de ingredientes, ingredientes globales y respaldo sin mezclar el estado administrativo `meal_options.active` con el ocultamiento personal `meal_preferences.hidden`.

## Decisiones

- `meal_preferences.hidden` controla ocultar/restaurar dentro de la experiencia normal.
- `meal_options.active` permanece como estado administrativo independiente.
- Guardar un platillo completo usa una RPC PostgreSQL transaccional; un fallo revierte toda la operación.
- Editar conserva los IDs existentes de MealOption, componentes y relaciones que permanecen; duplicar genera nuevos IDs para MealOption, componentes y DishIngredients, pero reutiliza Ingredients globales.
- El borrado permanente solo se permite mediante una operación administrativa que verifica referencias y rechaza la eliminación si puede romper datos. Ocultar es la alternativa segura.
- Exportar backup se realiza en el cliente desde el estado ya cargado y nunca incluye secretos.
- Importar backup valida formato, versión, estructura, referencias y muestra resumen; no escribe en Supabase.
- El cliente continúa usando cache de lectura, fallback local y mutaciones online confirmadas por BFF.

## Backend

La migración aditiva `003_admin_v2.sql` añadirá funciones PostgreSQL para guardar árboles completos, duplicar, fusionar y eliminar con comprobaciones. El BFF invocará `/rpc/<función>` con el helper REST existente. Todos los handlers conservarán la firma Node `(req, res)`.

## Frontend

Administrar conservará el diseño actual y añadirá filtros por estado/slot, búsqueda local por título, ingrediente y alias, editor táctil con componentes e ingredientes, gestión global de ingredientes, confirmaciones, cambios sin guardar, feedback de mutación, exportación y validación de importación.

## Fuera de alcance seguro

No se implementa restauración de backup en base de datos hasta disponer de una transacción completa que cubra todo el estado personal y sus referencias.
