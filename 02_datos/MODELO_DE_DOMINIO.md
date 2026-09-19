# Modelo de dominio

## Problema importante

Una comida no siempre es un único platillo.

Puede ser:

- platillo principal,
- acompañamiento,
- ensalada,
- bebida,
- vinagreta,
- fruta.

Por lo tanto, la unidad principal debe ser `MealOption`.

## Estructura

```text
MealSlot
└── MealOption
    ├── DishComponent
    │   └── DishIngredient
    ├── DishComponent
    │   └── DishIngredient
    └── Notes
```

## Entidades

### MealSlot

Representa:

- breakfast
- mid_morning
- lunch
- afternoon_snack
- dinner
- wake_up

### MealOption

Una opción completa elegible.

Campos:

- id
- meal_slot
- title
- active
- favorite
- source_index
- notes
- created_at
- updated_at

### DishComponent

Componente de una opción.

Ejemplo:

MealOption:
`Tacos de pescado + ensalada`

Components:
- Tacos de pescado
- Ensalada de quinoa

Campos:

- id
- meal_option_id
- name
- position
- optional

### Ingredient

Ingrediente canónico.

Campos:

- id
- canonical_name
- category
- active

### IngredientAlias

Ejemplos:

- yogurt → yogur
- jitomate → tomate
- champis → champiñón

### DishIngredient

Campos:

- component_id
- ingredient_id
- amount
- unit
- household_amount
- household_unit
- optional
- importance
- original_text

## Importancia

Valores:

- primary
- normal
- minor
- optional

Se utiliza para la compatibilidad con despensa.
