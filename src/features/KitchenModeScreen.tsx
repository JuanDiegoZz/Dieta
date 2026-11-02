import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { RequestError } from '../data/api'
import { finishPreparation, preparationEvent, type PreparationEvent } from '../domain/preparation'
import type { MealOption } from '../domain/types'

export function KitchenModeScreen({ meal, onBack, onComplete }: { meal: MealOption; onBack: () => void; onComplete: (event: PreparationEvent) => Promise<void> }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'unknown'>('idle')
  const pending = useRef(false)
  const event = useRef<PreparationEvent | null>(null)
  async function complete() {
    if (pending.current || status === 'success') return
    pending.current = true
    setStatus('saving')
    try {
      event.current ??= preparationEvent(meal.id)
      await onComplete(event.current)
      finishPreparation(meal.id)
      setStatus('success')
    } catch (error) { setStatus(error instanceof RequestError && error.status < 500 ? 'error' : 'unknown') }
    finally { pending.current = false }
  }
  return (
    <div className="kitchen-mode">
      <header className="kitchen-header"><button className="kitchen-back" onClick={onBack} type="button"><Icon name="chevron-left" size={21} /> Salir</button><span className="kitchen-label"><span className="status-pip" /> Modo cocina</span><button className="kitchen-more" type="button" aria-label="Más opciones"><Icon name="more" size={21} /></button></header>
      <main className="kitchen-content"><p className="page-kicker">{meal.components.length} componentes</p><h1>{meal.title}</h1><p className="kitchen-summary">Prepara solo lo que necesitas. Las cantidades conservan el plan.</p><div className="kitchen-ingredients">{meal.components.flatMap((component) => component.ingredients.map((item) => <div className="kitchen-ingredient" key={item.id}><div><strong>{item.name}</strong>{item.householdMeasure && <span>{item.householdMeasure}</span>}</div><strong className="kitchen-quantity">{item.quantity}</strong></div>))}</div>{meal.note && <p className="kitchen-note">{meal.note}</p>}<p role="status" aria-live="polite">{status === 'saving' ? 'Guardando preparación…' : status === 'success' ? 'Preparación guardada en el historial.' : status === 'error' ? 'El servidor rechazó el guardado. Puedes reintentar.' : status === 'unknown' ? 'No pudimos confirmar el resultado. Reintentar verificará la misma preparación sin duplicarla.' : ''}</p><button className={`kitchen-done${status === 'success' ? ' is-done' : ''}`} disabled={status === 'saving' || status === 'success'} onClick={() => { void complete() }} type="button">{status === 'success' ? <><Icon name="check" size={22} /> Preparado</> : status === 'saving' ? 'Guardando…' : status === 'error' || status === 'unknown' ? 'Reintentar confirmación' : <><span className="kitchen-done__circle" /> Terminé</>}</button></main>
    </div>
  )
}
