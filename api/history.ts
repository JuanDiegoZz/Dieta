import { handleApiError, insertRows, isUuid, json } from './_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from './_lib/http.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as Record<string, unknown> ?? {}
    if (typeof body.mealOptionId !== 'string' || !isUuid(body.mealOptionId)) return json(response, { error: 'INVALID_PAYLOAD', message: 'mealOptionId es obligatorio.' }, 400)
    if (body.rating !== undefined && body.rating !== null && (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 4)) return json(response, { error: 'INVALID_PAYLOAD', message: 'rating debe estar entre 1 y 4.' }, 400)
    if (body.note !== undefined && body.note !== null && (typeof body.note !== 'string' || body.note.length > 500)) return json(response, { error: 'INVALID_PAYLOAD', message: 'La nota no puede superar 500 caracteres.' }, 400)
    const parsedDate = body.eatenAt === undefined ? new Date() : new Date(String(body.eatenAt))
    if (Number.isNaN(parsedDate.getTime())) return json(response, { error: 'INVALID_PAYLOAD', message: 'eatenAt no es valida.' }, 400)
    const eatenAt = parsedDate.toISOString()
    const [saved] = await insertRows('meal_history', [{ meal_option_id: body.mealOptionId, eaten_at: eatenAt, rating: body.rating ?? null, note: body.note ?? null }])
    return json(response, saved, 201)
  } catch (error) { return handleApiError(response, error) }
}
