import Badge, { VerdictBadge } from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import { SkeletonRows } from '../ui/Skeleton'
import { IconSearch } from '../ui/Icons'
import { formatDateTime, riskTone, truncate } from '../../utils/format'

const CHANNEL_LABEL = {
  message: 'SMS',
  call: 'Call',
  email: 'Email',
  url: 'Link',
  upi: 'UPI',
}

export default function ScanTable({
  scans = [],
  loading = false,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
  categoryLabels = {},
  emptyTitle = 'No scans yet',
  emptyText = 'Scans you run will appear here.',
}) {
  if (loading) {
    return (
      <div style={{ padding: 'var(--sp-4)' }}>
        <SkeletonRows rows={6} />
      </div>
    )
  }

  if (!scans.length) {
    return <EmptyState icon={<IconSearch size={22} />} title={emptyTitle} text={emptyText} />
  }

  const header = (key, label) => {
    if (!onSort) return <th key={key}>{label}</th>
    const active = sortBy === key
    return (
      <th key={key} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="table__sort" onClick={() => onSort(key)}>
          {label}
          <span aria-hidden="true" style={{ opacity: active ? 1 : 0.3 }}>
            {active && sortDir === 'asc' ? '▲' : '▼'}
          </span>
        </button>
      </th>
    )
  }

  return (
    <div className="table-wrap">
      <table className={`table ${onRowClick ? 'table--clickable' : ''}`.trim()}>
        <thead>
          <tr>
            {header('created_at', 'Time')}
            {header('channel', 'Channel')}
            <th>Message</th>
            {header('category', 'Category')}
            {header('risk_score', 'Risk')}
            {header('verdict', 'Verdict')}
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => {
            const tone = riskTone(scan.risk_score)
            return (
              <tr
                key={scan.id}
                onClick={onRowClick ? () => onRowClick(scan) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(scan)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={
                  onRowClick
                    ? `Open scan from ${formatDateTime(scan.created_at)}, verdict ${scan.verdict}`
                    : undefined
                }
              >
                <td className="nowrap small muted">{formatDateTime(scan.created_at)}</td>
                <td>
                  <Badge tone="neutral">{CHANNEL_LABEL[scan.channel] || scan.channel}</Badge>
                </td>
                <td>
                  <span className="truncate" title={scan.content}>
                    {truncate(scan.content, 72)}
                  </span>
                </td>
                <td className="small nowrap">
                  {categoryLabels[scan.category] || scan.category.replace(/_/g, ' ')}
                </td>
                <td>
                  <div className="risk-bar">
                    <div className="risk-bar__track">
                      <div
                        className={`risk-bar__fill bg-${tone}`}
                        style={{ width: `${Math.max(3, scan.risk_score)}%` }}
                      />
                    </div>
                    <span className={`risk-bar__value risk--${tone}`}>{scan.risk_score}</span>
                  </div>
                </td>
                <td>
                  <VerdictBadge verdict={scan.verdict} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { CHANNEL_LABEL }
