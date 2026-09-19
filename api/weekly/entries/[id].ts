import { deleteRows, handleApiError, isUuid, json, patchRows } from '../../_lib/supabase'

export default async function handler(request: Request) {
  try {
    const id = request.url.split('/').pop() ?? ''
    if (!isUuid(id)) return json({ error: 'INVALID_ID' }, 400)
    if (request.method === 'DELETE') { await deleteRows('weekly_plan_entries', { id: `eq.${id}` }); return new Response(null, { status: 204 }) }
    if (request.method === 'PATCH') {
      const body = await request.json() as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      if (typeof body.locked === 'boolean') patch.locked = body.locked
      if (body.mealOptionId === null || (typeof body.mealOptionId === 'string' && isUuid(body.mealOptionId))) patch.meal_option_id = body.mealOptionId
      if (!Object.keys(patch).length) return json({ error: 'INVALID_PAYLOAD' }, 400)
      const [saved] = await patchRows('weekly_plan_entries', { id: `eq.${id}` }, patch)
      return json(saved)
    }
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  } catch (error) { return handleApiError(error) }
}
