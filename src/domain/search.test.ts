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
    expect(searchMealOptions(meals, '')).toHaveLength(2)
  })
})
