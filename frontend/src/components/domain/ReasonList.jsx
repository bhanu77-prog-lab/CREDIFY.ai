const DOT = {
  high: 'var(--danger)',
  medium: 'var(--warn)',
  low: 'var(--text-muted)',
}

const SEVERITY_WORD = {
  high: 'Strong warning sign',
  medium: 'Worth noticing',
  low: 'Minor note',
}

/**
 * The "why we flagged this" list. Every string here comes from the backend
 * already written in plain language - this component only ranks and presents it.
 */
export default function ReasonList({ reasons = [], limit }) {
  const items = limit ? reasons.slice(0, limit) : reasons

  if (!items.length) {
    return <p className="muted small">No specific warning signs were found.</p>
  }

  return (
    <ul className="reason-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((reason, index) => (
        <li className="reason" key={`${reason.reason.slice(0, 24)}-${index}`}>
          <span
            className="reason__dot"
            style={{ background: DOT[reason.severity] || DOT.low }}
            aria-hidden="true"
          />
          <div>
            <p className="reason__text">{reason.reason}</p>
            <p className="reason__meta">
              {SEVERITY_WORD[reason.severity] || 'Note'}
              {reason.engine ? ` · detected by the ${engineName(reason.engine)} check` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function engineName(engine) {
  switch (engine) {
    case 'rules':
      return 'wording'
    case 'url':
      return 'link'
    case 'upi':
      return 'payment'
    case 'email':
      return 'sender'
    case 'call':
      return 'call-script'
    case 'intel':
      return 'community reports'
    default:
      return 'overall'
  }
}
