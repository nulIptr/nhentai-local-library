import { RefreshCw } from 'lucide-react'
import type { TagAnalysis, TagMetadataStatus } from '../types'

interface TagStatsCardsProps {
  analysis: TagAnalysis
  status: TagMetadataStatus
  onRefresh: () => void
  isRefreshing: boolean
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleString('zh-CN')
}

export function TagStatsCards({ analysis, status, onRefresh, isRefreshing }: TagStatsCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-500">标签总数</div>
          <div className="mt-1 text-2xl font-semibold text-neutral-100">{analysis.totalTags}</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-500">已标记漫画</div>
          <div className="mt-1 text-2xl font-semibold text-neutral-100">{analysis.taggedMangaCount}</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-500">翻译覆盖率</div>
          <div className="mt-1 text-2xl font-semibold text-neutral-100">
            {formatPercent(analysis.translationCoverage)}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-500">元数据库版本</div>
          <div className="mt-1 text-lg font-semibold text-neutral-100">
            {status.loaded ? `v${status.version}` : '未加载'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div>
            <span className="text-neutral-500">仓库：</span>
            {status.repo || '-'}
          </div>
          <div>
            <span className="text-neutral-500">Commit：</span>
            {status.headSha ? `${status.headSha.slice(0, 8)}` : '-'}
          </div>
          <div>
            <span className="text-neutral-500">文件更新时间：</span>
            {formatDate(status.fileMtime)}
          </div>
          {status.lastRefreshSuccessAt && (
            <div>
              <span className="text-neutral-500">上次刷新成功：</span>
              {formatDate(status.lastRefreshSuccessAt)}
            </div>
          )}
          {status.lastRefreshError && (
            <div className="text-red-400">上次刷新失败：{status.lastRefreshError}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-1.5 self-start rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-neutral-200 hover:border-neutral-600 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? '刷新中...' : '刷新元数据'}
        </button>
      </div>
    </div>
  )
}
