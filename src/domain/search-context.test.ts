import { describe, expect, it } from 'vitest'
import { filterIngredients } from './pantry'

const ingredients = [{ id: 'p', canonicalName: 'Piña fresca', active: true, category: 'fruta', aliases: ['ananás'] }, { id: 'e', canonicalName: 'Espinaca', active: true, category: 'verdura', aliases: [] }]
describe('consistent ingredient discovery', () => {
  it.each(['piña', 'pina', 'PIÑA', 'piñ', 'pina fre', 'ANANAS'])('uses words and normalized prefixes: %s', (query) => {
    expect(filterIngredients(ingredients, query).map(i => i.id)).toEqual(['p'])
  })
})
