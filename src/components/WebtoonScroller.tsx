import { useEffect, useRef } from 'react'
import { getPageSrc } from '../lib/placeholder'

interface WebtoonScrollerProps {
  mangaId: string
  pageCount: number
  width: number
  onCurrentPageChange: (page: number) => void
  initialPage?: number
}

export function WebtoonScroller({
  mangaId,
  pageCount,
  width,
  onCurrentPageChange,
  initialPage = 0
}: WebtoonScrollerProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const page = Number(visible.target.getAttribute('data-page'))
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
      className="h-full w-full overflow-y-auto bg-black py-4"
    >
      <div className="flex flex-col items-center gap-2">
        {Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={i}
            data-page={i}
            style={{ width: widthStyle }}
          >
            <img
              src={getPageSrc(mangaId, i)}
              alt={`Page ${i + 1}`}
              loading="lazy"
              className="w-full select-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
