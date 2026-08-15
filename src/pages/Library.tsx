import { useState, useMemo } from 'react'
import { useLocation, useSearch } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Shuffle, BarChart3, Settings } from 'lucide-react'
import { client } from '../api'
import { SearchFilter } from '../components/SearchFilter'
import { MangaCard } from '../components/MangaCard'
import { MangaDetail } from '../components/MangaDetail'
import type { Manga, SortField } from '../types'

const PAGE_SIZE = 24

function getPaginationRange(current: number, total: number) {
  if (total <= 1) return [1]
  const pages: (number | string)[] = []
  const showEllipsisStart = current > 3
  const showEllipsisEnd = current < total - 2

  pages.push(1)
  if (showEllipsisStart) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) {
    if (showEllipsisStart && i === 2) continue
    if (showEllipsisEnd && i === total - 1) continue
    pages.push(i)
  }

  if (showEllipsisEnd) pages.push('...')
  pages.push(total)
  return pages
}

export function Library() {
  const [, navigate] = useLocation()
  const search = useSearch()
  const [selected, setSelected] = useState<Manga | null>(null)

  const params = useMemo(() => new URLSearchParams(search), [search])

  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const sortBy = (params.get('sortBy') as SortField) || 'createdAt'
  const sortOrder = (params.get('sortOrder') as 'asc' | 'desc') || 'desc'
  const page = Math.max(1, Number(params.get('page') || '1'))
  const activeTag = params.get('tag') || ''
  const isRandom = params.has('random')

  const setParams = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(search)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    })
    const qs = next.toString()
    navigate(qs ? `/?${qs}` : '/', { replace: true })
  }

  const handleSearch = (value: string) => {
    setParams({ q: value, page: 1 })
  }

  const handleCategoryChange = (value: string) => {
    setParams({ category: value, page: 1 })
  }

  const handleSortByChange = (value: SortField) => {
    setParams({ sortBy: value, random: undefined, page: 1 })
  }

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setParams({ sortOrder: value, random: undefined, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    setParams({ page: newPage })
  }

  const handleRandom = () => {
    const next = new URLSearchParams(search)
    next.set('random', String(Date.now()))
    next.delete('page')
    navigate(`/?${next.toString()}`, { replace: true })
  }

  const handleTagClick = (namespace: string, tag: string) => {
    setSelected(null)
    setParams({ tag: `${namespace}:${tag}`, page: 1 })
  }

  const clearTag = () => {
    const next = new URLSearchParams(search)
    next.delete('tag')
    next.delete('page')
    const qs = next.toString()
    navigate(qs ? `/?${qs}` : '/', { replace: true })
  }

  const { data: listData, isLoading } = useQuery({
    queryKey: ['mangas', q, category, activeTag, sortBy, sortOrder, page, isRandom ? params.get('random') : ''],
    queryFn: async () => {
      if (isRandom) {
        const res = await client.api.mangas.random.get({
          $query: {
            pageSize: String(PAGE_SIZE),
            q,
            category,
            tag: activeTag
          }
        })
        if (res.error) throw new Error(String(res.error.value))
        return res.data
      }
      const res = await client.api.mangas.list.get({
        $query: {
          page: String(page),
          pageSize: String(PAGE_SIZE),
          q,
          category,
          tag: activeTag,
          sortBy,
          sortOrder
        }
      })
      if (res.error) throw new Error(String(res.error.value))
      return res.data
    }
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await client.api.mangas.categories.get()
      if (res.error) throw new Error(String(res.error.value))
      return res.data || []
    }
  })

  const mangas = listData?.items || []
  const pagination = listData?.pagination
  const pageRange = pagination ? getPaginationRange(page, pagination.totalPages) : []

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <h1 className="text-lg font-semibold text-neutral-100">漫画图书馆</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tags')}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
          >
            <BarChart3 size={16} /> 标签分析
          </button>
          <button
            onClick={handleRandom}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
          >
            <Shuffle size={16} /> 随便看看
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
          >
            <Settings size={16} /> 设置
          </button>
        </div>
      </header>

      <SearchFilter
        q={q}
        onQChange={handleSearch}
        category={category}
        onCategoryChange={handleCategoryChange}
        categories={categories || []}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        sortOrder={sortOrder}
        onSortOrderChange={handleSortOrderChange}
      />

      {activeTag && (
        <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950/80 px-4 py-2 text-sm text-neutral-300 backdrop-blur">
          <span className="text-neutral-500">标签过滤：</span>
          {(() => {
            const sep = activeTag.indexOf(':')
            if (sep > 0) {
              const ns = activeTag.slice(0, sep)
              const val = activeTag.slice(sep + 1)
              return (
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-blue-300">
                  <span className="text-blue-400/80">{ns}:</span>
                  {val}
                </span>
              )
            }
            return (
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-blue-300">{activeTag}</span>
            )
          })()}
          <button onClick={clearTag} className="text-neutral-500 hover:text-neutral-200">
            清除
          </button>
        </div>
      )}

      <main className="p-4">
        {isLoading ? (
          <div className="py-20 text-center text-neutral-500">加载中...</div>
        ) : mangas.length === 0 ? (
          <div className="py-20 text-center text-neutral-500">没有符合条件的漫画</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {mangas.map((manga) => (
                <MangaCard
                  key={manga.id}
                  manga={manga}
                  onClick={() => setSelected(manga)}
                  onRead={() => window.open(`/reader/${manga.id}`, '_blank')}
                />
              ))}
            </div>

            {pagination && !isRandom && pagination.totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-40 hover:border-neutral-700"
                      >
                        上一页
                      </button>
                      {pageRange.map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-neutral-500">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(Number(p))}
                            disabled={p === page}
                            className={`min-w-[2.25rem] rounded-md border px-3 py-1.5 text-sm ${
                              p === page
                                ? 'border-blue-500/30 bg-blue-500/20 text-blue-300'
                                : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handlePageChange(Math.min(pagination.totalPages, page + 1))}
                        disabled={page >= pagination.totalPages}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-40 hover:border-neutral-700"
                      >
                        下一页
                      </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                      <span>跳转</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        defaultValue={page}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = Number((e.target as HTMLInputElement).value.replace(/[^0-9]/g, ''))
                            if (value) {
                              handlePageChange(Math.max(1, Math.min(pagination.totalPages, value)))
                            }
                          }
                        }}
                        className="w-14 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-center text-neutral-200 outline-none"
                      />
                      <span>/ {pagination.totalPages}</span>
                  </div>
                </>
              </div>
            )}
          </>
        )}
      </main>

      {selected && (
        <MangaDetail
          mangaId={selected.id}
          onClose={() => setSelected(null)}
          onRead={() => {
            setSelected(null)
            window.open(`/reader/${selected.id}`, '_blank')
          }}
          onTagClick={handleTagClick}
        />
      )}
    </div>
  )
}
