import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useLocation } from 'wouter'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  Settings2
} from 'lucide-react'
import { client } from '../api'
import { ReaderCanvas } from '../components/ReaderCanvas'
import { WebtoonScroller } from '../components/WebtoonScroller'
import { useReaderStore } from '../stores/readerStore'
import { getPlaceholderTitle } from '../lib/placeholder'
import type { ReaderMode, FitMode, Manga } from '../types'

const MODES: { value: ReaderMode; label: string }[] = [
  { value: 'single', label: '单页' },
  { value: 'double', label: '双页' },
  { value: 'scroll', label: '长条' }
]

const FITS: { value: FitMode; label: string }[] = [
  { value: 'window', label: '适应窗口' },
  { value: 'width', label: '适应宽度' },
  { value: 'height', label: '适应高度' }
]

const SCROLL_WIDTHS = [
  { value: 0.5, label: '50vw' },
  { value: 0.75, label: '75vw' },
  { value: 0.9, label: '90vw' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' }
]

export function Reader() {
  const { id } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const { mode, fit, scrollWidth, modeSetByUser, setMode, setFit, setScrollWidth, setProgress, getProgress } =
    useReaderStore()

  const [currentPage, setCurrentPage] = useState(0)
  const [currentSpread, setCurrentSpread] = useState(0)
  const [showToolbar, setShowToolbar] = useState(true)

  const { data: manga, isLoading } = useQuery({
    queryKey: ['manga', id],
    queryFn: async () => {
      const res = await client.api.mangas[id].get()
      if (res.error) throw new Error(String(res.error.value))
      return res.data as Manga
    },
    enabled: Boolean(id)
  })

  const readMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.mangas[id].read.post()
      if (res.error) throw new Error(String(res.error.value))
      return res.data as Manga
    }
  })

  const progressMutation = useMutation({
    mutationFn: async (page: number) => {
      const res = await client.api.mangas[id].meta.patch({ currentPage: page })
      if (res.error) throw new Error(String(res.error.value))
      return res.data as Manga
    }
  })

  const [pageInput, setPageInput] = useState('1')

  useEffect(() => {
    if (manga) {
      readMutation.mutate()
      const saved = Math.min(
        manga.currentPage ?? getProgress(manga.id),
        (manga.pageCount || 1) - 1
      )
      setCurrentPage(saved)
      setCurrentSpread(Math.floor(saved / 2))
      setPageInput(String(saved + 1))
    }
  }, [manga?.id])

  useEffect(() => {
    if (modeSetByUser) return
    const isLandscape = window.innerWidth > window.innerHeight
    setMode(isLandscape ? 'double' : 'single')
  }, [])

  const pageCount = manga?.pageCount || 0

  const spreads = useMemo(() => {
    const list: number[][] = []
    for (let i = 0; i < pageCount; i += 2) {
      list.push(i + 1 < pageCount ? [i, i + 1] : [i])
    }
    return list
  }, [pageCount])

  const currentPages = useMemo(() => {
    if (mode === 'double') {
      const spread = spreads[currentSpread] || [currentPage]
      return [...spread].reverse()
    }
    return [currentPage]
  }, [mode, currentSpread, currentPage, spreads])

  const goPrev = useCallback(() => {
    if (mode === 'double') {
      setCurrentSpread((s) => Math.max(0, s - 1))
    } else {
      setCurrentPage((p) => Math.max(0, p - 1))
    }
  }, [mode])

  const goNext = useCallback(() => {
    if (mode === 'double') {
      setCurrentSpread((s) => Math.min(spreads.length - 1, s + 1))
    } else {
      setCurrentPage((p) => Math.min(pageCount - 1, p + 1))
    }
  }, [mode, pageCount, spreads.length])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (mode === 'scroll') return
      e.preventDefault()
      if (e.deltaY > 30) goNext()
      else if (e.deltaY < -30) goPrev()
    },
    [mode, goNext, goPrev]
  )

  const goFirst = useCallback(() => {
    if (mode === 'double') {
      setCurrentSpread(0)
    } else {
      setCurrentPage(0)
    }
  }, [mode])

  const goLast = useCallback(() => {
    if (mode === 'double') {
      setCurrentSpread(spreads.length - 1)
    } else {
      setCurrentPage(pageCount - 1)
    }
  }, [mode, pageCount, spreads.length])

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(pageCount - 1, page))
      if (mode === 'double') {
        setCurrentSpread(Math.floor(clamped / 2))
      } else {
        setCurrentPage(clamped)
      }
    },
    [mode, pageCount]
  )

  useEffect(() => {
    if (mode === 'double') {
      setCurrentSpread(Math.floor(currentPage / 2))
    } else {
      const pages = spreads[currentSpread]
      if (pages) setCurrentPage(pages[0])
    }
  }, [mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      else if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, navigate])

  useEffect(() => {
    if (!manga) return
    const activePage = mode === 'double' ? currentPages[0] : currentPage
    setProgress(manga.id, activePage)
    setPageInput(String(activePage + 1))
    progressMutation.mutate(activePage)
  }, [currentPage, currentSpread, mode, manga?.id])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-neutral-400">
        加载中...
      </div>
    )
  }

  if (!manga || !pageCount) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-neutral-400">
        <p>漫画不存在或没有页面</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-400 hover:underline">
          返回图书馆
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-black"
      onDoubleClick={() => setShowToolbar((v) => !v)}
    >
      {showToolbar && (
        <div className="z-20 flex w-full flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/70 px-3 py-2 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
              title="返回列表"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="max-w-[40vw] truncate text-xs text-neutral-200 sm:max-w-md sm:text-sm">
              {getPlaceholderTitle(manga)}
            </h1>
          </div>

          {mode !== 'scroll' && (
            <div className="order-last flex w-full items-center justify-center gap-1 text-xs sm:order-none sm:w-auto">
              <button
                onClick={goFirst}
                className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
                title="首页"
              >
                <ChevronFirst size={18} />
              </button>
              <button
                onClick={goPrev}
                className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
                title="上一页"
              >
                <ChevronLeft size={18} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = Number(pageInput) - 1
                    if (!Number.isNaN(page)) goToPage(page)
                  }
                }}
                onBlur={() => {
                  const page = Number(pageInput) - 1
                  if (!Number.isNaN(page)) goToPage(page)
                }}
                className="w-12 rounded border border-white/10 bg-white/10 px-1 py-1 text-center text-neutral-200 outline-none"
              />
              <span className="text-neutral-400">/ {pageCount}</span>
              <button
                onClick={goNext}
                className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
                title="下一页"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={goLast}
                className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
                title="尾页"
              >
                <ChevronLast size={18} />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs sm:gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ReaderMode, true)}
              className="rounded border border-white/10 bg-white/10 px-2 py-1 text-neutral-200 outline-none"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {mode !== 'scroll' ? (
              <select
                value={fit}
                onChange={(e) => setFit(e.target.value as FitMode)}
                className="rounded border border-white/10 bg-white/10 px-2 py-1 text-neutral-200 outline-none"
              >
                {FITS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={scrollWidth}
                onChange={(e) => setScrollWidth(Number(e.target.value))}
                className="rounded border border-white/10 bg-white/10 px-2 py-1 text-neutral-200 outline-none"
              >
                {SCROLL_WIDTHS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowToolbar((v) => !v)}
              className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {mode === 'scroll' ? (
          <WebtoonScroller
            mangaId={manga.id}
            pageCount={pageCount}
            width={scrollWidth}
            initialPage={getProgress(manga.id)}
            onCurrentPageChange={setCurrentPage}
          />
        ) : (
          <ReaderCanvas
            mangaId={manga.id}
            currentPages={currentPages}
            pageCount={pageCount}
            fit={fit}
            onPrev={goPrev}
            onNext={goNext}
            onWheel={handleWheel}
          />
        )}
      </div>

      {mode !== 'scroll' && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-40 transition hover:bg-black/60 hover:opacity-100"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-40 transition hover:bg-black/60 hover:opacity-100"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}
    </div>
  )
}
