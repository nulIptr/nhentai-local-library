import type { Database } from 'bun:sqlite'

interface TableColumn {
  name: string
}

export function migrateMangasDatabase(db: Database): void {
  const columns = db.prepare("SELECT name FROM pragma_table_info('Mangas')").all() as TableColumn[]
  const hasColumn = (name: string) => columns.some((column) => column.name === name)

  if (!hasColumn('currentPage')) {
    db.prepare('ALTER TABLE Mangas ADD COLUMN currentPage INTEGER DEFAULT 0').run()
  }
  if (!hasColumn('upload_date')) {
    db.prepare('ALTER TABLE Mangas ADD COLUMN upload_date TEXT').run()
  }

  // Legacy values were stored as millisecond timestamp strings. Preserve existing ISO values.
  db.prepare(`
    UPDATE Mangas
    SET date = strftime('%Y-%m-%dT%H:%M:%fZ', CAST(date AS REAL) / 1000.0, 'unixepoch')
    WHERE date IS NOT NULL
      AND trim(CAST(date AS TEXT)) NOT GLOB '*[^0-9]*'
      AND length(trim(CAST(date AS TEXT))) = 13
  `).run()
}
