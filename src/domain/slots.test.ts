import { describe, expect, it } from 'vitest'
import { MEAL_SLOTS, getSuggestedSlot } from './slots'

describe('meal slots', () => {
  it('keeps all five main slots available', () => {
    expect(MEAL_SLOTS).toHaveLength(5)
    expect(MEAL_SLOTS.map((slot) => slot.id)).toEqual([
      'breakfast',
      'midday',
      'lunch',
      'afternoon',
      'dinner',
    ])
  })

  it('uses the current time only for the initial suggestion', () => {
    expect(getSuggestedSlot(new Date(2026, 8, 18, 22, 0))).toBe('dinner')
    expect(getSuggestedSlot(new Date(2026, 8, 18, 7, 0))).toBe('breakfast')
  })
})
