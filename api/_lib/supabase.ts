export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

const DEFAULT_TIMEOUT_MS = 8000
const MAX_PAGES = 100

export interface SupabaseRequestOptions {
  timeoutMs?: number
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const key = secretKey ?? legacyKey
  if (!url || !key) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'La conexion de datos no esta configurada.')
  if (url.includes('/rest/v1')) throw new ApiError(500, 'SUPABASE_INVALID_URL', 'SUPABASE_URL debe ser la URL base sin /rest/v1/.')
  return { url, key, legacyJwt: !secretKey && !!legacyKey }
}

export function buildSupabaseHeaders(key: string, legacyJwt = false, initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders)
  headers.set('apikey', key)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (legacyJwt) headers.set('Authorization', `Bearer ${key}`)
  else headers.delete('Authorization')
  return headers
}

async function request<T>(table: string, init: RequestInit = {}, query = '', options: SupabaseRequestOptions = {}): Promise<T> {
  const { url, key, legacyJwt } = config()
  const operation = init.method === 'POST' ? 'insert' : init.method === 'PATCH' ? 'update' : init.method === 'DELETE' ? 'delete' : 'select'
  const configuredTimeout = Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS)
  const timeoutMs = options.timeoutMs ?? (configuredTimeout > 0 ? configuredTimeout : DEFAULT_TIMEOUT_MS)
  const controller = new AbortController()
  const startedAt = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new ApiError(504, 'DATA_PROVIDER_TIMEOUT', 'El proveedor de datos tardo demasiado.'))
    }, timeoutMs)
  })
  console.info(`supabase:start table=${table} operation=${operation}`)
  try {
    const request = (async () => {
      const response = await fetch(`${url}/rest/v1/${table}${query}`, {
        ...init,
        signal: controller.signal,
        headers: buildSupabaseHeaders(key, legacyJwt, init.headers),
      })
      if (!response.ok) {
        console.error(`supabase:error table=${table} status=${response.status} duration=${Date.now() - startedAt}ms`)
        throw new ApiError(502, 'DATA_PROVIDER_ERROR', 'No se pudo consultar el catalogo.')
      }
      return { status: response.status, value: response.status === 204 ? undefined : await response.json() as T }
    })()
    const result = await Promise.race([request, timeout])
    console.info(`supabase:done table=${table} status=${result.status} duration=${Date.now() - startedAt}ms`)
    return result.value as T
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DATA_PROVIDER_TIMEOUT') {
      console.error(`supabase:timeout table=${table} duration=${Date.now() - startedAt}ms`)
      throw error
    }
    if (error instanceof ApiError) throw error
    console.error(`supabase:error table=${table} status=network duration=${Date.now() - startedAt}ms`)
    throw new ApiError(502, 'DATA_PROVIDER_ERROR', 'No se pudo consultar el catalogo.')
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

export function selectRows<T>(table: string, select: string, filters: Record<string, string> = {}, options: SupabaseRequestOptions = {}) {
  const params = new URLSearchParams({ select, ...filters })
  return request<T[]>(table, {}, `?${params.toString()}`, options)
}

export async function selectAllRows<T>(table: string, select: string, filters: Record<string, string> = {}, options: SupabaseRequestOptions = {}) {
  const rows: T[] = []
  const pageSize = Math.min(Math.max(Number(filters.limit ?? 1000) || 1000, 1), 1000)
  let offset = Number(filters.offset ?? 0) || 0
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const page = await selectRows<T>(table, select, { ...filters, limit: String(pageSize), offset: String(offset) }, options)
    rows.push(...page)
    if (page.length < pageSize) return rows
    offset += page.length
  }
  throw new ApiError(502, 'DATA_PROVIDER_PAGINATION_LIMIT', 'La respuesta del proveedor de datos no termino correctamente.')
}

export function insertRows<T>(table: string, rows: Record<string, unknown>[], returning = true) {
  return request<T[]>(table, {
    method: 'POST',
    headers: { Prefer: returning ? 'return=representation' : 'return=minimal' },
    body: JSON.stringify(rows),
  })
}

export function upsertRows<T>(table: string, rows: Record<string, unknown>[], conflict: string) {
  const params = new URLSearchParams({ on_conflict: conflict })
  return request<T[]>(table, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation,missing=default' },
    body: JSON.stringify(rows),
  }, `?${params.toString()}`)
}

export function patchRows<T>(table: string, filters: Record<string, string>, body: Record<string, unknown>) {
  const params = new URLSearchParams(filters)
  return request<T[]>(table, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  }, `?${params.toString()}`)
}

export function deleteRows(table: string, filters: Record<string, string>) {
  const params = new URLSearchParams(filters)
  return request<undefined>(table, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, `?${params.toString()}`)
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders } })
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return json({ error: error.code, message: error.message }, error.status)
  console.error('api:error unexpected')
  return json({ error: 'INTERNAL_ERROR', message: 'Ocurrio un error inesperado.' }, 500)
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
