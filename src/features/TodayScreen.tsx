import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { MealCard } from '../components/MealCard'
import { MealTabs } from '../components/MealTabs'
import { SearchField } from '../components/SearchField'
import { SkeletonCard } from '../components/SkeletonCard'
import { getSuggestedSlot, MEAL_SLOTS } from '../domain/slots'
import { createMealSearchIndex, searchMealOptions } from '../domain/search'
import { rankMealOptions, recommendationReason } from '../domain/recommendations'
import type { MealOption, MealSlot, PantryItem } from '../domain/types'

const PERSONAL_NAME = 'Diana'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function dateLabel() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function TodayScreen({ meals, pantry, avoidRepeatDays, onOpen, onCook, onToggleFavorite, onHide }: { meals: MealOption[]; pantry: PantryItem[]; avoidRepeatDays: number; onOpen: (meal: MealOption) => void; onCook: (meal: MealOption) => void; onToggleFavorite: (meal: MealOption) => void; onHide: (meal: MealOption) => void }) {
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(() => getSuggestedSlot())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [surpriseIndex, setSurpriseIndex] = useState(0)
  const [surpriseOpen, setSurpriseOpen] = useState(false)
  const searchIndex = useMemo(() => createMealSearchIndex(meals), [meals])
  const slot = MEAL_SLOTS.find((item) => item.id === selectedSlot) ?? MEAL_SLOTS[0]
  const results = useMemo(() => {
    if (query.trim()) return searchMealOptions(meals, query, searchIndex).map((result) => result.meal)
    return rankMealOptions(meals.filter((meal) => meal.slot === selectedSlot), pantry, new Date(), avoidRepeatDays)
  }, [avoidRepeatDays, meals, pantry, query, searchIndex, selectedSlot])

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 260)
    return () => window.clearTimeout(timeout)
  }, [])

  const featured = results[0]
  const displayedResults = results.slice(0, 6)
  const surpriseOptions = useMemo(() => rankMealOptions(meals.filter((meal) => meal.slot === selectedSlot), pantry, new Date(), avoidRepeatDays), [avoidRepeatDays, meals, pantry, selectedSlot])
  const surpriseMeal = surpriseOptions[surpriseIndex % Math.max(surpriseOptions.length, 1)]

  return (
    <div className="page page--today">
      <header className="page-header page-header--today">
        <div>
          <p className="page-kicker">{dateLabel()}</p>
          <h1>{greeting()}, {PERSONAL_NAME} <span className="wave">✦</span></h1>
          <p className="page-subtitle">¿Qué se te antoja preparar hoy?</p>
        </div>
        <button className="header-action" type="button" aria-label="Abrir ajustes"><Icon name="settings" size={20} /></button>
      </header>

      <section className="today-intro">
        <div className="today-intro__copy"><span className="status-pip" /> <strong>{slot.label}</strong> suele ser tu siguiente franja <span className="today-intro__range">{slot.range}</span></div>
        <button className="button button--primary button--surprise" onClick={() => { setSurpriseIndex(0); setSurpriseOpen(true) }} type="button"><Icon name="sparkles" size={17} /> No sé qué comer</button>
      </section>

      {surpriseOpen && surpriseMeal && <section className="surprise-panel"><div><span className="section-kicker">¿Por qué te recomiendo esto?</span><h2>{surpriseMeal.title}</h2><div className="surprise-reasons">{recommendationReason(surpriseMeal, pantry).map((reason) => <span key={reason}>✓ {reason}</span>)}</div></div><div className="surprise-actions"><button className="button button--primary" onClick={() => onOpen(surpriseMeal)} type="button">Preparar esto</button><button className="button button--secondary" onClick={() => setSurpriseIndex((index) => index + 1)} type="button">Dame otra</button><button className="text-button text-button--muted" onClick={() => setSurpriseOpen(false)} type="button">Cerrar</button></div></section>}

      <div className="toolbar-row"><MealTabs selected={selectedSlot} onSelect={setSelectedSlot} /><SearchField value={query} onChange={setQuery} /></div>

      {query ? (
        <section className="section-block"><div className="section-heading"><div><p className="section-kicker">Búsqueda local</p><h2>Resultados para “{query}”</h2></div><span className="result-count">{results.length} opciones</span></div></section>
      ) : (
        <section className="recommendation-banner"><div className="recommendation-banner__icon"><Icon name="sparkles" size={22} /></div><div><span className="section-kicker">Una buena idea para ahora</span><strong>{featured?.title ?? 'Explora tu plan'}</strong><span>{featured ? featured.summary : 'Elige una franja para empezar.'}</span></div>{featured && <button className="round-button" onClick={() => onOpen(featured)} type="button" aria-label={`Ver ${featured.title}`}><Icon name="chevron-right" size={19} /></button>}</section>
      )}

      <section className="section-block section-block--cards">
        <div className="section-heading"><div><p className="section-kicker">{query ? 'Coincidencias' : 'Opciones de tu dieta'}</p><h2>{query ? 'Encuentra algo que te guste' : `Ideas para ${slot.label.toLocaleLowerCase('es')}`}</h2></div>{!query && <span className="result-count">{results.length} opciones</span>}</div>
        {loading ? <div className="card-grid">{[1, 2, 3].map((item) => <SkeletonCard key={item} />)}</div> : results.length ? <div className="card-grid">{displayedResults.map((meal) => <MealCard key={meal.id} meal={meal} onOpen={onOpen} onToggleFavorite={onToggleFavorite} onCook={onCook} onHide={onHide} />)}</div> : <EmptyState title="No encontramos opciones" message="Prueba otra búsqueda o cambia de franja. Todas las demás siguen disponibles." action={{ label: 'Ver esta franja', onClick: () => setQuery('') }} />}
      </section>
    </div>
  )
}
