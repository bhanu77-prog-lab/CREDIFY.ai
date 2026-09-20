import { formatNumber } from '../../utils/format'

/**
 * Ranked horizontal "heat bars" - used for report volume by state. Intensity is
 * carried by bar length rather than colour, so it stays readable for anyone with
 * colour vision deficiency and in both themes.
 */
export default function HeatBars({ data = [], valueKey = 'count', labelKey = 'state' }) {
  if (!data.length) return <p className="muted small">No regional data available.</p>

  const max = Math.max(...data.map((item) => item[valueKey]), 1)

  return (
    <div role="list">
      {data.map((item) => (
        <div className="heat-row" key={item[labelKey]} role="listitem">
          <span className="truncate" title={item[labelKey]}>
            {item[labelKey]}
          </span>
          <div
            className="heat-row__track"
            role="img"
            aria-label={`${item[labelKey]}: ${item[valueKey]} reports`}
          >
            <div
              className="heat-row__fill"
              style={{ width: `${Math.max(3, (item[valueKey] / max) * 100)}%` }}
            />
          </div>
          <span className="heat-row__value">{formatNumber(item[valueKey])}</span>
        </div>
      ))}
    </div>
  )
}
