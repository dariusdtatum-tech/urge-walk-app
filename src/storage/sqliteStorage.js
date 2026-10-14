// A localStorage-shaped store (getItem / setItem / removeItem / key / length / clear) backed by SQLite.
// The shared logic in src/lib takes a `storage` argument with exactly this shape, so it runs unchanged
// on the phone. Values stay the same JSON strings the PWA wrote, which keeps backup format 1 identical.
//
// `db` is anything with expo-sqlite's synchronous API: execSync(sql), runSync(sql, params),
// getFirstSync(sql, params), getAllSync(sql, params). On the phone that's openDatabaseSync(...);
// tests pass a small SQLite (sql.js) shim with the same four methods.
export const KV_TABLE = 'kv'

export function createSqliteStorage(db) {
  db.execSync(`CREATE TABLE IF NOT EXISTS ${KV_TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`)
  return {
    getItem(key) {
      const row = db.getFirstSync(`SELECT value FROM ${KV_TABLE} WHERE key = ?`, [String(key)])
      return row ? row.value : null
    },
    setItem(key, value) {
      db.runSync(
        `INSERT INTO ${KV_TABLE} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(key), String(value)],
      )
    },
    removeItem(key) {
      db.runSync(`DELETE FROM ${KV_TABLE} WHERE key = ?`, [String(key)])
    },
    clear() {
      db.runSync(`DELETE FROM ${KV_TABLE}`, [])
    },
    // Keys in a stable order (by key), like a Storage's key(i).
    key(i) {
      const row = db.getFirstSync(`SELECT key FROM ${KV_TABLE} ORDER BY key LIMIT 1 OFFSET ?`, [Number(i)])
      return row ? row.key : null
    },
    get length() {
      return db.getFirstSync(`SELECT COUNT(*) AS n FROM ${KV_TABLE}`, []).n
    },
  }
}
