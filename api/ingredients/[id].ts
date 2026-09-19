import { handleApiError, isUuid, json } from '../_lib/supabase.js'
import { assertUuid, updateIngredientRecord } from '../_lib/admin-write.js'
import { pathSegment, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { normalizeName } from '../../src/domain/ingredient-normalization.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const id = pathSegment(request)
    if (!isUuid(id)) return json(response, { error: 'INVALID_ID' }, 400)
    if (request.method !== 'PATCH') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as Record<string, unknown> ?? {}
    const canonicalName = typeof body.canonicalName === 'string' ? body.canonicalName.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : 'other'
    const rawAliases = Array.isArray(body.aliases) ? body.aliases.filter((alias): alias is string => typeof alias === 'string') : []
    if (!canonicalName || rawAliases.length !== (Array.isArray(body.aliases) ? body.aliases.length : 0)) return json(response, { error: 'INVALID_PAYLOAD', message: 'El nombre y aliases deben ser texto válido.' }, 400)
    const aliases = rawAliases
      .map((alias) => ({ alias: alias.trim(), normalizedAlias: normalizeName(alias) }))
      .filter((value) => !!value.normalizedAlias)
      .filter((value, index, values) => values.findIndex((item) => item.normalizedAlias === value.normalizedAlias) === index)
    const result = await updateIngredientRecord(assertUuid(id), { canonicalName, normalizedName: normalizeName(canonicalName), category, aliases })
    return json(response, result)
  } catch (error) { return handleApiError(response, error) }
}
