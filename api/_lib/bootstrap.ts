import { handleApiError, json, selectAllRows, selectRows } from './supabase'

interface OptionRow { id: string; source_key: string; meal_slot: string; title: string; notes: string | null; active: boolean; edited: boolean; source_index: number; option_position: number; updated_at: string }
interface ComponentRow { id: string; meal_option_id: string; source_label: string | null; position: number; optional: boolean; notes: string | null }
interface IngredientRow { id: string; component_id: string; ingredient_id: string; original_name: string; original_text: string; amount: number | null; unit: string | null; household_amount: string | null; household_unit: string | null; household_text: string | null; optional: boolean; importance: string; position: number }
interface CanonicalIngredient { id: string; canonical_name: string; category: string; active: boolean; updated_at: string }
interface AliasRow { ingredient_id: string; alias: string }
interface PreferenceRow { meal_option_id: string; favorite: boolean; hidden: boolean; rating: number | null; updated_at: string }
interface HistoryRow { id: string; meal_option_id: string; eaten_at: string; rating: number | null; note: string | null; created_at: string }
interface PantryRow { ingredient_id: string; available: boolean; use_soon: boolean; updated_at: string }

function displayQuantity(row: IngredientRow) {
  if (row.amount !== null && row.unit) return `${row.amount} ${row.unit}`
  return row.original_text.split(/[—–-]/).slice(1).join('').trim().split('(')[0].trim() || 'Cantidad no especificada'
}

function latest(values: string[]) {
  const sorted = [...values].sort()
  return sorted.length ? sorted[sorted.length - 1] : 'none'
}

export async function getBootstrap() {
  const [options, components, dishIngredients, ingredients, aliases, preferences, history, pantry] = await Promise.all([
    selectAllRows<OptionRow>('meal_options', 'id,source_key,meal_slot,title,notes,active,edited,source_index,option_position,updated_at'),
    selectAllRows<ComponentRow>('dish_components', 'id,meal_option_id,source_label,position,optional,notes'),
    selectAllRows<IngredientRow>('dish_ingredients', 'id,component_id,ingredient_id,original_name,original_text,amount,unit,household_amount,household_unit,household_text,optional,importance,position'),
    selectAllRows<CanonicalIngredient>('ingredients', 'id,canonical_name,category,active,updated_at'),
    selectAllRows<AliasRow>('ingredient_aliases', 'ingredient_id,alias'),
    selectAllRows<PreferenceRow>('meal_preferences', 'meal_option_id,favorite,hidden,rating,updated_at'),
    selectRows<HistoryRow>('meal_history', 'id,meal_option_id,eaten_at,rating,note,created_at', { order: 'eaten_at.desc', limit: '300' }),
    selectAllRows<PantryRow>('pantry_items', 'ingredient_id,available,use_soon,updated_at'),
  ])
  const preferenceMap = new Map(preferences.map((preference) => [preference.meal_option_id, preference]))
  const historyMap = new Map<string, HistoryRow>()
  for (const entry of history) if (!historyMap.has(entry.meal_option_id)) historyMap.set(entry.meal_option_id, entry)
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))
  const aliasMap = new Map<string, string[]>()
  for (const alias of aliases) aliasMap.set(alias.ingredient_id, [...(aliasMap.get(alias.ingredient_id) ?? []), alias.alias])
  const ingredientRows = new Map<string, IngredientRow[]>()
  for (const row of dishIngredients) ingredientRows.set(row.component_id, [...(ingredientRows.get(row.component_id) ?? []), row])
  const componentRows = new Map<string, ComponentRow[]>()
  for (const row of components) componentRows.set(row.meal_option_id, [...(componentRows.get(row.meal_option_id) ?? []), row])
  const catalogVersion = [
    options.length,
    components.length,
    dishIngredients.length,
    ingredients.length,
    aliases.length,
    latest(options.map((row) => row.updated_at)),
    latest(ingredients.map((row) => row.updated_at)),
  ].join(':')
  const stateVersion = [
    preferences.length,
    history.length,
    pantry.length,
    latest(preferences.map((row) => row.updated_at)),
    latest(history.map((row) => row.created_at)),
    latest(pantry.map((row) => row.updated_at)),
  ].join(':')
  return {
    version: `${catalogVersion}|${stateVersion}`,
    catalogVersion,
    ingredients: ingredients.map((ingredient) => ({ id: ingredient.id, canonicalName: ingredient.canonical_name, category: ingredient.category, active: ingredient.active, aliases: aliasMap.get(ingredient.id) ?? [] })),
    pantry: pantry.map((item) => ({ ingredientId: item.ingredient_id, available: item.available, useSoon: item.use_soon, updatedAt: item.updated_at })),
    meals: options.map((option) => {
      const preference = preferenceMap.get(option.id)
      const last = historyMap.get(option.id)
      const mealComponents = (componentRows.get(option.id) ?? []).map((component) => ({
        id: component.id, label: component.source_label, optional: component.optional, note: component.notes ?? '',
        ingredients: (ingredientRows.get(component.id) ?? []).map((row) => ({
          id: row.id, ingredientId: row.ingredient_id, name: row.original_name, quantity: displayQuantity(row), amount: row.amount, unit: row.unit,
          householdMeasure: row.household_text ?? undefined, householdAmount: row.household_amount, householdUnit: row.household_unit,
          originalText: row.original_text, aliases: aliasMap.get(row.ingredient_id) ?? [], optional: row.optional, importance: row.importance,
          category: ingredientMap.get(row.ingredient_id)?.category ?? 'other',
        })),
      }))
      const names = mealComponents.flatMap((component) => component.ingredients.map((ingredient) => ingredient.name))
      return {
        id: option.id, slot: option.meal_slot, title: option.title,
        summary: names.slice(0, 4).join(' · ') || 'Opción de la dieta', favorite: preference?.favorite ?? false,
        hidden: preference?.hidden ?? false, rating: preference?.rating ?? null, active: option.active, edited: option.edited,
        lastEatenAt: last?.eaten_at ?? null, components: mealComponents, note: option.notes ?? '',
      }
    }),
    history,
  }
}

function etagFor(version: string | number) {
  let hash = 2166136261
  for (const character of String(version)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return `"${(hash >>> 0).toString(16)}"`
}

export default async function handler(request?: Request) {
  try {
    const payload = await getBootstrap()
    const etag = etagFor(payload.version)
    if (request?.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'no-store' } })
    return json(payload, 200, { ETag: etag, 'X-Catalog-Version': payload.catalogVersion ?? '' })
  } catch (error) { return handleApiError(error) }
}
