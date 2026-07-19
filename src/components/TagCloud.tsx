import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TagMap, TagMetadata } from '../types'

interface TagCloudProps {
  tags: TagMap | null | undefined
  tagMeta?: Record<string, Record<string, TagMetadata>>
  onTagClick?: (namespace: string, tag: string) => void
  limit?: number
}

interface ActiveTooltip {
  namespace: string
  tag: string
  meta: TagMetadata
  rect: DOMRect
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

const TOOLTIP_MARGIN = 8
const SHOW_DELAY = 150
const HIDE_DELAY = 200

function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

function Tooltip({
  active,
  onMouseEnter,
  onMouseLeave,
  onNavigate
}: {
  active: ActiveTooltip
  onMouseEnter: () => void
  onMouseLeave: () => void
  onNavigate?: () => void
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 })

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const anchor = active.rect
    let top = anchor.bottom + TOOLTIP_MARGIN
    let left = anchor.left + anchor.width / 2 - rect.width / 2

    if (top + rect.height > window.innerHeight - TOOLTIP_MARGIN) {
      top = anchor.top - rect.height - TOOLTIP_MARGIN
    }
    if (left < TOOLTIP_MARGIN) {
      left = TOOLTIP_MARGIN
    } else if (left + rect.width > window.innerWidth - TOOLTIP_MARGIN) {
      left = window.innerWidth - rect.width - TOOLTIP_MARGIN
    }

    setStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 9999,
      opacity: 1
    })
  }, [active])

  return createPortal(
    <div
      ref={elRef}
      style={style}
      className="max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm shadow-xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="mb-1 text-xs text-neutral-500">
        {active.namespace}: {active.tag}
      </div>
      <div className="mb-2 font-medium text-neutral-100">
        {active.meta.name ? `${active.tag}(${active.meta.name})` : active.tag}
      </div>
      {active.meta.intro ? (
        <div
          className="mb-2 max-h-40 overflow-auto text-neutral-300"
          dangerouslySetInnerHTML={{ __html: active.meta.intro }}
        />
      ) : (
        <div className="mb-2 text-xs text-neutral-500">暂无说明</div>
      )}
      {active.meta.links.length > 0 && (
        <div className="space-y-1">
          {active.meta.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-blue-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
      {onNavigate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate()
          }}
          className="mt-2 text-xs text-blue-400 hover:underline"
        >
          查看相关漫画
        </button>
      )}
    </div>,
    document.body
  )
}

export function TagCloud({ tags, tagMeta, onTagClick, limit }: TagCloudProps) {
  const [active, setActive] = useState<ActiveTooltip | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchMode = useRef(false)

  useEffect(() => {
    touchMode.current = isTouchDevice()
  }, [])

  if (!tags || Object.keys(tags).length === 0) return null

  const pairs = Object.entries(tags).flatMap(([cat, list]) => {
    const items = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/\s+/) : []
    return items.filter(Boolean).map((tag) => ({ cat, tag }))
  })
  const visible = limit ? pairs.slice(0, limit) : pairs

  const clearTimers = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const show = (item: ActiveTooltip) => {
    clearTimers()
    showTimer.current = setTimeout(() => {
      setActive(item)
    }, SHOW_DELAY)
  }

  const hide = () => {
    clearTimers()
    hideTimer.current = setTimeout(() => {
      setActive(null)
    }, HIDE_DELAY)
  }

  const handleClick = (
    e: React.MouseEvent | React.TouchEvent,
    namespace: string,
    tag: string,
    meta: TagMetadata
  ) => {
    if (touchMode.current) {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      if (active && active.namespace === namespace && active.tag === tag) {
        onTagClick?.(namespace, tag)
        setActive(null)
      } else {
        clearTimers()
        setActive({ namespace, tag, meta, rect })
      }
      return
    }
    onTagClick?.(namespace, tag)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(({ cat, tag }) => {
        const style = TAG_COLORS[cat] || TAG_COLORS.misc
        const meta = tagMeta?.[cat]?.[tag]
        const label = meta?.name ? `${tag}(${meta.name})` : tag
        return (
          <button
            key={`${cat}:${tag}`}
            type="button"
            onMouseEnter={(e) => {
              if (touchMode.current) return
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              show({ namespace: cat, tag, meta: meta || { name: tag, intro: '', links: [] }, rect })
            }}
            onMouseLeave={() => {
              if (touchMode.current) return
              hide()
            }}
            onFocus={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              show({ namespace: cat, tag, meta: meta || { name: tag, intro: '', links: [] }, rect })
            }}
            onBlur={() => hide()}
            onClick={(e) => handleClick(e, cat, tag, meta || { name: tag, intro: '', links: [] })}
            className={`px-2 py-0.5 text-xs rounded border ${style} hover:opacity-80 transition`}
          >
            {label}
          </button>
        )
      })}
      {active && (
        <Tooltip
          active={active}
          onMouseEnter={() => clearTimers()}
          onMouseLeave={() => hide()}
          onNavigate={onTagClick ? () => onTagClick(active.namespace, active.tag) : undefined}
        />
      )}
    </div>
  )
}
