import { handleApiError, insertRows, isUuid, json, selectRows, upsertRows } from './_lib/supabase'

const slots = new Set(['breakfast', 'midday', 'lunch', 'afternoon', 'dinner'])

export default async function handler(request: Request) {
  try {
    if (request.method === 'GET') {
      const [plans] = await Promise.all([selectRows<{ id: string; start_date: string; name: string }>('weekly_plans', 'id,start_date,name', { order: 'start_date.desc', limit: '1' })])
      if (!plans[0]) return json(null)
      const entries = await selectRows<{ id: string; planned_date: string; meal_slot: string; meal_option_id: string | null; locked: boolean }>('weekly_plan_entries', 'id,planned_date,meal_slot,meal_option_id,locked', { weekly_plan_id: `eq.${plans[0].id}`, order: 'planned_date.asc,meal_slot.asc' })
      return json({ id: plans[0].id, startDate: plans[0].start_date, name: plans[0].name, entries: entries.map((entry) => ({ id: entry.id, plannedDate: entry.planned_date, slot: entry.meal_slot, mealOptionId: entry.meal_option_id, locked: entry.locked })) })
    }
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await request.json() as { id?: unknown; startDate?: unknown; name?: unknown; entries?: unknown }
    if (typeof body.startDate !== 'string' || Number.isNaN(Date.parse(body.startDate)) || !Array.isArray(body.entries)) return json({ error: 'INVALID_PAYLOAD', message: 'startDate y entries son obligatorios.' }, 400)
    const planId = typeof body.id === 'string' && isUuid(body.id) ? body.id : undefined
    const [plan] = planId ? await upsertRows<{ id: string }>('weekly_plans', [{ id: planId, start_date: body.startDate, name: typeof body.name === 'string' ? body.name.slice(0, 80) : 'Mi semana' }], 'id') : await insertRows<{ id: string }>('weekly_plans', [{ start_date: body.startDate, name: typeof body.name === 'string' ? body.name.slice(0, 80) : 'Mi semana' }])
    const entries = body.entries as Array<Record<string, unknown>>
    if (entries.some((entry) => typeof entry.plannedDate !== 'string' || typeof entry.slot !== 'string' || !slots.has(entry.slot) || (entry.mealOptionId !== null && !isUuid(String(entry.mealOptionId))) || typeof entry.locked !== 'boolean')) return json({ error: 'INVALID_PAYLOAD', message: 'Entrada semanal inválida.' }, 400)
    const rows = entries.map((entry) => ({ id: typeof entry.id === 'string' && isUuid(entry.id) ? entry.id : undefined, weekly_plan_id: plan.id, planned_date: entry.plannedDate, meal_slot: entry.slot, meal_option_id: entry.mealOptionId, locked: entry.locked }))
    if (rows.length) await upsertRows('weekly_plan_entries', rows, 'weekly_plan_id,planned_date,meal_slot')
    return json({ ...body, id: plan.id })
  } catch (error) { return handleApiError(error) }
}
