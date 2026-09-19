import { handleApiError, isUuid, json, selectRows, upsertRows } from '../_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { mergePantryRow } from '../_lib/pantry.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const id = new URL(request.url ?? '/', 'http://localhost').pathname.split('/').filter(Boolean).pop() ?? ''
    if (!isUuid(id)) return json(response, { error: 'INVALID_ID', message: 'Ingrediente inválido.' }, 400)
    if (request.method !== 'PATCH') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as Record<string, unknown> ?? {}
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => key === 'available' || key === 'useSoon'))
    if (!Object.keys(patch).length || Object.values(patch).some((value) => typeof value !== 'boolean')) return json(response, { error: 'INVALID_PAYLOAD', message: 'available y useSoon deben ser boolean.' }, 400)
    const existing = (await selectRows<{ available: boolean; use_soon: boolean }>('pantry_items', 'available,use_soon', { ingredient_id: `eq.${id}`, limit: '1' }))[0]
    const row = mergePantryRow(id, patch as { available?: boolean; useSoon?: boolean }, existing)
    const [saved] = await upsertRows('pantry_items', [row], 'ingredient_id')
    return json(response, saved)
  } catch (error) { return handleApiError(response, error) }
}
