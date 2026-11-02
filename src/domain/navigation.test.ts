import { describe, expect, it } from 'vitest'
import { parseView, mealIdFromHash, returnRoute } from './navigation'

describe('hash navigation', () => {
  it('keeps meal IDs in reloadable detail links', () => {
    expect(parseView('#/detail?id=meal-1')).toBe('detail')
    expect(mealIdFromHash('#/detail?id=meal-1')).toBe('meal-1')
  })
  it.each(['today', 'explore', 'favorites', 'week', 'history'])('returns to %s', (origin) => {
    expect(returnRoute(origin)).toBe(origin)
  })
  it('uses a safe fallback without a valid origin', () => {
    expect(returnRoute('detail')).toBe('today')
    expect(parseView('#/unknown')).toBe('today')
  })
})
