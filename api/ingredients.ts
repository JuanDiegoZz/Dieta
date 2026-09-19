import { handleApiError, insertRows, json, selectRows } from './_lib/supabase.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from './_lib/http.js'
import { normalizeName } from '../src/domain/ingredient-normalization.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as { canonicalName?: unknown; category?: unknown } ?? {}
    if (typeof body.canonicalName !== 'string' || !body.canonicalName.trim()) return json(response, { error: 'INVALID_PAYLOAD' }, 400)
    const normalized = normalizeName(body.canonicalName)
    const existing = await selectRows<{ id: string; canonical_name: string; category: string }>('ingredients', 'id,canonical_name,category', { normalized_name: `eq.${normalized}`, limit: '1' })
    if (existing[0]) return json(response, existing[0])
    const [created] = await insertRows('ingredients', [{ canonical_name: body.canonicalName.trim(), normalized_name: normalized, category: typeof body.category === 'string' ? body.category : 'other', active: true }])
    return json(response, created, 201)
  } catch (error) { return handleApiError(response, error) }
}
