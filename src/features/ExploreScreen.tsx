import { useScreenState } from '../platform/useScreenState'
import { useEffect, useMemo, useRef } from 'react'
import { EmptyState } from '../components/EmptyState'
import { MealCard } from '../components/MealCard'
import { MealTabs } from '../components/MealTabs'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { createMealSearchIndex, searchMealOptions } from '../domain/search'
import { MEAL_SLOTS } from '../domain/slots'
import { rankMealOptions } from '../domain/recommendations'
import { clampPage, pageCount, paginate } from '../domain/pagination'
import type { MealOption, MealSlot, PantryItem } from '../domain/types'

type Filter = 'favorite' | 'available' | 'recent' | 'notRecent' | 'useSoon'
const PAGE_SIZE = 12

export function ExploreScreen({ meals, pantry, avoidRepeatDays, onAvoidRepeatDaysChange, onOpen, onCook, onToggleFavorite, onHide, diagnostics = false }: { diagnostics?: boolean; meals: MealOption[]; pantry: PantryItem[]; avoidRepeatDays: number; onAvoidRepeatDaysChange: (days: number) => void; onOpen: (meal: MealOption) => void; onCook: (meal: MealOption) => void; onToggleFavorite: (meal: MealOption) => void; onHide: (meal: MealOption) => void }) {
  const [selectedSlot, setSelectedSlot] = useScreenState<MealSlot>('explore.slot', 'lunch')
  const [query, setQuery] = useScreenState('explore.query', '')
  const [filters, setFilters] = useScreenState<Filter[]>('explore.filters', [])
  const [page, setPage] = useScreenState('explore.page', 1)
  const resultsRef = useRef<HTMLElement>(null)
  const searchIndex = useMemo(() => createMealSearchIndex(meals), [meals])
  const matches = useMemo(() => searchMealOptions(meals, query, searchIndex), [meals, query, searchIndex])
  const results = useMemo(() => {
    let base = query.trim() ? matches.map((result) => result.meal) : meals.filter((meal) => meal.slot === selectedSlot)
    if (filters.includes('favorite')) base = base.filter((meal) => meal.favorite)
    if (filters.includes('available')) base = base.filter((meal) => (meal.availability ?? 0) >= 0.8)
    if (filters.includes('recent')) base = base.filter((meal) => meal.lastEatenAt ? Date.now() - Date.parse(meal.lastEatenAt) >= avoidRepeatDays * 86_400_000 : true)
    if (filters.includes('notRecent')) base = base.filter((meal) => !meal.lastEatenAt || Date.now() - Date.parse(meal.lastEatenAt) >= 3 * 86_400_000)
    if (filters.includes('useSoon')) { const soon = new Set(pantry.filter((item) => item.available && item.useSoon).map((item) => item.ingredientId)); base = base.filter((meal) => meal.components.some((component) => component.ingredients.some((ingredient) => ingredient.ingredientId && soon.has(ingredient.ingredientId)))) }
    const ranked = rankMealOptions(base, pantry, new Date(), avoidRepeatDays)
    if (!query.trim()) return ranked
    const scores = new Map(matches.map((result) => [result.meal.id, result.score]))
    const secondary = new Map(ranked.map((meal, position) => [meal.id, position]))
    return ranked.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || secondary.get(a.id)! - secondary.get(b.id)!)
  }, [avoidRepeatDays, filters, matches, meals, pantry, query, selectedSlot])

  const pages = pageCount(results.length, PAGE_SIZE)
  const safePage = clampPage(page, results.length, PAGE_SIZE)
  const visibleResults = paginate(results, safePage, PAGE_SIZE)

  const resetKey = JSON.stringify([query, selectedSlot, filters])
  const previousResetKey = useRef(resetKey)
  useEffect(() => { if (previousResetKey.current !== resetKey) { previousResetKey.current = resetKey; setPage(1) } }, [resetKey])
  useEffect(() => { setPage((current) => clampPage(current, results.length, PAGE_SIZE)) }, [results.length])

  function toggleFilter(filter: Filter) { setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]) }
  function changePage(nextPage: number) {
    const next = clampPage(nextPage, results.length, PAGE_SIZE)
    setPage(next)
    window.setTimeout(() => {
      const target = resultsRef.current
      if (!target) return
      if ('scrollBehavior' in document.documentElement.style) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else target.scrollIntoView()
    }, 0)
  }

  return (
    <div className="page">
      <header className="page-header"><div><p className="page-kicker">Tu plan, a tu manera</p><h1>Explorar</h1><p className="page-subtitle">Busca, descubre y elige sin complicarte.</p></div></header>
      {diagnostics && <p role="status">Coincidencias: {matches.length} · Tras filtros: {results.length} · Página: {visibleResults.length}</p>}
      <div className="explore-search"><SearchField value={query} onChange={setQuery} placeholder="Busca platos, ingredientes o alias" /></div>
      <p className="page-subtitle">{query.trim() ? 'Buscando en todas las franjas. Los filtros siguen activos.' : 'Elige una franja o busca en todo tu plan.'}</p>
      <MealTabs selected={selectedSlot} onSelect={setSelectedSlot} />
      <div className="filter-row" aria-label="Filtros visuales">
        {([['favorite', 'Favoritas'], ['available', 'Puedo hacerlo'], ['recent', 'Hace mucho no lo como'], ['notRecent', 'No comido recientemente'], ['useSoon', 'Usar pronto']] as [Filter, string][]).map(([id, label]) => <button className={`filter-chip${filters.includes(id) ? ' is-selected' : ''}`} key={id} aria-pressed={filters.includes(id)} onClick={() => toggleFilter(id)} type="button">{label}</button>)}<label className="repeat-setting">Evitar repetir<select value={avoidRepeatDays} onChange={(event) => onAvoidRepeatDaysChange(Number(event.target.value))}><option value="3">3 días</option><option value="5">5 días</option><option value="7">7 días</option><option value="10">10 días</option><option value="14">14 días</option></select></label>
      </div>
      <section className="section-block section-block--cards" ref={resultsRef}><div className="section-heading"><div><p className="section-kicker">{query.trim() ? 'Todas las franjas' : MEAL_SLOTS.find((slot) => slot.id === selectedSlot)?.label}</p><h2>{query ? `Resultados para “${query}”` : 'Todas tus opciones'}</h2></div><span className="result-count">{results.length}</span></div>{results.length ? <><div className="card-grid">{visibleResults.map((meal) => <MealCard key={meal.id} meal={meal} showSlot={Boolean(query.trim())} onOpen={onOpen} onToggleFavorite={onToggleFavorite} onCook={onCook} onHide={onHide} />)}</div><Pagination page={safePage} pages={pages} onChange={changePage} /></> : <EmptyState title="Nada con esos filtros" message="Prueba otra combinación. No hemos cambiado tu plan." action={{ label: 'Limpiar filtros', onClick: () => { setFilters([]); setQuery('') } }} />}</section>
    </div>
  )
}
