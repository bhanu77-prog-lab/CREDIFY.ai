import Card from '../ui/Card'
import Sparkline from '../charts/Sparkline'
import Skeleton from '../ui/Skeleton'
import { IconArrowDown, IconArrowUp } from '../ui/Icons'
import { formatPercent } from '../../utils/format'

/**
 * KPI tile.
 *
 * `higherIsBetter` matters: a rise in "money protected" is good news and shows
 * green, while a rise in "high-risk detected" is bad news and shows red. Using
 * one arrow colour for both would mislead at a glance.
 */
export default function StatCard({
  label,
  value,
  delta,
  spark = [],
  higherIsBetter = false,
  loading = false,
  accent = 'var(--accent)',
}) {
  if (loading) {
    return (
      <Card className="stat">
        <Skeleton width="55%" height={13} />
        <Skeleton width="70%" height={34} />
        <div className="stat__foot">
          <Skeleton width={60} height={13} />
          <Skeleton width={96} height={32} />
        </div>
      </Card>
    )
  }

  const rising = delta > 0.05
  const falling = delta < -0.05
  const good = rising ? higherIsBetter : falling ? !higherIsBetter : null

  const deltaClass =
    good === null ? 'delta--flat' : good ? 'delta--down' : 'delta--up'

  return (
    <Card className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      <div className="stat__foot">
        <span className={`delta ${deltaClass}`}>
          {rising ? <IconArrowUp size={13} /> : falling ? <IconArrowDown size={13} /> : null}
          {formatPercent(delta)}
          <span className="muted" style={{ fontWeight: 500, marginLeft: 2 }}>
            vs prev
          </span>
        </span>
        <Sparkline data={spark} color={accent} />
      </div>
    </Card>
  )
}
