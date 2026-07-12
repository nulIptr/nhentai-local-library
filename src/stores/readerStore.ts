import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReaderMode, FitMode } from '../types'

interface ReaderState {
  mode: ReaderMode
  fit: FitMode
  scrollWidth: number
  progress: Record<string, number>
  modeSetByUser: boolean
  setMode: (mode: ReaderMode, byUser?: boolean) => void
  setFit: (fit: FitMode) => void
  setScrollWidth: (width: number) => void
  setProgress: (mangaId: string, page: number) => void
  getProgress: (mangaId: string) => number
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      mode: 'double',
      fit: 'window',
      scrollWidth: 0.9,
      progress: {},
      modeSetByUser: false,
      setMode: (mode, byUser = false) => set({ mode, modeSetByUser: byUser ? true : get().modeSetByUser }),
      setFit: (fit) => set({ fit }),
      setScrollWidth: (scrollWidth) => set({ scrollWidth }),
      setProgress: (mangaId, page) =>
        set((state) => ({ progress: { ...state.progress, [mangaId]: page } })),
      getProgress: (mangaId) => get().progress[mangaId] || 0
    }),
    {
      name: 'emm-reader-storage'
    }
  )
)
