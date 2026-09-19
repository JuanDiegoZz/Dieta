import { handleApiError, insertRows, isUuid, json, selectRows, upsertRows } from './_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from './_lib/http.js'

const slots = new Set(['breakfast', 'midday', 'lunch', 'afternoon', 'dinner'])

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const startedAt = Date.now()
  console.info('weekly:start')
  try {
    if (request.method === 'GET') {
      console.info('weekly:query:start')
      const [plans] = await Promise.all([selectRows<{ id: string; start_date: string; name: string }>('weekly_plans', 'id,start_date,name', { order: 'start_date.desc', limit: '1' })])
      if (!plans[0]) {
        console.info(`weekly:query:done ${Date.now() - startedAt}ms`)
        console.info(`weekly:complete ${Date.now() - startedAt}ms`)
        return json(response, null)
      }
      const entries = await selectRows<{ id: string; planned_date: string; meal_slot: string; meal_option_id: string | null; locked: boolean }>('weekly_plan_entries', 'id,planned_date,meal_slot,meal_option_id,locked', { weekly_plan_id: `eq.${plans[0].id}`, order: 'planned_date.asc,meal_slot.asc' })
      console.info(`weekly:query:done ${Date.now() - startedAt}ms`)
      const output = { id: plans[0].id, startDate: plans[0].start_date, name: plans[0].name, entries: entries.map((entry) => ({ id: entry.id, plannedDate: entry.planned_date, slot: entry.meal_slot, mealOptionId: entry.meal_option_id, locked: entry.locked })) }
      console.info(`weekly:complete ${Date.now() - startedAt}ms`)
      return json(response, output)
    }
    if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as { id?: unknown; startDate?: unknown; name?: unknown; entries?: unknown } ?? {}
    if (typeof body.startDate !== 'string' || Number.isNaN(Date.parse(body.startDate)) || !Array.isArray(body.entries)) return json(response, { error: 'INVALID_PAYLOAD', message: 'startDate y entries son obligatorios.' }, 400)
    const entries = body.entries as Array<Record<string, unknown>>
    if (entries.some((entry) => typeof entry.plannedDate !== 'string' || typeof entry.slot !== 'string' || !slots.has(entry.slot) || (entry.mealOptionId !== null && !isUuid(String(entry.mealOptionId))) || typeof entry.locked !== 'boolean')) return json(response, { error: 'INVALID_PAYLOAD', message: 'Entrada semanal inválida.' }, 400)
    const planId = typeof body.id === 'string' && isUuid(body.id) ? body.id : undefined
    const [plan] = planId ? await upsertRows<{ id: string }>('weekly_plans', [{ id: planId, start_date: body.startDate, name: typeof body.name === 'string' ? body.name.slice(0, 80) : 'Mi semana' }], 'id') : await insertRows<{ id: string }>('weekly_plans', [{ start_date: body.startDate, name: typeof body.name === 'string' ? body.name.slice(0, 80) : 'Mi semana' }])
    const rows = entries.map((entry) => ({ id: typeof entry.id === 'string' && isUuid(entry.id) ? entry.id : undefined, weekly_plan_id: plan.id, planned_date: entry.plannedDate, meal_slot: entry.slot, meal_option_id: entry.mealOptionId, locked: entry.locked }))
    if (rows.length) await upsertRows('weekly_plan_entries', rows, 'weekly_plan_id,planned_date,meal_slot')
    console.info(`weekly:complete ${Date.now() - startedAt}ms`)
    return json(response, { ...body, id: plan.id })
  } catch (error) {
    console.error(`weekly:error duration=${Date.now() - startedAt}ms`)
    return handleApiError(response, error)
  }
}
