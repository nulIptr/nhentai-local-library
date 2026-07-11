import { Database } from 'bun:sqlite'

const dbPath = process.env.DB_PATH || './database.sqlite'
const db = new Database(dbPath)

const columns = db
  .prepare("SELECT name FROM pragma_table_info('Mangas')")
  .all() as { name: string }[]

if (!columns.some((c) => c.name === 'currentPage')) {
  db.prepare("ALTER TABLE Mangas ADD COLUMN currentPage INTEGER DEFAULT 0").run()
  console.log('Added currentPage column')
} else {
  console.log('currentPage column already exists')
}

db.close()
