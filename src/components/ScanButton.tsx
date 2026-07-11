import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderSearch, Loader2 } from 'lucide-react'
import { client } from '../api'

export function ScanButton() {
  const qc = useQueryClient()
  const [path, setPath] = useState('')
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: async (libraryPath: string) => {
      const res = await client.api.mangas.scan.post({ libraryPath })
      if (res.error) throw new Error(String(res.error.value))
      return res.data as {
        total: number
        added: number
        updated: number
        removed: number
        errors: string[]
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mangas'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!path.trim()) return
    mutation.mutate(path.trim())
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        <FolderSearch size={16} />
        扫描漫画库
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm text-neutral-400">
              漫画库目录路径
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:\\Comics"
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-blue-500"
              />
            </label>
            <button
              type="submit"
              disabled={mutation.isPending || !path.trim()}
              className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              开始扫描
            </button>
          </form>

          {mutation.isSuccess && (
            <div className="mt-3 rounded border border-green-500/20 bg-green-500/10 p-2 text-xs text-green-300">
              <p>扫描完成：共 {mutation.data.total} 本</p>
              <p>新增 {mutation.data.added} / 更新 {mutation.data.updated} / 移除 {mutation.data.removed}</p>
              {mutation.data.errors.length > 0 && (
                <p className="mt-1 text-red-300">错误 {mutation.data.errors.length} 条</p>
              )}
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
