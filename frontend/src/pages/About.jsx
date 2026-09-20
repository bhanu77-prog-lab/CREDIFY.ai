import { useEffect } from 'react'

import ArchitectureDiagram from '../components/domain/ArchitectureDiagram'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { IconAlert, IconBrain, IconShield } from '../components/ui/Icons'
import useReveal from '../utils/useReveal'

const STACK = [
  { label: 'Backend', value: 'Python 3.11+, FastAPI, Uvicorn, Pydantic v2' },
  { label: 'Database', value: 'SQLite via SQLAlchemy 2.x ORM' },
  { label: 'Auth', value: 'JWT (python-jose) with bcrypt password hashing, roles: user / analyst / admin' },
  { label: 'Machine learning', value: 'scikit-learn TF-IDF (word + character n-grams) into a calibrated linear model, persisted with joblib' },
  { label: 'Frontend', value: 'React 18, Vite, React Router v6, hand-written CSS design system' },
  { label: 'Charts', value: 'Hand-rolled SVG components — no charting library' },
  { label: 'Testing', value: 'pytest for the API and engines, Playwright for a frontend smoke test' },
  { label: 'Architecture', value: 'FastAPI + React + Vite local development stack' },
]

const ROADMAP = [
  {
    phase: 'Built',
    title: 'Cross-channel detection with explanations',
    text: 'Seven engines covering SMS, calls, email, links and UPI, fused into one score with plain-language reasons, an action playbook and a shared threat-intelligence blocklist.',
  },
  {
    phase: 'Next',
    title: 'On-device Android keyboard and call assistant',
    text: 'The model is small enough to run on a phone. Checking a message where it arrives, without it ever leaving the device, is the natural next step.',
  },
  {
    phase: 'Next',
    title: 'Regional languages',
    text: 'Hindi, Marathi, Bengali, Tamil and Telugu — starting with transliterated text, which is how most scam messages actually arrive.',
  },
  {
    phase: 'Later',
    title: 'Bank and telecom integration',
    text: 'A reporting bridge into the I4C pipeline so a confirmed scam indicator can reach the people able to freeze an account or block a SIM.',
  },
  {
    phase: 'Later',
    title: 'Family guardian mode',
    text: 'An opt-in alert to a trusted family member when a senior relative scans something high-risk — the moment when a second opinion matters most.',
  },
]

const TEAM = [
  { role: 'Team lead & backend', focus: 'API, detection engines, fusion scoring' },
  { role: 'Machine learning', focus: 'Corpus design, model training, explainability' },
  { role: 'Frontend', focus: 'Design system, dashboard, scanner experience' },
  { role: 'Research', focus: 'Scam taxonomy, Hinglish patterns, official statistics' },
  { role: 'UX & accessibility', focus: 'Plain-language copy, keyboard and screen-reader support' },
  { role: 'DevOps & QA', focus: 'Local development, test coverage, demo readiness' },
]

