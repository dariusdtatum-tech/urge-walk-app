// Test helper: expo-sqlite's synchronous API on top of sql.js (SQLite compiled to WebAssembly),
// so the adapter is tested against real SQLite in Node without native builds.
import initSqlJs from 'sql.js'

export async function openTestDatabase() {
  const SQL = await initSqlJs()
  const raw = new SQL.Database()
  const rows = (sql, params = []) => {
    const st = raw.prepare(sql)
    try {
      st.bind(params)
      const out = []
      while (st.step()) out.push(st.getAsObject())
      return out
    } finally {
      st.free()
    }
  }
  return {
    raw,
    execSync: (sql) => { raw.exec(sql) },
    runSync: (sql, params = []) => { raw.run(sql, params); return { changes: raw.getRowsModified() } },
    getFirstSync: (sql, params = []) => rows(sql, params)[0] ?? null,
    getAllSync: (sql, params = []) => rows(sql, params),
  }
}
