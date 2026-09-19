import { randomUUID } from 'node:crypto'
import { deleteRows, insertRows, isUuid, patchRows, selectRows } from './supabase'

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
  return !!value && typeof value.slot === 'string' && slots.has(value.slot) && typeof value.title === 'string' && value.title.trim().length > 0 && value.title.length <= 200 && Array.isArray(value.components) && value.components.every((component) => Array.isArray(component.ingredients) && component.ingredients.every((ingredient) => typeof ingredient.name === 'string' && ingredient.name.trim() && typeof ingredient.ingredientId === 'string' && isUuid(ingredient.ingredientId) && (ingredient.importance === undefined || importance.has(ingredient.importance))))
}

function key(prefix: string) { return `manual:${prefix}:${randomUUID()}` }

export async function saveMealRecord(payload: MealPayload, existingId?: string) {
  const mealId = existingId ?? randomUUID()
  let existingComponentKeys = new Map<string, string>()
  let existingIngredientKeys = new Map<string, string>()
  const source = existingId ? (await selectRows<{ source_key: string; daily_plan_id: string | null; source_index: number }>('meal_options', 'source_key,daily_plan_id,source_index', { id: `eq.${existingId}`, limit: '1' }))[0] : undefined
  if (existingId && !source) throw new Error('MealOption no encontrada.')
  const mealRow = {
    id: mealId, source_key: source?.source_key ?? key('meal'), daily_plan_id: source?.daily_plan_id ?? null, meal_slot: payload.slot,
    source_index: source?.source_index ?? -1, option_position: 0, title: payload.title.trim(), notes: payload.note?.trim() || null, active: payload.active ?? true, edited: !!existingId,
  }
  if (existingId) await patchRows('meal_options', { id: `eq.${existingId}` }, mealRow)
  else await insertRows('meal_options', [mealRow])
  if (existingId) {
    const currentComponents = await selectRows<{ id: string; source_key: string }>('dish_components', 'id,source_key', { meal_option_id: `eq.${existingId}` })
    const currentIngredients = currentComponents.length ? await selectRows<{ id: string; source_key: string }>('dish_ingredients', 'id,source_key', { component_id: `in.(${currentComponents.map((component) => component.id).join(',')})` }) : []
    if (currentComponents.length) await deleteRows('dish_components', { meal_option_id: `eq.${existingId}` })
    existingComponentKeys = new Map(currentComponents.map((component) => [component.id, component.source_key]))
    existingIngredientKeys = new Map(currentIngredients.map((ingredient) => [ingredient.id, ingredient.source_key]))
  }
  const componentRows = payload.components.map((component, position) => ({ id: component.id && isUuid(component.id) ? component.id : randomUUID(), source_key: existingComponentKeys.get(component.id ?? '') ?? key(`component-${mealId}-${position}`), meal_option_id: mealId, source_label: component.label?.trim() || null, position, optional: component.optional ?? false, notes: component.note?.trim() || null }))
  if (componentRows.length) await insertRows('dish_components', componentRows)
  const ingredientRows = payload.components.flatMap((component, componentIndex) => component.ingredients.map((ingredient, position) => ({
    id: ingredient.id && isUuid(ingredient.id) ? ingredient.id : randomUUID(), source_key: existingIngredientKeys.get(ingredient.id ?? '') ?? key(`ingredient-${mealId}-${componentIndex}-${position}`), component_id: componentRows[componentIndex].id,
    ingredient_id: ingredient.ingredientId && isUuid(ingredient.ingredientId) ? ingredient.ingredientId : (() => { throw new Error('Cada ingrediente debe seleccionar un ingrediente existente.') })(), original_name: ingredient.name.trim(), original_text: ingredient.originalText?.trim() || ingredient.name.trim(), amount: ingredient.amount ?? null, unit: ingredient.unit ?? null, household_amount: ingredient.householdAmount ?? null, household_unit: ingredient.householdUnit ?? null, household_text: ingredient.householdMeasure ?? null, optional: ingredient.optional ?? false, importance: ingredient.importance ?? 'normal', position,
  })))
  if (ingredientRows.length) await insertRows('dish_ingredients', ingredientRows)
  return { id: mealId, sourceKey: mealRow.source_key }
}
