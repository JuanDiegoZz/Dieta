import { handleApiError, isUuid, json, selectRows, upsertRows } from '../_lib/supabase'
import { mergePantryRow } from '../_lib/pantry'

export default async function handler(request: Request) {
  try {
    const id = request.url.split('/').pop() ?? ''
    if (!isUuid(id)) return json({ error: 'INVALID_ID', message: 'Ingrediente inválido.' }, 400)
    if (request.method !== 'PATCH') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await request.json() as Record<string, unknown>
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => key === 'available' || key === 'useSoon'))
    if (!Object.keys(patch).length || Object.values(patch).some((value) => typeof value !== 'boolean')) return json({ error: 'INVALID_PAYLOAD', message: 'available y useSoon deben ser boolean.' }, 400)
    const existing = (await selectRows<{ available: boolean; use_soon: boolean }>('pantry_items', 'available,use_soon', { ingredient_id: `eq.${id}`, limit: '1' }))[0]
    const row = mergePantryRow(id, patch as { available?: boolean; useSoon?: boolean }, existing)
    const [saved] = await upsertRows('pantry_items', [row], 'ingredient_id')
    return json(saved)
  } catch (error) { return handleApiError(error) }
}
