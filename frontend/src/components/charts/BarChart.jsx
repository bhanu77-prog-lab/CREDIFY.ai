import { formatNumber, riskTone } from '../../utils/format'

const TONE_VAR = {
  safe: 'var(--safe)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
}

/**
 * Horizontal bars for average risk per channel.
 *
 * The bar is coloured by the verdict band its average falls into, so the chart
 * carries the same semantic colour language as every risk badge in the app.
 */
export default function BarChart({ data = [], max = 100 }) {
  if (!data.length) {
    return <p className="muted small">No channel activity in this period yet.</p>
  }

  return (
    <div className="stack gap-3" role="list">
      {data.map((item) => {
        const tone = riskTone(item.avg_risk)
        const width = Math.max(2, (item.avg_risk / max) * 100)
        return (
          <div key={item.channel} role="listitem">
            <div className="row between gap-3" style={{ marginBottom: 6 }}>
              <span className="small strong">{item.label}</span>
              <span className="tiny muted tabular">
                {formatNumber(item.count)} scans · avg{' '}
                <span className={`strong risk--${tone}`}>{item.avg_risk}</span>
              </span>
            </div>
            <div
              className="risk-bar__track"
              style={{ height: 12 }}
              role="img"
              aria-label={`${item.label}: average risk ${item.avg_risk} out of 100 across ${item.count} scans`}
            >
              <div
                className="risk-bar__fill"
                style={{ width: `${width}%`, background: TONE_VAR[tone] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
