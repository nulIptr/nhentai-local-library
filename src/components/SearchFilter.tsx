import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import type { SortField } from '../types'

interface SearchFilterProps {
  q: string
  onQChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  categories: string[]
  sortBy: SortField
  onSortByChange: (value: SortField) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
}

const SORT_LABELS: Record<SortField, string> = {
  date: '入库时间',
  mtime: '修改时间',
  posted: '发布时间',
  rating: '评分',
  readCount: '阅读次数',
  bundleSize: '文件大小',
  pageCount: '页数',
  title: '标题'
}

export function SearchFilter({
  q,
  onQChange,
  category,
  onCategoryChange,
  categories,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange
}: SearchFilterProps) {
  return (
    <div className="sticky top-0 z-30 flex flex-col gap-3 border-b border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 focus-within:border-blue-500">
        <Search size={18} className="text-neutral-500" />
        <input
          type="text"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onQChange(q)
          }}
          placeholder="搜索标题 / 日文名 / 标签"
          className="flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={16} className="text-neutral-500" />
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-500 sm:flex-none"
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ArrowUpDown size={16} className="text-neutral-500" />
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortField)}
          className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-500 sm:flex-none"
        >
          {Object.entries(SORT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-700"
        >
          {sortOrder === 'asc' ? '升序' : '降序'}
        </button>
      </div>
    </div>
  )
}
