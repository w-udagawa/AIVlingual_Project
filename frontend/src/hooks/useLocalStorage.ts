/**
 * Local storage hook
 */

import { useState, useEffect } from 'react'

export default function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  // Get from local storage then parse stored json or return initialValue
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T) => {
    if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key "${key}" even though environment is not a browser`
      )
    }

    try {
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(value))
      // Save state
      setStoredValue(value)
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  useEffect(() => {
    setStoredValue(readValue())
  }, [])

  return [storedValue, setValue]
}