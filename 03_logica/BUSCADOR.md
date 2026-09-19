# Buscador

## Objetivo

Debe sentirse instantáneo.

## Buscar en

- nombre de MealOption,
- componentes,
- ingredientes,
- aliases,
- tags.

## Normalización de query

1. lowercase
2. eliminar acentos
3. trim
4. colapsar espacios
5. tokenizar
6. resolver aliases

## Ejemplos

`queso tortilla`

Debe favorecer opciones donde aparecen ambos conceptos.

`pescado`

Debe encontrar opciones por:

- nombre,
- ingrediente,
- tag.

`champis`

Debe encontrar champiñones si el alias existe.

## Ranking sugerido

Ponderación:

- match exacto de título: +100
- título parcial: +70
- componente: +60
- ingrediente: +50
- alias: +45
- tag: +30
- favorito: +10
- no comido recientemente: +10

No usar IA en V1.
