import { describe, expect, it } from 'vitest'
import { formatLastEaten, rankMealOptions, recencyScore } from './recommendations'
import type { MealOption } from './types'

const meal = (id: string, lastEatenAt: string | null): MealOption => ({ id, slot: 'dinner', title: id, summary: '', tags: [], favorite: false, availability: null, lastEaten: 'Nunca', lastEatenAt, components: [] })

describe('recency and no-repeat scoring', () => {
  const now = new Date('2026-09-18T12:00:00.000Z')

  it('lowers recent meals without blocking them', () => {
    expect(recencyScore('2026-09-18T10:00:00.000Z', now)).toBeLessThan(recencyScore(null, now))
    expect(rankMealOptions([meal('today', '2026-09-18T10:00:00.000Z'), meal('never', null)], now).map((item) => item.id)).toEqual(['never', 'today'])
  })

  it('formats the visible recency label', () => {
    expect(formatLastEaten('2026-09-17T12:00:00.000Z', now)).toBe('Ayer')
    expect(formatLastEaten(null, now)).toBe('Nunca')
  })

  it('prioritizes use-soon ingredients without inventing a meal', () => {
    const withSoon = { ...meal('soon', null), components: [{ id: 'c', label: null, ingredients: [{ id: 'i', ingredientId: 'tomato', name: 'Tomate', quantity: '1 pieza', aliases: [] }] }] }
    const other = meal('other', null)
    expect(rankMealOptions([other, withSoon], [{ ingredientId: 'tomato', available: true, useSoon: true }])[0].id).toBe('soon')
  })
})
