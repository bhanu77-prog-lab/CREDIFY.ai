import { useMemo, useState } from 'react'

import useElementWidth from '../../utils/useElementWidth'
import { formatDate, formatNumber } from '../../utils/format'

const SERIES = [
  { key: 'safe', label: 'Safe', color: 'var(--safe)' },
  { key: 'suspicious', label: 'Suspicious', color: 'var(--warn)' },
  { key: 'high_risk', label: 'High risk', color: 'var(--danger)' },
]

const PAD = { top: 16, right: 12, bottom: 28, left: 40 }

/**
 * Stacked area chart, drawn by hand.
 *
 * Series are stacked safe -> suspicious -> high risk so the red band sits on top
 * where the eye lands first, and the hover tooltip reports the exact breakdown
 * for a day rather than the stacked cumulative value.
 */
export default function AreaChart({ data = [], height = 260 }) {
  const [ref, width] = useElementWidth(720)
  const [hover, setHover] = useState(null)

  const chart = useMemo(() => {
    if (!data.length) return null

    const innerW = Math.max(width - PAD.left - PAD.right, 10)
    const innerH = height - PAD.top - PAD.bottom

    const max = Math.max(1, ...data.map((d) => d.total))
    const { niceMax, step: tickStep } = niceScale(max)

    const x = (index) => PAD.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW)
    const y = (value) => PAD.top + innerH - (value / niceMax) * innerH

    // Cumulative stack: each band's upper edge is the running total.
    let running = data.map(() => 0)
    const bands = SERIES.map((series) => {
      const lower = [...running]
      running = running.map((value, index) => value + (data[index][series.key] || 0))
      const upper = [...running]
      const top = upper.map((value, index) => `${x(index)},${y(value)}`)
      const bottom = lower
        .map((value, index) => `${x(index)},${y(value)}`)
        .reverse()
      return {
        ...series,
        area: `M${top.join(' L')} L${bottom.join(' L')} Z`,
        line: `M${top.join(' L')}`,
      }
    })

    const gridlines = []
    for (let value = 0; value <= niceMax + 1e-9; value += tickStep) {
      gridlines.push({ value, y: y(value) })
    }

    const step = Math.max(1, Math.ceil(data.length / (width < 520 ? 4 : 7)))
    const xLabels = data
      .map((point, index) => ({ point, index }))
      .filter(({ index }) => index % step === 0 || index === data.length - 1)

    return { bands, gridlines, xLabels, x, y, innerH, innerW, niceMax }
  }, [data, width, height])

  if (!data.length || !chart) {
    return (
      <div ref={ref} style={{ height }} className="row center muted small">
        No activity in this period yet.
      </div>
    )
  }

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const relative = event.clientX - rect.left - PAD.left
    const ratio = Math.max(0, Math.min(1, relative / Math.max(chart.innerW, 1)))
    const index = Math.round(ratio * (data.length - 1))
    setHover({ index, x: chart.x(index) })
  }

  const point = hover ? data[hover.index] : null

  return (
    <div className="chart-shell" ref={ref}>
      <svg
        className="chart"
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Scans over time. ${data.length} days, peak ${chart.niceMax} scans in a day.`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {chart.gridlines.map((line) => (
          <g key={line.value}>
            <line
              className="chart__grid-line"
              x1={PAD.left}
              x2={width - PAD.right}
              y1={line.y}
              y2={line.y}
            />
            <text className="chart__axis-text" x={PAD.left - 8} y={line.y + 4} textAnchor="end">
              {formatNumber(Math.round(line.value))}
            </text>
          </g>
        ))}

        {chart.bands.map((band) => (
          <g key={band.key}>
            <path d={band.area} fill={band.color} opacity="0.22" />
            <path d={band.line} fill="none" stroke={band.color} strokeWidth="2" strokeLinejoin="round" />
          </g>
        ))}

        {chart.xLabels.map(({ point: p, index }) => (
          <text
            key={p.date}
            className="chart__axis-text"
            x={chart.x(index)}
            y={height - 8}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
          >
            {formatDate(`${p.date}T00:00:00`)}
          </text>
        ))}

        {hover && (
          <g>
            <line
              className="chart__hover-line"
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={PAD.top + chart.innerH}
            />
            <circle cx={hover.x} cy={PAD.top + chart.innerH} r="3" fill="var(--accent)" />
          </g>
        )}
      </svg>

      {point && (
        <div
          className="chart-tooltip"
          style={{
            left: `${Math.min(Math.max(hover.x, 90), width - 90)}px`,
            top: `${PAD.top + 10}px`,
          }}
        >
          <div className="chart-tooltip__title">{formatDate(`${point.date}T00:00:00`, { withYear: true })}</div>
          {[...SERIES].reverse().map((series) => (
            <div className="chart-tooltip__row" key={series.key}>
              <span className="chart-tooltip__swatch" style={{ background: series.color }} />
              <span>{series.label}</span>
              <span className="chart-tooltip__value">{formatNumber(point[series.key])}</span>
            </div>
          ))}
          <div className="chart-tooltip__row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
            <span className="strong">Total</span>
            <span className="chart-tooltip__value">{formatNumber(point.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Pick a round tick step. These are scan counts, so the step set is restricted
 * to 1 / 2 / 5 × a power of ten — no 2.5 — and every axis label is a whole number.
 */
function niceScale(max, targetTicks = 4) {
  const rough = Math.max(max / targetTicks, 1)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) || magnitude * 10
  return { step, niceMax: Math.ceil(max / step) * step }
}

export { SERIES as AREA_SERIES }
