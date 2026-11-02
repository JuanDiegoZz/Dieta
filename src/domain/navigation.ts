import type { AppRoute } from '../components/AppShell'

export type View = AppRoute | 'detail' | 'kitchen'
const routes = ['today', 'explore', 'pantry', 'favorites', 'week', 'history', 'admin']
export function parseView(hash: string): View {
  const value = hash.replace(/^#\/?/, '').split('?')[0]
  return [...routes, 'detail', 'kitchen'].includes(value) ? value as View : 'today'
}
export function mealIdFromHash(hash: string) { return new URLSearchParams(hash.split('?')[1] ?? '').get('id') }
export function returnRoute(origin: unknown): AppRoute { return typeof origin === 'string' && routes.includes(origin) ? origin as AppRoute : 'today' }
