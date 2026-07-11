import { useState, useEffect } from 'react'
import { useLocation, useSearch } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { client } from '../api'
import { SearchFilter } from '../components/SearchFilter'
import { MangaCard } from '../components/MangaCard'
import { MangaDetail } from '../components/MangaDetail'
import { ScanButton } from '../components/ScanButton'
import type { Manga, SortField } from '../types'

export function Library() {
  const [, navigate] = useLocation()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Manga | null>(null)
  const search = useSearch()
  const [activeTag, setActiveTag] = useState(() => new URLSearchParams(search).get('tag') || '')

  useEffect(() => {
    const tag = new URLSearchParams(search).get('tag') || ''
    setActiveTag(tag)
    setPage(1)
  }, [search])

  const pageSize = 24

  const { data: listData, isLoading } = useQuery({
    queryKey: ['mangas', q, category, activeTag, sortBy, sortOrder, page],
    queryFn: async () => {
      const res = await client.api.mangas.list.get({
        $query: {
          page: String(page),
          pageSize: String(pageSize),
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

  const handleSearch = (value: string) => {
    setQ(value)
    setPage(1)
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    setPage(1)
  }

  const handleTagClick = (tag: string) => {
    setSelected(null)
    navigate(`/?tag=${encodeURIComponent(tag)}`)
  }

  const clearTag = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <h1 className="text-lg font-semibold text-neutral-100">漫画图书馆</h1>
        <ScanButton />
      </header>

      <SearchFilter
        q={q}
        onQChange={handleSearch}
        category={category}
        onCategoryChange={handleCategoryChange}
        categories={categories || []}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {activeTag && (
        <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-950/80 px-4 py-2 text-sm text-neutral-300 backdrop-blur">
          <span className="text-neutral-500">标签过滤：</span>
          <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-blue-300">{activeTag}</span>
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
                  onRead={() => navigate(`/reader/${manga.id}`)}
                />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-40 hover:border-neutral-700"
                >
                  上一页
                </button>
                <span className="text-sm text-neutral-400">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-40 hover:border-neutral-700"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selected && (
        <MangaDetail
          manga={selected}
          onClose={() => setSelected(null)}
          onRead={() => {
            setSelected(null)
            navigate(`/reader/${selected.id}`)
          }}
          onTagClick={handleTagClick}
        />
      )}
    </div>
  )
}
