import { describe, expect, it, vi } from 'vitest'
import handler from '../../api/history.js'
import { mockRequest, mockResponse } from './node-mocks.js'

const id = '11111111-1111-4111-8111-111111111111'
const mealOptionId = '22222222-2222-4222-8222-222222222222'
const eatenAt = '2026-11-01T12:00:00.000Z'
const saved = { id, meal_option_id: mealOptionId, eaten_at: eatenAt, rating: null, note: null }

describe('preparation idempotency', () => {
  it.each([false, true])('confirms a stable event, duplicate=%s', async (duplicate) => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => new Response(JSON.stringify(init?.method === 'POST' ? duplicate ? [] : [saved] : [saved]), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      const output = mockResponse()
      await handler(mockRequest({ method: 'POST', body: { id, mealOptionId, eatenAt } }), output.response)
      expect(output.response.statusCode).toBe(duplicate ? 200 : 201)
      expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))[0].id).toBe(id)
      expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('prefer')).toContain('resolution=ignore-duplicates')
      expect(fetcher).toHaveBeenCalledTimes(duplicate ? 2 : 1)
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })
  it('rejects an invalid event ID before contacting Supabase', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    try {
      const output = mockResponse()
      await handler(mockRequest({ method: 'POST', body: { id: 'bad', mealOptionId } }), output.response)
      expect(output.response.statusCode).toBe(400)
      expect(fetcher).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })
  it('never overwrites an existing event with different content', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('[]', { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify([{ ...saved, meal_option_id: id }]), { status: 200 }))
    vi.stubGlobal('fetch', fetcher); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      const output = mockResponse()
      await handler(mockRequest({ method: 'POST', body: { id, mealOptionId, eatenAt } }), output.response)
      expect(output.response.statusCode).toBe(409)
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })
})
