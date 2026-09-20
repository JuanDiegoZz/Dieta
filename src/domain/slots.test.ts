import { describe, expect, it } from 'vitest'
import { MEAL_SLOTS, getSuggestedSlot } from './slots'

describe('meal slots', () => {
  it('keeps every diet slot available in the tab order', () => {
    expect(MEAL_SLOTS).toHaveLength(6)
    expect(MEAL_SLOTS.map((slot) => slot.id)).toEqual([
      'wake_up',
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
