import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema.ts'

const dbPath = process.env.DB_PATH || './database.sqlite'
const sqlite = new Database(dbPath)

export const db = drizzle(sqlite, { schema })
