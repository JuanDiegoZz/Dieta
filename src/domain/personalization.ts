import type { HistoryEntry, MealOption } from './types'

export function applyPreference(meals: MealOption[], mealId: string, patch: Partial<Pick<MealOption, 'favorite' | 'hidden' | 'rating'>>): MealOption[] {
  return meals.map((meal) => meal.id === mealId ? { ...meal, ...patch } : meal)
}

export function appendHistory(entries: HistoryEntry[], meal: MealOption, eatenAt: string, id: string): HistoryEntry[] {
  return [{ id, mealOptionId: meal.id, eatenAt, rating: meal.rating ?? null, note: null }, ...entries]
}

export function removeHistory(entries: HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== id)
}
