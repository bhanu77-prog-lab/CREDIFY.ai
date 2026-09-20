/**
 * Tiny trend line for the KPI cards. Purely decorative context for the number
 * beside it, so it carries no axes and is hidden from assistive tech.
 */
export default function Sparkline({ data = [], width = 96, height = 32, color = 'var(--accent)' }) {
  if (!data || data.length < 2) return <svg width={width} height={height} aria-hidden="true" />

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = Math.max(max - min, 1)
  const step = width / (data.length - 1)

  const points = data.map((value, index) => {
    const x = index * step
    const y = height - 2 - ((value - min) / span) * (height - 4)
    return [x, y]
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const last = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="stat__spark">
      <path d={area} fill={color} opacity="0.14" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  )
}
