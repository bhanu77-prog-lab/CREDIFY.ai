/** Indian-format numbers, currency and dates used across the whole app. */

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '0'
  return Number(value).toLocaleString('en-IN')
}

/**
 * Compact Indian currency: 22,848 Cr / 1.9 Cr / 45.2 L / 12,500.
 * Judges read these figures at a glance, so lakh/crore beats K/M here.
 */
export function formatRupees(value, { compact = true, decimals = 1 } = {}) {
  const amount = Number(value) || 0
  if (!compact) return `₹${formatNumber(Math.round(amount))}`

  const abs = Math.abs(amount)
  if (abs >= 1e7) {
    const crore = amount / 1e7
    return `₹${trim(crore, crore >= 100 ? 0 : decimals)} Cr`
  }
  if (abs >= 1e5) {
    const lakh = amount / 1e5
    return `₹${trim(lakh, lakh >= 100 ? 0 : decimals)} L`
  }
  if (abs >= 1000) return `₹${formatNumber(Math.round(amount))}`
  return `₹${trim(amount, 0)}`
}

export function formatCount(value) {
  const amount = Number(value) || 0
  if (amount >= 1e7) return `${trim(amount / 1e7, 1)} Cr`
  if (amount >= 1e5) return `${trim(amount / 1e5, 1)} L`
  return formatNumber(amount)
}

function trim(value, decimals) {
  const fixed = Number(value).toFixed(decimals)
  const cleaned = fixed.replace(/\.0+$/, '')
  return Number(cleaned).toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

export function formatPercent(value, decimals = 1) {
  const number = Number(value) || 0
  return `${number > 0 ? '+' : ''}${number.toFixed(decimals)}%`
}

const DATE_OPTS = { day: 'numeric', month: 'short' }

export function formatDate(input, { withYear = false } = {}) {
  const date = toDate(input)
  if (!date) return ''
  return date.toLocaleDateString('en-IN', withYear ? { ...DATE_OPTS, year: 'numeric' } : DATE_OPTS)
}

export function formatDateTime(input) {
  const date = toDate(input)
  if (!date) return ''
  return `${date.toLocaleDateString('en-IN', DATE_OPTS)}, ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function timeAgo(input) {
  const date = toDate(input)
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date, { withYear: true })
}

/**
 * The API sends naive UTC timestamps. Without the trailing Z the browser reads
 * them as local time, which shifts every chart by the timezone offset.
 */
function toDate(input) {
  if (!input) return null
  if (input instanceof Date) return input
  const text = String(input)
  const normalised = /Z|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`
  const date = new Date(normalised)
  return Number.isNaN(date.getTime()) ? null : date
}

export function riskTone(score) {
  if (score >= 65) return 'danger'
  if (score >= 35) return 'warn'
  return 'safe'
}

export function verdictTone(verdict) {
  if (verdict === 'High Risk') return 'danger'
  if (verdict === 'Suspicious') return 'warn'
  return 'safe'
}

export function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function truncate(text, length = 90) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  return value.length > length ? `${value.slice(0, length)}…` : value
}
