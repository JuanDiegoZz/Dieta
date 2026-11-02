import { describe, expect, it, vi } from 'vitest'
import { buildSupabaseHeaders, isUuid, rpc, selectAllRows } from '../../api/_lib/supabase.js'

describe('Supabase REST headers', () => {
  it.each(['meal_preferences', 'pantry_items'])('diagnoses a 401 safely and allows a later read of %s', async (table) => {
    const requestId = '12345678-1234-1234-1234-123456789abc'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'PGRST301', message: 'private-provider-message', details: 'private-details' }), { status: 401, headers: { 'sb-request-id': requestId } }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_private')
    vi.stubEnv('VERCEL_ENV', 'preview')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(selectAllRows(table, '*')).rejects.toMatchObject({ status: 502, code: 'DATA_PROVIDER_ERROR' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const output = log.mock.calls.flat().join(' ')
      expect(output).toContain(`table=${table} operation=select status=401 providerCode=PGRST301 requestId=${requestId} authMode=secret-apikey environment=preview`)
      expect(output).not.toMatch(/private|https:\/\//)
      await expect(selectAllRows(table, '*')).resolves.toEqual([])
    } finally { log.mockRestore(); vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })

  it('does not log arbitrary provider codes or request header values', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'sb_secret_private' }), { status: 401, headers: { 'sb-request-id': 'private-token' } })))
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_private')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(selectAllRows('meal_preferences', '*')).rejects.toMatchObject({ code: 'DATA_PROVIDER_ERROR' })
      const output = log.mock.calls.flat().join(' ')
      expect(output).toContain('providerCode=unclassified requestId=unavailable')
      expect(output).not.toContain('private')
    } finally { log.mockRestore(); vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })

  it('sends secret keys only as apikey, never as a bearer token', () => {
    const headers = buildSupabaseHeaders('sb_secret_test')

    expect(headers.get('apikey')).toBe('sb_secret_test')
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('keeps legacy JWT fallback compatible', () => {
    const headers = buildSupabaseHeaders('legacy-service-role-jwt', true)

    expect(headers.get('apikey')).toBe('legacy-service-role-jwt')
    expect(headers.get('authorization')).toBe('Bearer legacy-service-role-jwt')
  })

  it('accepts PostgreSQL UUIDs without imposing RFC version bits', () => {
    expect(isUuid('9bd5a6b3-8604-448f-66d0-ac1bc82cc43c')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
  })

  it('paginates REST results beyond the provider page limit', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const rows = offset === 0 ? Array.from({ length: 1000 }, (_, index) => ({ id: String(index) })) : [{ id: '1000' }]
      return new Response(JSON.stringify(rows), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      const rows = await selectAllRows<{ id: string }>('dish_ingredients', 'id')
      expect(rows).toHaveLength(1001)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('aborts a Supabase request that never responds', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      const request = selectAllRows('meal_options', 'id', {}, { timeoutMs: 25 })
      await expect(request).rejects.toMatchObject({ code: 'DATA_PROVIDER_TIMEOUT' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('stops pagination when the provider returns an error', async () => {
    const fetchMock = vi.fn(async () => new Response('upstream error', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      await expect(selectAllRows('meal_options', 'id')).rejects.toMatchObject({ code: 'DATA_PROVIDER_ERROR' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('invokes Postgres RPC through the server-side REST boundary', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://example.supabase.co/rest/v1/rpc/admin_save_meal')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ payload: { title: 'Prueba' }, existing_id: null })
      return new Response(JSON.stringify({ id: 'meal-1' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      await expect(rpc<{ id: string }>('admin_save_meal', { payload: { title: 'Prueba' }, existing_id: null })).resolves.toEqual({ id: 'meal-1' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('maps validated RPC conflicts to safe API errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: '23503', message: 'referenced row' }), { status: 400 })))
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      await expect(rpc('admin_delete_meal', { p_meal_id: 'meal-1' })).rejects.toMatchObject({ status: 409, code: 'ADMIN_REFERENCE_CONFLICT' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})
