import type { SVGProps } from 'react'

export type IconName =
  | 'calendar'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'compass'
  | 'heart'
  | 'home'
  | 'menu'
  | 'more'
  | 'pantry'
  | 'play'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'star'
  | 'history'
  | 'check'
  | 'close'
  | 'download'

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  }

  switch (name) {
    case 'home':
      return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></svg>
    case 'compass':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.4 8.6-1.9 4.9-4.9 1.9 1.9-4.9 4.9-1.9Z" /></svg>
    case 'pantry':
      return <svg {...common}><path d="M4 8h16v12H4z" /><path d="M7 8V5h10v3M8 12h8M8 16h5" /></svg>
    case 'heart':
      return <svg {...common}><path d="M20.8 8.7c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" /></svg>
    case 'history':
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></svg>
    case 'calendar':
      return <svg {...common}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M7 3v3M17 3v3M3 9h18M7 13h3M7 17h3M14 13h3" /></svg>
    case 'settings':
      return <svg {...common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1A2 2 0 1 1 3 15l.1-.1a2 2 0 0 0-1.4-3.4h-.2a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.4-3.4L3 4A2 2 0 1 1 5.8 1.2l.1.1A2 2 0 0 0 9.3 0h.2a2 2 0 0 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1A2 2 0 1 1 19.8 4l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.7 3.5Z" transform="translate(0 2) scale(.83)" /></svg>
    case 'search':
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
    case 'star':
      return <svg {...common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
    case 'sparkles':
      return <svg {...common}><path d="m12 3-1.4 5.1L6 10l4.6 1.8L12 17l1.4-5.2L18 10l-4.6-1.9L12 3ZM19 15l-.6 2.1L16 18l2.4.9L19 21l.6-2.1L22 18l-2.4-.9L19 15Z" /></svg>
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'play':
      return <svg {...common}><path d="m8 5 11 7-11 7V5Z" /></svg>
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
    case 'close':
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
    case 'download':
      return <svg {...common}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
    case 'chevron-left':
      return <svg {...common}><path d="m14 5-7 7 7 7" /></svg>
    case 'chevron-right':
      return <svg {...common}><path d="m10 5 7 7-7 7" /></svg>
    case 'menu':
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>
  }
}
