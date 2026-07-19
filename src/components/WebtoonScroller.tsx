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
  const onCurrentPageChangeRef = useRef(onCurrentPageChange)
  const currentPageRef = useRef(initialPage)
  const positionedMangaRef = useRef<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)

  useEffect(() => {
    onCurrentPageChangeRef.current = onCurrentPageChange
  }, [onCurrentPageChange])

  useEffect(() => {
    if (!containerRef.current) return
    const visibility = new Map<Element, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0)
        })

        const visible = [...visibility.entries()].reduce<
          { target: Element; ratio: number } | undefined
        >((best, [target, ratio]) => {
          if (ratio === 0 || (best && best.ratio >= ratio)) return best
          return { target, ratio }
        }, undefined)

        if (visible) {
          const page = Number(visible.target.getAttribute('data-page'))
          if (page === currentPageRef.current) return

          currentPageRef.current = page
          setCurrentPage(page)
          onCurrentPageChangeRef.current(page)
        }
      },
      { root: containerRef.current, threshold: 0.5 }
    )

    const items = containerRef.current.querySelectorAll('[data-page]')
    items.forEach((item) => observerRef.current?.observe(item))

    return () => observerRef.current?.disconnect()
  }, [mangaId, pageCount])

  useEffect(() => {
    const container = containerRef.current
    if (!container || positionedMangaRef.current === mangaId) return

    positionedMangaRef.current = mangaId
    const page = Math.max(0, Math.min(initialPage, pageCount - 1))
    const target = container.querySelector<HTMLElement>(`[data-page="${page}"]`)
    if (!target) return

    currentPageRef.current = page
    setCurrentPage(page)
    container.scrollTo({ top: target.offsetTop, behavior: 'smooth' })
  }, [initialPage, mangaId, pageCount])

  const widthStyle = width <= 2 ? `${width * 100}vw` : `${width}%`

  return (
    <div
      ref={containerRef}
      className="h-full w-full scroll-smooth overflow-y-auto overscroll-contain bg-black py-4 [-webkit-overflow-scrolling:touch] [overflow-anchor:none]"
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
