import { useEffect, useRef, useState } from 'react'

import { riskTone } from '../../utils/format'

const TONE_VAR = {
  safe: 'var(--safe)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
}

const START = -220
const SWEEP = 260

/**
 * Risk gauge that sweeps 0 -> score on mount.
 *
 * The animation is a deliberate beat: it gives the user a moment to register
 * that an analysis happened before the number lands. Under prefers-reduced-motion
 * it snaps straight to the final value.
 */
export default function GaugeMeter({ score = 0, verdict = 'Safe', size = 210, caption }) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setDisplay(score)
      return () => {}
    }

    const duration = 900
    const start = performance.now()
    const animate = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(Math.round(score * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [score])

  const stroke = 16
  const radius = (size - stroke) / 2 - 6
  const center = size / 2
  const tone = riskTone(score)

  const trackPath = arcPath(center, center, radius, START, START + SWEEP)
  const valuePath = arcPath(center, center, radius, START, START + (SWEEP * display) / 100)

  return (
    <div className="gauge-wrap">
      <svg
        width={size}
        height={size * 0.86}
        viewBox={`0 0 ${size} ${size * 0.86}`}
        role="img"
        aria-label={`Risk score ${score} out of 100. Verdict: ${verdict}.`}
      >
        {/* Band markers at the 35 and 65 verdict thresholds. */}
        {[35, 65].map((mark) => {
          const angle = START + (SWEEP * mark) / 100
          const outer = polar(center, center, radius + stroke / 2 + 3, angle)
          const inner = polar(center, center, radius - stroke / 2 - 3, angle)
          return (
            <line
              key={mark}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--border-strong)"
              strokeWidth="1.5"
            />
          )
        })}

        <path
          d={trackPath}
          fill="none"
          className="gauge__track"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={valuePath}
          fill="none"
          stroke={TONE_VAR[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        <text className="gauge__value" x={center} y={center + 8} fill={TONE_VAR[tone]}>
          {display}
        </text>
        <text className="gauge__caption" x={center} y={center + 30}>
          {caption || 'risk score / 100'}
        </text>
      </svg>
    </div>
  )
}

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  if (Math.abs(endAngle - startAngle) < 0.01) {
    const p = polar(cx, cy, r, startAngle)
    return `M${p.x} ${p.y}`
  }
  const start = polar(cx, cy, r, startAngle)
  const end = polar(cx, cy, r, endAngle)
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  return `M${start.x} ${start.y} A${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}
