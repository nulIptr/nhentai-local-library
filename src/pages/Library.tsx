import { useState } from 'react'
import { useLocation } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { client } from '../api'
import { SearchFilter } from '../components/SearchFilter'
import { MangaCard } from '../components/MangaCard'
import { MangaDetail } from '../components/MangaDetail'
import type { Manga, SortField } from '../types'

export function Library() {
  const [, navigate] = useLocation()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Manga | null>(null)

  const pageSize = 24

  const { data: listData, isLoading } = useQuery({
    queryKey: ['mangas', q, category, sortBy, sortOrder, page],
    queryFn: async () => {
      const res = await client.api.mangas.list.get({
        $query: {
          page: String(page),
          pageSize: String(pageSize),
          q,
          category,
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

  return (
    <div className="min-h-screen bg-neutral-950">
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
        />
      )}
    </div>
  )
}
