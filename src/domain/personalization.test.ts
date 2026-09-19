import { describe, expect, it } from 'vitest'
import { appendHistory, applyPreference, removeHistory } from './personalization'
import type { MealOption } from './types'

const meal: MealOption = { id: 'meal-1', slot: 'breakfast', title: 'Opción', summary: '', tags: [], favorite: false, availability: null, lastEaten: 'Nunca', components: [] }

describe('personalization', () => {
  it('aplica favoritos, ocultar y rating a una opción específica', () => {
    const result = applyPreference([meal], meal.id, { favorite: true, hidden: true, rating: 4 })
    expect(result[0]).toMatchObject({ favorite: true, hidden: true, rating: 4 })
  })

  it('agrega y elimina un registro de historial sin afectar otras entradas', () => {
    const entry = appendHistory([], meal, '2026-09-18T12:00:00.000Z', 'history-1')[0]
    expect(entry).toMatchObject({ mealOptionId: meal.id, rating: null })
    expect(removeHistory([entry], entry.id)).toEqual([])
  })
})
