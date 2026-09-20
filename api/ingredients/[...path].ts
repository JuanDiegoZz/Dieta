import { handleApiError, isUuid, json } from '../_lib/supabase.js'
import { assertUuid, mergeIngredientRecords, updateIngredientRecord } from '../_lib/admin-write.js'
import { readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js'
import { normalizeName } from '../../src/domain/ingredient-normalization.js'

function getRoute(request: ApiRequest) {
  const parts = new URL(request.url ?? '/', 'http://localhost').pathname.split('/').filter(Boolean)
  if (parts[0] !== 'api' || parts[1] !== 'ingredients') return null
  if (parts.length === 3) return { id: parts[2] ?? '', merge: false }
  if (parts.length === 4 && parts[3] === 'merge') return { id: parts[2] ?? '', merge: true }
  return null
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const route = getRoute(request)
    if (!route) return json(response, { error: 'NOT_FOUND' }, 404)
    if (!isUuid(route.id)) return json(response, { error: 'INVALID_ID' }, 400)

    if (route.merge) {
      if (request.method !== 'POST') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
      const body = await readJsonBody(request) as { destinationId?: unknown } ?? {}
      if (typeof body.destinationId !== 'string' || !isUuid(body.destinationId) || body.destinationId === route.id) {
        return json(response, { error: 'INVALID_PAYLOAD', message: 'Selecciona un Ingredient destino distinto.' }, 400)
      }
      return json(response, await mergeIngredientRecords(route.id, body.destinationId))
    }

    if (request.method !== 'PATCH') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const body = await readJsonBody(request) as Record<string, unknown> ?? {}
    const canonicalName = typeof body.canonicalName === 'string' ? body.canonicalName.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : 'other'
    const rawAliases = Array.isArray(body.aliases) ? body.aliases.filter((alias): alias is string => typeof alias === 'string') : []
    if (!canonicalName || rawAliases.length !== (Array.isArray(body.aliases) ? body.aliases.length : 0)) {
      return json(response, { error: 'INVALID_PAYLOAD', message: 'El nombre y aliases deben ser texto válido.' }, 400)
    }
    const aliases = rawAliases
      .map((alias) => ({ alias: alias.trim(), normalizedAlias: normalizeName(alias) }))
      .filter((value) => !!value.normalizedAlias)
      .filter((value, index, values) => values.findIndex((item) => item.normalizedAlias === value.normalizedAlias) === index)
    const result = await updateIngredientRecord(assertUuid(route.id), {
      canonicalName,
      normalizedName: normalizeName(canonicalName),
      category,
      aliases,
    })
    return json(response, result)
  } catch (error) {
    return handleApiError(response, error)
  }
}
