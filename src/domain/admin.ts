import { searchMealOptions } from './search'
import type { HistoryEntry, Ingredient, MealOption, MealSlot, PantryItem, WeeklyPlan } from './types'

export type AdminMealStatus = 'all' | 'active' | 'hidden'

export interface BackupData {
  meals: MealOption[]
  ingredients: Ingredient[]
  preferences: Array<{ mealOptionId: string; favorite: boolean; hidden: boolean; rating: number | null }>
  history: HistoryEntry[]
  pantry: PantryItem[]
  weeklyPlan: WeeklyPlan | null
  settings: Record<string, unknown>
}

export interface BackupDocument {
  format: 'mi-dieta-backup'
  version: 1
  exported_at: string
  data: BackupData
}

export interface BackupSummary {
  meals: number
  components: number
  dishIngredients: number
  ingredients: number
  aliases: number
  preferences: number
  history: number
  pantry: number
  weeklyEntries: number
}

export type BackupValidation = { valid: true; summary: BackupSummary } | { valid: false; errors: string[] }

const slots = new Set<MealSlot>(['wake_up', 'breakfast', 'midday', 'lunch', 'afternoon', 'dinner'])

export function duplicateMealDraft(meal: MealOption): MealOption {
  return { ...meal, id: '', title: `${meal.title} — copia`, favorite: false, hidden: false, rating: null, active: true, lastEaten: 'Nunca', lastEatenAt: null, components: meal.components.map((component) => ({ ...component, id: '', ingredients: component.ingredients.map((ingredient) => ({ ...ingredient, id: '', aliases: [...ingredient.aliases] })) })) }
}


function statusMatches(meal: MealOption, status: AdminMealStatus) {
  if (status === 'hidden') return meal.hidden === true
  if (status === 'active') return meal.active !== false
  return true
}

export function filterAdminMeals(meals: MealOption[], query: string, status: AdminMealStatus, slot: MealSlot | null) {
  const searched = query.trim() ? searchMealOptions(meals, query).map((result) => result.meal) : meals
  return searched.filter((meal) => statusMatches(meal, status) && (!slot || meal.slot === slot))
}

export function validateMealDraft(meal: MealOption): { valid: true } | { valid: false; message: string } {
  if (!meal.title.trim()) return { valid: false, message: 'Escribe un nombre para el platillo.' }
  if (!slots.has(meal.slot)) return { valid: false, message: 'Selecciona una franja válida.' }
  if (!meal.components.length) return { valid: false, message: 'Agrega al menos un componente.' }
  for (const component of meal.components) {
    for (const ingredient of component.ingredients) {
      if (!ingredient.ingredientId) return { valid: false, message: 'Selecciona un ingrediente en cada fila.' }
      if (ingredient.amount !== null && ingredient.amount !== undefined && (!Number.isFinite(ingredient.amount) || ingredient.amount < 0)) return { valid: false, message: 'Las cantidades no pueden ser negativas.' }
    }
  }
  return { valid: true }
}

