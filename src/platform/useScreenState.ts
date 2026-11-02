import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

// Store only UI controls in the current history entry, never catalog or personal records.
export function useScreenState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const saved = window.history.state?.dieta?.ui?.[key]
    return saved !== undefined ? saved : typeof initial === 'function' ? (initial as () => T)() : initial
  })
  function update(next: SetStateAction<T>) {
    setValue((previous) => {
      const resolved = typeof next === 'function' ? (next as (value: T) => T)(previous) : next
      const state = window.history.state ?? {}
      const dieta = state.dieta ?? {}
      window.history.replaceState({ ...state, dieta: { ...dieta, ui: { ...dieta.ui, [key]: resolved } } }, '')
      return resolved
    })
  }
  return [value, update]
}
