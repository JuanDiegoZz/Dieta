import { deleteRows, handleApiError, isUuid, json, patchRows } from '../../_lib/supabase.js'
import { empty, pathSegment, readJsonBody, type ApiRequest, type ApiResponse } from '../../_lib/http.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const id = pathSegment(request)
    if (!isUuid(id)) return json(response, { error: 'INVALID_ID' }, 400)
    if (request.method === 'DELETE') {
      await deleteRows('weekly_plan_entries', { id: `eq.${id}` })
      return empty(response, 204)
    }
    if (request.method === 'PATCH') {
      const body = await readJsonBody(request) as Record<string, unknown> ?? {}
      const patch: Record<string, unknown> = {}
      if (typeof body.locked === 'boolean') patch.locked = body.locked
      if (body.mealOptionId === null || (typeof body.mealOptionId === 'string' && isUuid(body.mealOptionId))) patch.meal_option_id = body.mealOptionId
      if (!Object.keys(patch).length) return json(response, { error: 'INVALID_PAYLOAD' }, 400)
      const [saved] = await patchRows('weekly_plan_entries', { id: `eq.${id}` }, patch)
      return json(response, saved)
    }
    return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
  } catch (error) { return handleApiError(response, error) }
}
