import { BookOpen, Database, Languages, RefreshCw, Tags } from 'lucide-react'
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
  const cards = [
    { label: '标签总数', value: analysis.totalTags, icon: Tags, color: 'text-sky-300', glow: 'bg-sky-400/10' },
    { label: '已标记漫画', value: analysis.taggedMangaCount, icon: BookOpen, color: 'text-emerald-300', glow: 'bg-emerald-400/10' },
    { label: '翻译覆盖率', value: formatPercent(analysis.translationCoverage), icon: Languages, color: 'text-violet-300', glow: 'bg-violet-400/10' },
    { label: '元数据库版本', value: status.loaded ? `v${status.version}` : '未加载', icon: Database, color: 'text-amber-300', glow: 'bg-amber-400/10' }
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} className="relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700">
            <div className={`absolute -right-5 -top-5 h-20 w-20 rounded-full ${glow}`} />
            <div className="relative flex items-start justify-between gap-2">
              <div className="text-xs text-neutral-500">{label}</div>
              <Icon size={17} className={color} />
            </div>
            <div className="relative mt-2 text-2xl font-semibold text-neutral-100">{value}</div>
          </div>
        ))}
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
