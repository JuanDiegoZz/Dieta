import { describe, expect, it } from 'vitest'
import { searchMealOptions } from './search'
import type { MealOption } from './types'

const meals: MealOption[] = [
  {
    id: 'mushroom-quesadillas',
    slot: 'dinner',
    title: 'Quesadillas de champiñones',
    summary: 'Tortilla de maíz con queso panela y champiñones.',
    tags: ['rápido'],
    favorite: true,
    availability: 0.8,
    lastEaten: 'Hace 8 días',
    components: [
      {
        id: 'mushroom-main',
        label: 'Plato principal',
        ingredients: [
          { id: 'tortilla', name: 'Tortilla de maíz', quantity: '90 g', aliases: ['tortillas'] },
          { id: 'mushrooms', name: 'Champiñones', quantity: '183 g', aliases: ['champis'] },
        ],
      },
    ],
  },
  {
    id: 'fish-bowl',
    slot: 'lunch',
    title: 'Bowl de pescado',
    summary: 'Pescado con arroz y ensalada fresca.',
    tags: ['proteína'],
    favorite: false,
    availability: 0.6,
    lastEaten: 'Ayer',
    components: [
      {
        id: 'fish-main',
        label: 'Plato principal',
        ingredients: [{ id: 'fish', name: 'Pescado blanco', quantity: '150 g', aliases: [] }],
      },
    ],
  },
  {
    id: 'breakfast-chicken',
    slot: 'breakfast',
    title: 'Pollo con avena',
    summary: 'Desayuno con pollo.',
    tags: [],
    favorite: false,
    availability: 0.7,
    lastEaten: 'Nunca',
    components: [
      {
        id: 'breakfast-main',
        label: 'Plato principal',
        ingredients: [{ id: 'chicken', name: 'Pollo', quantity: '120 g', aliases: ['ave'] }],
      },
    ],
  },
  {
    id: 'dinner-chicken',
    slot: 'dinner',
    title: 'Pollo con arroz',
    summary: 'Cena con pollo.',
    tags: [],
    favorite: false,
    availability: 0.7,
    lastEaten: 'Nunca',
    components: [
      {
        id: 'dinner-main',
        label: 'Plato principal',
        ingredients: [{ id: 'chicken-dinner', name: 'Pollo', quantity: '150 g', aliases: ['ave'] }],
      },
    ],
  },
]

describe('searchMealOptions', () => {
  it('finds a meal by alias and ranks an exact title first', () => {
    expect(searchMealOptions(meals, 'champis')[0].meal.id).toBe('mushroom-quesadillas')
    expect(searchMealOptions(meals, 'pescado')[0].meal.id).toBe('fish-bowl')
  })

  it('requires all query tokens to be present', () => {
    expect(searchMealOptions(meals, 'queso tortilla')).toHaveLength(1)
    expect(searchMealOptions(meals, 'queso inexistente')).toHaveLength(0)
  })

  it('returns every meal for an empty query', () => {
    expect(searchMealOptions(meals, '')).toHaveLength(4)
  })

  it('limits a breakfast query to breakfast meals', () => {
    expect(searchMealOptions(meals, 'pollo', undefined, 'breakfast').map((result) => result.meal.id)).toEqual(['breakfast-chicken'])
  })

  it('limits a lunch query without falling back to other slots', () => {
    expect(searchMealOptions(meals, 'pollo', undefined, 'lunch')).toHaveLength(0)
  })

  it('recalculates the same query when the selected slot changes', () => {
    expect(searchMealOptions(meals, 'pollo', undefined, 'breakfast').map((result) => result.meal.id)).toEqual(['breakfast-chicken'])
    expect(searchMealOptions(meals, 'pollo', undefined, 'dinner').map((result) => result.meal.id)).toEqual(['dinner-chicken'])
  })

  it('keeps ingredient and alias searches inside the selected slot', () => {
    expect(searchMealOptions(meals, 'pollo', undefined, 'breakfast').map((result) => result.meal.id)).toEqual(['breakfast-chicken'])
    expect(searchMealOptions(meals, 'ave', undefined, 'breakfast').map((result) => result.meal.id)).toEqual(['breakfast-chicken'])
  })
})
