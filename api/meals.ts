import { handleApiError, json } from './_lib/supabase.js'
import { saveMealRecord, validateMealPayload } from './_lib/meal-write.js'

export default async function handler(request: Request) {
  try {
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await request.json()
    if (!validateMealPayload(body)) return json({ error: 'INVALID_PAYLOAD', message: 'La comida o sus ingredientes son inválidos.' }, 400)
    return json(await saveMealRecord(body), 201)
  } catch (error) { return handleApiError(error) }
}
