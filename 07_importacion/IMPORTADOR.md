# Importación de documentos

## Fuente

Priorizar `DietaCompleta.docx`.

## Objetivo

Importar automáticamente:

- franja,
- título,
- componentes,
- ingredientes,
- gramos/ml,
- medidas caseras,
- notas,
- opcionales.

## Parser

Debe detectar encabezados:

- Al despertar
- Desayuno
- Medio día
- Comida
- Media tarde
- Cena

## Cantidades

Ejemplo:

```text
Tortilla de maíz — 90 g (3 piezas)
```

Guardar:

```json
{
  "amount": 90,
  "unit": "g",
  "householdAmount": "3",
  "householdUnit": "piezas"
}
```

## Regla

Guardar siempre el texto original.

## Revisión humana

El importador debe producir:

- filas válidas,
- warnings,
- líneas ambiguas.

No corregir silenciosamente información dudosa.
