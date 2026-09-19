import { rankMealOptions } from './recommendations'
import type { MealOption, PantryItem, WeeklyPlan, WeeklyPlanEntry } from './types'

export const PLANNING_SLOTS = ['breakfast', 'midday', 'lunch', 'afternoon', 'dinner'] as const

function dateKey(startDate: string, offset: number) {
  const date = new Date(`${startDate}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function generateWeeklyPlan(meals: MealOption[], startDate: string, pantry: PantryItem[], existing: WeeklyPlan | null = null, avoidRepeatDays = 7): WeeklyPlan {
  const old = new Map((existing?.entries ?? []).map((entry) => [`${entry.plannedDate}:${entry.slot}`, entry]))
  const used = new Set<string>()
  const entries: WeeklyPlanEntry[] = []
  for (let day = 0; day < 7; day += 1) {
    for (const slot of PLANNING_SLOTS) {
      const date = dateKey(startDate, day)
      const previous = old.get(`${date}:${slot}`)
      if (previous?.locked) { entries.push(previous); if (previous.mealOptionId) used.add(previous.mealOptionId); continue }
      const candidates = rankMealOptions(meals.filter((meal) => meal.slot === slot && !used.has(meal.id)), pantry, new Date(), avoidRepeatDays)
      const fallback = rankMealOptions(meals.filter((meal) => meal.slot === slot), pantry, new Date(), avoidRepeatDays)
      const selected = candidates[0] ?? fallback[0]
      entries.push({ id: previous?.id ?? `local-${date}-${slot}`, plannedDate: date, slot, mealOptionId: selected?.id ?? null, locked: false })
      if (selected) used.add(selected.id)
    }
  }
  return { id: existing?.id ?? null, startDate, name: existing?.name ?? 'Mi semana', entries }
}

export interface ShoppingItem {
  key: string
  ingredientId: string
  name: string
  category: string
  amount: number | null
  unit: string | null
  householdMeasures: string[]
  available: boolean
  optional: boolean
}

export function buildShoppingList(plan: WeeklyPlan, meals: MealOption[], pantry: PantryItem[], hideAvailable: boolean): ShoppingItem[] {
  const byId = new Map(meals.map((meal) => [meal.id, meal]))
  const available = new Set(pantry.filter((item) => item.available).map((item) => item.ingredientId))
  const result = new Map<string, ShoppingItem>()
  for (const entry of plan.entries) {
    const meal = entry.mealOptionId ? byId.get(entry.mealOptionId) : undefined
    if (!meal) continue
    for (const ingredient of meal.components.flatMap((component) => component.ingredients)) {
      const ingredientId = ingredient.ingredientId ?? ingredient.name.toLocaleLowerCase('es')
      if (hideAvailable && available.has(ingredientId)) continue
      const unit = ingredient.unit ?? null
      const key = `${ingredientId}:${unit ?? 'text'}:${ingredient.amount === null || ingredient.amount === undefined ? ingredient.id : 'numeric'}`
      const current = result.get(key)
      const household = ingredient.householdMeasure ? [...(current?.householdMeasures ?? []), ingredient.householdMeasure] : current?.householdMeasures ?? []
      if (!current) result.set(key, { key, ingredientId, name: ingredient.name, category: ingredient.category ?? 'other', amount: ingredient.amount ?? null, unit, householdMeasures: household, available: available.has(ingredientId), optional: !!ingredient.optional })
      else if (current.amount !== null && typeof ingredient.amount === 'number' && current.unit === unit) current.amount += ingredient.amount
    }
  }
  return [...result.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'es'))
}
