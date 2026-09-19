import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { rankMealOptions } from '../domain/recommendations'
import { buildShoppingList, generateWeeklyPlan, PLANNING_SLOTS } from '../domain/weekly'
import { exportWeeklyPlan } from '../domain/weekly-export'
import type { MealOption, PantryItem, WeeklyPlan, WeeklyPlanEntry } from '../domain/types'

function monday() { const date = new Date(); const day = date.getDay(); date.setDate(date.getDate() - (day === 0 ? 6 : day - 1)); return date.toISOString().slice(0, 10) }
function labelDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) }
function labelCategory(category: string) { return ({ protein: 'Proteínas', proteina: 'Proteínas', vegetable: 'Verduras', verdura: 'Verduras', fruit: 'Frutas', fruta: 'Frutas', dairy: 'Lácteos', lacteos: 'Lácteos', cereal: 'Cereales', bebida: 'Bebidas', condimento: 'Otros', other: 'Otros' } as Record<string, string>)[category] ?? 'Otros' }
function slotLabel(slot: WeeklyPlanEntry['slot']) { return ({ breakfast: 'Desayuno', midday: 'Medio día', lunch: 'Comida', afternoon: 'Media tarde', dinner: 'Cena' } as Record<string, string>)[slot] ?? slot }

export function WeeklyScreen({ meals, pantry, avoidRepeatDays, plan, onSave, onOpen, onPantryChange }: { meals: MealOption[]; pantry: PantryItem[]; avoidRepeatDays: number; plan: WeeklyPlan | null; onSave: (plan: WeeklyPlan) => void; onOpen: (meal: MealOption) => void; onPantryChange: (item: PantryItem, patch: Partial<Pick<PantryItem, 'available' | 'useSoon'>>) => void }) {
  const [tab, setTab] = useState<'week' | 'shopping'>('week')
  const [hideAvailable, setHideAvailable] = useState(false)
  const [startDate, setStartDate] = useState(plan?.startDate ?? monday())
  const [changeEntry, setChangeEntry] = useState<WeeklyPlanEntry | null>(null)
  const [changeQuery, setChangeQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastActionRef = useRef<HTMLButtonElement | null>(null)
  const workingPlan = plan
  const byId = new Map(meals.map((meal) => [meal.id, meal]))
  const shopping = useMemo(() => workingPlan ? buildShoppingList(workingPlan, meals, pantry, hideAvailable) : [], [hideAvailable, meals, pantry, workingPlan])
  const groupedShopping = useMemo(() => shopping.reduce<Record<string, typeof shopping>>((groups, item) => { (groups[item.category] ??= []).push(item); return groups }, {}), [shopping])
  const changeOptions = useMemo(() => {
    if (!changeEntry) return []
    const query = changeQuery.trim().toLocaleLowerCase('es')
    return rankMealOptions(meals.filter((meal) => meal.slot === changeEntry.slot && (!query || meal.title.toLocaleLowerCase('es').includes(query))), pantry, new Date(), avoidRepeatDays)
  }, [avoidRepeatDays, changeEntry, changeQuery, meals, pantry])
  const changingMeal = changeEntry?.mealOptionId ? byId.get(changeEntry.mealOptionId) : undefined

  useEffect(() => {
    if (!changeEntry) return
    closeButtonRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') closeChange() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [changeEntry])

  function generate() { onSave(generateWeeklyPlan(meals, startDate, pantry, workingPlan, avoidRepeatDays)) }
  function updateEntry(entry: WeeklyPlanEntry, patch: Partial<WeeklyPlanEntry>) { if (!workingPlan) return; onSave({ ...workingPlan, entries: workingPlan.entries.map((item) => item.id === entry.id ? { ...item, ...patch } : item) }) }
  function openChange(entry: WeeklyPlanEntry, event: React.MouseEvent<HTMLButtonElement>) { lastActionRef.current = event.currentTarget; setChangeQuery(''); setChangeEntry(entry) }
  function closeChange() { setChangeEntry(null); window.setTimeout(() => lastActionRef.current?.focus(), 0) }
  async function exportWeek() {
    if (!workingPlan) return
    setExporting(true); setExportNotice(null)
    try { const result = await exportWeeklyPlan(workingPlan, meals); setExportNotice(result === 'downloaded' ? 'Imagen descargada' : 'Imagen abierta en una pestaña nueva') }
    catch { setExportNotice('No pudimos preparar la imagen. Inténtalo de nuevo.') }
    finally { setExporting(false) }
  }

  return <div className="page week-page">
    <header className="page-header"><div><p className="page-kicker">Organiza sin complicarte</p><h1>Plan semanal</h1><p className="page-subtitle">Genera una propuesta con las opciones reales de tu dieta y ajústala a tu gusto.</p></div></header>
    <div className="week-toolbar">
      <div className="segmented-control"><button className={tab === 'week' ? 'is-selected' : ''} onClick={() => setTab('week')} type="button">Mi semana</button><button className={tab === 'shopping' ? 'is-selected' : ''} onClick={() => setTab('shopping')} type="button">Lista del súper</button></div>
      {tab === 'week' && <div className="week-actions"><label>Comienza <input aria-label="Fecha de inicio de la semana" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>{workingPlan && <button className="button button--secondary" disabled={exporting} onClick={() => { void exportWeek() }} type="button"><Icon name="download" size={16} /> {exporting ? 'Preparando…' : 'Exportar semana'}</button>}<button className="button button--primary" onClick={generate} type="button"><Icon name="sparkles" size={16} /> {workingPlan ? 'Regenerar semana' : 'Generar mi semana'}</button></div>}
    </div>
    {exportNotice && <div className="inline-notice" role="status">{exportNotice}<button className="icon-button" aria-label="Cerrar aviso" onClick={() => setExportNotice(null)} type="button"><Icon name="close" size={16} /></button></div>}
    {tab === 'week' && !workingPlan && <EmptyState title="Aún no tienes una semana" message="Genera una propuesta con tus comidas reales, favoritos y despensa." action={{ label: 'Generar mi semana', onClick: generate }} />}
    {tab === 'week' && workingPlan && <section className="week-grid" aria-label="Plan semanal">{[0, 1, 2, 3, 4, 5, 6].map((offset) => { const date = new Date(`${workingPlan.startDate}T12:00:00`); date.setDate(date.getDate() + offset); const dateKey = date.toISOString().slice(0, 10); return <article className="day-column" key={dateKey}><header><strong>{labelDate(dateKey)}</strong><span>Día {offset + 1}</span></header>{PLANNING_SLOTS.map((slot) => { const entry = workingPlan.entries.find((item) => item.plannedDate === dateKey && item.slot === slot); const meal = entry?.mealOptionId ? byId.get(entry.mealOptionId) : undefined; return <div className={`week-entry${entry?.locked ? ' is-locked' : ''}`} key={slot}><div className="week-entry__label"><span className="section-kicker">{slotLabel(slot)}</span>{entry?.locked && <span className="lock-label">Bloqueada</span>}</div>{entry && meal ? <><button className="week-entry__title" onClick={() => onOpen(meal)} type="button">{meal.title}</button><div className="week-entry__controls"><button className="week-change-button" onClick={(event) => openChange(entry, event)} type="button"><span>Cambiar</span><Icon name="chevron-right" size={15} /></button><button className="text-button" onClick={() => updateEntry(entry, { locked: !entry.locked })} type="button">{entry.locked ? 'Desbloquear' : 'Bloquear'}</button><button className="text-button text-button--muted" onClick={() => updateEntry(entry, { mealOptionId: null })} type="button">Limpiar</button></div></> : <button className="week-entry__empty" onClick={() => entry && updateEntry(entry, { mealOptionId: rankMealOptions(meals.filter((option) => option.slot === entry.slot), pantry, new Date(), avoidRepeatDays)[0]?.id ?? null })} type="button">Sin opción <span>+ Añadir</span></button>}</div> })}</article> })}</section>}
    {tab === 'shopping' && <section className="shopping-section"><div className="shopping-toolbar"><label className="check-control"><input checked={hideAvailable} onChange={(event) => setHideAvailable(event.target.checked)} type="checkbox" /> Ocultar lo que ya tengo</label><span>{shopping.length} líneas</span></div>{shopping.length ? Object.entries(groupedShopping).map(([category, items]) => <section className="shopping-group" key={category}><h2>{labelCategory(category)}</h2>{items.map((item) => <article className="shopping-row" key={item.key}><div><strong>{item.name}</strong><small>{item.amount !== null ? `${item.amount} ${item.unit ?? ''}` : 'Cantidad según el plan'}{item.householdMeasures.length ? ` · ${item.householdMeasures.join(' · ')}` : ''}</small></div><button className={`button button--secondary${item.available ? ' is-checked' : ''}`} onClick={() => onPantryChange({ ingredientId: item.ingredientId, available: item.available, useSoon: false }, { available: !item.available })} type="button">{item.available ? '✓ Ya lo tienes' : 'Marcar comprado'}</button></article>)}</section>) : <EmptyState title="Tu lista está vacía" message="Genera una semana para calcular los ingredientes necesarios." />}</section>}
    {changeEntry && <div className="dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeChange() }}><section className="change-dialog" role="dialog" aria-modal="true" aria-labelledby="change-dialog-title"><div className="change-dialog__header"><div><p className="section-kicker">{slotLabel(changeEntry.slot)}</p><h2 id="change-dialog-title">Cambiar comida</h2>{changingMeal && <p>Actual: {changingMeal.title}</p>}</div><button ref={closeButtonRef} className="icon-button" aria-label="Cerrar alternativas" onClick={closeChange} type="button"><Icon name="close" size={20} /></button></div><label className="change-dialog__search"><Icon name="search" size={18} /><input autoComplete="off" aria-label="Buscar alternativa" placeholder="Buscar alternativa" value={changeQuery} onChange={(event) => setChangeQuery(event.target.value)} /></label><div className="change-options">{changeOptions.length ? changeOptions.map((option) => <button className={`change-option${option.id === changeEntry.mealOptionId ? ' is-selected' : ''}`} key={option.id} onClick={() => { updateEntry(changeEntry, { mealOptionId: option.id }); closeChange() }} type="button"><span><strong>{option.title}</strong><small>{option.summary || 'Opción de tu dieta'}</small></span>{option.id === changeEntry.mealOptionId && <Icon name="check" size={18} />}</button>) : <EmptyState title="No encontramos alternativas" message="Prueba con otra búsqueda o limpia el texto." />}</div></section></div>}
  </div>
}
