import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { MEAL_SLOTS } from '../domain/slots'
import { clampPage, pageCount, paginate } from '../domain/pagination'
import type { HistoryEntry, MealOption } from '../domain/types'

function dateLabel(value: string) {
  return new Date(value).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function HistoryScreen({ entries, meals, onOpen, onRepeat, onDelete }: { entries: HistoryEntry[]; meals: MealOption[]; onOpen: (meal: MealOption) => void; onRepeat: (meal: MealOption) => void; onDelete: (entry: HistoryEntry) => void }) {
  const byId = new Map(meals.map((meal) => [meal.id, meal]))
  const sorted = [...entries].filter((entry) => byId.has(entry.mealOptionId)).sort((a, b) => Date.parse(b.eatenAt) - Date.parse(a.eatenAt))
  const [page, setPage] = useState(1)
  const pages = pageCount(sorted.length, 12)
  const safePage = clampPage(page, sorted.length, 12)
  useEffect(() => { setPage((current) => clampPage(current, sorted.length, 12)) }, [sorted.length])
  return <div className="page"><header className="page-header"><div><p className="page-kicker">Lo que ya disfrutaste</p><h1>Historial</h1><p className="page-subtitle">Vuelve a preparar algo o revisa cómo vas variando.</p></div></header>{sorted.length ? <section className="section-block history-list">{paginate(sorted, safePage, 12).map((entry) => { const meal = byId.get(entry.mealOptionId); if (!meal) return null; const slot = MEAL_SLOTS.find((item) => item.id === meal.slot); return <article className="history-row" key={entry.id}><button className="history-row__main" onClick={() => onOpen(meal)} type="button"><span className="section-kicker">{slot?.label ?? meal.slot}</span><strong>{meal.title}</strong><small>{dateLabel(entry.eatenAt)}{entry.rating ? ` · ${'★'.repeat(entry.rating)}` : ''}</small></button><div className="history-row__actions"><button className="text-button" onClick={() => onRepeat(meal)} type="button"><Icon name="play" size={15} /> Repetir</button><button className="text-button text-button--muted" onClick={() => onDelete(entry)} type="button" aria-label={`Eliminar ${meal.title} del historial`}>Eliminar</button></div></article> })}<Pagination page={safePage} pages={pages} onChange={setPage} /></section> : <EmptyState title="Tu historial está vacío" message="Cuando marques una comida como preparada aparecerá aquí." />}</div>
}
