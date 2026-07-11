import type { TagMap } from '../types'

interface TagCloudProps {
  tags: TagMap | null | undefined
  onTagClick?: (tag: string) => void
  limit?: number
}

const TAG_COLORS: Record<string, string> = {
  artist: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  group: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  language: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  parody: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  character: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  female: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  male: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  misc: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30'
}

export function TagCloud({ tags, onTagClick, limit }: TagCloudProps) {
  if (!tags || Object.keys(tags).length === 0) return null

  const pairs = Object.entries(tags).flatMap(([cat, list]) =>
    list.map((tag) => ({ cat, tag }))
  )
  const visible = limit ? pairs.slice(0, limit) : pairs

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(({ cat, tag }) => {
        const style = TAG_COLORS[cat] || TAG_COLORS.misc
        return (
          <button
            key={`${cat}:${tag}`}
            type="button"
            onClick={() => onTagClick?.(tag)}
            className={`px-2 py-0.5 text-xs rounded border ${style} hover:opacity-80 transition`}
          >
            {cat}: {tag}
          </button>
        )
      })}
    </div>
  )
}
