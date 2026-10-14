import { createContext, useContext } from 'react'

// The SQLite store (or an in-memory one in tests). Every screen reads and writes through it.
export const StorageContext = createContext(null)
export const useStorage = () => {
  const s = useContext(StorageContext)
  if (!s) throw new Error('StorageContext missing')
  return s
}
