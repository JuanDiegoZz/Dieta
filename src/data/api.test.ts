import { describe, expect, it, vi } from 'vitest'

function makeStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    clear: () => { values.clear() },
  }
}

function makeWindow() {
  return { sessionStorage: makeStorage(), setTimeout, clearTimeout } as unknown as Window
}

const fallbackPayload = { version: 'fallback', meals: [], history: [], ingredients: [], pantry: [] }

describe('bootstrap request resilience', () => {
  it('uses the local catalog after the API request times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', makeWindow())
    vi.stubGlobal('fetch', vi.fn((url: string) => url === '/api/bootstrap'
      ? new Promise<Response>(() => undefined)
      : Promise.resolve(new Response(JSON.stringify(fallbackPayload), { status: 200 }))))
    try {
      const { loadBootstrap } = await import('./api.js')
      const pending = loadBootstrap()
      await vi.advanceTimersByTimeAsync(8000)
      await expect(pending).resolves.toMatchObject({ source: 'fallback', version: 'fallback' })
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })

  it('renders a session cache immediately while revalidation is pending', async () => {
    vi.useFakeTimers()
    const browser = makeWindow()
    browser.sessionStorage.setItem('mi-dieta:bootstrap:v2', JSON.stringify({ payload: fallbackPayload, etag: null }))
    vi.stubGlobal('window', browser)
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    try {
      const { loadBootstrap } = await import('./api.js')
      let cached = false
      const pending = loadBootstrap(() => { cached = true })
      expect(cached).toBe(true)
      await vi.advanceTimersByTimeAsync(8000)
      await expect(pending).resolves.toMatchObject({ source: 'cache', version: 'fallback' })
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })

  it('invalidates session cache after a confirmed catalog mutation', async () => {
    const browser = makeWindow()
    browser.sessionStorage.setItem('mi-dieta:bootstrap:v2', JSON.stringify({ payload: fallbackPayload, etag: '"old"' }))
    vi.stubGlobal('window', browser)
    try {
      const { invalidateBootstrapCache } = await import('./api.js')
      await invalidateBootstrapCache()
      expect(browser.sessionStorage.getItem('mi-dieta:bootstrap:v2')).toBeNull()
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })

  it('accepts empty 204 responses from delete mutations', async () => {
    vi.stubGlobal('window', makeWindow())
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    try {
      const { deleteHistory } = await import('./api.js')
      await expect(deleteHistory('history-1')).resolves.toBeUndefined()
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})

describe('catalog recovery', () => {
  it('does not confirm an incomplete preparation response', async () => {
    vi.stubGlobal('window', makeWindow())
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201 })))
    try {
      const { createHistory, getWriteStatus } = await import('./api.js')
      await expect(createHistory({ id: 'event', mealOptionId: 'meal', eatenAt: '2026-11-01T12:00:00.000Z' })).rejects.toThrow('HISTORY_UNCONFIRMED')
      expect(getWriteStatus().pending).toBe(false)
    } finally { vi.unstubAllGlobals(); vi.resetModules() }
  })
  it('distinguishes a missing weekly plan from a failed request and deduplicates loads', async () => {
    vi.stubGlobal('window', makeWindow())
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('null', { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    try {
      const { loadWeekly } = await import('./api.js')
      const pending = loadWeekly()
      expect(loadWeekly()).toBe(pending)
      await expect(pending).rejects.toThrow('API 503')
      await expect(loadWeekly()).resolves.toBeNull()
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally { vi.unstubAllGlobals(); vi.resetModules() }
  })
  it('shares concurrent requests and replaces stale cache', async () => {
    const browser = makeWindow()
    browser.sessionStorage.setItem('mi-dieta:bootstrap:v2', JSON.stringify({ payload: fallbackPayload, etag: 'old' }))
    vi.stubGlobal('window', browser)
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ...fallbackPayload, version: 'fresh' }), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    try {
      const { loadBootstrap } = await import('./api.js')
      const first = loadBootstrap()
      expect(loadBootstrap()).toBe(first)
      await expect(first).resolves.toMatchObject({ source: 'api', version: 'fresh' })
      expect(fetcher).toHaveBeenCalledTimes(1)
    } finally { vi.unstubAllGlobals(); vi.resetModules() }
  })
  it('retains cache when API data is incomplete', async () => {
    const browser = makeWindow()
    browser.sessionStorage.setItem('mi-dieta:bootstrap:v2', JSON.stringify({ payload: fallbackPayload, etag: 'old' }))
    vi.stubGlobal('window', browser)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    try {
      const { loadBootstrap } = await import('./api.js')
      await expect(loadBootstrap()).resolves.toMatchObject({ source: 'cache', version: 'fallback' })
    } finally { vi.unstubAllGlobals(); vi.resetModules() }
  })
})
