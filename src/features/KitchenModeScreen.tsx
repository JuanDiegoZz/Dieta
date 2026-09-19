import { useState } from 'react'
import { Icon } from '../components/Icon'
import type { MealOption } from '../domain/types'

export function KitchenModeScreen({ meal, onBack, onComplete }: { meal: MealOption; onBack: () => void; onComplete: () => void }) {
  const [done, setDone] = useState(false)
  return (
    <div className="kitchen-mode">
      <header className="kitchen-header"><button className="kitchen-back" onClick={onBack} type="button"><Icon name="chevron-left" size={21} /> Salir</button><span className="kitchen-label"><span className="status-pip" /> Modo cocina</span><button className="kitchen-more" type="button" aria-label="Más opciones"><Icon name="more" size={21} /></button></header>
      <main className="kitchen-content"><p className="page-kicker">{meal.components.length} componentes</p><h1>{meal.title}</h1><p className="kitchen-summary">Prepara solo lo que necesitas. Las cantidades conservan el plan.</p><div className="kitchen-ingredients">{meal.components.flatMap((component) => component.ingredients.map((item) => <div className="kitchen-ingredient" key={item.id}><div><strong>{item.name}</strong>{item.householdMeasure && <span>{item.householdMeasure}</span>}</div><strong className="kitchen-quantity">{item.quantity}</strong></div>))}</div>{meal.note && <p className="kitchen-note">{meal.note}</p>}<button className={`kitchen-done${done ? ' is-done' : ''}`} onClick={() => { setDone(true); onComplete() }} type="button">{done ? <><Icon name="check" size={22} /> Preparado</> : <><span className="kitchen-done__circle" /> Terminé</>}</button></main>
    </div>
  )
}
