import { describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import { migrateMangasDatabase } from '../database-migrations.ts'

describe('migrateMangasDatabase', () => {
  it('adds upload_date and converts legacy millisecond dates once', () => {
    const db = new Database(':memory:')
    try {
      db.run('CREATE TABLE Mangas (id TEXT PRIMARY KEY, date TEXT)')
      db.prepare('INSERT INTO Mangas (id, date) VALUES (?, ?), (?, ?)').run('numeric', '1673308265000', 'iso', '2023-01-09T23:51:05.000Z')

      migrateMangasDatabase(db)
      migrateMangasDatabase(db)

      const rows = db.prepare('SELECT id, date FROM Mangas ORDER BY id').all() as Array<{ id: string; date: string }>
      expect(rows).toEqual([
        { id: 'iso', date: '2023-01-09T23:51:05.000Z' },
        { id: 'numeric', date: '2023-01-09T23:51:05.000Z' }
      ])
      const columns = db.prepare('PRAGMA table_info(Mangas)').all() as Array<{ name: string }>
      expect(columns.some((column) => column.name === 'upload_date')).toBe(true)
    } finally {
      db.close()
    }
  })
})
