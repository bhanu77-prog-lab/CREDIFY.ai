import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { IconBrain, IconCheck, IconCopy, IconGlobe, IconShield } from '../components/ui/Icons'
import Input from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  { role: 'Analyst', email: 'analyst@scamshield.in', password: 'Analyst@123' },
  { role: 'User', email: 'demo@scamshield.in', password: 'Demo@123' },
  { role: 'Admin', email: 'admin@scamshield.in', password: 'Admin@123' },
]

const VALUE_PROPS = [
  {
    icon: <IconShield size={20} />,
    title: 'Keep a history of what you checked',
    text: 'Signed-in scans are saved so you can look back at what you were sent and export it if you need to file a complaint.',
  },
  {
    icon: <IconBrain size={20} />,
    title: 'See the full reasoning',
    text: 'Every verdict keeps its reason list and the exact words that influenced the score.',
  },
  {
    icon: <IconGlobe size={20} />,
    title: 'Help the next person',
    text: 'Scams you report feed a shared blocklist, so anyone who checks the same link or UPI ID is warned instantly.',
  },
]

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const { login, register, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  useEffect(() => {
    document.title = 'Sign in · CREDIFY.ai'
  }, [])

  if (!loading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />
  }

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters.'
    if (mode === 'register' && form.full_name.trim().length < 2) {
      next.full_name = 'Please enter your name.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(form.email.trim(), form.password)
        toast.success('Welcome back')
      } else {
        await register({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
        })
        toast.success('Account created', 'You are signed in.')
      }
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (caught) {
      setErrors({ form: caught?.message || 'Could not sign you in.' })
    } finally {
      setSubmitting(false)
    }
  }

  const useDemo = (account) => {
    setForm({ email: account.email, password: account.password, full_name: '' })
    setMode('login')
    setErrors({})
    toast.info('Filled in', `${account.role} credentials are ready — press Sign in.`)
  }

  return (
    <div className="auth">
      <div className="auth__form-side">
        <div className="auth__form">
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--r-md)',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent)',
                marginBottom: 'var(--sp-4)',
              }}
            >
              <IconShield size={24} />
            </div>
            <h1 style={{ fontSize: 'var(--fs-30)' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="muted small" style={{ marginTop: 'var(--sp-2)' }}>
              {mode === 'login'
                ? 'Signing in is optional — the scanner works without it. It just keeps your history.'
                : 'It takes a few seconds and keeps your scan history in one place.'}
            </p>
          </div>

          <form onSubmit={submit} className="stack gap-4" style={{ marginTop: 'var(--sp-8)' }}>
            {mode === 'register' && (
              <Input
                label="Full name"
                value={form.full_name}
                onChange={set('full_name')}
                error={errors.full_name}
                autoComplete="name"
                placeholder="Your name"
              />
            )}

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />

            {errors.form && (
              <p className="field__error" role="alert">
                {errors.form}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div
            style={{
              marginTop: 'var(--sp-4)',
              padding: 'var(--sp-4)',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <p className="small muted">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                style={{ border: 0, background: 'none', color: 'var(--accent)', padding: 0, fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }}
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setErrors({})
                }}
              >
                {mode === 'login' ? 'Create one free →' : 'Sign in →'}
              </button>
            </p>
          </div>

          <Card tight style={{ marginTop: 'var(--sp-8)' }}>
            <p className="tiny muted" style={{ marginBottom: 'var(--sp-3)' }}>
              DEMO ACCOUNTS — click to fill in
            </p>
            <div className="stack gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="cred-chip"
                  onClick={() => useDemo(account)}
                >
                  <IconCopy size={14} />
                  <span className="grow">
                    {account.email} / {account.password}
                  </span>
                  <span className="badge badge--neutral">{account.role}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <aside className="auth__aside">
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              padding: '6px 14px',
              borderRadius: 'var(--r-full)',
              background: 'rgba(46,207,228,0.12)',
              border: '1px solid rgba(46,207,228,0.28)',
              color: 'var(--cyan-400)',
              fontSize: 'var(--fs-12)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <IconShield size={13} />
            CREDIFY.ai
          </div>
          <h2>Your scans, kept together.</h2>
          <p style={{ color: 'rgba(232,238,246,.8)', marginTop: 'var(--sp-3)' }}>
            An account is not required to check a message. It exists so you can look back at what you
            were sent, and so your reports can help other people.
          </p>
        </div>

        <div className="stack gap-6" style={{ marginTop: 'var(--sp-4)' }}>
          {VALUE_PROPS.map((prop) => (
            <div className="auth__value" key={prop.title}>
              <span style={{ color: 'var(--cyan-400)', flex: 'none' }}>{prop.icon}</span>
              <span>
                <strong>{prop.title}</strong>
                {prop.text}
              </span>
            </div>
          ))}
        </div>

        <div className="auth__value" style={{ marginTop: 'var(--sp-4)' }}>
          <span style={{ color: 'var(--cyan-400)', flex: 'none' }}>
            <IconCheck size={20} />
          </span>
          <span>
            <strong>Nothing leaves this machine</strong>
            No external service is called at any point. Scan text is truncated before storage.
          </span>
        </div>
      </aside>
    </div>
  )
}
