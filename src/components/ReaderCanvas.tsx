import { useEffect, useRef, useState } from 'react'
import { getPageSrc } from '../lib/placeholder'
import type { FitMode } from '../types'

const SWIPE_THRESHOLD = 40

interface ReaderCanvasProps {
  mangaId: string
  currentPages: number[]
  pageCount: number
  fit: FitMode
  onPrev: () => void
  onNext: () => void
  onWheel?: (e: React.WheelEvent) => void
}

export function ReaderCanvas({
  mangaId,
  currentPages,
  pageCount,
  fit,
  onPrev,
  onNext,
  onWheel
}: ReaderCanvasProps) {
  const [displayedPages, setDisplayedPages] = useState(currentPages)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const loadedRef = useRef<Set<number>>(new Set())
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  const pageSrc = (page: number) => getPageSrc(mangaId, page)

  // 预加载指定页，返回 Promise<>
  const preloadPages = (pages: number[]) => {
    return Promise.all(
      pages.map(
        (page) =>
          new Promise<void>((resolve) => {
            if (loadedRef.current.has(page)) return resolve()
            const img = new Image()
            img.decoding = 'sync'
            img.onload = () => {
              loadedRef.current.add(page)
              resolve()
            }
            img.onerror = () => resolve()
            img.src = pageSrc(page)
          })
      )
    )
  }

  useEffect(() => {
    // 前后各多预加载一页，减少翻页闪烁
    const adjacent = [
      ...currentPages.map((p) => p - 1),
      ...currentPages.map((p) => p + 1)
    ].filter((p) => p >= 0 && p < pageCount)
    preloadPages([...new Set([...currentPages, ...adjacent])])
  }, [currentPages, pageCount, mangaId])

  useEffect(() => {
    let cancelled = false
    const allLoaded = currentPages.every((p) => loadedRef.current.has(p))
    if (allLoaded) {
      setDisplayedPages(currentPages)
      setIsTransitioning(false)
      return
    }

    setIsTransitioning(true)
    preloadPages(currentPages).then(() => {
      if (cancelled) return
      setDisplayedPages(currentPages)
      setIsTransitioning(false)
    })

    return () => {
      cancelled = true
    }
  }, [currentPages])

  const handleAreaClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.35) onPrev()
    else if (x > rect.width * 0.65) onNext()
  }

  const imgClass =
    fit === 'width'
      ? 'max-w-full h-auto'
      : fit === 'height'
        ? 'max-h-full w-auto'
        : 'max-h-full max-w-full object-contain'

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchEndRef.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = () => {
    const start = touchStartRef.current
    const end = touchEndRef.current
    if (!start || !end) return
    const dx = start.x - end.x
    const dy = start.y - end.y
    // 优先判定水平滑动
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) onNext()
      else onPrev()
    }
    touchStartRef.current = null
    touchEndRef.current = null
  }

  return (
    <div
      className="relative flex h-full w-full touch-none items-center justify-center overflow-hidden bg-neutral-900"
      onClick={handleAreaClick}
      onWheel={onWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex h-full items-center justify-center gap-0">
        {displayedPages.map((page) => (
          <div
            key={page}
            className={`flex h-full items-center justify-center ${
              displayedPages.length > 1 ? 'w-1/2' : 'w-full'
            }`}
          >
            <img
              src={pageSrc(page)}
              alt={`Page ${page + 1}`}
              className={`${imgClass} select-none`}
              decoding="sync"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {isTransitioning && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          加载中…
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        {displayedPages.map((p) => p + 1).join(', ')} / {pageCount}
      </div>
    </div>
  )
}
