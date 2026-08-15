import { Database } from 'bun:sqlite'
import { migrateMangasDatabase } from '../src/server/lib/database-migrations.ts'

const dbPath = process.env.DB_PATH || './database.sqlite'
const db = new Database(dbPath)

migrateMangasDatabase(db)
console.log('Mangas schema migration completed')

db.close()
