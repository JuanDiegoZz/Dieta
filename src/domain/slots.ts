import type { MealSlot } from './types'

export interface MealSlotDefinition {
  id: MealSlot
  label: string
  shortLabel: string
  range: string
}

export const MEAL_SLOTS: MealSlotDefinition[] = [
  { id: 'wake_up', label: 'Al despertar', shortLabel: 'Al despertar', range: 'Al despertar' },
  { id: 'breakfast', label: 'Desayuno', shortLabel: 'Desayuno', range: '05:00–10:59' },
  { id: 'midday', label: 'Medio día', shortLabel: 'Medio día', range: '11:00–12:59' },
  { id: 'lunch', label: 'Comida', shortLabel: 'Comida', range: '13:00–16:59' },
  { id: 'afternoon', label: 'Media tarde', shortLabel: 'Media tarde', range: '17:00–19:29' },
  { id: 'dinner', label: 'Cena', shortLabel: 'Cena', range: '19:30–04:59' },
]

export function getSuggestedSlot(date: Date = new Date()): MealSlot {
  const minutes = date.getHours() * 60 + date.getMinutes()

  if (minutes >= 5 * 60 && minutes < 11 * 60) return 'breakfast'
  if (minutes < 13 * 60) return 'midday'
  if (minutes < 17 * 60) return 'lunch'
  if (minutes < 19 * 60 + 30) return 'afternoon'
  return 'dinner'
}
