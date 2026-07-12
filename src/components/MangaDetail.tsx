import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X, Bookmark, EyeOff, BookOpen, ExternalLink } from 'lucide-react'
import { client } from '../api'
import { StarRating } from './StarRating'
import { TagCloud } from './TagCloud'
import { getPlaceholderCover, getPlaceholderTitle } from '../lib/placeholder'
import type { Manga } from '../types'

interface MangaDetailProps {
  mangaId: string
  onClose: () => void
  onRead: () => void
  onTagClick?: (tag: string) => void
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatDate(ts: number | string | null | undefined) {
  if (!ts) return '-'
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN')
}

export function MangaDetail({ mangaId, onClose, onRead, onTagClick }: MangaDetailProps) {
  const qc = useQueryClient()

  const { data: manga, isLoading } = useQuery({
    queryKey: ['manga', mangaId],
    queryFn: async () => {
      const res = await client.api.mangas[mangaId].get()
      if (res.error) throw new Error(String(res.error.value))
      return res.data as Manga
    },
    enabled: Boolean(mangaId)
  })

  const { data: tagMeta } = useQuery({
    queryKey: ['manga-tags', mangaId],
    queryFn: async () => {
      const res = await client.api.mangas[mangaId].tags.get()
      if (res.error) throw new Error(String(res.error.value))
      return res.data as Record<string, Record<string, { name?: string }>>
    },
    enabled: Boolean(mangaId)
  })

  const metaMutation = useMutation({
    mutationFn: async (body: { mark?: boolean; hiddenBook?: boolean }) => {
      const res = await client.api.mangas[mangaId].meta.patch(body)
      if (res.error) throw new Error(String(res.error.value))
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mangas'] })
      qc.invalidateQueries({ queryKey: ['manga', mangaId] })
    }
  })

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await client.api.mangas[mangaId].rate.post({ rating })
      if (res.error) throw new Error(String(res.error.value))
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mangas'] })
      qc.invalidateQueries({ queryKey: ['manga', mangaId] })
    }
  })

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-neutral-400">
          加载中...
        </div>
      </div>
    )
  }

  if (!manga) return null

  const title = getPlaceholderTitle(manga)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-5 overflow-y-auto p-4 md:flex-row md:p-5">
          <div className="mx-auto shrink-0 md:mx-0">
            <img
              src={getPlaceholderCover(manga.id)}
              alt={title}
              className="w-full max-w-[220px] rounded-lg border border-neutral-800 object-cover"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-medium text-neutral-100">{title}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-neutral-300">
              <div>
                <span className="text-neutral-500">分类：</span>
                {manga.category || '-'}
              </div>
              <div>
                <span className="text-neutral-500">页数：</span>
                {manga.pageCount || '-'}
              </div>
              <div>
                <span className="text-neutral-500">大小：</span>
                {formatBytes(manga.bundleSize)}
              </div>
              <div>
                <span className="text-neutral-500">阅读次数：</span>
                {manga.readCount || 0}
              </div>
              <div>
                <span className="text-neutral-500">状态：</span>
                {manga.status || '-'}
              </div>
              <div>
                <span className="text-neutral-500">入库时间：</span>
                {formatDate(manga.date)}
              </div>
            </div>

            <div>
              <span className="text-sm text-neutral-500">评分</span>
              <div className="mt-1">
                <StarRating
                  value={manga.rating || 0}
                  onChange={(v) => rateMutation.mutate(v)}
                  size={24}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => metaMutation.mutate({ mark: !manga.mark })}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                  manga.mark
                    ? 'border-yellow-500/30 bg-yellow-500/20 text-yellow-300'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                <Bookmark size={14} className={manga.mark ? 'fill-current' : ''} />
                {manga.mark ? '已收藏' : '收藏'}
              </button>
              <button
                onClick={() => metaMutation.mutate({ hiddenBook: !manga.hiddenBook })}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                  manga.hiddenBook
                    ? 'border-red-500/30 bg-red-500/20 text-red-300'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                <EyeOff size={14} />
                {manga.hiddenBook ? '已隐藏' : '隐藏'}
              </button>
              {manga.url && (
                <a
                  href={manga.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
                >
                  <ExternalLink size={14} /> 来源
                </a>
              )}
            </div>

            <div>
              <span className="text-sm text-neutral-500">标签</span>
              <div className="mt-2">
                <TagCloud tags={manga.tags} tagMeta={tagMeta} onTagClick={onTagClick} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800 p-4">
          <button
            onClick={onRead}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <BookOpen size={18} /> 开始阅读
          </button>
        </div>
      </div>
    </div>
  )
}
