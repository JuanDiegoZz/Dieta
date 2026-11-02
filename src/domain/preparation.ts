export interface PreparationEvent { id: string; eatenAt: string; rating: number | null }

export function preparationEvent(mealId: string, rating: number | null): PreparationEvent {
  const key = `mi-dieta:preparation:${mealId}`
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as PreparationEvent | null
    if (value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) && Number.isFinite(Date.parse(value.eatenAt))) return value
  } catch { /* Session storage is optional; the mounted screen still retains its event. */ }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const event = { id: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`, eatenAt: new Date().toISOString(), rating }
  try { sessionStorage.setItem(key, JSON.stringify(event)) } catch { /* Storage is optional. */ }
  return event
}

export function finishPreparation(mealId: string) {
  try { sessionStorage.removeItem(`mi-dieta:preparation:${mealId}`) } catch { /* Storage is optional. */ }
}
