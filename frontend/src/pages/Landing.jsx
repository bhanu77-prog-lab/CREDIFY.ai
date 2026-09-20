import { useCallback, useEffect, useState } from 'react'

import api, { ApiError } from '../api/client'
import ArchitectureDiagram from '../components/domain/ArchitectureDiagram'
import ReasonList from '../components/domain/ReasonList'
import Badge, { VerdictBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import {
  IconAlert,
  IconBrain,
  IconCheck,
  IconGlobe,
  IconLink,
  IconLock,
  IconMail,
  IconMessage,
  IconPhone,
  IconRupee,
  IconShield,
} from '../components/ui/Icons'
import Textarea from '../components/ui/Textarea'
import { riskTone } from '../utils/format'
import useReveal, { useCountUp } from '../utils/useReveal'

const SAMPLE =
  'Dear Customer, your SBI account will be blocked within 2 hours due to incomplete KYC. Update immediately at http://sbi-verify-kyc.info/update'

const STATS = [
  {
    target: 22848,
    prefix: '₹',
    suffix: ' Cr',
    caption: 'lost to cyber financial fraud in 2024 alone, up from ₹551 crore in 2021.',
    source: 'I4C / NCRP',
  },
  {
    target: 41,
    suffix: '×',
    caption: 'rise in reported losses between 2021 and 2024, far outpacing the rise in complaints.',
    source: 'I4C / NCRP',
  },
  {
    target: 1.9,
    suffix: ' Cr',
    decimals: 1,
    caption: 'complaints filed on the National Cyber Crime Reporting Portal in 2024.',
    source: 'I4C / NCRP',
  },
  {
    target: 55050,
    prefix: '₹',
    suffix: ' Cr',
    caption: 'lost across 65.8 lakh+ complaints between 2021 and mid-2026.',
    source: 'I4C / NCRP',
  },
]

const CHANNELS = [
  {
    icon: <IconMessage size={20} />,
    title: 'SMS & Chat',
    text: 'The message that arrives at 9 PM saying your account closes tonight.',
    catches: ['Fake KYC alerts', 'Lottery wins', 'Task job offers'],
  },
  {
    icon: <IconPhone size={20} />,
    title: 'Calls',
    text: 'Paste what the caller said. Scam calls follow a script, and we know the scripts.',
    catches: ['Digital arrest', 'OTP requests', 'Fake tech support'],
  },
  {
    icon: <IconMail size={20} />,
    title: 'Email & Links',
    text: 'We read the sender headers and pick apart the web address, without ever opening it.',
    catches: ['Forged senders', 'Lookalike domains', 'Credential pages'],
  },
  {
    icon: <IconRupee size={20} />,
    title: 'UPI & Payments',
    text: 'The direction of money is the tell: receiving never needs your PIN.',
    catches: ['Collect requests', 'QR "refunds"', '₹1 trust tests'],
  },
]

const DIFFERENTIATORS = [
  {
    icon: <IconBrain size={20} />,
    title: 'Explainable, not a black box',
    text: 'Every verdict shows the exact phrases and patterns that triggered it, in language a first-time smartphone user can follow. A warning nobody understands is a warning nobody acts on.',
  },
  {
    icon: <IconGlobe size={20} />,
    title: 'One tool, five channels',
    text: 'Scams cross channels: an SMS leads to a call, the call leads to a UPI request. Checking all five in one place is what catches the ones that hop between them.',
  },
  {
    icon: <IconShield size={20} />,
    title: 'Built for Indian scams',
    text: 'Digital arrest, UPI collect-request traps, prepaid task jobs, fake KYC deadlines — and the Hinglish they actually arrive in, not translated textbook English.',
  },
]

const STEPS = [
  {
    title: 'Paste it',
    text: 'Drop in the message, the call, the email, the link or the payment request. No login, no app install.',
  },
  {
    title: 'We analyse it',
    text: 'Seven engines run at once: a language model, red-flag rules, link checks, payment checks, sender checks, call-script checks and a shared blocklist.',
  },
  {
    title: 'You get a plain answer',
    text: 'A risk score, the specific reasons behind it, and exactly what to do next — including where to report if money has already moved.',
  },
]

function StatTile({ stat }) {
  const [ref, value] = useCountUp(stat.target, { decimals: stat.decimals || 0 })
  const display = stat.decimals
    ? value.toFixed(stat.decimals)
    : Math.round(value).toLocaleString('en-IN')

  return (
    <div className="stat-tile" ref={ref}>
      <p className="stat-tile__value">
        {stat.prefix || ''}
        {display}
        {stat.suffix || ''}
      </p>
      <p className="stat-tile__caption">{stat.caption}</p>
      <p className="stat-tile__source">Source: {stat.source}</p>
    </div>
  )
}

function MiniScanner() {
  const [content, setContent] = useState(SAMPLE)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    const text = content.trim()
    if (!text) return
    setLoading(true)
    setError(null)
    try {
      // save:false — a landing-page demo should not fill anyone's history.
      const data = await api.analyze(text, 'message', false)
      setResult(data)
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.offline
          ? 'The analysis service is not running. Start the backend and try again.'
          : 'Could not analyse that right now. Please try again.',
      )
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [content])

  return (
    <div className="mini-scanner">
      <div className="mini-scanner__head">
        <span className="mini-scanner__dots" aria-hidden="true">
          <span className="mini-scanner__dot" />
          <span className="mini-scanner__dot" />
          <span className="mini-scanner__dot" />
        </span>
        Live scanner
      </div>

      <div className="mini-scanner__body">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') run()
          }}
          maxLength={2000}
          rows={4}
          aria-label="Message to check"
          style={{ minHeight: 110 }}
        />

        <div className="row between gap-3 wrap" style={{ marginTop: 'var(--sp-3)' }}>
          <span className="tiny muted">This is a real scam SMS. Try editing it.</span>
          <Button variant="primary" onClick={run} loading={loading}>
            Check this message
          </Button>
        </div>

        {error && (
          <p className="small risk--danger" style={{ marginTop: 'var(--sp-3)' }} role="alert">
            {error}
          </p>
        )}

        {result && !error && (
          <div className="mini-scanner__result">
            <div className="verdict-head">
              <span className={`verdict-score risk--${riskTone(result.risk_score)}`}>
                {result.risk_score}
                <span className="verdict-score__max">/100</span>
              </span>
              <div className="stack gap-2">
                <VerdictBadge verdict={result.verdict} size="lg" />
                <Badge tone="accent">{result.category_label}</Badge>
              </div>
            </div>
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <ReasonList reasons={result.reasons} limit={3} />
            </div>
            <Button
              as="link"
              to="/scanner"
              variant="ghost"
              size="sm"
              fullWidth
              style={{ marginTop: 'var(--sp-3)' }}
            >
              See the full breakdown and what to do
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ThreatTicker() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .reports({ page_size: 14, status: 'verified' })
      .then((data) => {
        if (!cancelled) setItems(data.items || [])
      })
      .catch(() => {
        /* the ticker is decorative; silence is the right failure mode */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!items.length) return null

  const labels = items.map((item) => ({
    id: item.id,
    text: item.claimed_category.replace(/_/g, ' '),
    channel: item.channel,
  }))
  const rows = [0, 1, 2, 3].map((row) => {
    const offset = (row * 3) % labels.length
    const rowItems = [...labels.slice(offset), ...labels.slice(0, offset)]
    return [...rowItems, ...rowItems]
  })

  return (
    <div className="ticker" aria-label="Recently reported scams from the community">
      {rows.map((row, rowIndex) => (
        <div
          className="ticker__track"
          style={{
            '--ticker-row': rowIndex,
            '--ticker-speed': `${30 + rowIndex * 3}s`,
            '--ticker-delay': `${rowIndex * -4.5}s`,
            '--ticker-lift': `${rowIndex % 2 ? 3 : 0}px`,
          }}
          key={rowIndex}
        >
          {row.map((item, index) => (
            <span className="ticker__item" key={`${item.id}-${rowIndex}-${index}`}>
              <span className="risk--danger" aria-hidden="true">
                <IconAlert size={14} />
              </span>
              <span className="strong" style={{ textTransform: 'capitalize' }}>
                {item.text}
              </span>
              <span className="muted">reported via {item.channel}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function Reveal({ children, className = '' }) {
  const [ref, revealClass] = useReveal()
  return (
    <div ref={ref} className={`${revealClass} ${className}`.trim()}>
      {children}
    </div>
  )
}

export default function Landing() {
  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="hero">
        <div className="hero__bg" aria-hidden="true">
          <div className="hero__grid" />
          <div className="hero__glow hero__glow--a" />
          <div className="hero__glow hero__glow--b" />
        </div>

        <div className="container hero__inner">
          <div>
            <Badge tone="accent">
              <IconShield size={14} /> CREDIFY.ai
            </Badge>

            <h1 className="hero__title">
              Know if it&apos;s a scam — <em>before</em> you click, call back, or pay.
            </h1>

            <p className="hero__lede">
              Paste any suspicious SMS, call, email, link or UPI request and get an instant,
              explainable verdict — so you can stop a scam before you lose money, instead of
              reporting it after.
            </p>

            <div className="hero__cta">
              <Button as="link" to="/scanner" variant="primary" size="lg">
                Scan a message free
              </Button>
              <Button as="link" to="/dashboard" variant="secondary" size="lg">
                See live dashboard
              </Button>
            </div>

            <div className="hero__trust">
              <span>
                <IconCheck size={15} className="risk--safe" /> No login needed
              </span>
              <span>
                <IconLock size={15} className="risk--safe" /> Nothing stored without consent
              </span>
              <span>
                <IconCheck size={15} className="risk--safe" /> SMS, calls, email, links, UPI
              </span>
            </div>
          </div>

          <MiniScanner />
        </div>
      </section>

      <ThreatTicker />

      {/* -------------------------------------------------- problem numbers */}
      <section className="section section--alt" id="problem">
        <div className="container">
          <Reveal>
            <div className="section__head section__head--center">
              <p className="eyebrow">The problem, in numbers</p>
              <h2 className="section__title">
                Losses are growing far faster than the number of complaints
              </h2>
              <p className="section__lede">
                Cybercrime cases in India grew from 27,248 in 2018 to 86,420 in 2023 (NCRB). But the
                money lost has grown much faster than the number of people reporting it — which means
                each scam is taking more.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="stat-tiles">
              {STATS.map((stat) => (
                <StatTile key={stat.caption} stat={stat} />
              ))}
            </div>
          </Reveal>

          <Reveal>
            <Card style={{ marginTop: 'var(--sp-8)' }}>
              <div className="row between gap-6 wrap">
                <div style={{ maxWidth: '46ch' }}>
                  <h3 style={{ fontSize: 'var(--fs-18)' }}>Where the money actually goes</h3>
                  <p className="muted small" style={{ marginTop: 'var(--sp-2)' }}>
                    By value, investment scams account for roughly 77% of losses, digital-arrest
                    scams about 8%, and credit-card fraud about 7%. Helplines have saved over ₹11,158
                    crore, frozen accounts on 32.8 lakh+ complaints and blocked 9.42 lakh+ fraudulent
                    SIMs — but only when victims report fast enough.
                  </p>
                </div>
                <div className="stack gap-3" style={{ minWidth: 260, flex: 1 }}>
                  {[
                    { label: 'Investment scams', pct: 77 },
                    { label: 'Digital arrest', pct: 8 },
                    { label: 'Credit card fraud', pct: 7 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="row between small" style={{ marginBottom: 4 }}>
                        <span>{row.label}</span>
                        <span className="strong tabular">{row.pct}%</span>
                      </div>
                      <div className="risk-bar__track" style={{ height: 8 }}>
                        <div
                          className="risk-bar__fill"
                          style={{
                            width: `${row.pct}%`,
                            background: 'linear-gradient(90deg, var(--cyan-600), var(--cyan-400))',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="section" id="how">
        <div className="container">
          <Reveal>
            <div className="section__head section__head--center">
              <p className="eyebrow">How it works</p>
              <h2 className="section__title">Three steps, about four seconds</h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="steps">
              {STEPS.map((step, index) => (
                <div className="step" key={step.title}>
                  <div className="step__num">{index + 1}</div>
                  <h3 className="step__title">{step.title}</h3>
                  <p className="step__text">{step.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- channels */}
      <section className="section section--alt" id="features">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Channels covered</p>
              <h2 className="section__title">Scams do not stay in one app, so neither do we</h2>
              <p className="section__lede">
                A single fraud usually starts as an SMS, moves to a phone call, and ends at a UPI
                request. Checking each one in a different place is how people miss the pattern.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid-4">
              {CHANNELS.map((channel) => (
                <Card className="feature" hover key={channel.title}>
                  <div className="feature__icon">{channel.icon}</div>
                  <h3 className="feature__title">{channel.title}</h3>
                  <p className="feature__text">{channel.text}</p>
                  <div className="feature__list">
                    {channel.catches.map((item) => (
                      <Badge tone="neutral" key={item}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------- differentiators */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Why it&apos;s different</p>
              <h2 className="section__title">Most tools tell you it is spam. We tell you why.</h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid-3">
              {DIFFERENTIATORS.map((item) => (
                <Card className="feature" hover key={item.title}>
                  <div className="feature__icon">{item.icon}</div>
                  <h3 className="feature__title">{item.title}</h3>
                  <p className="feature__text">{item.text}</p>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- architecture */}
      <section className="section section--alt" id="architecture">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Under the hood</p>
              <h2 className="section__title">Seven engines, one honest score</h2>
              <p className="section__lede">
                No single signal decides anything. The language model can be confident and still be
                wrong on a four-word message, so its opinion is weighed against concrete evidence:
                what the words ask for, where the link really goes, which way the money moves.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <ArchitectureDiagram />
          </Reveal>

          <Reveal>
            <div className="grid-3" style={{ marginTop: 'var(--sp-6)' }}>
              <Card tight>
                <p className="tiny muted">Model accuracy</p>
                <p className="strong" style={{ fontSize: 'var(--fs-24)' }}>
                  98.5%
                </p>
                <p className="small muted">5-fold cross-validation on the training corpus.</p>
              </Card>
              <Card tight>
                <p className="tiny muted">Runs</p>
                <p className="strong" style={{ fontSize: 'var(--fs-24)' }}>
                  Fully offline
                </p>
                <p className="small muted">No external API is called. Nothing leaves the machine.</p>
              </Card>
              <Card tight>
                <p className="tiny muted">Languages</p>
                <p className="strong" style={{ fontSize: 'var(--fs-24)' }}>
                  English + Hinglish
                </p>
                <p className="small muted">Trained on the phrasing scams actually arrive in.</p>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- final CTA */}
      <section className="section section--tight">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <h2>Check it before you act on it.</h2>
              <p>
                It takes four seconds and no account. If it turns out to be a scam, we will also tell
                you exactly what to do next.
              </p>
              <div className="cta-band__actions">
                <Button as="link" to="/scanner" variant="primary" size="lg">
                  Scan a message free
                </Button>
                <Button as="link" to="/dashboard" variant="secondary" size="lg">
                  Explore the dashboard
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
