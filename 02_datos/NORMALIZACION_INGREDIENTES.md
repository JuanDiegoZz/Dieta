# Normalización de ingredientes

## Motivo

Los documentos contienen nombres equivalentes o relacionados escritos de distintas maneras.

Ejemplos:

- Yogurt griego
- Yogur griego
- Yogur griego OIKOS
- Yogur griego alto en proteína

No deben perder su texto original, pero el buscador necesita relacionarlos.

## Estrategia

Cada ingrediente mantiene:

- `canonical_name`
- `original_text`
- aliases

Ejemplo:

```text
canonical: Yogur griego

aliases:
- yogurt griego
- yogur
- yogurt
```

Una versión específica como `Yogur griego OIKOS` puede mantenerse como ingrediente propio y además pertenecer a:

```text
category = yogurt_griego
```

## Regla

Nunca reemplazar silenciosamente un ingrediente específico por otro.

La normalización sirve para:

- búsqueda,
- agrupación,
- recomendaciones.

No para cambiar el plan.
