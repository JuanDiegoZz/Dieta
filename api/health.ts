import { handleApiError, json, selectRows } from './_lib/supabase'

export default async function handler(request?: Request) {
  try {
    if (request && request.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
    await selectRows<{ id: string }>('meal_options', 'id', { limit: '1' })
    return json({ status: 'ok', database: 'ok' })
  } catch (error) {
    const response = handleApiError(error)
    return json({ status: 'error', database: 'error' }, response.status)
  }
}
