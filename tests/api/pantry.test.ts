import { describe, expect, it } from 'vitest'
import { mergePantryRow } from '../../api/_lib/pantry.js'

describe('pantry patch merging', () => {
  it('preserves existing fields when a partial patch updates another field', () => {
    expect(mergePantryRow('ingredient-id', { useSoon: true }, { available: true, use_soon: false })).toEqual({
      ingredient_id: 'ingredient-id',
      available: true,
      use_soon: true,
    })
  })
})
