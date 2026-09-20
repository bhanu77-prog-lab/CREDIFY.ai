import { useMemo, useState } from 'react'

import { formatNumber } from '../../utils/format'

/**
 * Categorical palette.
 *
 * Deliberately built from blues, violets, teals and warm neutrals - never green,
 * amber or red, because those three are reserved system-wide for risk level. A
 * category slice tinted red would read as "this category is dangerous", which is
 * not what it means.
 */
const PALETTE = [
  '#12b5cb',
  '#5b6ee1',
  '#8b5cf6',
  '#c026a6',
  '#0e7490',
  '#3b82f6',
  '#a855f7',
  '#e0679a',
  '#0891b2',
  '#6366f1',
  '#7c3aed',
  '#64748b',
]

export default function DonutChart({ data = [], size = 220, thickness = 30, centerLabel = 'flagged' }) {
  const [active, setActive] = useState(null)

  const total = data.reduce((sum, item) => sum + item.count, 0)

  const slices = useMemo(() => {
    if (!total) return []
    const radius = (size - thickness) / 2
    const circumference = 2 * Math.PI * radius
    let offset = 0
    return data.map((item, index) => {
      const fraction = item.count / total
      const length = fraction * circumference
      const slice = {
        ...item,
        color: PALETTE[index % PALETTE.length],
        dash: `${length} ${circumference - length}`,
        offset: -offset,
        radius,
        index,
      }
      offset += length
      return slice
    })
  }, [data, total, size, thickness])

  if (!total) {
    return (
      <div className="empty" style={{ padding: 'var(--sp-8)' }}>
        <p className="empty__title">Nothing flagged yet</p>
        <p className="empty__text">Scam categories appear here once scans are analysed.</p>
      </div>
    )
  }

  const center = size / 2
  const activeSlice = active !== null ? slices[active] : null

  return (
    <div className="donut-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Scam categories: ${data.map((d) => `${d.label} ${d.pct} percent`).join(', ')}`}
        style={{ flex: 'none' }}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          {slices.map((slice) => (
            <circle
              key={slice.category}
              cx={center}
              cy={center}
              r={slice.radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={active === slice.index ? thickness + 6 : thickness}
              strokeDasharray={slice.dash}
              strokeDashoffset={slice.offset}
              opacity={active === null || active === slice.index ? 1 : 0.32}
              style={{ transition: 'stroke-width 180ms var(--ease), opacity 180ms var(--ease)' }}
              onMouseEnter={() => setActive(slice.index)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </g>
        <g className="donut-center">
          <text className="donut-center__value" x={center} y={center - 2}>
            {activeSlice ? `${activeSlice.pct}%` : formatNumber(total)}
          </text>
          <text className="donut-center__label" x={center} y={center + 18}>
            {activeSlice ? truncateLabel(activeSlice.label) : centerLabel}
          </text>
        </g>
      </svg>

      <div className="legend grow">
        {slices.map((slice) => (
          <button
            key={slice.category}
            type="button"
            className={`legend__item ${active === slice.index ? 'legend__item--active' : ''}`.trim()}
            onMouseEnter={() => setActive(slice.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(slice.index)}
            onBlur={() => setActive(null)}
          >
            <span className="legend__swatch" style={{ background: slice.color }} />
            <span className="legend__label" title={slice.label}>
              {slice.label}
            </span>
            <span className="legend__value">{formatNumber(slice.count)}</span>
            <span className="legend__pct">{slice.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function truncateLabel(label) {
  return label.length > 18 ? `${label.slice(0, 17)}…` : label
}

export { PALETTE as CATEGORY_PALETTE }
