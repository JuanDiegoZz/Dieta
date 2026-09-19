import { handleApiError, isUuid, json, patchRows } from '../_lib/supabase.js'
import { deleteMealRecord } from '../_lib/admin-write.js'
import { empty, pathSegment, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { saveMealRecord, validateMealPayload } from '../_lib/meal-write.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const id = pathSegment(request)
    if (!isUuid(id)) return json(response, { error: 'INVALID_ID' }, 400)
    if (request.method === 'PATCH') {
      const body = await readJsonBody(request)
      if (!validateMealPayload(body)) return json(response, { error: 'INVALID_PAYLOAD', message: 'La comida o sus ingredientes son inválidos.' }, 400)
      return json(response, await saveMealRecord(body, id))
    }
    if (request.method === 'DELETE') {
      if (new URL(request.url ?? '/', 'http://localhost').searchParams.get('permanent') === 'true') {
        await deleteMealRecord(id)
        return empty(response, 204)
      }
      await patchRows('meal_options', { id: `eq.${id}` }, { active: false, edited: true })
      return empty(response, 204)
    }
    return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
  } catch (error) { return handleApiError(response, error) }
}
