# Motor de recomendaciones

## Objetivo

Ordenar opciones, no inventar comidas.

## Señales

- franja seleccionada,
- disponibilidad en despensa,
- historial,
- favorito,
- rating,
- oculto,
- ingredientes prioritarios por usar.

## Score base

Ejemplo:

```text
score =
  pantry_score
+ favorite_score
+ recency_score
+ preference_score
+ use_soon_score
```

## Pantry score

No tratar todos los ingredientes igual.

Peso sugerido:

- primary: 5
- normal: 3
- minor: 1
- optional: 0.25

```text
available_weight / total_required_weight
```

## Recency

Ejemplo:

- hoy: penalización alta
- 1–2 días: penalización
- 3–6 días: neutral
- 7+ días: bonus

Configurable.

## Nunca hacer

- inventar sustituciones,
- cambiar gramos,
- cambiar ingredientes,
- recomendar algo oculto.
