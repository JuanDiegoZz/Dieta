# Prompt para el importador

Revisa primero:

- `02_datos/`
- `07_importacion/`

Construye un parser que convierta los documentos de dieta al modelo de dominio.

Reglas:

- no perder texto original,
- no fusionar automáticamente variantes dudosas,
- producir warnings,
- mantener opciones con mismo nombre si sus datos difieren,
- detectar múltiples componentes por MealOption,
- detectar notas y opcionales,
- separar cantidad principal y medida doméstica.

El output debe poder inspeccionarse antes de insertar en Supabase.
