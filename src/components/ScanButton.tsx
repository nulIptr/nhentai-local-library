import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderSearch, Loader2, X } from 'lucide-react'
import { client } from '../api'

export function ScanButton() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.mangas.scan.post()
      if (res.error) throw new Error(String(res.error.value))
      return res.data as {
        started: boolean
        message?: string
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mangas'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside)
      return () => document.removeEventListener('mousedown', onClickOutside)
    }
  }, [open])

  const handleScan = () => {
    if (mutation.isPending) return
    mutation.mutate()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={mutation.isPending}
        className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-60"
      >
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <FolderSearch size={16} />}
        扫描漫画库
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-neutral-200">扫描漫画库</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            >
              <X size={14} />
            </button>
          </div>

          <button
            onClick={handleScan}
            disabled={mutation.isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            开始扫描
          </button>

          {mutation.isSuccess && (
            <div className="mt-3 rounded border border-green-500/20 bg-green-500/10 p-2 text-xs text-green-300">
              {mutation.data.message || '扫描任务已启动'}
            </div>
          )}

          {mutation.isError && (
            <div className="mt-3 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300">
              {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
