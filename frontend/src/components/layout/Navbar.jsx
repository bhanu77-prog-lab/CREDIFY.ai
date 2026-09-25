import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Button from '../ui/Button'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import { IconKeyboard, IconLogout, IconMenu, IconMoon, IconSun, IconX } from '../ui/Icons'

// Labels are resolved at render time via t() so language changes are reactive.
const LINK_KEYS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/#how', key: 'nav.howItWorks' },
  { to: '/#features', key: 'nav.features' },
  { to: '/dashboard', key: 'nav.dashboard' },
  { to: '/about', key: 'nav.about' },
]

export function Logo({ size = 26 }) {
  return (
    <Link to="/" className="logo" aria-label="CREDIFY.ai home">
      <svg
        className="logo__mark"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M16 2.5 4.5 7.2v8.6C4.5 22.6 9.3 28.2 16 29.5c6.7-1.3 11.5-6.9 11.5-13.7V7.2L16 2.5Z"
          fill="url(#shieldGrad)"
        />
        <path
          d="M16 5.4 7.2 9v6.8c0 5.3 3.6 9.7 8.8 10.9 5.2-1.2 8.8-5.6 8.8-10.9V9L16 5.4Z"
          fill="var(--surface)"
          opacity="0.14"
        />
        {/* circuit motif inside the shield */}
        <path
          d="M11 16.4l3.3 3.3L21 12.8"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="16.4" r="1.7" fill="#fff" />
        <circle cx="21" cy="12.8" r="1.7" fill="#fff" />
        <defs>
          <linearGradient id="shieldGrad" x1="4.5" y1="2.5" x2="27.5" y2="29.5">
            <stop stopColor="var(--cyan-400)" />
            <stop offset="1" stopColor="var(--cyan-600)" />
          </linearGradient>
        </defs>
      </svg>
      <span>
        CREDIFY<span className="logo__ai">.ai</span>
      </span>
    </Link>
  )
}

export function ThemeToggle({ size = 'md' }) {
  const { theme, toggle } = useTheme()
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={toggle}
      icon={theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    />
  )
}

export default function Navbar({ onOpenShortcuts }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('')
      return undefined
    }

    const sectionIds = ['how', 'features']
    const updateActiveSection = () => {
      const threshold = window.scrollY + 140
      let nextSection = 'home'

      sectionIds.forEach((id) => {
        const section = document.getElementById(id)
        if (section && section.offsetTop <= threshold) nextSection = id
      })

      setActiveSection(nextSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [location.pathname])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`.trim()}>
      <div className="container nav__inner">
        <Logo />

        <nav className={`nav__links ${open ? 'nav__links--open' : ''}`.trim()} aria-label="Main">
          {LINK_KEYS.map((link) =>
            link.to.includes('#') ? (
              <a
                key={link.key}
                className={`nav__link ${activeSection === link.to.slice(2) ? 'nav__link--active' : ''}`.trim()}
                href={link.to}
              >
                {t(link.key)}
              </a>
            ) : (
              <NavLink
                key={link.key}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `nav__link ${
                    location.pathname === '/' && link.to === '/'
                      ? activeSection === 'home'
                      : isActive && location.pathname !== '/'
                  ? 'nav__link--active'
                  : ''
                  }`.trim()
                }
              >
                {t(link.key)}
              </NavLink>
            ),
          )}

          {/* Below 900px the bar has room only for the theme toggle and the
              menu button, so the account and CTA actions move in here. */}
          <div className="nav__menu-actions">
            {isAuthenticated ? (
              <Button variant="secondary" size="md" fullWidth icon={<IconLogout size={17} />} onClick={logout}>
                {t('nav.signOut')}
              </Button>
            ) : (
              <Button as="link" to="/login" variant="secondary" size="md" fullWidth>
                {t('nav.signIn')}
              </Button>
            )}
            <Button as="link" to="/scanner" variant="primary" size="md" fullWidth>
              {t('nav.scanMessage')}
            </Button>
          </div>
        </nav>

        <div className="nav__actions">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            icon={<IconKeyboard size={17} />}
            onClick={onOpenShortcuts}
            aria-label={t('nav.keyboardShortcuts')}
            title={`${t('nav.keyboardShortcuts')} (?)`}
            className="nav__shortcuts-btn"
          />
          <ThemeToggle />
          <div className="nav__bar-actions">
            {isAuthenticated ? (
              <>
                <span className="small muted nowrap" style={{ marginInline: 'var(--sp-2)' }}>
                  {user.full_name.split(' ')[0]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<IconLogout size={17} />}
                  onClick={logout}
                  aria-label={t('nav.signOut')}
                />
              </>
            ) : (
              <Button as="link" to="/login" variant="ghost" size="sm">
                {t('nav.signIn')}
              </Button>
            )}
            <Button as="link" to="/scanner" variant="primary" size="sm">
              {t('nav.scanMessage')}
            </Button>
          </div>
          <Button
            className="nav__toggle"
            variant="ghost"
            size="sm"
            icon={open ? <IconX size={18} /> : <IconMenu size={18} />}
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
            aria-expanded={open}
          />
        </div>
      </div>
    </header>
  )
}
