import { Icon, type IconName } from '../components/Icon'

export function PlaceholderScreen({ title, eyebrow, icon, description }: { title: string; eyebrow: string; icon: IconName; description: string }) {
  return <div className="page placeholder-page"><div className="placeholder-illustration"><Icon name={icon} size={28} /></div><p className="page-kicker">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{description}</p><span className="coming-soon"><span className="status-pip" /> Próximamente en tu plan</span></div>
}
