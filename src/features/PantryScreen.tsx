import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Pagination } from '../components/Pagination'
import { SearchField } from '../components/SearchField'
import { filterIngredients } from '../domain/pantry'
import { clampPage, pageCount, paginate } from '../domain/pagination'
import type { Ingredient, PantryItem } from '../domain/types'

export function PantryScreen({ ingredients, pantry, onChange }: { ingredients: Ingredient[]; pantry: PantryItem[]; onChange: (item: PantryItem, patch: Partial<Pick<PantryItem, 'available' | 'useSoon'>>) => void }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pantryMap = new Map(pantry.map((item) => [item.ingredientId, item]))
  const results = useMemo(() => filterIngredients(ingredients.filter((ingredient) => ingredient.active), query), [ingredients, query])
  const pages = pageCount(results.length, 24)
  const safePage = clampPage(page, results.length, 24)
  useEffect(() => { setPage(1) }, [query])
  useEffect(() => { setPage((current) => clampPage(current, results.length, 24)) }, [results.length])
  return <div className="page"><header className="page-header"><div><p className="page-kicker">Lo que tienes en casa</p><h1>Mi despensa</h1><p className="page-subtitle">Marca ingredientes en un toque para encontrar comidas que sí puedes preparar.</p></div></header><SearchField value={query} onChange={setQuery} placeholder="Busca pollo, yogurt, tomate..." /><section className="pantry-toolbar"><span>{results.length} ingredientes</span><span className="pantry-legend"><i className="pantry-dot pantry-dot--yes" /> Tengo <i className="pantry-dot pantry-dot--soon" /> Usar pronto</span></section>{results.length ? <><div className="pantry-list">{paginate(results, safePage, 24).map((ingredient) => { const item = pantryMap.get(ingredient.id) ?? { ingredientId: ingredient.id, available: false, useSoon: false }; return <article className={`pantry-row${item.available ? ' is-available' : ''}`} key={ingredient.id}><div className="pantry-row__name"><strong>{ingredient.canonicalName}</strong>{ingredient.aliases.length > 0 && <small>{ingredient.aliases.slice(0, 2).join(' · ')}</small>}</div><div className="pantry-row__actions"><button className={`pantry-toggle${item.available ? ' is-active' : ''}`} onClick={() => onChange(item, { available: !item.available })} type="button" aria-pressed={item.available}>{item.available ? 'Tengo ✓' : 'No tengo'}</button><button className={`soon-toggle${item.useSoon ? ' is-active' : ''}`} onClick={() => onChange(item, { useSoon: !item.useSoon })} type="button" aria-pressed={item.useSoon}>Usar pronto</button></div></article> })}</div><Pagination page={safePage} pages={pages} onChange={setPage} /></> : <EmptyState title="No encontramos ingredientes" message="Prueba con otro nombre o alias." action={{ label: 'Limpiar búsqueda', onClick: () => setQuery('') }} />}</div>
}
