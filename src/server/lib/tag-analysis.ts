import { and, eq } from 'drizzle-orm'
import { db } from '../db.ts'
import { mangas } from '../schema.ts'
import type { TagAnalysis, TagMap } from '../../types.ts'
import { getTagMetadata } from './tags.ts'

interface TagKey {
  namespace: string
  tag: string
}

interface TagCount extends TagKey {
  count: number
}

export interface TagAnalysisRow {
  id: string
  tags: TagMap | null
  hiddenBook: boolean | null
  exist: boolean | null
}

export function aggregateTagData(
  rows: TagAnalysisRow[],
  options: {
    namespace?: string
    limit?: number
    includeHidden?: boolean
  },
  translate: (namespace: string, tag: string) => { name?: string; intro?: string } | undefined
): TagAnalysis {
  const namespaceFilter = options.namespace?.trim() || undefined
  const limit = Math.max(1, Math.min(200, options.limit ?? 50))
  const includeHidden = options.includeHidden ?? false

  const countMap = new Map<string, TagCount>()
  const authorCountMap = new Map<string, number>()
  const namespaceCounts = new Map<string, Set<string>>()
  const perRowTagSets: Set<string>[] = []
  let taggedMangaCount = 0

  for (const row of rows) {
    if (row.exist === false) continue
    if (!includeHidden && row.hiddenBook) continue

    const tags = row.tags
    if (!tags || Object.keys(tags).length === 0) continue

    taggedMangaCount++
    const rowTagSet = new Set<string>()
    const rowAuthors = new Set<string>()

    for (const [ns, list] of Object.entries(tags)) {
      const items = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/\s+/) : []
      const unique = new Set(items.filter(Boolean))

      if (ns === 'artist') {
        for (const artist of unique) rowAuthors.add(artist)
      }

      for (const raw of unique) {
        const key = `${ns}:${raw}`
        rowTagSet.add(key)

        if (!countMap.has(key)) {
          countMap.set(key, { namespace: ns, tag: raw, count: 0 })
        }
        countMap.get(key)!.count++

        if (!namespaceCounts.has(ns)) namespaceCounts.set(ns, new Set())
        namespaceCounts.get(ns)!.add(raw)
      }
    }

    for (const artist of rowAuthors) {
      authorCountMap.set(artist, (authorCountMap.get(artist) ?? 0) + 1)
    }

    perRowTagSets.push(rowTagSet)
  }

  let translatedCount = 0
  for (const { namespace, tag } of countMap.values()) {
    if (translate(namespace, tag)?.name) translatedCount++
  }

  const totalTags = countMap.size
  const translationCoverage = totalTags > 0 ? translatedCount / totalTags : 0

  const sorted = [...countMap.values()]
    .filter((item) => !namespaceFilter || item.namespace === namespaceFilter)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  const top = sorted.slice(0, limit)
  const topAuthors = [...authorCountMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit)
  const topKeys = new Set(top.map((t) => `${t.namespace}:${t.tag}`))
  const indexMap = new Map([...topKeys].map((k, i) => [k, i]))
  const n = top.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (const set of perRowTagSets) {
    const present = [...set].filter((k) => topKeys.has(k))
    for (const a of present) {
      for (const b of present) {
        const ai = indexMap.get(a)
        const bi = indexMap.get(b)
        if (ai !== undefined && bi !== undefined) {
          matrix[ai][bi]++
        }
      }
    }
  }

  const namespaceCountsRecord: Record<string, number> = {}
  for (const [ns, set] of namespaceCounts.entries()) {
    namespaceCountsRecord[ns] = set.size
  }

  return {
    totalTags,
    taggedMangaCount,
    translationCoverage,
    namespaceCounts: namespaceCountsRecord,
    topTags: top.map((t) => {
      const meta = translate(t.namespace, t.tag)
      return {
        namespace: t.namespace,
        tag: t.tag,
        name: meta?.name,
        intro: meta?.intro,
        count: t.count
      }
    }),
    topAuthors: topAuthors.map((author) => ({
      ...author,
      name: translate('artist', author.tag)?.name
    })),
    cooccurrence: {
      tags: top.map((t) => {
        const meta = translate(t.namespace, t.tag)
        return {
          namespace: t.namespace,
          tag: t.tag,
          name: meta?.name,
          intro: meta?.intro
        }
      }),
      matrix
    }
  }
}

export async function analyzeTags(options?: {
  namespace?: string
  limit?: number
  includeHidden?: boolean
}): Promise<TagAnalysis> {
  const rows = await db
    .select({
      id: mangas.id,
      tags: mangas.tags,
      hiddenBook: mangas.hiddenBook,
      exist: mangas.exist
    })
    .from(mangas)

  return aggregateTagData(rows, options ?? {}, getTagMetadata)
}

export async function getTaggedMangaCount(includeHidden = false): Promise<number> {
  const conditions = [eq(mangas.exist, true)]
  if (!includeHidden) conditions.push(eq(mangas.hiddenBook, false))

  const rows = await db
    .select({ count: db.$count(mangas) })
    .from(mangas)
    .where(and(...conditions))

  return rows[0]?.count ?? 0
}