export function buildBackup(input: Omit<BackupData, 'preferences'> & { preferences?: BackupData['preferences'] }, exportedAt = new Date().toISOString()): BackupDocument {
  const preferences = input.preferences ?? input.meals
    .filter((meal) => meal.favorite || meal.hidden || meal.rating !== null && meal.rating !== undefined)
    .map((meal) => ({ mealOptionId: meal.id, favorite: meal.favorite, hidden: meal.hidden === true, rating: meal.rating ?? null }))
  return {
    format: 'mi-dieta-backup',
    version: 1,
    exported_at: exportedAt,
    data: {
      meals: input.meals,
      ingredients: input.ingredients,
      preferences,
      history: input.history,
      pantry: input.pantry,
      weeklyPlan: input.weeklyPlan,
      settings: input.settings,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function summaryOf(data: BackupData): BackupSummary {
  return {
    meals: data.meals.length,
    components: data.meals.reduce((total, meal) => total + meal.components.length, 0),
    dishIngredients: data.meals.reduce((total, meal) => total + meal.components.reduce((count, component) => count + component.ingredients.length, 0), 0),
    ingredients: data.ingredients.length,
    aliases: data.ingredients.reduce((total, ingredient) => total + ingredient.aliases.length, 0),
    preferences: data.preferences.length,
    history: data.history.length,
    pantry: data.pantry.length,
    weeklyEntries: data.weeklyPlan?.entries.length ?? 0,
  }
}

export function validateBackup(value: unknown): BackupValidation {
  if (!isRecord(value) || value.format !== 'mi-dieta-backup') return { valid: false, errors: ['El archivo no es un respaldo de mi dieta.'] }
  if (value.version !== 1) return { valid: false, errors: ['La versión del respaldo no es compatible.'] }
  if (typeof value.exported_at !== 'string' || !isRecord(value.data) || !Array.isArray(value.data.meals) || !Array.isArray(value.data.ingredients) || !Array.isArray(value.data.preferences) || !Array.isArray(value.data.history) || !Array.isArray(value.data.pantry) || !(value.data.weeklyPlan === null || isRecord(value.data.weeklyPlan) && Array.isArray(value.data.weeklyPlan.entries)) || !isRecord(value.data.settings)) return { valid: false, errors: ['El respaldo no contiene todas las secciones requeridas.'] }

  const data = value.data as unknown as BackupData
  const errors: string[] = []
  const mealIds = new Set<string>()
  const componentIds = new Set<string>()
  const dishIngredientIds = new Set<string>()
  const ingredientIds = new Set<string>()
  for (const ingredient of data.ingredients) {
    if (!ingredient || typeof ingredient.id !== 'string' || !Array.isArray(ingredient.aliases) || ingredientIds.has(ingredient.id)) errors.push('Hay Ingredients con IDs duplicados o inválidos.')
    else ingredientIds.add(ingredient.id)
  }
  for (const meal of data.meals) {
    if (!meal || typeof meal.id !== 'string' || mealIds.has(meal.id)) { errors.push('Hay MealOptions con IDs duplicados o inválidos.'); continue }
    mealIds.add(meal.id)
    if (!slots.has(meal.slot) || !meal.title?.trim() || !Array.isArray(meal.components)) errors.push('Hay un MealOption con slot, nombre o componentes inválidos.')
    for (const component of Array.isArray(meal.components) ? meal.components : []) {
      if (!component || typeof component.id !== 'string' || componentIds.has(component.id)) { errors.push('Hay DishComponents con IDs duplicados o inválidos.'); continue }
      componentIds.add(component.id)
      for (const dishIngredient of Array.isArray(component.ingredients) ? component.ingredients : []) {
        if (!dishIngredient || typeof dishIngredient.id !== 'string' || dishIngredientIds.has(dishIngredient.id)) errors.push('Hay DishIngredients con IDs duplicados o inválidos.')
        else dishIngredientIds.add(dishIngredient.id)
        if (!dishIngredient?.ingredientId || !ingredientIds.has(dishIngredient.ingredientId)) errors.push('La relación dish_ingredients apunta a un Ingredient inexistente.')
      }
    }
  }
  for (const preference of data.preferences) if (!preference || typeof preference.mealOptionId !== 'string' || !mealIds.has(preference.mealOptionId)) errors.push('Una preferencia apunta a un MealOption inexistente.')
  for (const entry of data.history) if (!entry || typeof entry.mealOptionId !== 'string' || !mealIds.has(entry.mealOptionId)) errors.push('Un registro de historial apunta a un MealOption inexistente.')
  for (const item of data.pantry) if (!item || typeof item.ingredientId !== 'string' || !ingredientIds.has(item.ingredientId)) errors.push('Un registro de despensa apunta a un Ingredient inexistente.')
  for (const entry of data.weeklyPlan?.entries ?? []) if (!entry || (entry.mealOptionId && !mealIds.has(entry.mealOptionId))) errors.push('Una entrada semanal apunta a un MealOption inexistente.')
  return errors.length ? { valid: false, errors: [...new Set(errors)] } : { valid: true, summary: summaryOf(data) }
}
