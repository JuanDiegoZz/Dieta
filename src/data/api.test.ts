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
})
