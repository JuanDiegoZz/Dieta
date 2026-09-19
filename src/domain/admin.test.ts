import { describe, expect, it } from 'vitest'
import { buildBackup, duplicateMealDraft, filterAdminMeals, validateBackup, validateMealDraft } from './admin'
import type { Ingredient, MealOption } from './types'

const ingredient: Ingredient = { id: 'ingredient-1', canonicalName: 'Tomate', category: 'verdura', aliases: ['jitomate'], active: true }
const meal = (overrides: Partial<MealOption> = {}): MealOption => ({
  id: 'meal-1', slot: 'lunch', title: 'Ensalada', summary: 'Tomate', tags: [], favorite: false, availability: null, lastEaten: 'Nunca', active: true, hidden: false,
  components: [{ id: 'component-1', label: 'Principal', ingredients: [{ id: 'dish-1', ingredientId: ingredient.id, name: 'Tomate', quantity: '1 pieza', aliases: ingredient.aliases, amount: 1, unit: 'pieza' }] }],
  ...overrides,
})

describe('admin domain', () => {
  it('keeps hidden preference separate from administrative active state', () => {
    const hiddenActive = meal({ id: 'hidden-active', hidden: true, active: true })
    const hiddenInactive = meal({ id: 'hidden-inactive', hidden: true, active: false })
    expect(filterAdminMeals([meal(), hiddenActive, hiddenInactive], '', 'active', null).map((item) => item.id)).toEqual(['meal-1', 'hidden-active'])
    expect(filterAdminMeals([meal(), hiddenActive, hiddenInactive], '', 'hidden', null).map((item) => item.id)).toEqual(['hidden-active', 'hidden-inactive'])
    expect(filterAdminMeals([meal(), hiddenActive, hiddenInactive], '', 'all', null).map((item) => item.id)).toEqual(['meal-1', 'hidden-active', 'hidden-inactive'])
  })

  it('searches titles, ingredients and aliases and filters slots', () => {
    expect(filterAdminMeals([meal(), meal({ id: 'breakfast', slot: 'breakfast', title: 'Avena' })], 'jitomate', 'all', 'lunch').map((item) => item.id)).toEqual(['meal-1'])
    expect(filterAdminMeals([meal(), meal({ id: 'breakfast', slot: 'breakfast', title: 'Avena' })], '', 'all', 'breakfast').map((item) => item.id)).toEqual(['breakfast'])
  })

  it('rejects invalid meal drafts before a mutation', () => {
    expect(validateMealDraft(meal({ title: ' ' }))).toEqual({ valid: false, message: 'Escribe un nombre para el platillo.' })
    expect(validateMealDraft(meal({ components: [{ id: 'c', label: 'Principal', ingredients: [{ id: 'd', ingredientId: ingredient.id, name: 'Tomate', quantity: '', aliases: [], amount: -1, unit: 'pieza' }] }] }))).toEqual({ valid: false, message: 'Las cantidades no pueden ser negativas.' })
    expect(validateMealDraft(meal({ components: [] }))).toEqual({ valid: false, message: 'Agrega al menos un componente.' })
  })

  it('duplicates the tree with new internal IDs and shared Ingredient IDs', () => {
    const duplicate = duplicateMealDraft(meal())
    expect(duplicate.id).toBe('')
    expect(duplicate.components[0].id).toBe('')
    expect(duplicate.components[0].ingredients[0].id).toBe('')
    expect(duplicate.components[0].ingredients[0].ingredientId).toBe(ingredient.id)
    expect(duplicate.title).toBe('Ensalada — copia')
  })

  it('builds a secret-free backup and validates references without writing', () => {
    const backup = buildBackup({ meals: [meal({ favorite: true })], ingredients: [ingredient], history: [], pantry: [], weeklyPlan: null, settings: { avoidRepeatDays: 7 } })
    expect(backup.format).toBe('mi-dieta-backup')
    expect(validateBackup(backup)).toEqual({ valid: true, summary: { meals: 1, components: 1, dishIngredients: 1, ingredients: 1, aliases: 1, preferences: 1, history: 0, pantry: 0, weeklyEntries: 0 } })
    expect(validateBackup({ ...backup, data: { ...backup.data, meals: [{ ...backup.data.meals[0], components: [{ ...backup.data.meals[0].components[0], ingredients: [{ ...backup.data.meals[0].components[0].ingredients[0], ingredientId: 'missing' }] }] }] } })).toEqual({ valid: false, errors: ['La relación dish_ingredients apunta a un Ingredient inexistente.'] })
    expect(validateBackup({ ...backup, version: 2 })).toEqual({ valid: false, errors: ['La versión del respaldo no es compatible.'] })
  })
})
