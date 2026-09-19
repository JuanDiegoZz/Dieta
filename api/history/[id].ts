import { deleteRows, handleApiError, isUuid, json } from '../_lib/supabase.js'

export default async function handler(request: Request) {
  try {
    const id = request.url.split('/').pop() ?? ''
    if (!isUuid(id)) return json({ error: 'INVALID_ID', message: 'Historial inválido.' }, 400)
    if (request.method !== 'DELETE') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
    await deleteRows('meal_history', { id: `eq.${id}` })
    return new Response(null, { status: 204 })
  } catch (error) { return handleApiError(error) }
}
