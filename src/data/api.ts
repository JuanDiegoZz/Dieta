import { formatLastEaten } from '../domain/recommendations'
import type { HistoryEntry, Ingredient, MealOption, PantryItem, WeeklyPlan } from '../domain/types'
import { deletePersistentCache, readPersistentCache, writePersistentCache, type PersistentCacheRecord } from './persistent-cache'

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
const API_TIMEOUT_MS = 8000
const FALLBACK_TIMEOUT_MS = 3000
const CACHE_TIMEOUT_MS = 1500
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
    const record = await resolveWithin(readPersistentCache<BootstrapPayload>(PERSISTENT_CACHE_KEY), CACHE_TIMEOUT_MS, null)
    if (!record) return null
    return { ...record, payload: normalizePayload(record.payload, 'cache') }
  } catch {
    return null
  }
}

async function writeCache(payload: BootstrapPayload, etag: string | null) {
  writeSessionCache(payload, etag)
  void writePersistentCache({ key: PERSISTENT_CACHE_KEY, payload, etag, savedAt: Date.now() }).catch(() => undefined)
}

export async function invalidateBootstrapCache() {
  memoryCache = null
  memoryEtag = null
  try { window.sessionStorage.removeItem(CACHE_KEY) } catch { /* storage is optional */ }
  await deletePersistentCache(PERSISTENT_CACHE_KEY).catch(() => undefined)
}

function resolveWithin<T>(promise: Promise<T>, milliseconds: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), milliseconds)
    promise.then((value) => { window.clearTimeout(timer); resolve(value) }, () => { window.clearTimeout(timer); resolve(fallback) })
  })
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const request = fetch(url, controller ? { ...options, signal: controller.signal } : options)
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      controller?.abort()
      reject(new Error('REQUEST_TIMEOUT'))
    }, timeoutMs)
  })
  try {
    return await Promise.race([request, timeout])
  } finally {
    if (timer !== undefined) window.clearTimeout(timer)
  }
}

async function fetchJson<T>(url: string, options?: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const response = await fetchWithTimeout(url, { ...options, headers: { Accept: 'application/json', ...(options?.headers ?? {}) } }, timeoutMs)
  if (!response.ok) throw new Error(`API ${response.status}`)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function loadBootstrap(onCached?: (payload: BootstrapPayload) => void): Promise<BootstrapPayload> {
  const cached = readSessionCache()
  if (cached) onCached?.(cached.payload)
  const persistent = cached ? Promise.resolve(cached) : readCache()
  let persistentRecord: PersistentCacheRecord<BootstrapPayload> | null = cached
  let freshLoaded = false
  if (!cached) void persistent.then((record) => {
    persistentRecord = record
    if (!record || freshLoaded) return
    onCached?.(record.payload)
  })
  try {
    const response = await fetchWithTimeout('/api/bootstrap', {
      headers: { Accept: 'application/json', ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}) },
    })
    if (response.status === 304 && cached) {
      freshLoaded = true
      const payload = normalizePayload(cached.payload, 'api')
      void writeCache(payload, cached.etag)
      return payload
    }
    if (!response.ok) throw new Error(`API ${response.status}`)
    const payload = normalizePayload(await response.json() as BootstrapPayload, 'api')
    freshLoaded = true
    void writeCache(payload, response.headers.get('etag'))
    return payload
  } catch (apiError) {
    freshLoaded = true
    const record = persistentRecord ?? await persistent
    if (record) return normalizePayload(record.payload, 'cache')
    try {
      const payload = normalizePayload(await fetchJson<BootstrapPayload>('/catalog.json', undefined, FALLBACK_TIMEOUT_MS), 'fallback')
      void writeCache(payload, null)
      return payload
    } catch {
      if (cached) return cached.payload
      throw apiError
    }
  }
}

export async function updateMealPreference(mealOptionId: string, patch: { favorite?: boolean; hidden?: boolean; rating?: number | null }) {
  const result = await fetchJson(`/api/preferences/${encodeURIComponent(mealOptionId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  await invalidateBootstrapCache()
  return result
}

export async function createHistory(entry: { mealOptionId: string; eatenAt?: string; rating?: number | null; note?: string | null }) {
  const result = await fetchJson('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
  await invalidateBootstrapCache()
  return result
}

export async function deleteHistory(id: string) {
  const result = await fetchJson(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' })
  await invalidateBootstrapCache()
  return result
}

export async function updatePantry(ingredientId: string, patch: { available?: boolean; useSoon?: boolean }) {
  const result = await fetchJson(`/api/pantry/${encodeURIComponent(ingredientId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  await invalidateBootstrapCache()
  return result
}

export async function loadWeekly(): Promise<WeeklyPlan | null> {
  try { return await fetchJson<WeeklyPlan | null>('/api/weekly') } catch { return null }
}

export async function saveWeekly(plan: WeeklyPlan) {
  const result = await fetchJson<WeeklyPlan>('/api/weekly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) })
  await invalidateBootstrapCache()
  return result
}

export async function saveMeal(meal: Partial<MealOption> & { components: MealOption['components'] }) {
  const method = meal.id ? 'PATCH' : 'POST'
  const url = meal.id ? `/api/meals/${encodeURIComponent(meal.id)}` : '/api/meals'
  const result = await fetchJson<MealOption>(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meal) })
  await invalidateBootstrapCache()
  return result
}

export async function createIngredient(canonicalName: string, category = 'other') {
  const result = await fetchJson('/api/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canonicalName, category }) })
  await invalidateBootstrapCache()
  return result
}

export async function updateIngredient(id: string, body: { canonicalName: string; category: string; aliases: string[] }) {
  const result = await fetchJson(`/api/ingredients/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  await invalidateBootstrapCache()
  return result
}

export async function mergeIngredients(sourceId: string, destinationId: string) {
  const result = await fetchJson(`/api/ingredients/${encodeURIComponent(sourceId)}/merge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinationId }) })
  await invalidateBootstrapCache()
  return result
}

export async function permanentlyDeleteMeal(id: string) {
  const result = await fetchJson(`/api/meals/${encodeURIComponent(id)}?permanent=true`, { method: 'DELETE' })
  await invalidateBootstrapCache()
  return result
}

export type { BootstrapPayload }
