import { describe, expect, it, vi } from 'vitest'
import { getBootstrap } from '../../api/_lib/bootstrap.js'
import weekly from '../../api/weekly.js'
import { mockRequest, mockResponse } from './node-mocks.js'

describe('BFF timeout resilience', () => {
  it('does not leave bootstrap pending when Supabase hangs', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    vi.stubEnv('SUPABASE_REQUEST_TIMEOUT_MS', '25')
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    try {
      const pending = getBootstrap()
      await expect(pending).rejects.toMatchObject({ code: 'DATA_PROVIDER_TIMEOUT' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('returns a controlled response when weekly Supabase access hangs', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    vi.stubEnv('SUPABASE_REQUEST_TIMEOUT_MS', '25')
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    try {
      const output = mockResponse()
      const pending = weekly(mockRequest({ url: '/api/weekly' }), output.response)
      await Promise.resolve()
      const response = await pending
      expect(response).toBeUndefined()
      expect(output.response.statusCode).toBe(504)
      expect(JSON.parse(output.body)).toMatchObject({ error: 'DATA_PROVIDER_TIMEOUT' })
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})
