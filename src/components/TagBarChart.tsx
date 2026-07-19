import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import type { TagAnalysis } from '../types'

interface TagBarChartProps {
  data: TagAnalysis['topTags']
  onBarClick?: (item: { namespace: string; tag: string }) => void
}

export function TagBarChart({ data, onBarClick }: TagBarChartProps) {
  if (data.length === 0) return null

  const chartData = data.map((item) => ({
    ...item,
    label: item.name || item.tag,
    full: `${item.namespace}: ${item.name ? `${item.tag}(${item.name})` : item.tag}`
  }))

  return (
    <div className="h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 64 }}>
          <XAxis
            dataKey="label"
            angle={-45}
            textAnchor="end"
            interval={0}
            tick={{ fill: '#a3a3a3', fontSize: 10 }}
            stroke="#525252"
          />
          <YAxis tick={{ fill: '#a3a3a3', fontSize: 10 }} stroke="#525252" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#171717',
              border: '1px solid #404040',
              borderRadius: '0.5rem',
              color: '#e5e5e5'
            }}
            formatter={(_, __, props) => {
              const payload = props?.payload as (typeof chartData)[number]
              return [payload.count, payload.full]
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`hsl(${(index * 25) % 360}, 70%, 55%)`}
                cursor={onBarClick ? 'pointer' : 'default'}
                onClick={() => onBarClick?.(chartData[index])}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
