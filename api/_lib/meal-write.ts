import { isUuid, rpc } from './supabase.js'

export interface MealPayload {
  id?: string
  slot: string
  title: string
  note?: string | null
  active?: boolean
  components: Array<{ id?: string; label?: string | null; note?: string | null; optional?: boolean; ingredients: Array<{ id?: string; ingredientId?: string; name: string; amount?: number | null; unit?: string | null; householdAmount?: string | null; householdUnit?: string | null; householdMeasure?: string | null; originalText?: string; optional?: boolean; importance?: string }> }>
}

const slots = new Set(['wake_up', 'breakfast', 'midday', 'lunch', 'afternoon', 'dinner'])
const importance = new Set(['primary', 'normal', 'minor', 'optional'])

export function validateMealPayload(body: unknown): body is MealPayload {
  const value = body as MealPayload
  return !!value && typeof value.slot === 'string' && slots.has(value.slot) && typeof value.title === 'string' && value.title.trim().length > 0 && value.title.length <= 200 && Array.isArray(value.components) && value.components.length > 0 && value.components.every((component) => !!component && Array.isArray(component.ingredients) && component.ingredients.every((ingredient) => {
    const amountValid = ingredient.amount === undefined || ingredient.amount === null || (typeof ingredient.amount === 'number' && Number.isFinite(ingredient.amount) && ingredient.amount >= 0)
    const unitValid = ingredient.unit === undefined || ingredient.unit === null || (typeof ingredient.unit === 'string' && ingredient.unit.length <= 100)
    return !!ingredient && typeof ingredient.name === 'string' && ingredient.name.trim().length > 0 && typeof ingredient.ingredientId === 'string' && isUuid(ingredient.ingredientId) && amountValid && unitValid && (ingredient.importance === undefined || importance.has(ingredient.importance))
  }))
}

export async function saveMealRecord(payload: MealPayload, existingId?: string) {
  return rpc<{ id: string; sourceKey: string }>('admin_save_meal', { payload, existing_id: existingId ?? null })
}
