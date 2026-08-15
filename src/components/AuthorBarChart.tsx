import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TagAnalysis } from '../types'

interface AuthorBarChartProps {
  data?: TagAnalysis['topAuthors']
  onAuthorClick?: (author: string) => void
}

const COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#22c55e']

export function AuthorBarChart({ data = [], onAuthorClick }: AuthorBarChartProps) {
  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-neutral-500">没有可用的作者标签数据</div>
  }

  const chartData = data.map((item) => ({
    ...item,
    label: item.name || item.tag,
    full: item.name ? `${item.tag} (${item.name})` : item.tag
  }))

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, left: 12, bottom: 4 }}>
          <defs>
            {COLORS.map((color, index) => (
              <linearGradient key={color} id={`author-bar-${index}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={color} />
              </linearGradient>
            ))}
          </defs>
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#a3a3a3', fontSize: 11 }} stroke="#404040" />
          <YAxis
            type="category"
            dataKey="label"
            width={104}
            tick={{ fill: '#d4d4d4', fontSize: 11 }}
            stroke="#404040"
            tickFormatter={(value: string) => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#171717', border: '1px solid #525252', borderRadius: '6px', color: '#f5f5f5' }}
            labelFormatter={(_, payload) => payload[0]?.payload?.full || ''}
            formatter={(value) => [value, '作品数量']}
          />
          <Bar dataKey="count" radius={[0, 5, 5, 0]} onClick={(_, index) => onAuthorClick?.(chartData[index]?.tag)}>
            {chartData.map((item, index) => (
              <Cell key={item.tag} fill={`url(#author-bar-${index % COLORS.length})`} cursor={onAuthorClick ? 'pointer' : 'default'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
