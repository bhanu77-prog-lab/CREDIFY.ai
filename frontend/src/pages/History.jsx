import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../api/client'
import ReasonList from '../components/domain/ReasonList'
import ScanTable from '../components/domain/ScanTable'
import PageHeader from '../components/layout/PageHeader'
import Badge, { VerdictBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { IconChevronLeft, IconChevronRight, IconDownload, IconSearch, IconTrash } from '../components/ui/Icons'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { formatDateTime, formatNumber, riskTone } from '../utils/format'

const PAGE_SIZE = 15

export default function History() {
  const [filters, setFilters] = useState({
    q: '',
    verdict: '',
    channel: '',
    category: '',
    date_from: '',
    date_to: '',
  })
  const [sort, setSort] = useState({ by: 'created_at', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)
  const [selected, setSelected] = useState(null)
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    document.title = 'History · CREDIFY.ai'
    api.meta().then(setMeta).catch(() => setMeta(null))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.scans({
        page,
        page_size: PAGE_SIZE,
        sort_by: sort.by,
        sort_dir: sort.dir,
        ...filters,
      })
      setData(result)
    } catch (caught) {
      toast.error('Could not load history', caught?.message)
      setData({ items: [], total: 0, pages: 1 })
    } finally {
      setLoading(false)
    }
  }, [page, sort, filters, toast])

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

  const update = (patch) => {
    setPage(1)
    setFilters((current) => ({ ...current, ...patch }))
  }

  const onSort = (key) => {
    setSort((current) =>
      current.by === key ? { by: key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { by: key, dir: 'desc' },
    )
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const response = await api.exportScans(filters)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `credify-scans-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Export ready', 'Your CSV has been downloaded.')
    } catch (caught) {
      toast.error('Export failed', caught?.message)
    } finally {
      setExporting(false)
    }
  }

  const remove = async (scan) => {
    try {
      await api.deleteScan(scan.id)
      toast.success('Deleted', 'That scan has been removed from your history.')
      setSelected(null)
      load()
    } catch (caught) {
      toast.error('Could not delete', caught?.message)
    }
  }

  const activeFilters = Object.entries(filters).filter(([, value]) => value)

  return (
    <div className="page">
      <PageHeader
        eyebrow="History"
        title="Your scans"
        subtitle="Everything you have checked while signed in. Content is truncated to 2,000 characters before storage."
        actions={
          <Button
            variant="secondary"
            icon={<IconDownload size={17} />}
            onClick={exportCsv}
            loading={exporting}
            disabled={!data.total}
          >
            Export CSV
          </Button>
        }
      />

      <Card padded={false} style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ padding: 'var(--sp-4)' }}>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <div style={{ minWidth: 220, flex: 1, maxWidth: 320 }}>
              <Input
                icon={<IconSearch size={16} />}
                placeholder="Search message text…"
                value={filters.q}
                onChange={(event) => update({ q: event.target.value })}
                aria-label="Search your scans"
              />
            </div>

            <select
              className="select"
              style={{ width: 'auto', minWidth: 150 }}
              value={filters.verdict}
              onChange={(event) => update({ verdict: event.target.value })}
              aria-label="Filter by verdict"
            >
              <option value="">All verdicts</option>
              <option value="High Risk">High Risk</option>
              <option value="Suspicious">Suspicious</option>
              <option value="Safe">Safe</option>
            </select>

            <select
              className="select"
              style={{ width: 'auto', minWidth: 150 }}
              value={filters.channel}
              onChange={(event) => update({ channel: event.target.value })}
              aria-label="Filter by channel"
            >
              <option value="">All channels</option>
              {(meta?.channels || []).map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>

            <select
              className="select"
              style={{ width: 'auto', minWidth: 180 }}
              value={filters.category}
              onChange={(event) => update({ category: event.target.value })}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {(meta?.categories || []).map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={filters.date_from}
              onChange={(event) => update({ date_from: event.target.value })}
              aria-label="From date"
              containerClassName="nowrap"
            />
            <Input
              type="date"
              value={filters.date_to}
              onChange={(event) => update({ date_to: event.target.value })}
              aria-label="To date"
            />

            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({ q: '', verdict: '', channel: '', category: '', date_from: '', date_to: '' })
                }
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        <ScanTable
          scans={data.items}
          loading={loading}
          onRowClick={setSelected}
          sortBy={sort.by}
          sortDir={sort.dir}
          onSort={onSort}
          categoryLabels={categoryLabels}
          emptyTitle={activeFilters.length ? 'No scans match those filters' : 'No scans yet'}
          emptyText={
            activeFilters.length
              ? 'Try widening the date range or clearing a filter.'
              : 'Run a scan and it will appear here.'
          }
        />

        {data.total > 0 && (
          <div className="pagination">
            <span className="pagination__info">
              Showing {formatNumber((page - 1) * PAGE_SIZE + 1)}–
              {formatNumber(Math.min(page * PAGE_SIZE, data.total))} of {formatNumber(data.total)}
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
              <span className="small tabular">
                Page {page} of {data.pages}
              </span>
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
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Scan detail"
        wide
        footer={
          <>
            <Button
              variant="danger"
              icon={<IconTrash size={16} />}
              onClick={() => remove(selected)}
            >
              Delete scan
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          </>
        }
      >
        {selected && (
          <div className="stack gap-6">
            <div className="row gap-3 wrap">
              <VerdictBadge verdict={selected.verdict} size="lg" />
              <Badge tone="accent">{categoryLabels[selected.category] || selected.category}</Badge>
              <Badge tone="neutral">{selected.channel}</Badge>
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
          </div>
        )}
      </Modal>
    </div>
  )
}
