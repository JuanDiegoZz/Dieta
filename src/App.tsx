import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { parseView, mealIdFromHash, returnRoute, type View } from './domain/navigation'
import { AppShell, type AppRoute } from './components/AppShell'
import { SkeletonCard } from './components/SkeletonCard'
import { createHistory, createIngredient as createIngredientRequest, deleteHistory, isOffline, loadBootstrap, loadWeekly, mergeIngredients, permanentlyDeleteMeal, saveMeal, saveWeekly, updateIngredient, updateMealPreference, updatePantry, type DataSource } from './data/api'
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
import { applyPreference, removeHistory as removeHistoryEntry } from './domain/personalization'
import { enrichMealsWithCompatibility } from './domain/pantry'

function writeHash(view: View, mealId?: string, origin?: AppRoute) {
  const hash = `#/${view}${mealId ? `?id=${encodeURIComponent(mealId)}` : ''}`
  if (window.location.hash === hash) return
  const state = window.history.state ?? {}
  window.history.pushState({ ...state, dieta: { ...state.dieta, origin: origin ?? state.dieta?.origin, scroll: 0, position: (state.dieta?.position ?? 0) + 1 } }, '', hash)
}

function storedAvoidRepeatDays() { try { const value = Number(window.localStorage.getItem('mi-dieta:avoid-repeat-days')); return [3, 5, 7, 10, 14].includes(value) ? value : 7 } catch { return 7 } }
function sourceLabel(source: DataSource | null) { return source === 'api' ? 'API' : source === 'cache' ? 'Cache' : source === 'fallback' ? 'Fallback local' : 'Cargando' }

