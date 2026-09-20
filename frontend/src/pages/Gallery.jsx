import { useState } from 'react'

import AreaChart from '../components/charts/AreaChart'
import BarChart from '../components/charts/BarChart'
import DonutChart from '../components/charts/DonutChart'
import GaugeMeter from '../components/charts/GaugeMeter'
import HeatBars from '../components/charts/HeatBars'
import Sparkline from '../components/charts/Sparkline'
import ActionPlaybook from '../components/domain/ActionPlaybook'
import ReasonList from '../components/domain/ReasonList'
import ScanTable from '../components/domain/ScanTable'
import StatCard from '../components/domain/StatCard'
import Badge, { VerdictBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card, { CardBody, CardHead } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { IconDownload, IconSearch, IconShield } from '../components/ui/Icons'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Skeleton, { SkeletonRows, SkeletonText } from '../components/ui/Skeleton'
import Tabs from '../components/ui/Tabs'
import Textarea from '../components/ui/Textarea'
import { useToast } from '../components/ui/Toast'
import { useTheme } from '../context/ThemeContext'

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'success']
const SIZES = ['sm', 'md', 'lg']

const TIMESERIES = Array.from({ length: 14 }, (_, i) => {
  const safe = 6 + Math.round(4 * Math.sin(i / 2))
  const suspicious = 3 + (i % 3)
  const high = 8 + Math.round(6 * Math.sin(i / 3 + 1)) + i
  return {
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
    safe,
    suspicious,
    high_risk: high,
    total: safe + suspicious + high,
  }
})

const CATEGORIES = [
  { category: 'kyc_bank', label: 'Fake KYC / Bank Alert', count: 84, pct: 31.2 },
  { category: 'job_investment', label: 'Fake Job / Investment Scam', count: 62, pct: 23.0 },
  { category: 'upi_collect', label: 'UPI Collect-Request Fraud', count: 44, pct: 16.4 },
  { category: 'digital_arrest', label: 'Digital Arrest', count: 38, pct: 14.1 },
  { category: 'lottery_prize', label: 'Lottery & Prize Scam', count: 24, pct: 8.9 },
  { category: 'delivery_parcel', label: 'Parcel & Customs Scam', count: 17, pct: 6.4 },
]

const CHANNELS = [
  { channel: 'message', label: 'SMS / WhatsApp', count: 224, avg_risk: 61 },
  { channel: 'call', label: 'Call transcript', count: 52, avg_risk: 74 },
  { channel: 'email', label: 'Email', count: 27, avg_risk: 76 },
  { channel: 'upi', label: 'UPI / Payment', count: 41, avg_risk: 60 },
  { channel: 'url', label: 'Link', count: 56, avg_risk: 42 },
]

const SCANS = [
  {
    id: '1',
    created_at: new Date().toISOString(),
    channel: 'message',
    content: 'Dear Customer, your SBI account will be blocked within 2 hours due to incomplete KYC.',
    category: 'kyc_bank',
    risk_score: 92,
    verdict: 'High Risk',
  },
  {
    id: '2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    channel: 'url',
    content: 'http://offers-today.xyz/win',
    category: 'otp_phishing',
    risk_score: 48,
    verdict: 'Suspicious',
  },
  {
    id: '3',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    channel: 'message',
    content: 'Your OTP for login is 738291. Do not share this OTP with anyone.',
    category: 'safe_none',
    risk_score: 4,
    verdict: 'Safe',
  },
]

const REASONS = [
  {
    reason:
      'Someone is asking you for a secret code (OTP, PIN, CVV or password). No real bank, wallet or company will ever ask for these.',
    severity: 'high',
    weight: 30,
    engine: 'rules',
  },
  {
    reason:
      'The message creates panic with a deadline, such as an account being blocked within hours.',
    severity: 'medium',
    weight: 12,
    engine: 'rules',
  },
  {
    reason: 'The message contains a link. Check the address carefully before opening it.',
    severity: 'low',
    weight: 5,
    engine: 'rules',
  },
]

const PLAYBOOK = {
  do: [
    'Stop and do not respond, click, call back or pay anything.',
    "Open your bank's own app and check whether any action is genuinely pending.",
  ],
  dont: [
    'Do not open the link in the message, even to just check.',
    'Do not enter your card number, CVV, PIN or OTP on any page you reached from a message.',
  ],
  report_to: 'cybercrime.gov.in / 1930',
}

