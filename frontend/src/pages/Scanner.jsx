import { useCallback, useEffect, useRef, useState } from 'react'

import api, { ApiError } from '../api/client'
import PageHeader from '../components/layout/PageHeader'
import ChannelTabs, { channelConfig } from '../components/domain/ChannelTabs'
import RiskResultCard from '../components/domain/RiskResultCard'
import Button from '../components/ui/Button'
import Card, { CardBody, CardHead } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { IconAlert, IconShield } from '../components/ui/Icons'
import Skeleton from '../components/ui/Skeleton'
import Textarea from '../components/ui/Textarea'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'

const MAX = 5000

/**
 * Three samples per channel: two scams and one genuine message. Including a
 * legitimate sample matters — it lets a judge verify in one click that the tool
 * does not simply flag everything.
 */
const SAMPLES = {
  message: [
    {
      tone: 'danger',
      label: 'Fake KYC deadline',
      text: 'Dear Customer, your SBI account will be blocked within 2 hours due to incomplete KYC. Update immediately at http://sbi-verify-kyc.info/update',
    },
    {
      tone: 'danger',
      label: 'Task job offer',
      text: 'Work from home job! Earn Rs 5000 per day just by liking YouTube videos. Join our telegram group now and pay Rs 2,500 registration to start.',
    },
    {
      tone: 'safe',
      label: 'Genuine OTP alert',
      text: 'Your OTP for login is 738291. Do not share this OTP with anyone.',
    },
  ],
  call: [
    {
      tone: 'danger',
      label: 'Digital arrest call',
      text: 'Do not disconnect this call. This is Inspector Sharma from Mumbai Cyber Cell. A parcel in your name contains narcotics and you are under digital arrest. Transfer your entire balance to the RBI verification account and do not tell anyone, not even your family.',
    },
    {
      tone: 'danger',
      label: 'OTP request from "bank"',
      text: 'Hello, I am calling from the HDFC card division. Your reward points of 8500 are expiring. Please tell me the OTP received on your mobile so I can redeem them.',
    },
    {
      tone: 'safe',
      label: 'Genuine clinic reminder',
      text: 'Hello, calling from the clinic to remind you about your dental appointment tomorrow at 4 PM. Reply YES to confirm.',
    },
  ],
  email: [
    {
      tone: 'danger',
      label: 'Forged bank sender',
      text: 'From: SBI Security Team <alerts@sbi-secure-verify.xyz>\nReply-To: recovery.desk@gmail.com\nSubject: URGENT: Your account will be suspended\n\nDear Customer, your net banking will be suspended today. Verify your account at http://sbi-secure-verify.xyz/login',
    },
    {
      tone: 'danger',
      label: 'Fake tax refund',
      text: 'From: Income Tax Refund <refunds@incometax-refund.info>\nReply-To: taxdesk.helpline@yahoo.com\nSubject: Immediate action required: refund pending\n\nYour income tax refund of Rs 48,000 is pending. Confirm your bank account and PAN at http://rbi-refund.online/claim',
    },
    {
      tone: 'safe',
      label: 'Genuine refund notice',
      text: 'From: Zomato <no-reply@zomato.com>\nSubject: Refund processed\n\nYour refund of Rs 249 has been processed to the original payment method in 3-5 working days.',
    },
  ],
  url: [
    { tone: 'danger', label: 'Bank lookalike domain', text: 'http://sbi-kyc-verify.info/update' },
    { tone: 'danger', label: 'Raw IP address', text: 'http://192.168.44.10/netbanking' },
    { tone: 'safe', label: 'Genuine bank website', text: 'https://www.onlinesbi.sbi' },
  ],
  upi: [
    {
      tone: 'danger',
      label: 'Collect-request refund trap',
      text: 'A collect request of Rs 24,999 has been received from refund.helpdesk@okaxis. Enter your UPI PIN in the next 5 minutes to receive the refund in your account.',
    },
    {
      tone: 'danger',
      label: 'QR code "to receive money"',
      text: 'Sir main army mein hoon, transfer ho gaya hai isliye fridge bech raha hoon. Maine paise bhej diye hain, QR scan karke PIN daaliye.',
    },
    {
      tone: 'safe',
      label: 'Genuine payment receipt',
      text: 'PhonePe: You paid Rs 2,500 to Kirana Store. UPI Ref 3348219. Thank you.',
    },
  ],
}

function LoadingResult() {
  return (
    <Card padded={false}>
      <div style={{ padding: 'var(--sp-6)', borderBottom: '1px solid var(--border)' }}>
        <div className="row gap-6 wrap">
          <Skeleton width={190} height={150} radius="var(--r-lg)" />
          <div className="stack gap-3 grow" style={{ minWidth: 220 }}>
            <Skeleton width="45%" height={26} radius="var(--r-full)" />
            <Skeleton width="70%" height={26} />
            <Skeleton width="90%" height={14} />
            <Skeleton width="60%" height={14} />
          </div>
        </div>
      </div>
      <div style={{ padding: 'var(--sp-6)' }} className="stack gap-3">
        <Skeleton width="30%" height={18} />
        <Skeleton height={62} />
        <Skeleton height={62} />
        <Skeleton height={62} />
      </div>
    </Card>
  )
}

