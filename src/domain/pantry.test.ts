import { describe, expect, it } from 'vitest'
import { calculateCompatibility } from './pantry'
import type { MealOption } from './types'

const meal: MealOption = { id: 'm', slot: 'lunch', title: 'Pescado', summary: '', tags: [], favorite: false, availability: null, lastEaten: 'Nunca', components: [{ id: 'c', label: null, ingredients: [{ id: 'di-1', ingredientId: 'fish', name: 'Pescado', quantity: '100 g', aliases: [], importance: 'primary' }, { id: 'di-2', ingredientId: 'tortilla', name: 'Tortilla', quantity: '2 piezas', aliases: [], importance: 'normal' }] }] }

describe('pantry compatibility', () => {
  it('penalizes missing primary ingredients strongly', () => {
    const result = calculateCompatibility(meal, [{ ingredientId: 'tortilla', available: true, useSoon: false }])
    expect(result.score).toBeLessThan(0.5)
    expect(result.missing).toEqual(['Pescado'])
  })

  it('does not penalize optional ingredients as required missing items', () => {
    const optionalMeal = { ...meal, components: [{ ...meal.components[0], ingredients: [{ ...meal.components[0].ingredients[0], optional: true, importance: 'optional' }] }] }
    expect(calculateCompatibility(optionalMeal, []).optionalMissing).toEqual(['Pescado'])
  })
})
