import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AppShell, type AppRoute } from './components/AppShell'
import { SkeletonCard } from './components/SkeletonCard'
import { createHistory, deleteHistory, isOffline, loadBootstrap, loadWeekly, saveMeal, saveWeekly, updateMealPreference, updatePantry, type DataSource } from './data/api'
const AdminScreen = lazy(() => import('./features/AdminScreen').then((module) => ({ default: module.AdminScreen })))
import { FavoritesScreen } from './features/FavoritesScreen'
import { HistoryScreen } from './features/HistoryScreen'
import { ExploreScreen } from './features/ExploreScreen'
import { KitchenModeScreen } from './features/KitchenModeScreen'
import { MealDetailScreen } from './features/MealDetailScreen'
import { PlaceholderScreen } from './features/PlaceholderScreen'
import { TodayScreen } from './features/TodayScreen'
import { PantryScreen } from './features/PantryScreen'
const WeeklyScreen = lazy(() => import('./features/WeeklyScreen').then((module) => ({ default: module.WeeklyScreen })))
import type { HistoryEntry, MealOption } from './domain/types'
import type { Ingredient, PantryItem, WeeklyPlan } from './domain/types'
import { appendHistory, applyPreference, removeHistory as removeHistoryEntry } from './domain/personalization'
import { enrichMealsWithCompatibility } from './domain/pantry'

type View = AppRoute | 'detail' | 'kitchen'

