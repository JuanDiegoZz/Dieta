import { MEAL_SLOTS } from '../domain/slots'
import type { MealSlot } from '../domain/types'

export function MealTabs({ selected, onSelect }: { selected: MealSlot; onSelect: (slot: MealSlot) => void }) {
  return (
    <div className="meal-tabs" aria-label="Franjas del día" role="tablist">
      {MEAL_SLOTS.map((slot) => (
        <button
          className={`meal-tab${selected === slot.id ? ' is-selected' : ''}`}
          key={slot.id}
          onClick={() => onSelect(slot.id)}
          role="tab"
          aria-selected={selected === slot.id}
          type="button"
        >
          {slot.label}
        </button>
      ))}
    </div>
  )
}
