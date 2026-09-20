import { useCallback, useEffect, useState } from 'react'

import api from '../api/client'
import PageHeader from '../components/layout/PageHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardBody, CardHead } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import {
  IconAlert,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
  IconSearch,
} from '../components/ui/Icons'
import Input from '../components/ui/Input'
import { SkeletonRows } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatNumber } from '../utils/format'

const PAGE_SIZE = 20

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'domain', label: 'Websites' },
  { value: 'upi', label: 'UPI IDs' },
  { value: 'phone', label: 'Phone numbers' },
  { value: 'keyword', label: 'Phrases' },
]

const TYPE_LABEL = { domain: 'Website', upi: 'UPI ID', phone: 'Phone', keyword: 'Phrase' }
const RISK_TONE = { high: 'danger', medium: 'warn', low: 'neutral' }

export default function ThreatIntel() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [q, setQ] = useState('')

  const [lookupValue, setLookupValue] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)

  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState('domain')
  const [adding, setAdding] = useState(false)

  const { isAnalyst } = useAuth()
  const toast = useToast()

  useEffect(() => {
    document.title = 'Threat Intel · CREDIFY.ai'
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.intel({
        page,
        page_size: PAGE_SIZE,
        indicator_type: type || undefined,
        q: q || undefined,
      })
      setData(result)
    } catch (caught) {
      toast.error('Could not load the blocklist', caught?.message)
    } finally {
      setLoading(false)
    }
  }, [page, type, q, toast])

  useEffect(() => {
    const timer = window.setTimeout(load, q ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [load, q])

  const lookup = async (event) => {
    event.preventDefault()
    const value = lookupValue.trim()
    if (!value) return
    setLookingUp(true)
    try {
      setLookupResult(await api.intelLookup(value))
    } catch (caught) {
      toast.error('Lookup failed', caught?.message)
    } finally {
      setLookingUp(false)
    }
  }

  const add = async (event) => {
    event.preventDefault()
    const value = newValue.trim()
    if (!value) return
    setAdding(true)
    try {
      await api.addIntel({ indicator_type: newType, indicator_value: value, risk_level: 'high' })
      toast.success('Added to blocklist', `${value} is now flagged for everyone.`)
      setNewValue('')
      setPage(1)
      load()
    } catch (caught) {
      toast.error('Could not add', caught?.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Threat intel"
        title="Shared blocklist"
        subtitle="Websites, UPI IDs, phone numbers and phrases reported through CREDIFY.ai. Every high-risk scan and verified community report adds to it automatically."
      />

      <div className="scanner-grid">
        <Card padded={false}>
          <CardHead
            title="Reported indicators"
            subtitle={loading ? 'Loading…' : `${formatNumber(data.total)} entries`}
          />

          <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              <div style={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
                <Input
                  icon={<IconSearch size={16} />}
                  placeholder="Search the blocklist…"
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value)
                    setPage(1)
                  }}
                  aria-label="Search indicators"
                />
              </div>
              <div className="filter-group">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="chip"
                    aria-pressed={type === item.value}
                    onClick={() => {
                      setType(item.value)
                      setPage(1)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <CardBody>
              <SkeletonRows rows={8} />
            </CardBody>
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={<IconDatabase size={22} />}
              title="Nothing matches"
              text="Try a different search term or clear the type filter."
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Indicator</th>
                      <th>Reports</th>
                      <th>Risk</th>
                      <th>Source</th>
                      <th>Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Badge tone="neutral">{TYPE_LABEL[item.indicator_type]}</Badge>
                        </td>
                        <td>
                          <span className="mono truncate" title={item.indicator_value}>
                            {item.indicator_value}
                          </span>
                        </td>
                        <td className="tabular">{formatNumber(item.report_count)}</td>
                        <td>
                          <Badge tone={RISK_TONE[item.risk_level] || 'neutral'} dot>
                            {item.risk_level}
                          </Badge>
                        </td>
                        <td className="small muted">{item.source}</td>
                        <td className="small muted nowrap">{formatDate(item.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.pages > 1 && (
                <div className="pagination">
                  <span className="pagination__info">
                    Page {page} of {data.pages} · {formatNumber(data.total)} entries
                  </span>
                  <div className="pagination__controls">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconChevronLeft size={16} />}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconChevronRight size={16} />}
                      onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                      disabled={page >= data.pages}
                      aria-label="Next page"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        <div className="stack gap-4">
          <Card padded={false}>
            <CardHead
              title="Check one thing"
              subtitle="Paste a website, UPI ID or phone number to see if it has been reported."
            />
            <CardBody>
              <form onSubmit={lookup} className="stack gap-3">
                <Input
                  placeholder="example.info, name@okaxis or 9812345601"
                  value={lookupValue}
                  onChange={(event) => setLookupValue(event.target.value)}
                  aria-label="Value to look up"
                />
                <Button type="submit" variant="primary" fullWidth loading={lookingUp}>
                  Check the blocklist
                </Button>
              </form>

              {lookupResult && (
                <div
                  className="reason"
                  style={{
                    marginTop: 'var(--sp-4)',
                    background: lookupResult.known_bad ? 'var(--danger-bg)' : 'var(--safe-bg)',
                    borderColor: lookupResult.known_bad
                      ? 'color-mix(in srgb, var(--danger) 28%, transparent)'
                      : 'color-mix(in srgb, var(--safe) 28%, transparent)',
                  }}
                >
                  <span className={lookupResult.known_bad ? 'risk--danger' : 'risk--safe'}>
                    {lookupResult.known_bad ? <IconAlert size={18} /> : <IconCheck size={18} />}
                  </span>
                  <div>
                    <p className="reason__text">{lookupResult.message}</p>
                    <p className="reason__meta">
                      Recognised as a {TYPE_LABEL[lookupResult.detected_type]?.toLowerCase()}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {isAnalyst ? (
            <Card padded={false}>
              <CardHead title="Add an indicator" subtitle="Analyst and admin accounts only." />
              <CardBody>
                <form onSubmit={add} className="stack gap-3">
                  <div className="field">
                    <label className="field__label" htmlFor="intel-type">
                      Type
                    </label>
                    <select
                      id="intel-type"
                      className="select"
                      value={newType}
                      onChange={(event) => setNewType(event.target.value)}
                    >
                      <option value="domain">Website</option>
                      <option value="upi">UPI ID</option>
                      <option value="phone">Phone number</option>
                      <option value="keyword">Phrase</option>
                    </select>
                  </div>
                  <Input
                    label="Value"
                    placeholder="fake-bank-verify.info"
                    value={newValue}
                    onChange={(event) => setNewValue(event.target.value)}
                  />
                  <Button type="submit" variant="primary" fullWidth loading={adding}>
                    Add to blocklist
                  </Button>
                </form>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <p className="strong small">Adding indicators</p>
              <p className="small muted" style={{ marginTop: 4 }}>
                Analysts and admins can add entries directly. Everyone else contributes by reporting
                scams on the Community page — verified reports are added automatically.
              </p>
              <Button
                as="link"
                to="/community"
                variant="secondary"
                fullWidth
                style={{ marginTop: 'var(--sp-3)' }}
              >
                Report a scam
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
