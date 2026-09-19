import { describe, expect, it, vi } from 'vitest'
import health from '../../api/health.js'
import { mockRequest, mockResponse } from './node-mocks.js'

describe('health endpoint', () => {
  it('returns database ok when the minimal query responds', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[{"id":"1"}]', { status: 200 })))
    try {
      const output = mockResponse()
      const result = await health(mockRequest({ url: '/api/health' }), output.response)
      expect(result).toBeUndefined()
      expect(output.response.statusCode).toBe(200)
      expect(output.response.writableEnded).toBe(true)
      expect(JSON.parse(output.body)).toEqual({ status: 'ok', database: 'ok' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('returns degraded instead of hanging when Supabase never responds', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    vi.stubEnv('SUPABASE_HEALTH_TIMEOUT_MS', '25')
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    try {
      const output = mockResponse()
      const pending = health(mockRequest({ url: '/api/health' }), output.response)
      const response = await pending
      expect(response).toBeUndefined()
      expect(output.response.statusCode).toBe(503)
      expect(output.response.writableEnded).toBe(true)
      expect(JSON.parse(output.body)).toEqual({ status: 'degraded', database: 'timeout' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('returns degraded when the minimal Supabase query fails', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('upstream error', { status: 503 })))
    try {
      const output = mockResponse()
      await health(mockRequest({ url: '/api/health' }), output.response)
      expect(output.response.statusCode).toBe(503)
      expect(JSON.parse(output.body)).toEqual({ status: 'degraded', database: 'error' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})
