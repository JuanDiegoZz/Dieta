import { isUuid, rpc } from './supabase.js'

export function assertUuid(value: unknown, message = 'ID inválido.') {
  if (typeof value !== 'string' || !isUuid(value)) throw new Error(message)
  return value
}

export function updateIngredientRecord(id: string, body: { canonicalName: string; normalizedName: string; category: string; aliases: Array<{ alias: string; normalizedAlias: string }> }) {
  return rpc<{ id: string }>('admin_update_ingredient', {
    p_ingredient_id: id,
    p_canonical_name: body.canonicalName,
    p_normalized_name: body.normalizedName,
    p_category: body.category,
    p_aliases: body.aliases,
  })
}

export function mergeIngredientRecords(sourceId: string, destinationId: string) {
  return rpc<{ sourceId: string; destinationId: string; relations: number }>('admin_merge_ingredients', { p_source_id: sourceId, p_destination_id: destinationId })
}

export function deleteMealRecord(id: string) {
  return rpc<{ id: string; deleted: boolean }>('admin_delete_meal', { p_meal_id: id })
}
