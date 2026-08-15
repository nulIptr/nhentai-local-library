import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const mangas = sqliteTable('Mangas', {
  id: text('id').primaryKey(),
  title: text('title'),
  titleJpn: text('title_jpn'),
  coverPath: text('coverPath'),
  hash: text('hash'),
  filepath: text('filepath'),
  type: text('type'),
  pageCount: integer('pageCount'),
  bundleSize: integer('bundleSize'),
  mtime: text('mtime'),
  coverHash: text('coverHash'),
  status: text('status'),
  date: text('date'),
  rating: real('rating'),
  tags: text('tags', { mode: 'json' }).$type<Record<string, string[]>>(),
  filecount: integer('filecount'),
  posted: integer('posted'),
  filesize: integer('filesize'),
  category: text('category'),
  url: text('url'),
  mark: integer('mark', { mode: 'boolean' }),
  hiddenBook: integer('hiddenBook', { mode: 'boolean' }),
  readCount: integer('readCount'),
  currentPage: integer('currentPage').default(0),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
  uploadDate: text('upload_date'),
  exist: integer('exist', { mode: 'boolean' })
})

export type Manga = typeof mangas.$inferSelect