function Reveal({ children }) {
  const [ref, className] = useReveal()
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export default function About() {
  useEffect(() => {
    document.title = 'About · CREDIFY.ai'
  }, [])

  return (
    <>
      <section className="section section--tight">
        <div className="container">
          <div className="section__head">
            <Badge tone="accent">
              <IconShield size={14} /> CREDIFY.ai
            </Badge>
            <h1 className="section__title" style={{ marginTop: 'var(--sp-4)' }}>
              Most fraud tools help after the money is gone. This one helps before.
            </h1>
            <p className="section__lede">
              CREDIFY.ai is an explainable scam and fraud warning assistant. You paste anything
              suspicious — an SMS, what a caller said, an email, a link, a payment request — and it
              tells you how risky it is, exactly why, and what to do next.
            </p>
          </div>

          <div className="grid-3">
            <Card>
              <h3 style={{ fontSize: 'var(--fs-18)', marginBottom: 'var(--sp-2)' }}>The problem</h3>
              <p className="small muted">
                Cybercrime cases in India grew from 27,248 in 2018 to 86,420 in 2023 (NCRB). Financial
                fraud complaints on the national portal rose about sevenfold between 2021 and 2024,
                while losses rose 41 times over — from ₹551 crore to ₹22,848 crore (I4C / NCRP).
                Cumulative reported losses have crossed ₹55,050 crore across 65.8 lakh+ complaints.
              </p>
            </Card>
            <Card>
              <h3 style={{ fontSize: 'var(--fs-18)', marginBottom: 'var(--sp-2)' }}>Why it persists</h3>
              <p className="small muted">
                Reporting is a cure, not a prevention. Helplines have saved over ₹11,158 crore and
                frozen accounts on 32.8 lakh+ complaints, but only when a victim reports within the
                first hours. Everything before that moment — the moment of deciding whether to click
                — is currently unassisted.
              </p>
            </Card>
            <Card>
              <h3 style={{ fontSize: 'var(--fs-18)', marginBottom: 'var(--sp-2)' }}>Our answer</h3>
              <p className="small muted">
                Put a second opinion in that moment, in a form anyone can act on. Not a spam label,
                but a specific explanation: this message is asking you for an OTP, this link is not
                really your bank, approving this request will send money out.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Architecture</p>
              <h2 className="section__title">How a verdict is produced</h2>
              <p className="section__lede">
                Seven independent engines run over the same input. None of them decides alone — the
                fusion stage weighs them against each other, deliberately discounting the language
                model when nothing concrete supports it.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <ArchitectureDiagram />
          </Reveal>

          <Reveal>
            <Card style={{ marginTop: 'var(--sp-6)' }}>
              <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', flex: 'none' }}>
                  <IconBrain size={22} />
                </span>
                <div>
                  <h3 style={{ fontSize: 'var(--fs-18)' }}>Why the model is deliberately simple</h3>
                  <p className="small muted" style={{ marginTop: 'var(--sp-2)' }}>
                    The classifier is a linear model over TF-IDF features, not a deep network. That is
                    a design choice, not a limitation: a linear model gives a signed contribution per
                    word for free, which is what powers the &quot;words that influenced the score&quot;
                    chips. A black box would score just as well and destroy the product&apos;s whole
                    premise — that a person can see why they are being warned and judge it for
                    themselves. It also means the entire tool runs offline on a laptop, with no API
                    key and no data leaving the machine.
                  </p>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Technology</p>
              <h2 className="section__title">Built to run anywhere, including offline</h2>
            </div>
          </Reveal>

          <Reveal>
            <Card>
              {STACK.map((row) => (
                <div className="tech-row" key={row.label}>
                  <span className="tech-row__label">{row.label}</span>
                  <span className="small">{row.value}</span>
                </div>
              ))}
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Roadmap</p>
              <h2 className="section__title">Where this goes next</h2>
            </div>
          </Reveal>

          <Reveal>
            <Card>
              <div className="timeline">
                {ROADMAP.map((item) => (
                  <div className="timeline__item" key={item.title}>
                    <span className="timeline__phase">{item.phase}</span>
                    <div className="timeline__body">
                      <h3 style={{ fontSize: 'var(--fs-16)' }}>{item.title}</h3>
                      <p className="small muted" style={{ marginTop: 4 }}>
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section__head">
              <p className="eyebrow">Team</p>
              <h2 className="section__title">Who built it</h2>
              <p className="section__lede">
                Six roles across detection, interface and research. Replace these with your team
                members before the demo.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid-3">
              {TEAM.map((member) => (
                <Card key={member.role} hover>
                  <div
                    className="empty__icon"
                    style={{ margin: 0, marginBottom: 'var(--sp-3)' }}
                    aria-hidden="true"
                  >
                    <IconShield size={20} />
                  </div>
                  <h3 style={{ fontSize: 'var(--fs-16)' }}>{member.role}</h3>
                  <p className="small muted" style={{ marginTop: 4 }}>
                    {member.focus}
                  </p>
                  <p className="tiny muted" style={{ marginTop: 'var(--sp-3)' }}>
                    Team member name
                  </p>
                </Card>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <Card style={{ marginTop: 'var(--sp-8)' }}>
              <div className="row gap-4 between wrap">
                <div className="row gap-3" style={{ alignItems: 'flex-start', maxWidth: '58ch' }}>
                  <span className="risk--danger" style={{ flex: 'none' }}>
                    <IconAlert size={22} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: 'var(--fs-16)' }}>Scope and limits, stated plainly</h3>
                    <p className="small muted" style={{ marginTop: 4 }}>
                      CREDIFY.ai detects and explains. It does not block calls, freeze accounts or
                      contact anyone on your behalf, and a Safe verdict is not a guarantee. If money
                      has already left your account, report it at cybercrime.gov.in or call 1930 — that
                      is the only route that can still freeze it.
                    </p>
                  </div>
                </div>
                <Button
                  as="a"
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer noopener"
                  variant="danger"
                >
                  Report at cybercrime.gov.in
                </Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  )
}
