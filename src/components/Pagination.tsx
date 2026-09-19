export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  const numbers = pages <= 7
    ? Array.from({ length: pages }, (_, index) => index + 1)
    : [1, ...(page > 3 ? ['…'] : []), ...[page - 1, page, page + 1].filter((value) => value > 1 && value < pages), ...(page < pages - 2 ? ['…'] : []), pages]
  return <nav className="pagination" aria-label="Paginación">
    <button className="pagination__button" disabled={page === 1} onClick={() => onChange(page - 1)} type="button">‹ <span>Anterior</span></button>
    <span className="pagination__mobile-label">Página {page} de {pages}</span>
    <div className="pagination__numbers">{numbers.map((value, index) => typeof value === 'number' ? <button className={`pagination__number${value === page ? ' is-selected' : ''}`} key={value} aria-current={value === page ? 'page' : undefined} onClick={() => onChange(value)} type="button">{value}</button> : <span className="pagination__ellipsis" key={`${value}-${index}`}>{value}</span>)}</div>
    <button className="pagination__button" disabled={page === pages} onClick={() => onChange(page + 1)} type="button"><span>Siguiente</span> ›</button>
  </nav>
}
