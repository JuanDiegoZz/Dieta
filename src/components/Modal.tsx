import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ titleId, onClose, children, className = 'change-dialog' }: { titleId: string; onClose: () => void; children: ReactNode; className?: string }) {
  const panel = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null
    const root = document.getElementById('root')
    const previousHidden = root?.getAttribute('aria-hidden')
    const overflow = document.body.style.overflow
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter((item) => item.getClientRects().length > 0)
    const focusFirst = () => (focusable()[0] ?? panel.current)?.focus()
    focusFirst()
    root?.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = 'hidden'
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable(), first = items[0], last = items[items.length - 1]
      if (!first) { event.preventDefault(); panel.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    function containFocus(event: FocusEvent) { if (!panel.current?.contains(event.target as Node)) focusFirst() }
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('focusin', containFocus)
    return () => {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', containFocus)
      document.body.style.overflow = overflow
      if (previousHidden == null) root?.removeAttribute('aria-hidden'); else root?.setAttribute('aria-hidden', previousHidden)
      if (origin?.isConnected) origin.focus()
    }
  }, [])
  return createPortal(<div className="dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} tabIndex={-1} className={className} role="dialog" aria-modal="true" aria-labelledby={titleId}>{children}</section></div>, document.body)
}
