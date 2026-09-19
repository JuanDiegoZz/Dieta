import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { MealCard } from '../components/MealCard'
import { Pagination } from '../components/Pagination'
import { clampPage, pageCount, paginate } from '../domain/pagination'
import type { MealOption } from '../domain/types'

export function FavoritesScreen({ meals, onOpen, onCook, onToggleFavorite, onHide }: { meals: MealOption[]; onOpen: (meal: MealOption) => void; onCook: (meal: MealOption) => void; onToggleFavorite: (meal: MealOption) => void; onHide: (meal: MealOption) => void }) {
  const favorites = meals.filter((meal) => meal.favorite)
  const [page, setPage] = useState(1)
  const pages = pageCount(favorites.length, 12)
  const safePage = clampPage(page, favorites.length, 12)
  useEffect(() => { setPage((current) => clampPage(current, favorites.length, 12)) }, [favorites.length])
  return <div className="page"><header className="page-header"><div><p className="page-kicker">Tus elecciones</p><h1>Favoritos</h1><p className="page-subtitle">Las opciones que siempre te apetece volver a preparar.</p></div></header>{favorites.length ? <section className="section-block section-block--cards"><div className="section-heading"><div><p className="section-kicker">Guardados</p><h2>Tu selección</h2></div><span className="result-count">{favorites.length}</span></div><div className="card-grid">{paginate(favorites, safePage, 12).map((meal) => <MealCard key={meal.id} meal={meal} onOpen={onOpen} onCook={onCook} onToggleFavorite={onToggleFavorite} onHide={onHide} />)}</div><Pagination page={safePage} pages={pages} onChange={setPage} /></section> : <EmptyState title="Aún no tienes favoritos" message="Toca el corazón de una opción para encontrarla aquí." />}</div>
}
