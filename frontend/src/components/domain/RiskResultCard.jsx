import Badge, { VerdictBadge } from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import GaugeMeter from '../charts/GaugeMeter'
import ActionPlaybook from './ActionPlaybook'
import ReasonList from './ReasonList'
import { IconCopy, IconExternal, IconFlag, IconRefresh } from '../ui/Icons'
import { riskTone } from '../../utils/format'

const VERDICT_HEADLINE = {
  'High Risk': 'This looks like a scam',
  Suspicious: 'Be careful with this one',
  Safe: 'Nothing suspicious found',
}

const VERDICT_SUB = {
  'High Risk': 'Do not reply, click, call back or pay anything.',
  Suspicious: 'Some warning signs are present. Verify before you act on it.',
  Safe: 'We found no scam patterns, but stay alert if it later asks for money or a code.',
}

export default function RiskResultCard({
  result,
  onScanAnother,
  onReport,
  onCopy,
  reporting = false,
  compact = false,
}) {
  if (!result) return null

  const tone = riskTone(result.risk_score)
  const positiveTokens = result.explanation_tokens?.filter((t) => t.weight > 0) || []
  const negativeTokens = result.explanation_tokens?.filter((t) => t.weight < 0) || []

  return (
    <Card padded={false} className="stack">
      <div
        style={{
          padding: 'var(--sp-6)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 'var(--sp-6)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <GaugeMeter score={result.risk_score} verdict={result.verdict} size={compact ? 170 : 210} />

        <div className="grow" style={{ minWidth: 240 }}>
          <div className="row gap-2 wrap" style={{ marginBottom: 'var(--sp-3)' }}>
            <VerdictBadge verdict={result.verdict} size="lg" />
            <Badge tone="accent">{result.category_label}</Badge>
            <Badge tone="neutral">{Math.round(result.confidence * 100)}% confidence</Badge>
          </div>

          <h3 className={`risk--${tone}`} style={{ fontSize: 'var(--fs-24)' }}>
            {VERDICT_HEADLINE[result.verdict]}
          </h3>
          <p className="muted small" style={{ marginTop: 'var(--sp-2)', maxWidth: '52ch' }}>
            {VERDICT_SUB[result.verdict]}
          </p>

          <p className="tiny muted" style={{ marginTop: 'var(--sp-4)' }}>
            Language model score {result.ml_probability}% · combined across{' '}
            {countEngines(result)} independent checks
          </p>
        </div>
      </div>

      <div style={{ padding: 'var(--sp-6)' }} className="stack gap-6">
        <section>
          <h4 style={{ fontSize: 'var(--fs-16)', marginBottom: 'var(--sp-3)' }}>
            Why we flagged this
          </h4>
          <ReasonList reasons={result.reasons} />
        </section>

        {(positiveTokens.length > 0 || negativeTokens.length > 0) && (
          <section>
            <h4 style={{ fontSize: 'var(--fs-16)', marginBottom: 'var(--sp-2)' }}>
              Words that influenced the score
            </h4>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              Red pushed the score towards scam, green pushed it towards safe.
            </p>
            <div className="row gap-2 wrap">
              {positiveTokens.map((token) => (
                <span className="token-chip token-chip--pos" key={`p-${token.token}`}>
                  {token.token}
                  <span className="token-chip__weight">+{token.weight.toFixed(2)}</span>
                </span>
              ))}
              {negativeTokens.map((token) => (
                <span className="token-chip token-chip--neg" key={`n-${token.token}`}>
                  {token.token}
                  <span className="token-chip__weight">{token.weight.toFixed(2)}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {hasEntities(result.entities) && (
          <section>
            <h4 style={{ fontSize: 'var(--fs-16)', marginBottom: 'var(--sp-3)' }}>
              What we found inside
            </h4>
            <div className="stack gap-2">
              {renderEntities(result)}
            </div>
          </section>
        )}

        <section>
          <h4 style={{ fontSize: 'var(--fs-16)', marginBottom: 'var(--sp-3)' }}>What to do now</h4>
          <ActionPlaybook playbook={result.playbook} />
        </section>

        <div className="row gap-3 wrap">
          {onScanAnother && (
            <Button variant="primary" icon={<IconRefresh size={17} />} onClick={onScanAnother}>
              Scan another
            </Button>
          )}
          {onReport && (
            <Button
              variant="secondary"
              icon={<IconFlag size={17} />}
              onClick={onReport}
              loading={reporting}
            >
              Report to community
            </Button>
          )}
          {onCopy && (
            <Button variant="ghost" icon={<IconCopy size={17} />} onClick={onCopy}>
              Copy report
            </Button>
          )}
          <Button
            as="a"
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer noopener"
            variant="ghost"
            icon={<IconExternal size={17} />}
            iconPosition="right"
          >
            Report at cybercrime.gov.in
          </Button>
        </div>
      </div>
    </Card>
  )
}

function hasEntities(entities) {
  if (!entities) return false
  return ['urls', 'upi_ids', 'phones', 'amounts'].some((key) => (entities[key] || []).length > 0)
}

function renderEntities(result) {
  const entities = result.entities || {}
  const intel = result.entity_intel || []

  // A known-bad entry matches when its value appears inside the extracted value:
  // intel stores registrable domains and 10-digit phone numbers, while the text
  // may carry a full URL or a +91-prefixed number.
  const knownBad = (value) =>
    intel.some(
      (item) => item.known_bad && String(value).toLowerCase().includes(item.value.toLowerCase()),
    )

  const rows = [
    ...(entities.urls || []).map((v) => ({ key: `u-${v}`, label: 'Link', value: v, checked: true })),
    ...(entities.upi_ids || []).map((v) => ({
      key: `p-${v}`,
      label: 'Payment address',
      value: v,
      checked: true,
    })),
    ...(entities.phones || []).map((v) => ({
      key: `t-${v}`,
      label: 'Phone number',
      value: v,
      checked: true,
    })),
    ...(entities.amounts || []).map((v) => ({
      key: `a-${v}`,
      label: 'Amount',
      value: v,
      checked: false,
    })),
  ]

  return rows.slice(0, 10).map((row) => (
    <div className="entity-row" key={row.key}>
      <Badge tone="neutral">{row.label}</Badge>
      <span className="entity-row__value">{row.value}</span>
      {!row.checked ? null : knownBad(row.value) ? (
        <Badge tone="danger" dot>
          Reported before
        </Badge>
      ) : (
        <Badge tone="neutral">Not on our list</Badge>
      )}
    </div>
  ))
}

function countEngines(result) {
  const scores = result.engine_scores
  if (!scores) return 7
  return Object.values(scores).filter((value) => value > 0).length || 1
}
