import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

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

const SIDEBAR_KEY = 'scamshield-sidebar-collapsed'

/** Marketing shell: full-width page with the public navbar and footer. */
function SiteLayout({ children, showFooter = true }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      {showFooter && <Footer />}
    </>
  )
}

/** Workspace shell: navbar plus a collapsible sidebar. */
function AppLayout({ children }) {
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
      <Navbar />
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

  if (loading) {
    return (
      <div className="page">
        <EmptyState title="Checking your session…" text="One moment." />
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function NotFound() {
  return (
    <div className="page">
      <EmptyState
        icon={<IconSearch size={22} />}
        title="Page not found"
        text="That page does not exist. Try the scanner or the dashboard."
        action={
          <Button as="link" to="/" variant="primary">
            Back to home
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
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <ScrollManager />
      <Routes>
        <Route
          path="/"
          element={
            <SiteLayout>
              <Landing />
            </SiteLayout>
          }
        />
        <Route
          path="/about"
          element={
            <SiteLayout>
              <About />
            </SiteLayout>
          }
        />
        <Route
          path="/login"
          element={
            <SiteLayout showFooter={false}>
              <Login />
            </SiteLayout>
          }
        />
        <Route
          path="/scanner"
          element={
            <AppLayout>
              <Scanner />
            </AppLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/history"
          element={
            <AppLayout>
              <RequireAuth>
                <History />
              </RequireAuth>
            </AppLayout>
          }
        />
        <Route
          path="/community"
          element={
            <AppLayout>
              <Community />
            </AppLayout>
          }
        />
        <Route
          path="/intel"
          element={
            <AppLayout>
              <ThreatIntel />
            </AppLayout>
          }
        />
        <Route
          path="/gallery"
          element={
            <SiteLayout>
              <Gallery />
            </SiteLayout>
          }
        />
        <Route
          path="*"
          element={
            <SiteLayout>
              <NotFound />
            </SiteLayout>
          }
        />
      </Routes>
    </>
  )
}
