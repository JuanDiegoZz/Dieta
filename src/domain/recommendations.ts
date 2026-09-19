import type { MealOption, PantryItem } from './types'

export const RECOMMENDATION_WEIGHTS = {
  pantry: 50,
  recency: 20,
  favorite: 8,
  rating: 8,
  useSoon: 10,
} as const

function daysSince(value: string | null | undefined, now: Date): number | null {
  if (!value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000))
}

export function recencyScore(lastEatenAt: string | null | undefined, now = new Date(), avoidRepeatDays = 7): number {
  const days = daysSince(lastEatenAt, now)
  if (days === null) return 1
  if (days === 0) return -1
  if (days <= 2) return -0.7
  if (days < avoidRepeatDays) return -0.2
  return 0.5
}

export function formatLastEaten(lastEatenAt: string | null | undefined, now = new Date()): string {
  const days = daysSince(lastEatenAt, now)
  if (days === null) return 'Nunca'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 14) return 'Hace 1 semana'
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`
  return `Hace ${Math.floor(days / 30)} meses`
}

function useSoonScore(meal: MealOption, pantry: PantryItem[]) {
  const soon = new Set(pantry.filter((item) => item.available && item.useSoon).map((item) => item.ingredientId))
  const usesSoon = meal.components.some((component) => component.ingredients.some((ingredient) => ingredient.ingredientId && soon.has(ingredient.ingredientId)))
  return usesSoon ? 1 : 0
}

export function recommendationScore(meal: MealOption, pantry: PantryItem[], now = new Date(), avoidRepeatDays = 7): number {
  const pantryScore = meal.compatibility?.score ?? 0
  const rating = meal.rating ? (meal.rating - 2.5) / 1.5 : 0
  return pantryScore * RECOMMENDATION_WEIGHTS.pantry
    + recencyScore(meal.lastEatenAt, now, avoidRepeatDays) * RECOMMENDATION_WEIGHTS.recency
    + (meal.favorite ? RECOMMENDATION_WEIGHTS.favorite : 0)
    + rating * RECOMMENDATION_WEIGHTS.rating
    + useSoonScore(meal, pantry) * RECOMMENDATION_WEIGHTS.useSoon
}

export function rankMealOptions(meals: MealOption[], pantryOrNow: PantryItem[] | Date = [], now = new Date(), avoidRepeatDays = 7): MealOption[] {
  const pantry = pantryOrNow instanceof Date ? [] : pantryOrNow
  const effectiveNow = pantryOrNow instanceof Date ? pantryOrNow : now
  const scored = meals
    .filter((meal) => meal.hidden !== true && meal.active !== false)
    .map((meal) => ({ meal, score: recommendationScore(meal, pantry, effectiveNow, avoidRepeatDays) }))
  return scored.sort((a, b) => b.score - a.score || a.meal.title.localeCompare(b.meal.title, 'es')).map((entry) => entry.meal)
}

export function recommendationReason(meal: MealOption, pantry: PantryItem[], now = new Date()): string[] {
  const reasons: string[] = []
  if (meal.compatibility?.missing.length === 0) reasons.push('Tienes todos los ingredientes')
  else if (meal.compatibility) reasons.push(meal.compatibility.label)
  if (meal.favorite) reasons.push('Está entre tus favoritos')
  if ((meal.rating ?? 0) >= 3) reasons.push('Suele gustarte')
  const days = daysSince(meal.lastEatenAt, now)
  if (days !== null && days >= 7) reasons.push(`No la comes desde hace ${days} días`)
  if (useSoonScore(meal, pantry)) reasons.push('Aprovecha algo marcado para usar pronto')
  return reasons.slice(0, 3)
}
