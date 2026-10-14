// The app's one storage: SQLite on the phone, behind the same interface the PWA's localStorage had.
// installStorage() also sets globalThis.localStorage so src/lib's default `storage` arguments work as-is.
import { openDatabaseSync } from 'expo-sqlite'
import { createSqliteStorage } from './sqliteStorage.js'

export const DB_NAME = 'urgewalk.db'
let storage = null

export function getStorage() {
  if (!storage) storage = createSqliteStorage(openDatabaseSync(DB_NAME))
  return storage
}

export function installStorage() {
  const s = getStorage()
  if (!globalThis.localStorage) globalThis.localStorage = s
  return s
}
