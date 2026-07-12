import { useEffect, useRef, useState } from 'react'
import { getPageSrc } from '../lib/placeholder'

interface WebtoonScrollerProps {
  mangaId: string
  pageCount: number
  width: number
  onCurrentPageChange: (page: number) => void
  initialPage?: number
}

const PRELOAD_AHEAD = 5

export function WebtoonScroller({
  mangaId,
  pageCount,
  width,
  onCurrentPageChange,
  initialPage = 0
}: WebtoonScrollerProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)

  useEffect(() => {
    if (!containerRef.current) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const page = Number(visible.target.getAttribute('data-page'))
          setCurrentPage(page)
          onCurrentPageChange(page)
        }
      },
      { root: containerRef.current, threshold: 0.5 }
    )

    const items = containerRef.current.querySelectorAll('[data-page]')
    items.forEach((item) => observerRef.current?.observe(item))

    return () => observerRef.current?.disconnect()
  }, [mangaId, pageCount, onCurrentPageChange])

  useEffect(() => {
    if (!containerRef.current || initialPage <= 0) return
    const target = containerRef.current.querySelector(`[data-page="${initialPage}"]`)
    if (target) {
      target.scrollIntoView({ block: 'start' })
    }
  }, [initialPage])

  const widthStyle = width <= 2 ? `${width * 100}vw` : `${width}%`

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto overscroll-contain bg-black py-4 [-webkit-overflow-scrolling:touch]"
    >
      <div className="flex flex-col items-center gap-2">
        {Array.from({ length: pageCount }).map((_, i) => {
          const eager = i >= currentPage && i <= currentPage + PRELOAD_AHEAD
          return (
            <div
              key={i}
              data-page={i}
              style={{ width: widthStyle }}
              className="will-change-transform"
            >
              <img
                src={getPageSrc(mangaId, i)}
                alt={`Page ${i + 1}`}
                loading={eager ? 'eager' : 'lazy'}
                decoding={eager ? 'sync' : 'async'}
                className="w-full select-none"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
