import { describe, expect, it, vi } from 'vitest'
import bootstrap from '../../api/bootstrap.js'
import history from '../../api/history.js'
import preferences from '../../api/preferences/[id].js'
import weekly from '../../api/weekly.js'
import { mockRequest, mockResponse } from './node-mocks.js'

function stubSupabase(rows: unknown[] = []) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })))
}

describe('Vercel Node handler contract', () => {
  it('finalizes health-like method errors through the Node response', async () => {
    const output = mockResponse()
    const result = await history(mockRequest({ method: 'GET' }), output.response)
    expect(result).toBeUndefined()
    expect(output.response.statusCode).toBe(405)
    expect(output.response.writableEnded).toBe(true)
  })

  it('finalizes bootstrap and supports Node headers for a 304', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    stubSupabase()
    try {
      const first = mockResponse()
      const firstResult = await bootstrap(mockRequest({ url: '/api/bootstrap' }), first.response)
      expect(firstResult).toBeUndefined()
      expect(first.response.writableEnded).toBe(true)
      const etag = first.headers.get('etag')
      expect(etag).toBeTruthy()

      const second = mockResponse()
      const secondResult = await bootstrap(mockRequest({ url: '/api/bootstrap', headers: { 'if-none-match': String(etag) } }), second.response)
      expect(secondResult).toBeUndefined()
      expect(second.response.statusCode).toBe(304)
      expect(second.response.writableEnded).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('finalizes weekly GET through the Node response', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    stubSupabase()
    try {
      const output = mockResponse()
      const result = await weekly(mockRequest({ url: '/api/weekly' }), output.response)
      expect(result).toBeUndefined()
      expect(output.response.statusCode).toBe(200)
      expect(output.response.writableEnded).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('reads parsed Node request bodies for PATCH handlers', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    stubSupabase([{ meal_option_id: '9bd5a6b3-8604-448f-66d0-ac1bc82cc43c', favorite: true }])
    try {
      const output = mockResponse()
      const result = await preferences(mockRequest({ method: 'PATCH', url: '/api/preferences/9bd5a6b3-8604-448f-66d0-ac1bc82cc43c', body: { favorite: true } }), output.response)
      expect(result).toBeUndefined()
      expect(output.response.statusCode).toBe(200)
      expect(output.response.writableEnded).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})
