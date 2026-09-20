import { describe, expect, it, vi } from 'vitest'
import meals from '../../api/meals.js'
import mealById from '../../api/meals/[id].js'
import ingredientPath from '../../api/ingredients/[...path].js'
import ingredients from '../../api/ingredients.js'
import { mockRequest, mockResponse } from './node-mocks.js'

function stubRpc(result: unknown = { id: '11111111-1111-4111-8111-111111111111' }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    expect(String(input)).toContain('/rest/v1/rpc/')
    return new Response(JSON.stringify(result), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  return fetchMock
}

const payload = { slot: 'lunch', title: 'Temporal', components: [{ label: 'Principal', ingredients: [{ name: 'Pollo', ingredientId: '22222222-2222-4222-8222-222222222222', amount: 150, unit: 'g' }] }] }

describe('admin Node handlers', () => {
  it('saves a complete meal through one RPC request', async () => {
    const fetchMock = stubRpc()
    try {
      const output = mockResponse()
      await meals(mockRequest({ method: 'POST', body: payload }), output.response)
      expect(output.response.statusCode).toBe(201)
      expect(output.response.writableEnded).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(String(fetchMock.mock.calls[0][0])).toContain('/admin_save_meal')
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })

  it('updates ingredients through the atomic ingredient RPC', async () => {
    const fetchMock = stubRpc({ id: '22222222-2222-4222-8222-222222222222' })
    try {
      const output = mockResponse()
      await ingredientPath(mockRequest({ method: 'PATCH', url: '/api/ingredients/22222222-2222-4222-8222-222222222222', body: { canonicalName: 'Pollo', aliases: ['ave'] } }), output.response)
      expect(output.response.statusCode).toBe(200)
      expect(output.response.writableEnded).toBe(true)
      expect(String(fetchMock.mock.calls[0][0])).toContain('/admin_update_ingredient')
      expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('22222222-2222-4222-8222-222222222222')
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })

  it('creates global ingredients with an explicit UUID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: '44444444-4444-4444-8444-444444444444', canonical_name: 'Cilantro', category: 'other' }]), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    try {
      const output = mockResponse()
      await ingredients(mockRequest({ method: 'POST', body: { canonicalName: 'Cilantro' } }), output.response)
      expect(output.response.statusCode).toBe(201)
      expect(output.response.writableEnded).toBe(true)
      const inserted = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as Array<{ id?: string }>
      expect(inserted[0]?.id).toMatch(/^[0-9a-f-]{36}$/i)
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })

  it('finalizes merge and permanent-delete responses through Node res', async () => {
    const fetchMock = stubRpc({ deleted: true })
    try {
      const mergeOutput = mockResponse()
      await ingredientPath(mockRequest({ method: 'POST', url: '/api/ingredients/22222222-2222-4222-8222-222222222222/merge', body: { destinationId: '33333333-3333-4333-8333-333333333333' } }), mergeOutput.response)
      expect(mergeOutput.response.statusCode).toBe(200)
      expect(mergeOutput.response.writableEnded).toBe(true)
      const deleteOutput = mockResponse()
      await mealById(mockRequest({ method: 'DELETE', url: '/api/meals/11111111-1111-4111-8111-111111111111?permanent=true' }), deleteOutput.response)
      expect(deleteOutput.response.statusCode).toBe(204)
      expect(deleteOutput.response.writableEnded).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs() }
  })

  it('rejects invalid ingredient paths and methods with a completed response', async () => {
    const invalidPath = mockResponse()
    await ingredientPath(mockRequest({ method: 'PATCH', url: '/api/ingredients/id/unknown' }), invalidPath.response)
    expect(invalidPath.response.statusCode).toBe(404)
    expect(invalidPath.response.writableEnded).toBe(true)

    const invalidMethod = mockResponse()
    await ingredientPath(mockRequest({ method: 'GET', url: '/api/ingredients/22222222-2222-4222-8222-222222222222' }), invalidMethod.response)
    expect(invalidMethod.response.statusCode).toBe(405)
    expect(invalidMethod.response.writableEnded).toBe(true)
  })
})
