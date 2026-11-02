import { handleApiError, insertRows, isUuid, json, selectRows } from './_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from './_lib/http.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as Record<string, unknown> ?? {}
    if (body.id !== undefined && (typeof body.id !== 'string' || !isUuid(body.id) || body.eatenAt === undefined)) return json(response, { error: 'INVALID_PAYLOAD' }, 400)
    if (typeof body.mealOptionId !== 'string' || !isUuid(body.mealOptionId)) return json(response, { error: 'INVALID_PAYLOAD', message: 'mealOptionId es obligatorio.' }, 400)
    if (body.rating !== undefined && body.rating !== null && (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 4)) return json(response, { error: 'INVALID_PAYLOAD', message: 'rating debe estar entre 1 y 4.' }, 400)
    if (body.note !== undefined && body.note !== null && (typeof body.note !== 'string' || body.note.length > 500)) return json(response, { error: 'INVALID_PAYLOAD', message: 'La nota no puede superar 500 caracteres.' }, 400)
    const parsedDate = body.eatenAt === undefined ? new Date() : new Date(String(body.eatenAt))
    if (Number.isNaN(parsedDate.getTime())) return json(response, { error: 'INVALID_PAYLOAD', message: 'eatenAt no es valida.' }, 400)
    const eatenAt = parsedDate.toISOString()
    interface HistoryRow { id: string; meal_option_id: string; eaten_at: string; rating: number | null; note: string | null }
    const row = { ...(body.id ? { id: body.id } : {}), meal_option_id: body.mealOptionId, eaten_at: eatenAt, rating: body.rating ?? null, note: body.note ?? null }
    const [inserted] = await insertRows<HistoryRow>('meal_history', [row], true, !!body.id)
    const saved = inserted ?? (body.id ? (await selectRows<HistoryRow>('meal_history', 'id,meal_option_id,eaten_at,rating,note', { id: `eq.${body.id}`, limit: '1' }))[0] : undefined)
    if (!saved) return json(response, { error: 'HISTORY_UNCONFIRMED' }, 502)
    if (saved.meal_option_id !== body.mealOptionId || Date.parse(saved.eaten_at) !== Date.parse(eatenAt) || saved.rating !== row.rating || saved.note !== row.note) return json(response, { error: 'HISTORY_EVENT_CONFLICT' }, 409)
    return json(response, saved, inserted ? 201 : 200)
  } catch (error) { return handleApiError(response, error) }
}
