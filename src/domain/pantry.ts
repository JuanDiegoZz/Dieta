import type { DishIngredient, Ingredient, MealCompatibility, MealOption, PantryItem } from './types'

export const IMPORTANCE_WEIGHTS: Record<string, number> = { primary: 5, normal: 3, minor: 1, optional: 0.25 }

function weight(ingredient: DishIngredient) { return IMPORTANCE_WEIGHTS[ingredient.importance ?? 'normal'] ?? 3 }

export function calculateCompatibility(meal: MealOption, pantry: PantryItem[]): MealCompatibility {
  const availableIds = new Set(pantry.filter((item) => item.available).map((item) => item.ingredientId))
  const required = meal.components.flatMap((component) => component.ingredients)
  const available: string[] = []
  const missing: string[] = []
  const optionalMissing: string[] = []
  let total = 0
  let covered = 0
  for (const ingredient of required) {
    const isOptional = ingredient.optional || ingredient.importance === 'optional'
    const ingredientWeight = weight(ingredient)
    total += ingredientWeight
    if (ingredient.ingredientId && availableIds.has(ingredient.ingredientId)) {
      covered += ingredientWeight
      available.push(ingredient.name)
    } else if (isOptional) optionalMissing.push(ingredient.name)
    else missing.push(ingredient.name)
  }
  const score = total === 0 ? 1 : covered / total
  const label = missing.length === 0 ? (optionalMissing.length ? 'Muy compatible · faltan opcionales' : 'Muy compatible') : missing.length === 1 ? 'Te falta 1 ingrediente' : `Te faltan ${missing.length} ingredientes`
  return { score, available, missing, optionalMissing, label }
}

export function enrichMealsWithCompatibility(meals: MealOption[], pantry: PantryItem[]) {
  return meals.map((meal) => { const compatibility = calculateCompatibility(meal, pantry); return { ...meal, compatibility, availability: compatibility.score } })
}

export function filterIngredients(ingredients: Ingredient[], query: string): Ingredient[] {
  const normalized = query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (!normalized) return ingredients
  return ingredients.filter((ingredient) => [ingredient.canonicalName, ...ingredient.aliases].some((value) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalized)))
}
