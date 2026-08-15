import { describe, it, expect } from 'bun:test'
import { aggregateTagData } from '../tag-analysis.ts'
import type { TagAnalysisRow } from '../tag-analysis.ts'

function fakeTranslate(namespace: string, tag: string): { name: string } | undefined {
  const map: Record<string, string> = {
    'female:schoolgirl': '水手服',
    'female:stockings': '丝袜',
    'artist:hiten': 'Hiten'
  }
  const name = map[`${namespace}:${tag}`]
  return name ? { name } : undefined
}

const rows: TagAnalysisRow[] = [
  {
    id: '1',
    tags: {
      female: ['schoolgirl', 'stockings'],
      artist: ['hiten']
    },
    hiddenBook: false,
    exist: true
  },
  {
    id: '2',
    tags: {
      female: ['schoolgirl'],
      artist: ['hiten']
    },
    hiddenBook: false,
    exist: true
  },
  {
    id: '3',
    tags: {
      female: ['stockings']
    },
    hiddenBook: true,
    exist: true
  },
  {
    id: '4',
    tags: {},
    hiddenBook: false,
    exist: false
  }
]

describe('aggregateTagData', () => {
  it('counts unique tags and tagged manga', () => {
    const result = aggregateTagData(rows, {}, fakeTranslate)
    expect(result.taggedMangaCount).toBe(2)
    expect(result.totalTags).toBe(3)
    expect(result.namespaceCounts).toEqual({
      female: 2,
      artist: 1
    })
  })

  it('filters hidden manga by default', () => {
    const result = aggregateTagData(rows, {}, fakeTranslate)
    expect(result.topTags.find((t) => t.namespace === 'female' && t.tag === 'stockings')?.count).toBe(1)
  })

  it('includes hidden manga when requested', () => {
    const result = aggregateTagData(rows, { includeHidden: true }, fakeTranslate)
    expect(result.taggedMangaCount).toBe(3)
    expect(result.topTags.find((t) => t.namespace === 'female' && t.tag === 'stockings')?.count).toBe(2)
  })

  it('limits top tags', () => {
    const result = aggregateTagData(rows, { limit: 2 }, fakeTranslate)
    expect(result.topTags.length).toBe(2)
    expect(result.cooccurrence.tags.length).toBe(2)
    expect(result.cooccurrence.matrix.length).toBe(2)
  })

  it('filters by namespace', () => {
    const result = aggregateTagData(rows, { namespace: 'artist' }, fakeTranslate)
    expect(result.totalTags).toBe(3)
    expect(result.topTags.every((t) => t.namespace === 'artist')).toBe(true)
  })

  it('computes cooccurrence matrix', () => {
    const result = aggregateTagData(rows, { limit: 10 }, fakeTranslate)
    const schoolgirlIndex = result.topTags.findIndex((t) => t.tag === 'schoolgirl')
    const hitenIndex = result.topTags.findIndex((t) => t.tag === 'hiten')
    expect(result.cooccurrence.matrix[schoolgirlIndex][hitenIndex]).toBe(2)
  })

  it('computes translation coverage', () => {
    const result = aggregateTagData(rows, {}, fakeTranslate)
    expect(result.translationCoverage).toBe(1)
  })

  it('groups author work counts once per manga and applies the result limit', () => {
    const authorRows: TagAnalysisRow[] = [
      ...rows,
      {
        id: '5',
        tags: { artist: ['hiten', 'hiten', 'alice'] },
        hiddenBook: false,
        exist: true
      },
      {
        id: '6',
        tags: { artist: ['alice'] },
        hiddenBook: true,
        exist: true
      },
      {
        id: '7',
        tags: { artist: ['ignored'] },
        hiddenBook: false,
        exist: false
      }
    ]

    expect(aggregateTagData(authorRows, { limit: 1 }, fakeTranslate).topAuthors).toEqual([
      { tag: 'hiten', name: 'Hiten', count: 3 }
    ])
    expect(aggregateTagData(authorRows, { includeHidden: true }, fakeTranslate).topAuthors).toEqual([
      { tag: 'hiten', name: 'Hiten', count: 3 },
      { tag: 'alice', name: undefined, count: 2 }
    ])
  })

  it('returns no authors when eligible works have no artist tags', () => {
    const noAuthors = rows.map((row) => ({
      ...row,
      tags: row.tags ? { female: row.tags.female ?? [] } : row.tags
    }))
    expect(aggregateTagData(noAuthors, {}, fakeTranslate).topAuthors).toEqual([])
  })
})
