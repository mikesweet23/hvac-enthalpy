import { useEffect, useState } from 'react'

const PREFIX = 'enthalpy:'

/** useState that survives reloads via localStorage – handy on a phone. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // storage may be unavailable (private mode / quota); state still works in memory
    }
  }, [key, value])

  return [value, setValue] as const
}
