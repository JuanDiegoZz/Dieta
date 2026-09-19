import { Icon } from './Icon'
import type { MealOption } from '../domain/types'

function availabilityLabel(value: number | null) {
  if (value === null) return { text: 'Sin datos de despensa', tone: 'muted' }
  if (value >= 0.85) return { text: 'Lo tienes casi todo', tone: 'good' }
  if (value >= 0.65) return { text: 'Tienes buena parte', tone: 'warm' }
  return { text: 'Te faltan algunos ingredientes', tone: 'muted' }
}

export function MealCard({
  meal,
  onOpen,
  onToggleFavorite,
  onCook,
  onHide,
}: {
  meal: MealOption
  onOpen: (meal: MealOption) => void
  onToggleFavorite: (meal: MealOption) => void
  onCook?: (meal: MealOption) => void
  onHide?: (meal: MealOption) => void
}) {
  const availability = availabilityLabel(meal.availability)
  const componentSummary = meal.components.map((component) => component.label ?? 'Componente').join(' · ')

  return (
    <article className="meal-card">
      <div className="meal-card__topline">
        <span className="eyebrow">{componentSummary}</span>
        <button
          className={`icon-button favorite-button${meal.favorite ? ' is-favorite' : ''}`}
          aria-label={meal.favorite ? `Quitar ${meal.title} de favoritos` : `Guardar ${meal.title} en favoritos`}
          aria-pressed={meal.favorite}
          onClick={() => onToggleFavorite(meal)}
          type="button"
        >
          <Icon name="heart" size={19} />
        </button>
      </div>
      <button className="meal-card__body" onClick={() => onOpen(meal)} type="button">
        <h3>{meal.title}</h3>
        <p>{meal.summary}</p>
        <div className="meal-card__meta">
          <span className={`availability availability--${availability.tone}`}>
            <span className="availability__dot" />
            {meal.compatibility?.label ?? availability.text}
          </span>
          <span className="last-eaten"><Icon name="clock" size={14} /> {meal.lastEaten}</span>
        </div>
      </button>
      <div className="meal-card__footer">
        <div className="tag-list">
          {meal.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
        {onCook && (
          <button className="text-button" onClick={() => onCook(meal)} type="button">
            <Icon name="play" size={15} /> Cocinar
          </button>
        )}
        {onHide && <button className="text-button text-button--muted" onClick={() => onHide(meal)} type="button">Ocultar</button>}
      </div>
    </article>
  )
}
