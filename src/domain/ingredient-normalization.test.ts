import { describe, expect, it } from 'vitest'
import { normalizeName } from './ingredient-normalization'

describe('ingredient normalization', () => {
  it('prevents accidental duplicate names caused by case, accents or spaces', () => {
    expect(normalizeName('  POLLO  ')).toBe(normalizeName('pollo'))
    expect(normalizeName('Jitomáte')).toBe('jitomate')
  })
})
