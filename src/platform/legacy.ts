export function supportsAdvancedEffects() {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
}

export function installLegacyMode() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('legacy-mode', !supportsAdvancedEffects())
}
