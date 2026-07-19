import { useEffect, useRef, useState } from 'react'
import type { TagAnalysis } from '../types'

interface TagHeatmapProps {
  tags: TagAnalysis['cooccurrence']['tags']
  matrix: TagAnalysis['cooccurrence']['matrix']
  onCellClick?: (row: number, col: number) => void
}

const CELL_SIZE = 28
const LABEL_WIDTH = 120
const FONT_SIZE = 10

function getColor(value: number, max: number): string {
  if (max === 0) return 'rgba(38, 38, 38, 1)'
  const ratio = value / max
  const r = Math.round(37 + ratio * (59 - 37))
  const g = Math.round(99 + ratio * (130 - 99))
  const b = Math.round(235 + ratio * (246 - 235))
  return `rgba(${r}, ${g}, ${b}, ${0.3 + ratio * 0.7})`
}

function GridHeatmap({
  tags,
  matrix,
  onCellClick
}: {
  tags: TagAnalysis['cooccurrence']['tags']
  matrix: number[][]
  onCellClick?: (row: number, col: number) => void
}) {
  const max = Math.max(1, ...matrix.flat())
  const n = tags.length

  return (
    <div className="overflow-auto">
      <div
        className="grid gap-px bg-neutral-800 p-1"
        style={{
          gridTemplateColumns: `${LABEL_WIDTH}px repeat(${n}, minmax(${CELL_SIZE}px, 1fr))`,
          minWidth: `${LABEL_WIDTH + n * CELL_SIZE + 16}px`
        }}
      >
        <div className="sticky left-0 bg-neutral-900" />
        {tags.map((t, i) => (
          <div
            key={`col-${i}`}
            className="flex items-end justify-center truncate bg-neutral-900 pb-1 text-[10px] text-neutral-400"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            title={`${t.namespace}: ${t.name ? `${t.tag}(${t.name})` : t.tag}`}
          >
            {t.name || t.tag}
          </div>
        ))}
        {tags.map((rowTag, row) => (
          <div key={`row-${row}`} className="contents">
            <div
              className="sticky left-0 flex items-center truncate bg-neutral-900 px-2 text-[10px] text-neutral-400"
              title={`${rowTag.namespace}: ${rowTag.name ? `${rowTag.tag}(${rowTag.name})` : rowTag.tag}`}
            >
              {rowTag.name || rowTag.tag}
            </div>
            {tags.map((_, col) => {
              const value = matrix[row]?.[col] ?? 0
              return (
                <button
                  key={`cell-${row}-${col}`}
                  type="button"
                  onClick={() => onCellClick?.(row, col)}
                  className="flex h-7 items-center justify-center text-[10px] transition hover:brightness-125"
                  style={{ backgroundColor: getColor(value, max) }}
                  title={`${rowTag.name ? `${rowTag.tag}(${rowTag.name})` : rowTag.tag} × ${tags[col].name ? `${tags[col].tag}(${tags[col].name})` : tags[col].tag}: ${value}`}
                >
                  {value > 0 ? value : ''}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function CanvasHeatmap({
  tags,
  matrix,
  onCellClick
}: {
  tags: TagAnalysis['cooccurrence']['tags']
  matrix: number[][]
  onCellClick?: (row: number, col: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<{ row: number; col: number; x: number; y: number } | null>(null)
  const n = tags.length
  const max = Math.max(1, ...matrix.flat())
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const canvasWidth = LABEL_WIDTH + n * CELL_SIZE
  const canvasHeight = LABEL_WIDTH + n * CELL_SIZE

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasWidth * pixelRatio
    canvas.height = canvasHeight * pixelRatio
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#171717'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const value = matrix[row]?.[col] ?? 0
        ctx.fillStyle = getColor(value, max)
        ctx.fillRect(LABEL_WIDTH + col * CELL_SIZE, LABEL_WIDTH + row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
      }
    }

    ctx.fillStyle = '#a3a3a3'
    ctx.font = `${FONT_SIZE}px sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let row = 0; row < n; row++) {
      const text = tags[row].name || tags[row].tag
      ctx.save()
      ctx.translate(LABEL_WIDTH - 8, LABEL_WIDTH + row * CELL_SIZE + CELL_SIZE / 2)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    for (let col = 0; col < n; col++) {
      const text = tags[col].name || tags[col].tag
      ctx.save()
      ctx.translate(LABEL_WIDTH + col * CELL_SIZE + CELL_SIZE / 2, LABEL_WIDTH - 8)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }, [matrix, tags, n, max, canvasWidth, canvasHeight, pixelRatio])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < LABEL_WIDTH || y < LABEL_WIDTH) {
      setHover(null)
      return
    }
    const col = Math.floor((x - LABEL_WIDTH) / CELL_SIZE)
    const row = Math.floor((y - LABEL_WIDTH) / CELL_SIZE)
    if (row >= 0 && row < n && col >= 0 && col < n) {
      setHover({ row, col, x: e.clientX + 12, y: e.clientY + 12 })
    } else {
      setHover(null)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < LABEL_WIDTH || y < LABEL_WIDTH) return
    const col = Math.floor((x - LABEL_WIDTH) / CELL_SIZE)
    const row = Math.floor((y - LABEL_WIDTH) / CELL_SIZE)
    if (row >= 0 && row < n && col >= 0 && col < n) {
      onCellClick?.(row, col)
    }
  }

  return (
    <div className="overflow-auto">
      <canvas
        ref={canvasRef}
        width={canvasWidth * pixelRatio}
        height={canvasHeight * pixelRatio}
        style={{ width: canvasWidth, height: canvasHeight }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
        className="cursor-pointer"
      />
      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 shadow-lg"
          style={{ left: hover.x, top: hover.y }}
        >
          {tags[hover.row].name ? `${tags[hover.row].tag}(${tags[hover.row].name})` : tags[hover.row].tag} ×{' '}
          {tags[hover.col].name ? `${tags[hover.col].tag}(${tags[hover.col].name})` : tags[hover.col].tag}: {matrix[hover.row][hover.col]}
        </div>
      )}
    </div>
  )
}

export function TagHeatmap({ tags, matrix, onCellClick }: TagHeatmapProps) {
  if (tags.length === 0 || matrix.length === 0) return null

  if (tags.length <= 50) {
    return <GridHeatmap tags={tags} matrix={matrix} onCellClick={onCellClick} />
  }

  return <CanvasHeatmap tags={tags} matrix={matrix} onCellClick={onCellClick} />
}
