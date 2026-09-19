import { handleApiError, json } from './_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from './_lib/http.js'
import { saveMealRecord, validateMealPayload } from './_lib/meal-write.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request)
    if (!validateMealPayload(body)) return json(response, { error: 'INVALID_PAYLOAD', message: 'La comida o sus ingredientes son inválidos.' }, 400)
    return json(response, await saveMealRecord(body), 201)
  } catch (error) { return handleApiError(response, error) }
}
