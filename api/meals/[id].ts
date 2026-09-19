import { handleApiError, isUuid, json, patchRows } from '../_lib/supabase.js'
import { saveMealRecord, validateMealPayload } from '../_lib/meal-write.js'

export default async function handler(request: Request) {
  try {
    const id = request.url.split('/').pop() ?? ''
    if (!isUuid(id)) return json({ error: 'INVALID_ID' }, 400)
    if (request.method === 'PATCH') {
      const body = await request.json()
      if (!validateMealPayload(body)) return json({ error: 'INVALID_PAYLOAD', message: 'La comida o sus ingredientes son inválidos.' }, 400)
      return json(await saveMealRecord(body, id))
    }
    if (request.method === 'DELETE') {
      await patchRows('meal_options', { id: `eq.${id}` }, { active: false, edited: true })
      return new Response(null, { status: 204 })
    }
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  } catch (error) { return handleApiError(error) }
}
