import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Search } from 'lucide-react'
import { client } from '../api'
import { TagCloud } from '../components/TagCloud'
import { TagBarChart } from '../components/TagBarChart'
import { TagHeatmap } from '../components/TagHeatmap'
import { TagStatsCards } from '../components/TagStatsCards'
import type { TagAnalysis, TagMap, TagMetadataStatus } from '../types'

const LIMIT_OPTIONS = [20, 50, 100]

function buildTagMapFromAnalysis(analysis: TagAnalysis | undefined): TagMap {
  if (!analysis) return {}
  const map: TagMap = {}
  for (const item of analysis.topTags) {
    if (!map[item.namespace]) map[item.namespace] = []
    const list = map[item.namespace]
    if (Array.isArray(list)) list.push(item.tag)
  }
  return map
}

export function Tags() {
  const [, navigate] = useLocation()
  const qc = useQueryClient()

  const [namespace, setNamespace] = useState('')
  const [limit, setLimit] = useState(50)
  const [includeHidden, setIncludeHidden] = useState(false)
  const [search, setSearch] = useState('')

  const {
    data: analysis,
    isLoading: analysisLoading,
    error: analysisError
  } = useQuery({
    queryKey: ['tags', 'analysis', namespace, limit, includeHidden],
    queryFn: async () => {
      const res = await client.api.tags.analysis.get({
        $query: {
          namespace,
          limit: String(limit),
          includeHidden: String(includeHidden)
        }
      })
      if (res.error) throw new Error(String(res.error.value))
      return res.data as TagAnalysis
    }
  })

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['tags', 'metadata-status'],
    queryFn: async () => {
      const res = await client.api.tags['metadata']['status'].get()
      if (res.error) throw new Error(String(res.error.value))
      return res.data as TagMetadataStatus
    }
  })

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.tags['metadata']['refresh'].post()
      if (res.error) throw new Error(String(res.error.value))
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags', 'metadata-status'] })
      qc.invalidateQueries({ queryKey: ['tags', 'analysis'] })
      qc.invalidateQueries({ queryKey: ['manga-tags'] })
      qc.invalidateQueries({ queryKey: ['mangas'] })
    }
  })

  const namespaceOptions = useMemo(() => {
    if (!analysis) return []
    return Object.keys(analysis.namespaceCounts).sort()
  }, [analysis])

  const filteredTopTags = useMemo(() => {
    if (!analysis) return []
    if (!search.trim()) return analysis.topTags
    const q = search.trim().toLowerCase()
    return analysis.topTags.filter(
      (t) =>
        t.tag.toLowerCase().includes(q) ||
        (t.name?.toLowerCase().includes(q) ?? false) ||
        t.namespace.toLowerCase().includes(q)
    )
  }, [analysis, search])

  const tagMap = useMemo(() => buildTagMapFromAnalysis(analysis), [analysis])

  const tagMetaForCloud = useMemo(() => {
    if (!analysis) return {}
    const meta: Record<string, Record<string, { name: string; intro: string; links: [] }>> = {}
    for (const item of analysis.topTags) {
      if (!meta[item.namespace]) meta[item.namespace] = {}
      meta[item.namespace][item.tag] = {
        name: item.name || item.tag,
        intro: item.intro || '',
        links: []
      }
    }
    return meta
  }, [analysis])

  const handleTagClick = (ns: string, tag: string) => {
    navigate(`/?tag=${encodeURIComponent(`${ns}:${tag}`)}`)
  }

  const handleBarClick = (item: { namespace: string; tag: string }) => {
    handleTagClick(item.namespace, item.tag)
  }

  const handleCellClick = (
    row: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _col: number
  ) => {
    const tag = analysis?.cooccurrence.tags[row]
    if (tag) handleTagClick(tag.namespace, tag.tag)
  }

  const isLoading = analysisLoading || statusLoading

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded p-1.5 text-neutral-300 hover:bg-white/10"
            title="返回图书馆"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-neutral-100">标签分析</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4">
        {status && analysis && (
          <TagStatsCards
            analysis={analysis}
            status={status}
            onRefresh={() => refreshMutation.mutate()}
            isRefreshing={refreshMutation.isPending || status.isRefreshing}
          />
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-500">命名空间</label>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 outline-none"
            >
              <option value="">全部</option>
              {namespaceOptions.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-500">数量</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 outline-none"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(e) => setIncludeHidden(e.target.checked)}
              className="rounded border-neutral-600 bg-neutral-800"
            />
            包含隐藏漫画
          </label>

          <div className="flex flex-1 items-center gap-2">
            <Search size={16} className="text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标签..."
              className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 outline-none"
            />
          </div>
        </div>

        {isLoading && <div className="py-20 text-center text-neutral-500">加载中...</div>}

        {analysisError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            加载失败：{analysisError instanceof Error ? analysisError.message : String(analysisError)}
          </div>
        )}

        {!isLoading && !analysisError && analysis && (
          <>
            {analysis.totalTags === 0 ? (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-500">
                没有符合条件的标签数据
              </div>
            ) : (
              <>
                <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                  <h2 className="mb-3 text-sm font-medium text-neutral-300">标签云</h2>
                  <TagCloud tags={tagMap} tagMeta={tagMetaForCloud} onTagClick={handleTagClick} />
                </section>

                <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                  <h2 className="mb-3 text-sm font-medium text-neutral-300">Top {limit} 标签</h2>
                  <TagBarChart data={filteredTopTags} onBarClick={handleBarClick} />
                </section>

                <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                  <h2 className="mb-3 text-sm font-medium text-neutral-300">共现热力图</h2>
                  <TagHeatmap
                    tags={analysis.cooccurrence.tags}
                    matrix={analysis.cooccurrence.matrix}
                    onCellClick={handleCellClick}
                  />
                </section>

                <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                  <h2 className="mb-3 text-sm font-medium text-neutral-300">明细表</h2>
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-neutral-800 text-neutral-500">
                        <tr>
                          <th className="py-2 pr-4">命名空间</th>
                          <th className="py-2 pr-4">标签</th>
                          <th className="py-2 pr-4">使用次数</th>
                          <th className="py-2">说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800 text-neutral-300">
                        {filteredTopTags.map((item) => {
                          const label = item.name ? `${item.tag}(${item.name})` : item.tag
                          return (
                            <tr
                              key={`${item.namespace}:${item.tag}`}
                              className="cursor-pointer hover:bg-white/5"
                              onClick={() => handleTagClick(item.namespace, item.tag)}
                            >
                              <td className="py-2 pr-4">{item.namespace}</td>
                              <td className="py-2 pr-4 font-mono text-xs">{label}</td>
                              <td className="py-2 pr-4">{item.count}</td>
                              <td className="py-2 text-neutral-500">
                                {item.intro ? '有' : '无'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
