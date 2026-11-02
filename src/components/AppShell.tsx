import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Icon, type IconName } from './Icon'

export type AppRoute = 'today' | 'explore' | 'pantry' | 'favorites' | 'week' | 'history' | 'admin'

const navigation: { id: AppRoute; label: string; icon: IconName; mobile: boolean }[] = [
  { id: 'today', label: 'Hoy', icon: 'home', mobile: true },
  { id: 'explore', label: 'Explorar', icon: 'compass', mobile: true },
  { id: 'pantry', label: 'Despensa', icon: 'pantry', mobile: true },
  { id: 'favorites', label: 'Favoritos', icon: 'heart', mobile: true },
  { id: 'week', label: 'Semana', icon: 'calendar', mobile: true },
  { id: 'history', label: 'Historial', icon: 'history', mobile: false },
  { id: 'admin', label: 'Administrar', icon: 'settings', mobile: false },
]

export function AppShell({ route, onNavigate, children }: { route: AppRoute; onNavigate: (route: AppRoute) => void; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const secondaryActive = route === 'history' || route === 'admin'
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="brand-lockup"><span className="brand-mark"><img src="/icons/dieta-icon.png" alt="" aria-hidden="true" /></span><span>mi dieta</span></div>
        <div className="sidebar-caption">Tu siguiente comida,<br />sin darle más vueltas.</div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <button aria-current={route === item.id ? 'page' : undefined} className={`nav-item${route === item.id ? ' is-active' : ''}`} key={item.id} onClick={() => onNavigate(item.id)} type="button">
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
              {item.id === 'today' && <span className="nav-item__dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><button className="profile-chip" type="button"><span className="profile-avatar">DI</span><span><strong>Mi espacio</strong><small>Solo para ti</small></span><Icon name="more" size={17} /></button></div>
      </aside>
      <main className="app-main">{children}</main>
      <button className={`mobile-more${secondaryActive ? ' is-active' : ''}`} aria-label="Más secciones" aria-expanded={moreOpen} aria-haspopup="dialog" aria-current={secondaryActive ? 'page' : undefined} onClick={() => setMoreOpen(true)} type="button"><Icon name="more" size={20} /> Más</button>
      {moreOpen && <Modal titleId="more-title" onClose={() => setMoreOpen(false)}><h2 id="more-title">Más secciones</h2><button className="button button--secondary" onClick={() => setMoreOpen(false)} type="button">Cerrar</button><div className="more-destinations">{navigation.filter((item) => !item.mobile).map((item) => <button className="button button--secondary" aria-current={route === item.id ? 'page' : undefined} key={item.id} onClick={() => { setMoreOpen(false); onNavigate(item.id) }} type="button"><Icon name={item.icon} size={20} />{item.label}</button>)}</div></Modal>}
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {navigation.filter((item) => item.mobile).map((item) => (
          <button aria-current={route === item.id ? 'page' : undefined} className={`mobile-nav__item${route === item.id ? ' is-active' : ''}`} key={item.id} onClick={() => onNavigate(item.id)} type="button">
            <Icon name={item.icon} size={20} /><span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
