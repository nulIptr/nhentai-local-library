import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface NamespaceDonutChartProps {
  counts: Record<string, number>
  onNamespaceClick?: (namespace: string) => void
}

const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#f59e0b', '#34d399', '#fb7185', '#818cf8', '#2dd4bf']

export function NamespaceDonutChart({ counts, onNamespaceClick }: NamespaceDonutChartProps) {
  const data = Object.entries(counts)
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => b.count - a.count || a.namespace.localeCompare(b.namespace))

  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (data.length === 0) return <div className="flex h-72 items-center justify-center text-sm text-neutral-500">没有命名空间数据</div>

  return (
    <div className="relative h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="namespace"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="none"
            onClick={(_, index) => onNamespaceClick?.(data[index]?.namespace)}
          >
            {data.map((item, index) => (
              <Cell key={item.namespace} fill={COLORS[index % COLORS.length]} cursor={onNamespaceClick ? 'pointer' : 'default'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#171717', border: '1px solid #525252', borderRadius: '6px', color: '#f5f5f5' }}
            formatter={(value) => [value, '标签数']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-neutral-100">{total}</span>
        <span className="text-xs text-neutral-500">标签种类</span>
      </div>
    </div>
  )
}