export default function App() {
  const diagnostics = new URLSearchParams(window.location.search).get('diagnostics') === '1'
  const [catalogVersion, setCatalogVersion] = useState<string | number>('—')
  const [loadStatus, setLoadStatus] = useState('Cargando')
  const recoveryPending = useRef(false)
  const [view, setView] = useState<View>(() => parseView(window.location.hash))
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
  const [selectedMealId, setSelectedMealId] = useState<string | null>(() => mealIdFromHash(window.location.hash))
  const [origin, setOrigin] = useState<AppRoute>(() => returnRoute(window.history.state?.dieta?.origin))
  const currentLocation = useRef({ hash: window.location.hash, state: window.history.state })
  const restoringHistory = useRef(false)
  const originFocus = useRef<HTMLElement | null>(null)
  const [adminDirty, setAdminDirty] = useState(false)
  const enrichedMeals = useMemo(() => enrichMealsWithCompatibility(meals, pantry), [meals, pantry])
  const selectedMeal = useMemo(() => enrichedMeals.find((meal) => meal.id === selectedMealId), [enrichedMeals, selectedMealId])
  const visibleMeals = useMemo(() => enrichedMeals.filter((meal) => meal.active !== false && !meal.hidden), [enrichedMeals])
  const baseRoute: AppRoute = view === 'detail' || view === 'kitchen' ? origin : view

  useEffect(() => {
    let mounted = true
    void loadBootstrap((cached) => {
      if (!mounted) return
      setCatalogVersion(cached.catalogVersion ?? cached.version); setLoadStatus('Revalidando'); setMeals(cached.meals); setHistory(cached.history); setIngredients(cached.ingredients); setPantry(cached.pantry); setDataSource(cached.source ?? 'cache'); setLoading(false)
    }).then((payload) => {
      if (!mounted) return
      const source = payload.source ?? 'api'
      setCatalogVersion(payload.catalogVersion ?? payload.version); setLoadStatus(payload.source === 'api' ? 'Actualizado' : 'Sin actualizar'); setMeals(payload.meals); setHistory(payload.history); setIngredients(payload.ingredients); setPantry(payload.pantry); setDataSource(source); setLoading(false); setError(source === 'api' ? null : 'Estamos teniendo problemas para actualizar los datos. Mostrando la informacion guardada.')
    }).catch(() => {
      if (mounted) { setLoadStatus('Error de carga'); setLoading(false); setError('No pudimos cargar tu dieta. Revisa la conexión e inténtalo de nuevo.') }
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const updateConnection = () => setOffline(isOffline())
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection) }
  }, [])

  useEffect(() => {
    const recover = () => {
      if (loading || recoveryPending.current || dataSource === 'api' || isOffline() || document.visibilityState === 'hidden') return
      recoveryPending.current = true
      setLoadStatus('Actualizando')
      void loadBootstrap().then((payload) => {
        setLoadStatus(payload.source === 'api' ? 'Actualizado' : 'Sin actualizar')
        if (payload.source !== 'api') return
        setMeals(payload.meals); setHistory(payload.history); setIngredients(payload.ingredients); setPantry(payload.pantry)
        setDataSource('api'); setCatalogVersion(payload.catalogVersion ?? payload.version); setError(null)
      }).catch(() => setLoadStatus('Error de carga')).finally(() => { recoveryPending.current = false })
    }
    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', recover)
    return () => { window.removeEventListener('online', recover); document.removeEventListener('visibilitychange', recover) }
  }, [dataSource, loading])

  useEffect(() => { void loadWeekly().then(setWeeklyPlan) }, [])

  useEffect(() => {
    if (!window.history.state?.dieta) window.history.replaceState({ dieta: { position: 0 } }, '')
    currentLocation.current = { hash: window.location.hash, state: window.history.state }
    const onHistoryChange = () => {
      if (restoringHistory.current) { restoringHistory.current = false; return }
      const target = parseView(window.location.hash)
      if (adminDirty && view === 'admin' && target !== 'admin' && !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y salir?')) {
        const previous = currentLocation.current
        const delta = (previous.state?.dieta?.position ?? 0) - (window.history.state?.dieta?.position ?? 0)
        if (delta) { restoringHistory.current = true; window.history.go(delta) }
        else window.history.replaceState(previous.state, '', previous.hash)
        return
      }
      currentLocation.current = { hash: window.location.hash, state: window.history.state }
      setView(target); setSelectedMealId(mealIdFromHash(window.location.hash)); setOrigin(returnRoute(window.history.state?.dieta?.origin))
    }
    const beforeUnload = (event: BeforeUnloadEvent) => { if (adminDirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('popstate', onHistoryChange); window.addEventListener('hashchange', onHistoryChange); window.addEventListener('beforeunload', beforeUnload)
    return () => { window.removeEventListener('popstate', onHistoryChange); window.removeEventListener('hashchange', onHistoryChange); window.removeEventListener('beforeunload', beforeUnload) }
  }, [adminDirty, view])

  function navigate(route: AppRoute) { if (view === 'admin' && route !== 'admin' && adminDirty && !window.confirm('Tienes cambios sin guardar. Pulsa Cancelar para seguir editando o Aceptar para descartarlos.')) return; setAdminDirty(false); setView(route); setSelectedMealId(null); writeHash(route) }
  function openMealView(meal: MealOption, target: 'detail' | 'kitchen') {
    const from = baseRoute
    if (view !== 'detail' && view !== 'kitchen') {
      originFocus.current = document.activeElement as HTMLElement
      const state = window.history.state ?? {}
      window.history.replaceState({ ...state, dieta: { ...state.dieta, scroll: window.scrollY } }, '')
    }
    setOrigin(from); setSelectedMealId(meal.id); setView(target); writeHash(target, meal.id, from)
    window.scrollTo(0, 0)
  }
  function openMeal(meal: MealOption) { openMealView(meal, 'detail') }
  function openKitchen(meal: MealOption) { openMealView(meal, 'kitchen') }

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
    setCatalogVersion(payload.catalogVersion ?? payload.version); setLoadStatus(payload.source === 'api' ? 'Actualizado' : 'Sin actualizar'); setMeals(payload.meals); setHistory(payload.history); setIngredients(payload.ingredients); setPantry(payload.pantry); setDataSource(payload.source ?? 'api')
    return payload
  }

  async function saveAdminMeal(meal: MealOption) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    try { await saveMeal({ ...meal, components: meal.components }); await refreshCatalog() }
    catch { throw new Error(`No se pudo guardar la comida. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }
  async function changeMealActive(meal: MealOption, active: boolean) { await saveAdminMeal({ ...meal, active }) }
  async function changeMealHidden(meal: MealOption, hidden: boolean) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    await updateMealPreference(meal.id, { hidden })
    await refreshCatalog()
  }
  async function createAdminIngredient(name: string) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    const created = await createIngredientRequest(name)
    const payload = await refreshCatalog()
    const createdId = typeof created === 'object' && created && 'id' in created && typeof created.id === 'string' ? created.id : ''
    const found = payload.ingredients.find((ingredient) => ingredient.id === createdId || ingredient.canonicalName.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))
    if (!found) throw new Error('El Ingredient se guardó, pero no pudo volver a cargarse.')
    return found
  }
  async function updateAdminIngredient(ingredient: Ingredient, aliases: string[]) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    await updateIngredient(ingredient.id, { canonicalName: ingredient.canonicalName, category: ingredient.category, aliases })
    await refreshCatalog()
  }
  async function mergeAdminIngredients(source: Ingredient, destination: Ingredient) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    await mergeIngredients(source.id, destination.id)
    await refreshCatalog()
  }
  async function deleteAdminMeal(meal: MealOption) {
    if (!canWrite()) throw new Error('Necesitas conexión para guardar este cambio.')
    await permanentlyDeleteMeal(meal.id)
    await refreshCatalog()
  }

  async function recordHistory(meal: MealOption, event: { id: string; eatenAt: string }) {
    if (!canWrite()) throw new Error('Necesitas conexión para confirmar la preparación.')
    const entry = await createHistory({ ...event, mealOptionId: meal.id, rating: meal.rating ?? null })
    setHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
    setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, lastEatenAt: entry.eatenAt, lastEaten: 'Hoy' } : item))
  }

  async function removeHistory(entry: HistoryEntry) {
    if (!canWrite()) return
    const previous = history
    setHistory((current) => removeHistoryEntry(current, entry.id))
    try { await deleteHistory(entry.id) } catch { setHistory(previous); setError(`No se pudo eliminar el registro. ${dataSource === 'api' ? 'Inténtalo de nuevo.' : 'La API no está disponible; no se guardó.'}`) }
  }

  function backToCatalog() {
    if (window.history.state?.dieta?.origin) window.history.back()
    else navigate('today')
  }

  useEffect(() => {
    if (loading) return
    const timer = window.setTimeout(() => {
      if (view !== 'detail' && view !== 'kitchen') {
        originFocus.current?.focus({ preventScroll: true })
        window.scrollTo(0, window.history.state?.dieta?.scroll ?? 0)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [view, loading])

  let content
  if (loading && meals.length === 0) {
    content = <div className="page"><header className="page-header"><p className="page-kicker">Cargando tu plan</p><h1>Un momento</h1></header><div className="card-grid">{[1, 2, 3].map((item) => <SkeletonCard key={item} />)}</div></div>
  } else if (error && meals.length === 0) {
    content = <div className="page error-state"><p className="page-kicker">Algo salió mal</p><h1>No pudimos abrir tu plan</h1><p className="page-subtitle">{error}</p><button className="button button--primary" onClick={() => window.location.reload()} type="button">Reintentar</button></div>
  } else if (baseRoute === 'today') {
    content = <TodayScreen meals={visibleMeals} pantry={pantry} avoidRepeatDays={avoidRepeatDays} onOpen={openMeal} onCook={openKitchen} onToggleFavorite={toggleFavorite} onHide={hideMeal} />
  } else if (baseRoute === 'explore') {
    content = <ExploreScreen diagnostics={diagnostics} meals={visibleMeals} pantry={pantry} avoidRepeatDays={avoidRepeatDays} onAvoidRepeatDaysChange={changeAvoidRepeatDays} onOpen={openMeal} onCook={openKitchen} onToggleFavorite={toggleFavorite} onHide={hideMeal} />
  } else if (baseRoute === 'pantry') {
    content = <PantryScreen ingredients={ingredients} pantry={pantry} onChange={patchPantry} />
  } else if (baseRoute === 'favorites') {
    content = <FavoritesScreen meals={visibleMeals} onOpen={openMeal} onCook={openKitchen} onToggleFavorite={toggleFavorite} onHide={hideMeal} />
  } else if (baseRoute === 'history') {
    content = <HistoryScreen entries={history} meals={meals} onOpen={openMeal} onRepeat={openKitchen} onDelete={(entry) => { void removeHistory(entry) }} />
  } else if (baseRoute === 'week') {
    content = <WeeklyScreen meals={visibleMeals} pantry={pantry} avoidRepeatDays={avoidRepeatDays} plan={weeklyPlan} onSave={savePlan} onOpen={openMeal} onPantryChange={patchPantry} />
  } else if (baseRoute === 'admin') {
    content = <AdminScreen meals={enrichedMeals} ingredients={ingredients} history={history} pantry={pantry} weeklyPlan={weeklyPlan} settings={{ avoidRepeatDays }} onSave={saveAdminMeal} onActiveChange={changeMealActive} onHiddenChange={changeMealHidden} onCreateIngredient={createAdminIngredient} onUpdateIngredient={updateAdminIngredient} onMergeIngredients={mergeAdminIngredients} onDeleteMeal={deleteAdminMeal} onDirtyChange={setAdminDirty} />
  } else {
    content = <PlaceholderScreen eyebrow="Mantén tu plan al día" title="Administrar" icon="settings" description="La edición del plan y sus componentes llegará en la siguiente macrofase." />
  }

  return <AppShell route={baseRoute} onNavigate={navigate}>{diagnostics && <p role="status">Fuente: {dataSource ?? "ninguna"} · Carga: {loadStatus} · Versión: {catalogVersion} · Platillos: {meals.length}</p>}{import.meta.env.DEV && dataSource && <div className="data-source-indicator" role="status">Data source: <strong>{sourceLabel(dataSource)}</strong></div>}{offline && <div className="offline-banner" role="status">Sin conexión · {dataSource === 'cache' || dataSource === 'fallback' ? 'Mostrando datos guardados' : 'Los cambios no se guardarán'}</div>}{error && meals.length > 0 && <div className="status-banner" role="alert">{error}<button onClick={() => setError(null)} type="button" aria-label="Cerrar aviso">×</button></div>}<Suspense fallback={<div className="page"><p className="page-kicker">Cargando sección</p><h1>Un momento</h1></div>}><div key={baseRoute} hidden={view === 'detail' || view === 'kitchen'}>{content}</div>{view === 'detail' && (selectedMeal ? <MealDetailScreen meal={selectedMeal} onBack={backToCatalog} onCook={() => openKitchen(selectedMeal)} onToggleFavorite={() => toggleFavorite(selectedMeal)} onHide={() => { hideMeal(selectedMeal); navigate(origin) }} onRate={(rating) => rateMeal(selectedMeal, rating)} /> : <div className="page"><h1>Platillo no disponible</h1><button className="button" onClick={() => navigate('today')}>Ir a Hoy</button></div>)}{view === 'kitchen' && (selectedMeal ? <KitchenModeScreen key={selectedMeal.id} meal={selectedMeal} onBack={() => { setView('detail'); window.history.replaceState(window.history.state, '', `#/detail?id=${encodeURIComponent(selectedMeal.id)}`) }} onComplete={(event) => recordHistory(selectedMeal, event)} /> : <div className="page"><h1>Platillo no disponible</h1><button className="button" onClick={() => navigate('today')}>Ir a Hoy</button></div>)}</Suspense></AppShell>
}