function Section({ title, note, children }) {
  return (
    <section style={{ marginBottom: 'var(--sp-12)' }}>
      <h2 style={{ fontSize: 'var(--fs-20)', marginBottom: 'var(--sp-2)' }}>{title}</h2>
      {note && (
        <p className="muted small" style={{ marginBottom: 'var(--sp-4)' }}>
          {note}
        </p>
      )}
      <Card>{children}</Card>
    </section>
  )
}

/**
 * Internal component gallery at /gallery.
 *
 * Every primitive is rendered here in every variant and state so the design
 * system can be reviewed in both themes at once, rather than hunting for a
 * disabled danger button somewhere in the product.
 */
export default function Gallery() {
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState('one')
  const [text, setText] = useState('Paste a suspicious message here')

  return (
    <div className="container" style={{ paddingBlock: 'var(--sp-12)' }}>
      <div className="page-header">
        <div className="grow">
          <p className="page-header__eyebrow">Internal</p>
          <h1 className="page-header__title">Component gallery</h1>
          <p className="page-header__sub">
            Every primitive, variant and state. Currently rendering the{' '}
            <strong>{theme}</strong> theme.
          </p>
        </div>
        <Button variant="secondary" onClick={toggle}>
          Toggle theme
        </Button>
      </div>

      <Section title="Buttons — variants × sizes">
        <div className="stack gap-4">
          {SIZES.map((size) => (
            <div className="row gap-3 wrap" key={size}>
              <span className="tiny muted" style={{ width: 28 }}>
                {size}
              </span>
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} size={size}>
                  {variant}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons — states" note="Loading keeps the button width stable.">
        <div className="row gap-3 wrap">
          <Button variant="primary" loading>
            Analysing
          </Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
          <Button variant="primary" icon={<IconShield size={17} />}>
            With icon
          </Button>
          <Button variant="secondary" icon={<IconDownload size={17} />} iconPosition="right">
            Icon right
          </Button>
          <Button variant="ghost" icon={<IconSearch size={17} />} aria-label="Icon only" />
          <Button as="link" to="/scanner" variant="primary">
            As router link
          </Button>
        </div>
        <div style={{ marginTop: 'var(--sp-4)', maxWidth: 320 }}>
          <Button variant="primary" fullWidth>
            Full width
          </Button>
        </div>
      </Section>

      <Section title="Badges and chips">
        <div className="row gap-3 wrap">
          <Badge>neutral</Badge>
          <Badge tone="accent">accent</Badge>
          <Badge tone="safe" dot>
            safe
          </Badge>
          <Badge tone="warn" dot>
            warn
          </Badge>
          <Badge tone="danger" dot>
            danger
          </Badge>
          <VerdictBadge verdict="Safe" size="lg" />
          <VerdictBadge verdict="Suspicious" size="lg" />
          <VerdictBadge verdict="High Risk" size="lg" />
          <span className="token-chip token-chip--pos">
            kyc <span className="token-chip__weight">+0.42</span>
          </span>
          <span className="token-chip token-chip--neg">
            confirmed <span className="token-chip__weight">-0.18</span>
          </span>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="stack gap-4" style={{ maxWidth: 460 }}>
          <Input label="Email" placeholder="you@example.com" />
          <Input label="With icon" icon={<IconSearch size={16} />} placeholder="Search scans" />
          <Input label="With hint" hint="We never store this." placeholder="Optional" />
          <Input label="With error" error="Enter a valid email address." defaultValue="nope" />
          <Input label="Disabled" disabled placeholder="Not editable" />
          <Textarea
            label="Message"
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            hint="Ctrl+Enter submits."
          />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          items={[
            { value: 'one', label: 'Overview' },
            { value: 'two', label: 'Reasons' },
            { value: 'three', label: 'Entities' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="Feedback — toasts, modal, skeletons, empty state">
        <div className="row gap-3 wrap" style={{ marginBottom: 'var(--sp-6)' }}>
          <Button variant="success" onClick={() => toast.success('Saved', 'Your scan was stored.')}>
            Success toast
          </Button>
          <Button variant="danger" onClick={() => toast.error('Failed', 'Could not reach the server.')}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => toast.warn('Careful', 'This link looks unusual.')}>
            Warn toast
          </Button>
          <Button variant="ghost" onClick={() => toast.info('Note', 'Content is truncated before storage.')}>
            Info toast
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
        </div>

        <div className="grid-3">
          <Card tight>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Skeleton text
            </p>
            <SkeletonText lines={4} />
          </Card>
          <Card tight>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Skeleton rows
            </p>
            <SkeletonRows rows={3} />
          </Card>
          <Card tight>
            <Skeleton height={120} />
          </Card>
        </div>

        <div style={{ marginTop: 'var(--sp-6)' }}>
          <EmptyState
            title="Nothing here yet"
            text="Empty states explain what will appear and how to get there."
            action={<Button variant="secondary">Take an action</Button>}
          />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid-3">
          <Card hover>
            <h4>Hover card</h4>
            <p className="muted small">Lifts on hover.</p>
          </Card>
          <Card padded={false} flush>
            <CardHead title="With header" subtitle="And a subtitle" />
            <CardBody>
              <p className="muted small">Body content sits below the divider.</p>
            </CardBody>
          </Card>
          <Card tight>
            <h4>Tight card</h4>
            <p className="muted small">Reduced padding.</p>
          </Card>
        </div>
      </Section>

      <Section title="Stat cards">
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <StatCard label="Total scans" value="2,481" delta={18.4} spark={[3, 5, 4, 8, 7, 11, 14]} />
          <StatCard
            label="High risk detected"
            value="1,204"
            delta={12.1}
            spark={[2, 3, 5, 4, 7, 8, 12]}
            accent="var(--danger)"
          />
          <StatCard
            label="Money protected"
            value="₹8.4 Cr"
            delta={24.6}
            higherIsBetter
            spark={[1, 4, 3, 6, 9, 8, 13]}
            accent="var(--safe)"
          />
          <StatCard label="Loading state" value="—" loading />
        </div>
      </Section>

      <Section title="Charts — all hand-rolled SVG, no chart library">
        <div className="stack gap-8">
          <div>
            <p className="tiny muted">Stacked area — hover for a daily breakdown</p>
            <AreaChart data={TIMESERIES} />
          </div>
          <div className="grid-3">
            <div>
              <p className="tiny muted">Donut</p>
              <DonutChart data={CATEGORIES} size={180} />
            </div>
            <div>
              <p className="tiny muted">Bars</p>
              <BarChart data={CHANNELS} />
            </div>
            <div>
              <p className="tiny muted">Heat bars</p>
              <HeatBars
                data={[
                  { state: 'Maharashtra', count: 148 },
                  { state: 'Uttar Pradesh', count: 131 },
                  { state: 'Karnataka', count: 112 },
                ]}
              />
            </div>
          </div>
          <div className="row gap-8 wrap">
            <div className="text-center">
              <p className="tiny muted">Gauge — safe</p>
              <GaugeMeter score={12} verdict="Safe" size={170} />
            </div>
            <div className="text-center">
              <p className="tiny muted">Gauge — suspicious</p>
              <GaugeMeter score={52} verdict="Suspicious" size={170} />
            </div>
            <div className="text-center">
              <p className="tiny muted">Gauge — high risk</p>
              <GaugeMeter score={92} verdict="High Risk" size={170} />
            </div>
            <div>
              <p className="tiny muted">Sparkline</p>
              <Sparkline data={[3, 6, 4, 9, 7, 12, 10, 16]} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Domain components">
        <div className="stack gap-8">
          <div>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Reason list
            </p>
            <ReasonList reasons={REASONS} />
          </div>
          <div>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Action playbook
            </p>
            <ActionPlaybook playbook={PLAYBOOK} />
          </div>
          <div>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Scan table
            </p>
            <ScanTable scans={SCANS} categoryLabels={{ kyc_bank: 'Fake KYC / Bank Alert' }} />
          </div>
          <div>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Scan table — loading
            </p>
            <ScanTable loading />
          </div>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal dialog"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="small">
          Focus is trapped while this is open, Escape closes it, and focus returns to the button that
          opened it.
        </p>
      </Modal>
    </div>
  )
}
