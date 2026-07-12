import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Eye, BookOpen } from 'lucide-react'
import { StarRating } from './StarRating'
import { client } from '../api'
import { getPlaceholderCover, getPlaceholderTitle } from '../lib/placeholder'
import type { Manga } from '../types'

interface MangaCardProps {
  manga: Manga
  onClick?: () => void
  onRead?: () => void
}

export function MangaCard({ manga, onClick, onRead }: MangaCardProps) {
  const qc = useQueryClient()
  const title = getPlaceholderTitle(manga)

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await client.api.mangas[manga.id].rate.post({ rating })
      if (res.error) throw new Error(String(res.error.value))
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mangas'] })
      qc.invalidateQueries({ queryKey: ['manga', manga.id] })
    }
  })

  return (
    <div className="group relative flex w-full flex-col rounded-md border border-neutral-800 bg-neutral-900 p-2 transition hover:border-neutral-700">
      <div
        className="relative aspect-[200/283] cursor-pointer overflow-hidden rounded bg-neutral-800"
        onClick={onClick}
      >
        <img
          src={getPlaceholderCover(manga.id)}
          alt={title}
          className="h-full w-full object-cover transition group-hover:opacity-90"
          loading="lazy"
        />
        {manga.pageCount ? (
          <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">
            {manga.pageCount}P
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRead?.()
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-600/90 px-2 py-1 text-xs text-white hover:bg-blue-500"
          >
            <BookOpen size={14} /> 阅读
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-start justify-between gap-1">
        <h3
          className="line-clamp-2 flex-1 text-left text-sm leading-tight text-neutral-200"
          title={title}
        >
          {title}
        </h3>
        {manga.mark && <Bookmark size={16} className="shrink-0 fill-yellow-500 text-yellow-500" />}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <StarRating
          value={manga.rating || 0}
          onChange={(v) => rateMutation.mutate(v)}
          size={14}
        />
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <Eye size={12} />
          {manga.readCount || 0}
        </div>
      </div>
    </div>
  )
}
