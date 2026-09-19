import { handleApiError, isUuid, json, upsertRows } from '../_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js'

const allowed = new Set(['favorite', 'hidden', 'rating'])

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const id = new URL(request.url ?? '/', 'http://localhost').pathname.split('/').filter(Boolean).pop() ?? ''
    if (!isUuid(id)) return json(response, { error: 'INVALID_ID', message: 'MealOption inválida.' }, 400)
    if (request.method !== 'PATCH') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as Record<string, unknown> ?? {}
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.has(key)))
    if (!Object.keys(patch).length) return json(response, { error: 'INVALID_PAYLOAD', message: 'No hay campos editables.' }, 400)
    if ('favorite' in patch && typeof patch.favorite !== 'boolean') return json(response, { error: 'INVALID_PAYLOAD', message: 'favorite debe ser boolean.' }, 400)
    if ('hidden' in patch && typeof patch.hidden !== 'boolean') return json(response, { error: 'INVALID_PAYLOAD', message: 'hidden debe ser boolean.' }, 400)
    if ('rating' in patch && patch.rating !== null && (!Number.isInteger(patch.rating) || Number(patch.rating) < 1 || Number(patch.rating) > 4)) return json(response, { error: 'INVALID_PAYLOAD', message: 'rating debe estar entre 1 y 4.' }, 400)
    const [saved] = await upsertRows('meal_preferences', [{ meal_option_id: id, ...patch }], 'meal_option_id')
    return json(response, saved)
  } catch (error) { return handleApiError(response, error) }
}
