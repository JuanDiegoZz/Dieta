import { handleApiError, isUuid, json } from '../../_lib/supabase.js'
import { mergeIngredientRecords } from '../../_lib/admin-write.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from '../../_lib/http.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const parts = new URL(request.url ?? '/', 'http://localhost').pathname.split('/').filter(Boolean)
    const sourceId = parts[parts.length - 2] ?? ''
    if (!isUuid(sourceId)) return json(response, { error: 'INVALID_ID' }, 400)
    if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as { destinationId?: unknown } ?? {}
    if (typeof body.destinationId !== 'string' || !isUuid(body.destinationId) || body.destinationId === sourceId) return json(response, { error: 'INVALID_PAYLOAD', message: 'Selecciona un Ingredient destino distinto.' }, 400)
    return json(response, await mergeIngredientRecords(sourceId, body.destinationId))
  } catch (error) { return handleApiError(response, error) }
}
