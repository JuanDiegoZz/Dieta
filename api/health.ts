import { ApiError, handleApiError, json, selectRows } from './_lib/supabase.js'

export default async function handler(request?: Request) {
  const startedAt = Date.now()
  console.info('health:start')
  try {
    if (request && request.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
    const configuredTimeout = Number(process.env.SUPABASE_HEALTH_TIMEOUT_MS)
    await selectRows<{ id: string }>('meal_options', 'id', { limit: '1' }, { timeoutMs: configuredTimeout > 0 ? configuredTimeout : 4000 })
    console.info(`health:done status=200 duration=${Date.now() - startedAt}ms`)
    return json({ status: 'ok', database: 'ok' })
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DATA_PROVIDER_TIMEOUT') {
      console.error(`health:done status=503 database=timeout duration=${Date.now() - startedAt}ms`)
      return json({ status: 'degraded', database: 'timeout' }, 503)
    }
    const response = handleApiError(error)
    console.error(`health:done status=503 database=error duration=${Date.now() - startedAt}ms`)
    return json({ status: 'degraded', database: 'error' }, response.status >= 500 ? 503 : response.status)
  }
}
