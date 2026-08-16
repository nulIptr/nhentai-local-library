import { useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  FolderSearch,
  Loader2,
  Power,
  RotateCcw,
  Settings as SettingsIcon
} from 'lucide-react'
import { client } from '../api'

type ScanResult = {
  started: boolean
  message?: string
}

type ShutdownResult = {
  message: string
}

export function Settings() {
  const [, navigate] = useLocation()
  const qc = useQueryClient()
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [shutdownMessage, setShutdownMessage] = useState<string | null>(null)

  const scanMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const res = await client.api.mangas.scan.post({ force })
      if (res.error) throw new Error(String(res.error.value))
      return res.data as ScanResult
    },
    onSuccess: (data) => {
      setLastResult(data)
      qc.invalidateQueries({ queryKey: ['mangas'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  const handleScan = (force: boolean) => {
    if (scanMutation.isPending) return
    setLastResult(null)
    scanMutation.mutate(force)
  }

  const shutdownMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.system.shutdown.post()
      if (res.error) {
        const message = (res.error.value as { message?: string } | null)?.message
        throw new Error(message || String(res.error.value))
      }
      return res.data as ShutdownResult
    },
    onSuccess: (data) => setShutdownMessage(data.message)
  })

  const handleShutdown = () => {
    if (shutdownMutation.isPending) return
    const confirmed = window.confirm('确定要关闭后端服务所在的计算机吗？未保存的数据可能会丢失。')
    if (!confirmed) return

    setShutdownMessage(null)
    shutdownMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
          >
            <ArrowLeft size={16} /> 返回
          </button>
          <h1 className="text-lg font-semibold text-neutral-100">设置</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <SettingsIcon size={18} className="text-blue-400" />
            <h2 className="text-base font-medium text-neutral-100">漫画库扫描</h2>
          </div>

          <p className="mb-4 text-sm text-neutral-400">
            普通扫描仅会处理数据库中尚未记录的新增文件，速度较快；强制全文件扫描会重新校验所有文件并清理已删除的记录，耗时较长。
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => handleScan(false)}
              disabled={scanMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
            >
              {scanMutation.isPending && !scanMutation.variables ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FolderSearch size={16} />
              )}
              扫描新增文件
            </button>

            <button
              onClick={() => handleScan(true)}
              disabled={scanMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              {scanMutation.isPending && scanMutation.variables ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              强制全文件扫描
            </button>
          </div>

          {scanMutation.isPending && (
            <div className="mt-4 rounded border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-300">
              扫描任务已在后台启动，请稍后查看日志或刷新页面。
            </div>
          )}

          {scanMutation.isError && (
            <div className="mt-4 rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {scanMutation.error instanceof Error ? scanMutation.error.message : String(scanMutation.error)}
            </div>
          )}

          {scanMutation.isSuccess && lastResult && (
            <div className="mt-4 rounded border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
              {lastResult.message || '扫描任务已启动'}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-lg border border-red-500/30 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Power size={18} className="text-red-400" />
            <h2 className="text-base font-medium text-neutral-100">系统关机</h2>
          </div>

          <p className="mb-4 text-sm text-neutral-400">
            此操作会关闭运行后端服务的计算机，并中断当前服务。
          </p>

          <button
            onClick={handleShutdown}
            disabled={shutdownMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-md border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm text-red-300 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {shutdownMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            关闭服务器计算机
          </button>

          {shutdownMessage && (
            <div className="mt-4 rounded border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
              {shutdownMessage}
            </div>
          )}

          {shutdownMutation.isError && (
            <div className="mt-4 rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {shutdownMutation.error instanceof Error
                ? shutdownMutation.error.message
                : String(shutdownMutation.error)}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
