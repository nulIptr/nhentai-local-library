import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
}

export function StarRating({ value, onChange, size = 20 }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const display = hoverValue ?? value ?? 0
  const editable = Boolean(onChange)

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fillRatio = Math.min(Math.max(display - (i - 1), 0), 1)
        return (
          <div
            key={i}
            className="relative"
            style={{ width: size, height: size }}
            onMouseLeave={() => editable && setHoverValue(null)}
          >
            <Star
              size={size}
              className="absolute text-neutral-600"
              strokeWidth={1.5}
            />
            <div
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${fillRatio * 100}%` }}
            >
              <Star
                size={size}
                className="text-yellow-400 fill-yellow-400"
                strokeWidth={1.5}
              />
            </div>
            {editable && (
              <>
                <button
                  type="button"
                  className="absolute top-0 left-0 h-full w-1/2 cursor-pointer opacity-0"
                  onClick={() => onChange?.(i - 0.5)}
                  onMouseEnter={() => setHoverValue(i - 0.5)}
                  aria-label={`Rate ${i - 0.5} stars`}
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 h-full w-1/2 cursor-pointer opacity-0"
                  onClick={() => onChange?.(i)}
                  onMouseEnter={() => setHoverValue(i)}
                  aria-label={`Rate ${i} stars`}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
