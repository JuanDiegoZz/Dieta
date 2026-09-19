import { Icon } from './Icon'

export function EmptyState({ title, message, action }: { title: string; message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon name="search" size={23} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <button className="button button--secondary" onClick={action.onClick} type="button">{action.label}</button>}
    </div>
  )
}
