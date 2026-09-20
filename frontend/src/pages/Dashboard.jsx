import { useCallback, useEffect, useMemo, useState } from 'react'

import api, { ApiError } from '../api/client'
import AreaChart from '../components/charts/AreaChart'
import BarChart from '../components/charts/BarChart'
import DonutChart from '../components/charts/DonutChart'
import HeatBars from '../components/charts/HeatBars'
import ScanTable from '../components/domain/ScanTable'
import StatCard from '../components/domain/StatCard'
import ReasonList from '../components/domain/ReasonList'
import PageHeader from '../components/layout/PageHeader'
import Badge, { VerdictBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardBody, CardHead } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { IconAlert, IconRefresh, IconSearch } from '../components/ui/Icons'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Skeleton, { SkeletonRows } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import {
  formatDateTime,
  formatNumber,
  formatRupees,
  riskTone,
  timeAgo,
} from '../utils/format'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

const SEVERITY_TONE = { high: 'danger', medium: 'warn', low: 'neutral' }
const SEVERITY_COLOR = { high: 'var(--danger)', medium: 'var(--warn)', low: 'var(--text-muted)' }

const INDICATOR_LABEL = {
  domain: 'Website',
  upi: 'UPI ID',
  phone: 'Phone',
  keyword: 'Phrase',
}

