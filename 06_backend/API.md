# API

## Arquitectura recomendada

```text
Browser
  ↓
Vercel API
  ↓
Supabase
```

## Motivo

- cliente legacy más pequeño,
- mejor compatibilidad,
- queries controladas,
- no exponer lógica innecesaria.

## Endpoints sugeridos

### GET /api/bootstrap

Devuelve:

- meal options,
- components,
- ingredients,
- aliases,
- preferences,
- pantry.

Puede versionarse/cachearse.

### POST /api/history

Registrar comida.

### PATCH /api/meals/:id

Editar opción.

### POST /api/meals

Crear opción.

### PATCH /api/pantry/:ingredientId

Actualizar despensa.

### GET /api/search?q=

Opcional.

La búsqueda principal puede ocurrir localmente para velocidad.

## Seguridad

Es un proyecto personal, pero:

- no exponer service role al frontend,
- validar payloads,
- usar variables de entorno.

No invertir tiempo en un sistema empresarial de permisos.
