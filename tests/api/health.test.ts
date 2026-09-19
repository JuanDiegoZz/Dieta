import { describe, expect, it, vi } from 'vitest'
import health from '../../api/health.js'

describe('health endpoint', () => {
  it('returns database ok when the minimal query responds', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[{"id":"1"}]', { status: 200 })))
    try {
      const response = await health(new Request('http://localhost/api/health'))
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ status: 'ok', database: 'ok' })
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
      const pending = health(new Request('http://localhost/api/health'))
      const response = await pending
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({ status: 'degraded', database: 'timeout' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})
