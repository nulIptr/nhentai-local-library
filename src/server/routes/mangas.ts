import { unlink } from 'node:fs/promises'
import { Elysia, t } from 'elysia'
import { eq, and, or, like, desc, asc, sql, SQL } from 'drizzle-orm'

import { db } from '../db.ts'
import { mangas } from '../schema.ts'
import { openZipForPage } from '../lib/zip.ts'
import { readCover } from '../lib/cover.ts'
import { buildTagMeta, NAMESPACE_ALIASES } from '../lib/tags.ts'
import { runScanOnce } from '../lib/scan.ts'

const SORT_FIELDS = [
  'mtime',
  'createdAt',
  'updatedAt',
  'uploadDate',
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
    field === 'mtime'
      ? mangas.mtime
      : field === 'createdAt'
        ? mangas.createdAt
        : field === 'updatedAt'
          ? mangas.updatedAt
          : field === 'uploadDate'
            ? mangas.uploadDate
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

function tagCondition(tagParam: string) {
  const sep = tagParam.indexOf(':')
  if (sep > 0) {
    const ns = tagParam.slice(0, sep)
    const val = tagParam.slice(sep + 1)
    if (!val) return like(mangas.tags, `%${tagParam}%`)

    const namespaces = new Set([ns])
    if (NAMESPACE_ALIASES[ns]) namespaces.add(NAMESPACE_ALIASES[ns])
    // 反向别名：如果用户搜索的是 canonical 命名空间，也包含指向它的别名
    for (const [alias, canonical] of Object.entries(NAMESPACE_ALIASES)) {
      if (canonical === ns) namespaces.add(alias)
    }

    const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const pattern = `%"${escaped}"%`
    const conditions = [...namespaces].map((n) =>
      sql`json_extract(${mangas.tags}, ${`$."${n}"`}) LIKE ${pattern}`
    )
    return or(...conditions)
  }
  return like(mangas.tags, `%${tagParam}%`)
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
    async ({ body, set }) => {
      const libraryPath = process.env.LIBRARY_PATH
      if (!libraryPath) {
        set.status = 400
        return { error: 'LIBRARY_PATH environment variable is not configured' }
      }

      const forceFull = body.force === true
      const result = await runScanOnce(
        libraryPath,
        { forceFull },
        (summary) => {
          console.log(
            `[scan] Done: total=${summary.total}, added=${summary.added}, updated=${summary.updated}, removed=${summary.removed}`
          )
        }
      )

      if (!result.started) {
        set.status = result.message?.includes('进行中') ? 409 : 400
        return { error: result.message || 'Scan failed' }
      }

      return {
        started: true,
        message: result.message
      }
    },
    {
      body: t.Object({
        force: t.Optional(t.Boolean())
      })
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
      const sortBy: SortField = isSortField(query.sortBy || '') ? (query.sortBy as SortField) : 'createdAt'
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
        conditions.push(tagCondition(tag))
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
        tagMeta: buildTagMeta(item.tags, { detail: false })
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
    '/random',
    async ({ query }) => {
      const pageSize = Math.min(48, Math.max(1, Number(query.pageSize) || 24))
      const conditions: (SQL<unknown> | undefined)[] = [eq(mangas.exist, true)]
      if (query.q) {
        conditions.push(
          or(
            like(mangas.title, `%${query.q}%`),
            like(mangas.titleJpn, `%${query.q}%`),
            like(mangas.tags, `%${query.q}%`)
          )
        )
      }
      if (query.category) conditions.push(like(mangas.category, query.category))
      if (query.tag) conditions.push(tagCondition(query.tag))

      const where = and(...conditions.filter((c): c is SQL<unknown> => Boolean(c)))
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(mangas)
        .where(where)
      const total = totalResult[0]?.count || 0

      if (total === 0) {
        return {
          items: [],
          pagination: { page: 1, pageSize, total: 0, totalPages: 0 }
        }
      }

      const maxOffset = Math.max(0, total - pageSize)
      const offset = Math.floor(Math.random() * (maxOffset + 1))

      const items = await db
        .select()
        .from(mangas)
        .where(where)
        .orderBy(sql`RANDOM()`)
        .limit(pageSize)
        .offset(offset)

      const itemsWithMeta = items.map((item) => ({
        ...item,
        tagMeta: buildTagMeta(item.tags, { detail: false })
      }))

      return {
        items: itemsWithMeta,
        pagination: { page: 1, pageSize, total, totalPages: 1 }
      }
    },
    {
      query: t.Object({
        pageSize: t.Optional(t.String()),
        q: t.Optional(t.String()),
        category: t.Optional(t.String()),
        tag: t.Optional(t.String())
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
      return buildTagMeta(rows[0].tags, { detail: true })
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
        .set({ rating: body.rating, updatedAt: new Date().toISOString() })
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
  .delete(
    '/:id',
    async ({ params, set }) => {
      const rows = await db.select().from(mangas).where(eq(mangas.id, params.id)).limit(1)
      if (!rows[0]) {
        set.status = 404
        return { error: 'Manga not found' }
      }

      const filepath = rows[0].filepath
      if (filepath) {
        try {
          await unlink(filepath)
        } catch (e) {
          // 文件可能已不存在，继续删除数据库记录
          console.warn('Failed to delete manga file:', filepath, e)
        }
      }

      await db.delete(mangas).where(eq(mangas.id, params.id))
      return { success: true }
    },
    {
      params: t.Object({ id: t.String() })
    }
  )
