import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Footer from './components/layout/Footer'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import { useAuth } from './context/AuthContext'
import About from './pages/About'
import Community from './pages/Community'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import History from './pages/History'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Scanner from './pages/Scanner'
import ThreatIntel from './pages/ThreatIntel'
import Button from './components/ui/Button'
import EmptyState from './components/ui/EmptyState'
import { IconSearch } from './components/ui/Icons'
import KeyboardShortcutsPanel from './components/ui/KeyboardShortcutsPanel'

const SIDEBAR_KEY = 'scamshield-sidebar-collapsed'

/** Marketing shell: full-width page with the public navbar and footer. */
function SiteLayout({ children, showFooter = true, onOpenShortcuts }) {
  return (
    <>
      <Navbar onOpenShortcuts={onOpenShortcuts} />
      <main id="main">{children}</main>
      {showFooter && <Footer />}
    </>
  )
}

/** Workspace shell: navbar plus a collapsible sidebar. */
function AppLayout({ children, onOpenShortcuts }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <>
      <Navbar onOpenShortcuts={onOpenShortcuts} />
      <div className="shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="workspace">
          <main id="main">{children}</main>
        </div>
      </div>
    </>
  )
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="page">
        <EmptyState title={t('common.checkingSession')} text={t('common.oneMoment')} />
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="page">
      <EmptyState
        icon={<IconSearch size={22} />}
        title={t('common.notFoundTitle')}
        text={t('common.notFoundText')}
        action={
          <Button as="link" to="/" variant="primary">
            {t('common.back')}
          </Button>
        }
      />
    </div>
  )
}

/** Scroll to top on navigation, and to the anchor when a hash is present. */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const node = document.querySelector(hash)
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}

export default function App() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

  useEffect(() => {
    const onKeyDown = (event) => {
      // Only fire when ? is pressed outside of any editable field, and no
      // modifier is held (so it does not interfere with Ctrl+/ or similar).
      if (event.key !== '?') return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      event.preventDefault()
      setShortcutsOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        {/* useTranslation not used here intentionally — this is a static
            accessibility anchor rendered before any JS i18n is ready */}
        Skip to main content
      </a>
      <KeyboardShortcutsPanel open={shortcutsOpen} onClose={closeShortcuts} />
      <ScrollManager />
      <Routes>
        <Route
          path="/"
          element={
            <SiteLayout onOpenShortcuts={openShortcuts}>
              <Landing />
            </SiteLayout>
          }
        />
        <Route
          path="/about"
          element={
            <SiteLayout onOpenShortcuts={openShortcuts}>
              <About />
            </SiteLayout>
          }
        />
        <Route
          path="/login"
          element={
            <SiteLayout showFooter={false} onOpenShortcuts={openShortcuts}>
              <Login />
            </SiteLayout>
          }
        />
        <Route
          path="/scanner"
          element={
            <AppLayout onOpenShortcuts={openShortcuts}>
              <Scanner />
            </AppLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppLayout onOpenShortcuts={openShortcuts}>
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/history"
          element={
            <AppLayout onOpenShortcuts={openShortcuts}>
              <RequireAuth>
                <History />
              </RequireAuth>
            </AppLayout>
          }
        />
        <Route
          path="/community"
          element={
            <AppLayout onOpenShortcuts={openShortcuts}>
              <Community />
            </AppLayout>
          }
        />
        <Route
          path="/intel"
          element={
            <AppLayout onOpenShortcuts={openShortcuts}>
              <ThreatIntel />
            </AppLayout>
          }
        />
        <Route
          path="/gallery"
          element={
            <SiteLayout onOpenShortcuts={openShortcuts}>
              <Gallery />
            </SiteLayout>
          }
        />
        <Route
          path="*"
          element={
            <SiteLayout onOpenShortcuts={openShortcuts}>
              <NotFound />
            </SiteLayout>
          }
        />
      </Routes>
    </>
  )
}
