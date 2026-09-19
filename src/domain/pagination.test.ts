import { describe, expect, it } from 'vitest'
import { clampPage, paginate, pageCount } from './pagination'

describe('pagination', () => {
  const items = Array.from({ length: 55 }, (_, index) => index + 1)

  it('paginates 55 results in pages of 12', () => {
    expect(pageCount(items.length, 12)).toBe(5)
    expect(paginate(items, 1, 12)).toEqual(items.slice(0, 12))
    expect(paginate(items, 2, 12)).toEqual(items.slice(12, 24))
    expect(paginate(items, 5, 12)).toEqual(items.slice(48))
  })

  it('clamps pages outside the available range', () => {
    expect(clampPage(0, 55, 12)).toBe(1)
    expect(clampPage(99, 55, 12)).toBe(5)
    expect(clampPage(3, 0, 12)).toBe(1)
  })

  it('supports filtering before pagination', () => {
    const filtered = items.filter((item) => item % 2 === 0)
    expect(pageCount(filtered.length, 12)).toBe(3)
    expect(paginate(filtered, 1, 12)).toEqual(filtered.slice(0, 12))
  })
})
