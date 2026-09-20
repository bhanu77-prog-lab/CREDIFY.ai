const VERDICT_TONE = {
  Safe: 'safe',
  Suspicious: 'warn',
  'High Risk': 'danger',
}

export default function Badge({ children, tone = 'neutral', dot = false, size, className = '' }) {
  const classes = ['badge', `badge--${tone}`, size === 'lg' && 'badge--lg', className]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={classes}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export function VerdictBadge({ verdict, size }) {
  return (
    <Badge tone={VERDICT_TONE[verdict] || 'neutral'} dot size={size}>
      {verdict}
    </Badge>
  )
}

export { VERDICT_TONE }
