export function SkeletonCard() {
  return (
    <div className="meal-card skeleton-card" aria-label="Cargando opción" role="status">
      <span className="skeleton-line skeleton-line--small" />
      <span className="skeleton-line skeleton-line--title" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-line--short" />
      <div className="skeleton-card__footer"><span className="skeleton-pill" /><span className="skeleton-pill skeleton-pill--wide" /></div>
    </div>
  )
}
