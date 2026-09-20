import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../api/client'
import ChannelTabs from '../components/domain/ChannelTabs'
import PageHeader from '../components/layout/PageHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardBody, CardHead } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { IconChevronLeft, IconChevronRight, IconFlag, IconUsers } from '../components/ui/Icons'
import { SkeletonRows } from '../components/ui/Skeleton'
import Textarea from '../components/ui/Textarea'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils/format'

const PAGE_SIZE = 9

export default function Community() {
  const [reports, setReports] = useState({ items: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [meta, setMeta] = useState(null)

  const [channel, setChannel] = useState('message')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { isAnalyst } = useAuth()
  const toast = useToast()

  useEffect(() => {
    document.title = 'Community · CREDIFY.ai'
    api.meta().then(setMeta).catch(() => setMeta(null))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.reports({
        page,
        page_size: PAGE_SIZE,
        category: category || undefined,
        status: isAnalyst ? 'all' : 'verified',
      })
      setReports(data)
    } catch (caught) {
      toast.error('Could not load reports', caught?.message)
    } finally {
      setLoading(false)
    }
  }, [page, category, isAnalyst, toast])

  useEffect(() => {
    load()
  }, [load])

  const categoryLabels = useMemo(() => {
    const map = {}
    ;(meta?.categories || []).forEach((item) => {
      map[item.value] = item.label
    })
    return map
  }, [meta])

  const submit = async (event) => {
    event.preventDefault()
    const text = content.trim()
    if (text.length < 5) {
      toast.warn('Add a bit more', 'Please paste at least a few words of the scam message.')
      return
    }
    setSubmitting(true)
    try {
      const report = await api.submitReport({ channel, content: text, claimed_category: 'safe_none' })
      toast.success(
        report.status === 'verified' ? 'Report published' : 'Report received',
        report.status === 'verified'
          ? 'We confirmed it as a scam and it is now visible to everyone.'
          : 'An analyst will review it shortly. Thank you for helping.',
      )
      setContent('')
      setPage(1)
      load()
    } catch (caught) {
      toast.error('Could not submit', caught?.message)
    } finally {
      setSubmitting(false)
    }
  }

  const review = async (report, status) => {
    try {
      await api.reviewReport(report.id, status)
      toast.success('Updated', `Report marked as ${status}.`)
      load()
    } catch (caught) {
      toast.error('Could not update', caught?.message)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Community"
        title="Scams people reported this week"
        subtitle="Every verified report also feeds the shared blocklist, so the next person who pastes the same link or UPI ID is warned immediately."
      />

      <div className="scanner-grid">
        <div className="stack gap-4">
          <div className="filter-bar">
            <span className="filter-group__label">Filter</span>
            <button
              type="button"
              className="chip"
              aria-pressed={category === ''}
              onClick={() => {
                setCategory('')
                setPage(1)
              }}
            >
              All types
            </button>
            {(meta?.categories || [])
              .filter((item) => item.value !== 'safe_none')
              .map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="chip"
                  aria-pressed={category === item.value}
                  onClick={() => {
                    setCategory(item.value)
                    setPage(1)
                  }}
                >
                  {item.label}
                </button>
              ))}
          </div>

          {loading ? (
            <SkeletonRows rows={5} height={110} />
          ) : reports.items.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconUsers size={22} />}
                title="No reports here yet"
                text="Be the first to report a scam in this category — it takes a few seconds and helps everyone."
              />
            </Card>
          ) : (
            <div className="stack gap-3">
              {reports.items.map((report) => (
                <Card key={report.id} hover>
                  <div className="row between gap-3 wrap" style={{ marginBottom: 'var(--sp-3)' }}>
                    <div className="row gap-2 wrap">
                      <Badge tone="danger" dot>
                        {categoryLabels[report.claimed_category] || report.claimed_category}
                      </Badge>
                      <Badge tone="neutral">{report.channel}</Badge>
                      {report.status !== 'verified' && (
                        <Badge tone="warn">{report.status}</Badge>
                      )}
                    </div>
                    <span className="tiny muted">{timeAgo(report.created_at)}</span>
                  </div>

                  <p className="small" style={{ wordBreak: 'break-word' }}>
                    {report.content}
                  </p>

                  {isAnalyst && report.status === 'pending' && (
                    <div className="row gap-2" style={{ marginTop: 'var(--sp-4)' }}>
                      <Button variant="success" size="sm" onClick={() => review(report, 'verified')}>
                        Verify
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => review(report, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {reports.pages > 1 && (
            <div className="row center gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<IconChevronLeft size={16} />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              />
              <span className="small tabular">
                Page {page} of {reports.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconChevronRight size={16} />}
                onClick={() => setPage((p) => Math.min(reports.pages, p + 1))}
                disabled={page >= reports.pages}
                aria-label="Next page"
              />
            </div>
          )}
        </div>

        <div className="stack gap-4">
          <Card padded={false} as="section">
            <CardHead
              title="Report a scam you received"
              subtitle="We analyse it first, so obvious scams appear in the feed straight away."
            />
            <CardBody>
              <form onSubmit={submit} className="stack gap-4">
                <div>
                  <p className="field__label" style={{ marginBottom: 'var(--sp-2)' }}>
                    How did it reach you?
                  </p>
                  <ChannelTabs value={channel} onChange={setChannel} />
                </div>

                <Textarea
                  label="What did it say?"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={5000}
                  placeholder="Paste the message, or describe what the caller said…"
                  hint="Please remove your own name, account number or any personal details first."
                  style={{ minHeight: 150 }}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  icon={<IconFlag size={17} />}
                >
                  Submit report
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <p className="strong small">Why reporting helps</p>
            <p className="small muted" style={{ marginTop: 4 }}>
              A scam website or UPI ID is usually used against hundreds of people in a few days.
              Reporting it here blocks it for everyone else who checks it. For money you have already
              lost, report at cybercrime.gov.in or call 1930 — this feed is not a substitute for
              that.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