function routeFromHash(): View {
  const value = window.location.hash.replace(/^#\/?/, '') as View
  return ['today', 'explore', 'pantry', 'favorites', 'week', 'history', 'admin', 'detail', 'kitchen'].includes(value) ? value : 'today'
}

function writeHash(view: View) {
  if (window.location.hash !== `#/${view}`) window.history.pushState({}, '', `#/${view}`)
}

function localId() { return `local-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function storedAvoidRepeatDays() { try { const value = Number(window.localStorage.getItem('mi-dieta:avoid-repeat-days')); return [3, 5, 7, 10, 14].includes(value) ? value : 7 } catch { return 7 } }
function sourceLabel(source: DataSource | null) { return source === 'api' ? 'API' : source === 'cache' ? 'Cache' : source === 'fallback' ? 'Fallback local' : 'Cargando' }

export default function App() {
  const [view, setView] = useState<View>(() => routeFromHash())
  const [meals, setMeals] = useState<MealOption[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null)
  const [avoidRepeatDays, setAvoidRepeatDays] = useState(storedAvoidRepeatDays)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [offline, setOffline] = useState(() => isOffline())
  const [error, setError] = useState<string | null>(null)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const enrichedMeals = useMemo(() => enrichMealsWithCompatibility(meals, pantry), [meals, pantry])
  const selectedMeal = useMemo(() => enrichedMeals.find((meal) => meal.id === selectedMealId) ?? enrichedMeals[0], [enrichedMeals, selectedMealId])
  const visibleMeals = useMemo(() => enrichedMeals.filter((meal) => meal.active !== false && !meal.hidden), [enrichedMeals])
  const baseRoute: AppRoute = view === 'detail' || view === 'kitchen' ? 'today' : view

  useEffect(() => {
    let mounted = true
    void loadBootstrap((cached) => {
      if (!mounted) return
      setMeals(cached.meals); setHistory(cached.history); setIngredients(cached.ingredients); setPantry(cached.pantry); setDataSource(cached.source ?? 'cache'); setLoading(false)
    }).then((payload) => {
      if (!mounted) return
      setMeals(payload.meals); setHistory(payload.history); setIngredients(payload.ingredients); setPantry(payload.pantry); setDataSource(payload.source ?? 'api'); setLoading(false); setError(null)
    }).catch(() => {
      if (mounted) { setLoading(false); setError('No pudimos cargar tu dieta. Revisa la conexión e inténtalo de nuevo.') }
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const updateConnection = () => setOffline(isOffline())
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection) }
  }, [])

  useEffect(() => { void loadWeekly().then(setWeeklyPlan) }, [])

  useEffect(() => {
    const onHistoryChange = () => setView(routeFromHash())
    window.addEventListener('popstate', onHistoryChange); window.addEventListener('hashchange', onHistoryChange)
    return () => { window.removeEventListener('popstate', onHistoryChange); window.removeEventListener('hashchange', onHistoryChange) }
  }, [])

  function navigate(route: AppRoute) { setView(route); setSelectedMealId(null); writeHash(route) }
  function openMeal(meal: MealOption) { setSelectedMealId(meal.id); setView('detail'); writeHash('detail') }
  function openKitchen(meal: MealOption) { setSelectedMealId(meal.id); setView('kitchen'); writeHash('kitchen') }

  function canWrite() {
    if (!isOffline()) return true
    setError('Necesitas conexión para guardar este cambio.')
    return false
  }

  async function patchPreference(meal: MealOption, patch: { favorite?: boolean; hidden?: boolean; rating?: number | null }) {
    if (!canWrite()) return
    const previous = meals
    setMeals((current) => applyPreference(current, meal.id, patch))
    try { await updateMealPreference(meal.id, patch) } catch { setMeals(previous); setError(`No se pudo guardar el cambio. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }

  function toggleFavorite(meal: MealOption) { void patchPreference(meal, { favorite: !meal.favorite }) }
  function hideMeal(meal: MealOption) { void patchPreference(meal, { hidden: true }) }
  function rateMeal(meal: MealOption, rating: number) { void patchPreference(meal, { rating }) }

  async function patchPantry(item: PantryItem, patch: Partial<Pick<PantryItem, 'available' | 'useSoon'>>) {
    if (!canWrite()) return
    const previous = pantry
    const existing = pantry.find((entry) => entry.ingredientId === item.ingredientId)
    const next = { ...(existing ?? item), ...patch }
    setPantry((current) => existing ? current.map((entry) => entry.ingredientId === item.ingredientId ? next : entry) : [...current, next])
    try { await updatePantry(item.ingredientId, next) } catch { setPantry(previous); setError(`No se pudo actualizar la despensa. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }

  function savePlan(plan: WeeklyPlan) { if (!canWrite()) return; const previous = weeklyPlan; setWeeklyPlan(plan); void saveWeekly(plan).then(setWeeklyPlan).catch(() => { setWeeklyPlan(previous); setError(`No se pudo guardar la semana. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }) }
  function changeAvoidRepeatDays(days: number) { setAvoidRepeatDays(days); try { window.localStorage.setItem('mi-dieta:avoid-repeat-days', String(days)) } catch { /* optional storage */ } }

  async function refreshCatalog() {
    const payload = await loadBootstrap()
    setMeals(payload.meals); setHistory(payload.history); setIngredients(payload.ingredients); setPantry(payload.pantry); setDataSource(payload.source ?? 'api')
  }

  async function saveAdminMeal(meal: MealOption) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    try { await saveMeal({ ...meal, components: meal.components }); await refreshCatalog() }
    catch { throw new Error(`No se pudo guardar la comida. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }
  async function changeMealActive(meal: MealOption, active: boolean) { try { await saveAdminMeal({ ...meal, active }) } catch { setError(`No se pudo actualizar el estado de la comida. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) } }

  async function recordHistory(meal: MealOption) {
    if (!canWrite()) return
    const eatenAt = new Date().toISOString()
    const entry = appendHistory([], meal, eatenAt, localId())[0]
    const previousMeals = meals; const previousHistory = history
    setHistory((current) => appendHistory(current, meal, eatenAt, entry.id))
    setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, lastEatenAt: eatenAt, lastEaten: 'Hoy' } : item))
    try { await createHistory({ mealOptionId: meal.id, eatenAt, rating: entry.rating }) } catch { setHistory(previousHistory); setMeals(previousMeals); setError(`No se pudo guardar en el historial. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }

  async function removeHistory(entry: HistoryEntry) {
    if (!canWrite()) return
    const previous = history
    setHistory((current) => removeHistoryEntry(current, entry.id))
    try { await deleteHistory(entry.id) } catch { setHistory(previous); setError(`No se pudo eliminar el registro. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }

  function backToCatalog() { setView(baseRoute); writeHash(baseRoute) }

  let content
  if (loading && meals.length === 0) {
    content = <div className="page"><header className="page-header"><p className="page-kicker">Cargando tu plan</p><h1>Un momento</h1></header><div className="card-grid">{[1, 2, 3].map((item) => <SkeletonCard key={item} />)}</div></div>
  } else if (error && meals.length === 0) {
    content = <div className="page error-state"><p className="page-kicker">Algo salió mal</p><h1>No pudimos abrir tu plan</h1><p className="page-subtitle">{error}</p><button className="button button--primary" onClick={() => window.location.reload()} type="button">Reintentar</button></div>
  } else if (view === 'detail' && selectedMeal) {
    content = <MealDetailScreen meal={selectedMeal} onBack={backToCatalog} onCook={() => openKitchen(selectedMeal)} onToggleFavorite={() => toggleFavorite(selectedMeal)} onHide={() => { hideMeal(selectedMeal); backToCatalog() }} onRate={(rating) => rateMeal(selectedMeal, rating)} />
  } else if (view === 'kitchen' && selectedMeal) {
    content = <KitchenModeScreen meal={selectedMeal} onBack={() => { setView('detail'); writeHash('detail') }} onComplete={() => { void recordHistory(selectedMeal) }} />
  } else if (view === 'today') {
    content = <TodayScreen meals={visibleMeals} pantry={pantry} avoidRepeatDays={avoidRepeatDays} onOpen={openMeal} onCook={openKitchen} onToggleFavorite={toggleFavorite} onHide={hideMeal} />
  } else if (view === 'explore') {
    content = <ExploreScreen meals={visibleMeals} pantry={pantry} avoidRepeatDays={avoidRepeatDays} onAvoidRepeatDaysChange={changeAvoidRepeatDays} onOpen={openMeal} onCook={openKitchen} onToggleFavorite={toggleFavorite} onHide={hideMeal} />
  } else if (view === 'pantry') {
    content = <PantryScreen ingredients={ingredients} pantry={pantry} onChange={patchPantry} />
  } else if (view === 'favorites') {
    content = <FavoritesScreen meals={visibleMeals} onOpen={openMeal} onCook={openKitchen} onToggleFavorite={toggleFavorite} onHide={hideMeal} />
  } else if (view === 'history') {
    content = <HistoryScreen entries={history} meals={meals} onOpen={openMeal} onRepeat={openKitchen} onDelete={(entry) => { void removeHistory(entry) }} />
  } else if (view === 'week') {
    content = <WeeklyScreen meals={visibleMeals} pantry={pantry} avoidRepeatDays={avoidRepeatDays} plan={weeklyPlan} onSave={savePlan} onOpen={openMeal} onPantryChange={patchPantry} />
  } else if (view === 'admin') {
    content = <AdminScreen meals={enrichedMeals} ingredients={ingredients} onSave={saveAdminMeal} onActiveChange={(meal, active) => { void changeMealActive(meal, active) }} />
  } else {
    content = <PlaceholderScreen eyebrow="Mantén tu plan al día" title="Administrar" icon="settings" description="La edición del plan y sus componentes llegará en la siguiente macrofase." />
  }

  return <AppShell route={baseRoute} onNavigate={navigate}>{import.meta.env.DEV && dataSource && <div className="data-source-indicator" role="status">Data source: <strong>{sourceLabel(dataSource)}</strong></div>}{offline && <div className="offline-banner" role="status">Sin conexión · {dataSource === 'cache' || dataSource === 'fallback' ? 'Mostrando datos guardados' : 'Los cambios no se guardarán'}</div>}{error && meals.length > 0 && <div className="status-banner" role="alert">{error}<button onClick={() => setError(null)} type="button" aria-label="Cerrar aviso">×</button></div>}<Suspense fallback={<div className="page"><p className="page-kicker">Cargando sección</p><h1>Un momento</h1></div>}>{content}</Suspense></AppShell>
}
