/**
 * Thin fetch wrapper: attaches the bearer token, normalises FastAPI's error
 * shapes into a single readable message, and distinguishes "server said no"
 * from "server is unreachable" so the UI can show the right empty state.
 */

const TOKEN_KEY = 'scamshield-token'

// Same-origin by default so the Vite development proxy works with zero configuration.
// VITE_API_URL overrides it if the API lives elsewhere.
const BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '' : 'https://credify-api-vwrw.onrender.com')
).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, offline = false, details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.offline = offline
    this.details = details
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing - the session simply will not persist */
  }
}

function readableError(status, payload) {
  const detail = payload?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    // Pydantic validation errors.
    const first = detail[0]
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null
    const msg = first.msg || 'That value is not valid.'
    return field ? `${String(field).replace(/_/g, ' ')}: ${msg}` : msg
  }
  if (status === 401) return 'Please sign in to continue.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'We could not find what you asked for.'
  if (status >= 500) return 'The server ran into a problem. Please try again.'
  return 'Something went wrong. Please try again.'
}

async function request(path, { method = 'GET', body, headers = {}, raw = false, signal } = {}) {
  const url = `${BASE}${path}`
  const token = getToken()

  const init = { method, headers: { ...headers }, signal }

  if (token) init.headers.Authorization = `Bearer ${token}`

  if (body instanceof FormData) {
    init.body = body
  } else if (body instanceof URLSearchParams) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    init.body = body.toString()
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(
      'Cannot reach the CREDIFY.ai server. Make sure the backend is running on port 8000.',
      { offline: true },
    )
  }

  if (response.status === 204) return null

  if (raw) {
    if (!response.ok) throw new ApiError(readableError(response.status, null), { status: response.status })
    return response
  }

  let payload = null
  const type = response.headers.get('content-type') || ''
  if (type.includes('application/json')) {
    payload = await response.json().catch(() => null)
  }

  if (!response.ok) {
    if (response.status === 401 && token) setToken(null)
    throw new ApiError(readableError(response.status, payload), {
      status: response.status,
      details: payload?.detail ?? null,
    })
  }

  return payload
}

function query(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, value)
  })
  const string = search.toString()
  return string ? `?${string}` : ''
}

export const api = {
  health: () => request('/api/health'),

  // auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username: email, password }),
    }),
  me: () => request('/api/auth/me'),

  // analysis
  analyze: (content, channel = 'message', save = true, signal) =>
    request('/api/analyze', { method: 'POST', body: { content, channel, save }, signal }),
  analyzeBulk: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/api/analyze/bulk', { method: 'POST', body: form })
  },

  // scans
  scans: (params) => request(`/api/scans${query(params)}`),
  scan: (id) => request(`/api/scans/${id}`),
  deleteScan: (id) => request(`/api/scans/${id}`, { method: 'DELETE' }),
  exportScansUrl: (params) => `${BASE}/api/scans/export${query({ ...params, format: 'csv' })}`,
  exportScans: (params) => request(`/api/scans/export${query({ ...params, format: 'csv' })}`, { raw: true }),

  // dashboard
  summary: (days = 30) => request(`/api/dashboard/summary${query({ days })}`),
  timeseries: (days = 30) => request(`/api/dashboard/timeseries${query({ days })}`),
  categories: (days = 30) => request(`/api/dashboard/categories${query({ days })}`),
  channels: (days = 30) => request(`/api/dashboard/channels${query({ days })}`),
  topThreats: (limit = 10) => request(`/api/dashboard/top-threats${query({ limit })}`),
  alerts: () => request('/api/dashboard/alerts'),
  geography: () => request('/api/dashboard/geography'),
  meta: () => request('/api/dashboard/meta'),

  // intel
  intel: (params) => request(`/api/intel${query(params)}`),
  intelLookup: (value) => request(`/api/intel/lookup${query({ value })}`),
  addIntel: (payload) => request('/api/intel', { method: 'POST', body: payload }),

  // community
  reports: (params) => request(`/api/community/reports${query(params)}`),
  submitReport: (payload) => request('/api/community/report', { method: 'POST', body: payload }),
  reviewReport: (id, status) =>
    request(`/api/community/reports/${id}`, { method: 'PATCH', body: { status } }),
}

export default api
