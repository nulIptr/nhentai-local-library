import { Elysia, t } from 'elysia'
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm'
import { db } from '../db.ts'
import { mangas } from '../schema.ts'
import { openZipForPage } from '../lib/zip.ts'
import { readCover } from '../lib/cover.ts'
import { buildTagMeta } from '../lib/tags.ts'
import { scanLibrary } from '../lib/scan.ts'

const SORT_FIELDS = [
  'date',
  'mtime',
  'posted',
  'rating',
  'readCount',
  'bundleSize',
  'pageCount',
  'title'
] as const

type SortField = (typeof SORT_FIELDS)[number]

function isSortField(value: string): value is SortField {
  return SORT_FIELDS.includes(value as SortField)
}

function toOrderBy(field: SortField, order: 'asc' | 'desc') {
  const col =
    field === 'date'
      ? mangas.date
      : field === 'mtime'
        ? mangas.mtime
        : field === 'posted'
          ? mangas.posted
          : field === 'rating'
            ? mangas.rating
            : field === 'readCount'
              ? mangas.readCount
              : field === 'bundleSize'
                ? mangas.bundleSize
                : field === 'pageCount'
                  ? mangas.pageCount
                  : mangas.title
  return order === 'desc' ? desc(col) : asc(col)
}

export const mangaRoutes = new Elysia({ prefix: '/api/mangas' })
  .get(
    '/categories',
    async () => {
      const rows = await db
        .selectDistinct({ category: mangas.category })
        .from(mangas)
        .where(and(eq(mangas.hiddenBook, false), eq(mangas.exist, true)))
      return rows.map((r) => r.category).filter(Boolean) as string[]
    }
  )
  .post(
    '/scan',
    async ({ set }) => {
      const libraryPath = process.env.LIBRARY_PATH
      if (!libraryPath) {
        set.status = 400
        return { error: 'LIBRARY_PATH environment variable is not configured' }
      }

      try {
        const summary = await scanLibrary(libraryPath)
        return summary
      } catch (e) {
        set.status = 400
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }
  )
  .get(
    '/list',
    async ({ query }) => {
      const page = Math.max(1, Number(query.page || 1))
      const pageSize = Math.max(1, Math.min(200, Number(query.pageSize || 24)))
      const q = (query.q || '').trim()
      const category = (query.category || '').trim()
      const tag = (query.tag || '').trim()
      const sortBy: SortField = isSortField(query.sortBy || '') ? (query.sortBy as SortField) : 'date'
      const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'
      const includeHidden = query.includeHidden === 'true'

      const conditions = []
      if (!includeHidden) {
        conditions.push(eq(mangas.hiddenBook, false))
        conditions.push(eq(mangas.exist, true))
      }

      if (category) {
        conditions.push(eq(mangas.category, category))
      }

      if (tag) {
        conditions.push(like(mangas.tags, `%${tag}%`))
      }

      if (q) {
        const pattern = `%${q}%`
        conditions.push(
          or(
            like(mangas.title, pattern),
            like(mangas.titleJpn, pattern),
            like(mangas.tags, pattern)
          )
        )
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(mangas)
        .where(where)
      const total = totalResult[0]?.count || 0

      const items = await db
        .select()
        .from(mangas)
        .where(where)
        .orderBy(toOrderBy(sortBy, sortOrder))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      const itemsWithMeta = items.map((item) => ({
        ...item,
        tagMeta: buildTagMeta(item.tags)
      }))

      return {
        items: itemsWithMeta,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        q: t.Optional(t.String()),
        category: t.Optional(t.String()),
        tag: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
        includeHidden: t.Optional(t.String())
      })
    }
  )
  .get(
    '/:id',
    async ({ params, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }
      return rows[0]
    },
    {
      params: t.Object({ id: t.String() })
    }
  )
  .get(
    '/:id/tags',
    async ({ params, set }) => {
      const rows = await db.select({ tags: mangas.tags }).from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }
      return buildTagMeta(rows[0].tags)
    },
    {
      params: t.Object({ id: t.String() })
    }
  )
  .get(
    '/:id/cover',
    async ({ params, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }

      try {
        const { buffer, mime } = await readCover(rows[0].coverPath, rows[0].filepath)
        return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': mime } })
      } catch (e) {
        set.status = 500
        return { error: String(e) }
      }
    },
    {
      params: t.Object({ id: t.String() })
    }
  )
  .get(
    '/:id/page/:index',
    async ({ params, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }

      if (!rows[0].filepath) {
        set.status = 400
        return { error: 'Manga has no filepath' }
      }

      try {
        const { buffer, mime } = await openZipForPage(rows[0].filepath, Number(params.index))
        return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': mime } })
      } catch (e) {
        set.status = 500
        return { error: String(e) }
      }
    },
    {
      params: t.Object({ id: t.String(), index: t.Number() })
    }
  )
  .post(
    '/:id/read',
    async ({ params, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }

      await db
        .update(mangas)
        .set({
          readCount: (rows[0].readCount || 0) + 1,
          mtime: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(mangas.id, params.id))

      const updated = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      return updated[0]
    },
    {
      params: t.Object({ id: t.String() })
    }
  )
  .post(
    '/:id/rate',
    async ({ params, body, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }

      await db
        .update(mangas)
        .set({ rating: body.rating, mtime: new Date().toISOString() })
        .where(eq(mangas.id, params.id))

      const updated = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      return updated[0]
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ rating: t.Number({ minimum: 0, maximum: 5 }) })
    }
  )
  .patch(
    '/:id/meta',
    async ({ params, body, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }

      const update: Partial<typeof mangas.$inferInsert> = {}
      if (typeof body.mark === 'boolean') update.mark = body.mark
      if (typeof body.hiddenBook === 'boolean') update.hiddenBook = body.hiddenBook
      if (typeof body.readCount === 'number') update.readCount = body.readCount
      if (typeof body.currentPage === 'number') update.currentPage = Math.max(0, body.currentPage)

      if (Object.keys(update).length > 0) {
        update.mtime = new Date().toISOString()
        update.updatedAt = new Date().toISOString()
        await db.update(mangas).set(update).where(eq(mangas.id, params.id))
      }

      const updated = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      return updated[0]
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        mark: t.Optional(t.Boolean()),
        hiddenBook: t.Optional(t.Boolean()),
        readCount: t.Optional(t.Number()),
        currentPage: t.Optional(t.Number())
      })
    }
  )
