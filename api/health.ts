import { ApiError, json, selectRows } from './_lib/supabase.js'
import { type ApiRequest, type ApiResponse } from './_lib/http.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const startedAt = Date.now()
  console.info('health:start')
  try {
    if (request.method !== 'GET') return json(response, { error: 'METHOD_NOT_ALLOWED' }, 405)
    const configuredTimeout = Number(process.env.SUPABASE_HEALTH_TIMEOUT_MS)
    await selectRows<{ id: string }>('meal_options', 'id', { limit: '1' }, { timeoutMs: configuredTimeout > 0 ? configuredTimeout : 4000 })
    console.info(`health:done status=200 duration=${Date.now() - startedAt}ms`)
    return json(response, { status: 'ok', database: 'ok' })
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DATA_PROVIDER_TIMEOUT') {
      console.error(`health:done status=503 database=timeout duration=${Date.now() - startedAt}ms`)
      return json(response, { status: 'degraded', database: 'timeout' }, 503)
    }
    console.error(`health:done status=503 database=error duration=${Date.now() - startedAt}ms`)
    return json(response, { status: 'degraded', database: 'error' }, 503)
  }
}
