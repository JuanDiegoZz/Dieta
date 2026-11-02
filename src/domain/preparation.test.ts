import { describe, expect, it, vi } from 'vitest'
import { finishPreparation, preparationEvent } from './preparation'

describe('preparation event lifetime', () => {
  it('keeps the event payload across retries and replaces it only after confirmation', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
    try {
      const first = preparationEvent('meal', 4)
      expect(first.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(preparationEvent('meal', 1)).toEqual(first)
      expect(first.rating).toBe(4)
      finishPreparation('meal')
      expect(preparationEvent('meal', 1).id).not.toBe(first.id)
    } finally { vi.unstubAllGlobals() }
  })
})
