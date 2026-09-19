import { formatLastEaten } from '../domain/recommendations'
import type { HistoryEntry, Ingredient, MealOption, PantryItem, WeeklyPlan } from '../domain/types'
import { readPersistentCache, writePersistentCache, type PersistentCacheRecord } from './persistent-cache'

export type DataSource = 'api' | 'cache' | 'fallback'

export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

interface BootstrapPayload {
  version: string | number
  catalogVersion?: string
  meals: MealOption[]
  history: HistoryEntry[]
  ingredients: Ingredient[]
  pantry: PantryItem[]
  source?: DataSource
}

const CACHE_KEY = 'mi-dieta:bootstrap:v2'
const PERSISTENT_CACHE_KEY = 'bootstrap'
let memoryCache: BootstrapPayload | null = null
let memoryEtag: string | null = null

function normalizePayload(payload: BootstrapPayload, source: DataSource = payload.source ?? 'api'): BootstrapPayload {
  return {
    version: payload.version,
    catalogVersion: payload.catalogVersion,
    meals: payload.meals.map((meal) => ({
      ...meal,
      tags: meal.tags ?? [],
      lastEatenAt: meal.lastEatenAt ?? null,
      lastEaten: formatLastEaten(meal.lastEatenAt),
      availability: meal.availability ?? null,
    })),
    history: payload.history ?? [],
    ingredients: payload.ingredients ?? [],
    pantry: payload.pantry ?? [],
    source,
  }
}

interface CacheEnvelope {
  payload: BootstrapPayload
  etag: string | null
}

function readSessionCache(): PersistentCacheRecord<BootstrapPayload> | null {
  if (memoryCache) return { key: PERSISTENT_CACHE_KEY, payload: memoryCache, etag: memoryEtag, savedAt: Date.now() }
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BootstrapPayload | CacheEnvelope
    const envelope = 'payload' in parsed ? parsed : { payload: parsed, etag: null }
    memoryCache = normalizePayload(envelope.payload, 'cache')
    memoryEtag = envelope.etag
    return { key: PERSISTENT_CACHE_KEY, payload: memoryCache, etag: memoryEtag, savedAt: Date.now() }
  } catch {
    return null
  }
}

function writeSessionCache(payload: BootstrapPayload, etag: string | null) {
  memoryCache = payload
  memoryEtag = etag
  try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ payload, etag })) } catch { /* storage is optional */ }
}

async function readCache(): Promise<PersistentCacheRecord<BootstrapPayload> | null> {
  const session = readSessionCache()
  if (session) return session
  try {
    const record = await readPersistentCache<BootstrapPayload>(PERSISTENT_CACHE_KEY)
    if (!record) return null
    return { ...record, payload: normalizePayload(record.payload, 'cache') }
  } catch {
    return null
  }
}

async function writeCache(payload: BootstrapPayload, etag: string | null) {
  writeSessionCache(payload, etag)
  try {
    await writePersistentCache({ key: PERSISTENT_CACHE_KEY, payload, etag, savedAt: Date.now() })
  } catch { /* IndexedDB is an optional enhancement */ }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options?.headers ?? {}) } })
  if (!response.ok) throw new Error(`API ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadBootstrap(onCached?: (payload: BootstrapPayload) => void): Promise<BootstrapPayload> {
  const cached = readSessionCache()
  if (cached) onCached?.(cached.payload)
  const persistent = cached ? Promise.resolve(cached) : readCache()
  let freshLoaded = false
  if (!cached) void persistent.then((record) => {
    if (!record || freshLoaded) return
    onCached?.(record.payload)
  })
  try {
    const record = await persistent
    const response = await fetch('/api/bootstrap', {
      headers: { Accept: 'application/json', ...(record?.etag ? { 'If-None-Match': record.etag } : {}) },
    })
    if (response.status === 304 && record) {
      freshLoaded = true
      const payload = normalizePayload(record.payload, 'api')
      await writeCache(payload, record.etag)
      return payload
    }
    if (!response.ok) throw new Error(`API ${response.status}`)
    const payload = normalizePayload(await response.json() as BootstrapPayload, 'api')
    freshLoaded = true
    await writeCache(payload, response.headers.get('etag'))
    return payload
  } catch (apiError) {
    freshLoaded = true
    const record = await persistent
    if (record) return normalizePayload(record.payload, 'cache')
    try {
      const payload = normalizePayload(await fetchJson<BootstrapPayload>('/catalog.json'), 'fallback')
      writeSessionCache(payload, null)
      return payload
    } catch {
      if (cached) return cached.payload
      throw apiError
    }
  }
}

export async function updateMealPreference(mealOptionId: string, patch: { favorite?: boolean; hidden?: boolean; rating?: number | null }) {
  return fetchJson(`/api/preferences/${encodeURIComponent(mealOptionId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
}

export async function createHistory(entry: { mealOptionId: string; eatenAt?: string; rating?: number | null; note?: string | null }) {
  return fetchJson('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
}

export async function deleteHistory(id: string) {
  return fetchJson(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updatePantry(ingredientId: string, patch: { available?: boolean; useSoon?: boolean }) {
  return fetchJson(`/api/pantry/${encodeURIComponent(ingredientId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
}

export async function loadWeekly(): Promise<WeeklyPlan | null> {
  try { return await fetchJson<WeeklyPlan | null>('/api/weekly') } catch { return null }
}

export async function saveWeekly(plan: WeeklyPlan) {
  return fetchJson<WeeklyPlan>('/api/weekly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) })
}

export async function saveMeal(meal: Partial<MealOption> & { components: MealOption['components'] }) {
  const method = meal.id ? 'PATCH' : 'POST'
  const url = meal.id ? `/api/meals/${encodeURIComponent(meal.id)}` : '/api/meals'
  return fetchJson<MealOption>(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meal) })
}

export type { BootstrapPayload }
