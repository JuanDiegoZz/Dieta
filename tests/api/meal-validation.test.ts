import { describe, expect, it } from 'vitest'
import { validateMealPayload } from '../../api/_lib/meal-write.js'

describe('CRUD meal validation', () => {
  it('accepts a meal with existing ingredient references', () => {
    expect(validateMealPayload({ slot: 'lunch', title: 'Prueba', components: [{ ingredients: [{ name: 'Pollo', ingredientId: '11111111-1111-4111-8111-111111111111', importance: 'primary' }] }] })).toBe(true)
  })

  it('rejects unknown slots and importance values', () => {
    expect(validateMealPayload({ slot: 'snack', title: 'Prueba', components: [] })).toBe(false)
    expect(validateMealPayload({ slot: 'lunch', title: 'Prueba', components: [{ ingredients: [{ name: 'Pollo', importance: 'critical' }] }] })).toBe(false)
  })

  it('rejects negative amounts and missing components', () => {
    expect(validateMealPayload({ slot: 'lunch', title: 'Prueba', components: [{ ingredients: [{ name: 'Pollo', ingredientId: '11111111-1111-4111-8111-111111111111', amount: -1 }] }] })).toBe(false)
    expect(validateMealPayload({ slot: 'lunch', title: 'Prueba', components: [] })).toBe(false)
  })
})
