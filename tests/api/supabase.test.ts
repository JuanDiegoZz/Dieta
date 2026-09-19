import { describe, expect, it, vi } from 'vitest'
import { buildSupabaseHeaders, isUuid, selectAllRows } from '../../api/_lib/supabase.js'

describe('Supabase REST headers', () => {
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
})
