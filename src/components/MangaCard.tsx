import { Bookmark, Eye, BookOpen } from 'lucide-react'
import { StarRating } from './StarRating'
import { getPlaceholderCover, getPlaceholderTitle } from '../lib/placeholder'
import type { Manga } from '../types'

interface MangaCardProps {
  manga: Manga
  onClick?: () => void
  onRead?: () => void
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function MangaCard({ manga, onClick, onRead }: MangaCardProps) {
  const title = getPlaceholderTitle(manga)

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

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
        {manga.category && (
          <span className="rounded bg-neutral-800 px-1.5 py-0.5">{manga.category}</span>
        )}
        <span className="rounded bg-neutral-800 px-1.5 py-0.5">{manga.pageCount}P</span>
        {manga.bundleSize ? (
          <span className="rounded bg-neutral-800 px-1.5 py-0.5">{formatBytes(manga.bundleSize)}</span>
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <StarRating value={manga.rating || 0} size={14} />
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <Eye size={12} />
          {manga.readCount || 0}
        </div>
      </div>

      {manga.status && manga.status !== 'non-tag' && (
        <span className="absolute right-2 top-2 rounded bg-green-600/80 px-1.5 py-0.5 text-[10px] text-white">
          {manga.status}
        </span>
      )}
    </div>
  )
}
