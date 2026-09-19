import { deleteRows, handleApiError, isUuid, json } from '../_lib/supabase.js'
import { empty, pathSegment, type ApiRequest, type ApiResponse } from '../_lib/http.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const id = pathSegment(request)
    if (!isUuid(id)) return json(response, { error: 'INVALID_ID', message: 'Historial inválido.' }, 400)
    if (request.method !== 'DELETE') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    await deleteRows('meal_history', { id: `eq.${id}` })
    return empty(response, 204)
  } catch (error) { return handleApiError(response, error) }
}