export default function Dashboard() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const { isAnalyst, isAuthenticated, loading: authLoading } = useAuth()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, timeseries, categories, channels, threats, alerts, geography, meta] =
        await Promise.all([
          api.summary(days),
          api.timeseries(days),
          api.categories(days),
          api.channels(days),
          api.topThreats(8),
          api.alerts(),
          api.geography(),
          api.meta(),
        ])
      setData({ summary, timeseries, categories, channels, threats, alerts, geography, meta })
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.offline
          ? 'Cannot reach the CREDIFY.ai server. Start the backend on port 8000 and refresh.'
          : caught?.message || 'Could not load the dashboard.',
      )
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    document.title = 'Dashboard · CREDIFY.ai'
    load()
  }, [load])

  // The recent-scans table shows the signed-in user's own scans.
  const [scans, setScans] = useState([])
  const [scansLoading, setScansLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Requesting this while signed out would 401 and log a console error, so
    // wait for the session check and skip the call entirely when anonymous.
    if (authLoading) return () => {}
    if (!isAuthenticated) {
      setScans([])
      setScansLoading(false)
      return () => {}
    }
    setScansLoading(true)
    api
      .scans({ page_size: 25 })
      .then((page) => {
        if (!cancelled) setScans(page.items || [])
      })
      .catch(() => {
        if (!cancelled) setScans([])
      })
      .finally(() => {
        if (!cancelled) setScansLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, authLoading])

  const categoryLabels = useMemo(() => {
    const map = {}
    ;(data?.meta?.categories || []).forEach((item) => {
      map[item.value] = item.label
    })
    return map
  }, [data])

  const filteredScans = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return scans.filter((scan) => {
      if (verdictFilter !== 'all' && scan.verdict !== verdictFilter) return false
      if (channelFilter !== 'all' && scan.channel !== channelFilter) return false
      if (needle && !scan.content.toLowerCase().includes(needle)) return false
      return true
    })
  }, [scans, search, verdictFilter, channelFilter])

  if (error) {
    return (
      <div className="page">
        <PageHeader eyebrow="Dashboard" title="Fraud overview" />
        <Card>
          <EmptyState
            icon={<IconAlert size={22} />}
            title="Dashboard unavailable"
            text={error}
            action={
              <Button variant="primary" icon={<IconRefresh size={17} />} onClick={load}>
                Try again
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const summary = data?.summary
  const pct = summary?.pct_change_vs_prev_period || {}
  const sparks = summary?.sparklines || {}

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title="Fraud overview"
        subtitle="Everything CREDIFY.ai has analysed, across all channels. Figures update as new scans come in."
        actions={
          <>
            <div className="tabs" role="group" aria-label="Date range">
              {RANGES.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  className="tab"
                  aria-pressed={days === range.value}
                  onClick={() => setDays(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              icon={<IconRefresh size={17} />}
              onClick={load}
              loading={loading}
              aria-label="Refresh dashboard"
            />
          </>
        }
      />

      {/* ------------------------------------------------------------- KPIs */}
      <div className="kpi-grid">
        <StatCard
          label="Total scans"
          value={loading ? '—' : formatNumber(summary.total_scans)}
          delta={pct.total_scans || 0}
          spark={sparks.total_scans}
          higherIsBetter
          loading={loading}
        />
        <StatCard
          label="High-risk detected"
          value={loading ? '—' : formatNumber(summary.high_risk_count)}
          delta={pct.high_risk_count || 0}
          spark={sparks.high_risk_count}
          accent="var(--danger)"
          loading={loading}
        />
        <StatCard
          label="Threats blocked"
          value={loading ? '—' : formatNumber(summary.threats_blocked)}
          delta={pct.threats_blocked || 0}
          spark={sparks.threats_blocked}
          higherIsBetter
          accent="var(--accent)"
          loading={loading}
        />
        <StatCard
          label="Estimated money protected"
          value={loading ? '—' : formatRupees(summary.estimated_money_protected)}
          delta={pct.estimated_money_protected || 0}
          spark={sparks.estimated_money_protected}
          higherIsBetter
          accent="var(--safe)"
          loading={loading}
        />
      </div>

      <div className="dash-grid">
        {/* --------------------------------------------------- time series */}
        <Card className="col-8" padded={false}>
          <CardHead
            title="Scans over time"
            subtitle={`Daily breakdown by verdict, last ${days} days`}
            actions={
              <div className="row gap-3 tiny muted">
                <span className="row gap-1">
                  <span className="legend__swatch" style={{ background: 'var(--danger)' }} /> High risk
                </span>
                <span className="row gap-1">
                  <span className="legend__swatch" style={{ background: 'var(--warn)' }} /> Suspicious
                </span>
                <span className="row gap-1">
                  <span className="legend__swatch" style={{ background: 'var(--safe)' }} /> Safe
                </span>
              </div>
            }
          />
          <CardBody>
            {loading ? <Skeleton height={260} /> : <AreaChart data={data.timeseries} />}
          </CardBody>
        </Card>

        {/* ------------------------------------------------------- alerts */}
        <Card className="col-4" padded={false}>
          <CardHead title="Live alerts" subtitle="Trending scam advisories" />
          <CardBody>
            {loading ? (
              <SkeletonRows rows={3} height={64} />
            ) : data.alerts.length ? (
              data.alerts.slice(0, 3).map((alert) => (
                <div className="alert-item" key={alert.id}>
                  <span
                    className="alert-item__bar"
                    style={{ background: SEVERITY_COLOR[alert.severity] }}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
                      <Badge tone={SEVERITY_TONE[alert.severity]} dot>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="alert-item__title">{alert.title}</p>
                    <p className="alert-item__body">{alert.body}</p>
                    <p className="alert-item__time">{timeAgo(alert.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No active advisories" text="New alerts appear here as trends emerge." />
            )}
          </CardBody>
        </Card>

        {/* --------------------------------------------------- categories */}
        <Card className="col-7" padded={false}>
          <CardHead title="Scam categories" subtitle="Share of everything flagged in this period" />
          <CardBody>
            {loading ? <Skeleton height={220} /> : <DonutChart data={data.categories} />}
          </CardBody>
        </Card>

        {/* ----------------------------------------------------- channels */}
        <Card className="col-5" padded={false}>
          <CardHead title="Risk by channel" subtitle="Average risk score out of 100" />
          <CardBody>
            {loading ? <SkeletonRows rows={5} height={38} /> : <BarChart data={data.channels} />}
          </CardBody>
        </Card>

        {/* ------------------------------------------------- top indicators */}
        <Card className="col-7" padded={false}>
          <CardHead
            title="Top flagged indicators"
            subtitle="Websites, payment addresses and numbers reported most often"
            actions={
              <Button as="link" to="/intel" variant="ghost" size="sm">
                View full blocklist
              </Button>
            }
          />
          {loading ? (
            <CardBody>
              <SkeletonRows rows={6} />
            </CardBody>
          ) : (
            <div className="table-wrap">
              <table className="table" style={{ minWidth: 460 }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Indicator</th>
                    <th>Reports</th>
                    <th>Risk</th>
                    {isAnalyst && <th aria-label="Actions" />}
                  </tr>
                </thead>
                <tbody>
                  {data.threats.map((threat) => (
                    <tr key={`${threat.type}-${threat.value}`}>
                      <td>
                        <Badge tone="neutral">{INDICATOR_LABEL[threat.type] || threat.type}</Badge>
                      </td>
                      <td>
                        <span className="mono truncate" title={threat.value}>
                          {threat.value}
                        </span>
                      </td>
                      <td className="tabular">{formatNumber(threat.count)}</td>
                      <td>
                        <Badge tone={SEVERITY_TONE[threat.risk_level] || 'neutral'} dot>
                          {threat.risk_level}
                        </Badge>
                      </td>
                      {isAnalyst && (
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await api.addIntel({
                                  indicator_type: threat.type,
                                  indicator_value: threat.value,
                                  risk_level: 'high',
                                })
                                toast.success('Blocked', `${threat.value} is now marked high risk.`)
                                load()
                              } catch (caught) {
                                toast.error('Could not block', caught?.message)
                              }
                            }}
                          >
                            Block
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ---------------------------------------------------- geography */}
        <Card className="col-5" padded={false}>
          <CardHead
            title="Reports by state"
            subtitle="Top 10 by volume"
            actions={<Badge tone="neutral">Sample data</Badge>}
          />
          <CardBody>
            {loading ? (
              <SkeletonRows rows={8} height={24} />
            ) : (
              <>
                <HeatBars data={data.geography} />
                <p className="tiny muted" style={{ marginTop: 'var(--sp-3)' }}>
                  Regional figures are illustrative sample data, included to show how the view would
                  look once location is captured. Every other number on this page is real.
                </p>
              </>
            )}
          </CardBody>
        </Card>

        {/* -------------------------------------------------- recent scans */}
        <Card className="col-12" padded={false}>
          <CardHead
            title="Recent scans"
            subtitle="Click any row to see the full reasoning"
            actions={
              <Button as="link" to="/history" variant="ghost" size="sm">
                Open full history
              </Button>
            }
          />

          <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <div style={{ minWidth: 220, flex: 1, maxWidth: 340 }}>
                <Input
                  icon={<IconSearch size={16} />}
                  placeholder="Search message text…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search recent scans"
                />
              </div>
              <div className="filter-group">
                <span className="filter-group__label">Verdict</span>
                {['all', 'High Risk', 'Suspicious', 'Safe'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="chip"
                    aria-pressed={verdictFilter === value}
                    onClick={() => setVerdictFilter(value)}
                  >
                    {value === 'all' ? 'All' : value}
                  </button>
                ))}
              </div>
              <div className="filter-group">
                <span className="filter-group__label">Channel</span>
                {['all', 'message', 'call', 'email', 'url', 'upi'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="chip"
                    aria-pressed={channelFilter === value}
                    onClick={() => setChannelFilter(value)}
                  >
                    {value === 'all' ? 'All' : value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ScanTable
            scans={filteredScans}
            loading={scansLoading}
            onRowClick={setSelected}
            categoryLabels={categoryLabels}
            emptyTitle={scans.length ? 'No scans match these filters' : 'Sign in to see your scans here'}
            emptyText={
              scans.length
                ? 'Try clearing a filter or widening your search.'
                : 'Scans you run while signed in appear in this table and in your history.'
            }
          />
        </Card>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Scan detail"
        wide
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="stack gap-6">
            <div className="row gap-3 wrap">
              <VerdictBadge verdict={selected.verdict} size="lg" />
              <Badge tone="accent">{categoryLabels[selected.category] || selected.category}</Badge>
              <Badge tone="neutral">{selected.channel}</Badge>
              <Badge tone="neutral">{Math.round(selected.confidence * 100)}% confidence</Badge>
              <span className={`strong risk--${riskTone(selected.risk_score)}`}>
                {selected.risk_score}/100
              </span>
            </div>

            <div>
              <p className="tiny muted" style={{ marginBottom: 'var(--sp-2)' }}>
                Analysed {formatDateTime(selected.created_at)}
              </p>
              <Card tight>
                <p className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selected.content}
                </p>
              </Card>
            </div>

            <div>
              <h4 style={{ fontSize: 'var(--fs-16)', marginBottom: 'var(--sp-3)' }}>
                Why it was flagged
              </h4>
              <ReasonList reasons={selected.reasons || []} />
            </div>

            {selected.entities && hasAnyEntity(selected.entities) && (
              <div>
                <h4 style={{ fontSize: 'var(--fs-16)', marginBottom: 'var(--sp-3)' }}>
                  Extracted details
                </h4>
                <div className="row gap-2 wrap">
                  {[
                    ...(selected.entities.urls || []),
                    ...(selected.entities.upi_ids || []),
                    ...(selected.entities.phones || []),
                    ...(selected.entities.amounts || []),
                  ].map((value) => (
                    <span className="token-chip" key={value}>
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function hasAnyEntity(entities) {
  return ['urls', 'upi_ids', 'phones', 'amounts'].some((key) => (entities[key] || []).length > 0)
}