export default function Scanner() {
  const [channel, setChannel] = useState('message')
  const [content, setContent] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reporting, setReporting] = useState(false)
  const textareaRef = useRef(null)
  const resultRef = useRef(null)
  const toast = useToast()
  const { isAuthenticated } = useAuth()

  const config = channelConfig(channel)

  useEffect(() => {
    document.title = 'Scanner · CREDIFY.ai'
  }, [])

  const analyze = useCallback(async () => {
    const text = content.trim()
    if (!text) {
      setError('Paste the message you want checked first.')
      textareaRef.current?.focus()
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.analyze(text, channel, true)
      setResult(data)
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.offline
          ? 'Cannot reach the CREDIFY.ai server. Start the backend on port 8000 and try again.'
          : caught?.message || 'Something went wrong while analysing that.'
      setError(message)
      toast.error('Analysis failed', message)
    } finally {
      setLoading(false)
    }
  }, [content, channel, toast])

  const onKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      analyze()
    }
  }

  const reset = () => {
    setResult(null)
    setContent('')
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => textareaRef.current?.focus(), 200)
  }

  const report = async () => {
    if (!result) return
    setReporting(true)
    try {
      await api.submitReport({
        channel: result.channel,
        content: content.trim().slice(0, 5000),
        claimed_category: result.category,
      })
      toast.success('Thank you', 'Your report helps warn other people about this scam.')
    } catch (caught) {
      toast.error('Could not submit', caught?.message || 'Please try again in a moment.')
    } finally {
      setReporting(false)
    }
  }

  const copyReport = async () => {
    if (!result) return
    const lines = [
      'CREDIFY.ai report',
      `Verdict: ${result.verdict} (${result.risk_score}/100, ${Math.round(
        result.confidence * 100,
      )}% confidence)`,
      `Type: ${result.category_label}`,
      '',
      'Why it was flagged:',
      ...result.reasons.map((reason, index) => `${index + 1}. ${reason.reason}`),
      '',
      'Do:',
      ...result.playbook.do.map((item) => `- ${item}`),
      '',
      'Do not:',
      ...result.playbook.dont.map((item) => `- ${item}`),
      '',
      `Report at: ${result.playbook.report_to}`,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast.success('Copied', 'The full report is on your clipboard.')
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.')
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Scanner"
        title="Check anything suspicious"
        subtitle="Paste it exactly as you received it. The more you include — links, amounts, phone numbers — the more we can check."
      />

      <div className="scanner-grid">
        <div className="stack gap-4">
          <Card padded={false}>
            <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
              <ChannelTabs value={channel} onChange={setChannel} />
            </div>

            <div style={{ padding: 'var(--sp-4)' }}>
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={onKeyDown}
                maxLength={MAX}
                placeholder={config.placeholder}
                hint={config.hint}
                error={error}
                mono={channel === 'email' || channel === 'url'}
                aria-label={`${config.label} to check`}
                style={{ minHeight: 190 }}
              />

              <div className="row between gap-3 wrap" style={{ marginTop: 'var(--sp-4)' }}>
                <span className="tiny muted">
                  Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to check
                  {!isAuthenticated && ' · Sign in to keep a history of your scans'}
                </span>
                <div className="row gap-2">
                  {content && (
                    <Button variant="ghost" onClick={() => setContent('')}>
                      Clear
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={analyze}
                    loading={loading}
                    icon={<IconShield size={18} />}
                  >
                    Check for scam
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div ref={resultRef}>
            {loading && <LoadingResult />}

            {!loading && result && (
              <RiskResultCard
                result={result}
                onScanAnother={reset}
                onReport={report}
                onCopy={copyReport}
                reporting={reporting}
              />
            )}

            {!loading && !result && !error && (
              <Card>
                <EmptyState
                  icon={<IconShield size={22} />}
                  title="Your result will appear here"
                  text="Pick a channel above, paste what you received, and we will show the risk score, the exact reasons behind it, and what to do next."
                />
              </Card>
            )}
          </div>
        </div>

        <div className="stack gap-4">
          <Card padded={false}>
            <CardHead
              title="Try a sample"
              subtitle={`Real ${config.label.toLowerCase()} examples — two scams and one genuine.`}
            />
            <CardBody tight>
              <div className="sample-list">
                {SAMPLES[channel].map((sample) => (
                  <button
                    type="button"
                    className="sample"
                    key={sample.label}
                    onClick={() => {
                      setContent(sample.text)
                      setError(null)
                      textareaRef.current?.focus()
                    }}
                  >
                    <span
                      className="reason__dot"
                      style={{
                        background: sample.tone === 'safe' ? 'var(--safe)' : 'var(--danger)',
                        marginTop: 5,
                      }}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="strong" style={{ color: 'var(--text)' }}>
                        {sample.label}
                      </span>
                      <br />
                      {sample.text.replace(/\n+/g, ' ').slice(0, 82)}…
                    </span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
              <span className="risk--warn" aria-hidden="true">
                <IconAlert size={20} />
              </span>
              <div>
                <p className="strong small">Your privacy</p>
                <p className="small muted" style={{ marginTop: 4 }}>
                  Scan text is truncated to 2,000 characters before it is stored, and it is never
                  sent to any outside service — everything runs on this machine. Use the landing-page
                  scanner if you would rather nothing be stored at all.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="strong small">If money has already gone</p>
            <p className="small muted" style={{ marginTop: 4 }}>
              Call <strong>1930</strong> or report at cybercrime.gov.in immediately. Accounts can
              often still be frozen in the first few hours — after that it becomes very difficult.
            </p>
            <Button
              as="a"
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noreferrer noopener"
              variant="danger"
              fullWidth
              style={{ marginTop: 'var(--sp-3)' }}
            >
              Report at cybercrime.gov.in
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
