import { Icon } from './Icon'

export function SearchField({ value, onChange, placeholder = 'Busca por nombre, ingrediente o alias' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="search-field">
      <Icon name="search" size={19} />
      <input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="search" />
      {value && <button aria-label="Limpiar búsqueda" className="search-field__clear" onClick={() => onChange('')} type="button"><Icon name="close" size={16} /></button>}
    </label>
  )
}
