import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Handles two PWA surface areas in one component:
 *
 * 1. Install prompt  — browser fires `beforeinstallprompt`; we intercept it,
 *    show a subtle banner, and replay it when the user clicks Install.
 *
 * 2. Update banner   — Vite PWA sets window.__SW_UPDATE__ and dispatches a
 *    custom `sw-update` event when a new service-worker version is waiting.
 *    We show a banner so users can reload immediately rather than waiting for
 *    the tab to be closed and reopened.
 *
 * Both banners are dismissible and never re-appear in the same session after
 * being dismissed (install prompt) or after reload (update banner).
 */
export default function PwaPrompt() {
  const { t } = useTranslation()
  const [installEvent, setInstallEvent] = useState(null)
  const [showUpdate, setShowUpdate] = useState(false)

  // Intercept the native browser install prompt so we can show our own UI.
  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setInstallEvent(event)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Listen for the service-worker update event emitted by vite-plugin-pwa.
  useEffect(() => {
    const handler = () => setShowUpdate(true)
    window.addEventListener('sw-update', handler)
    return () => window.removeEventListener('sw-update', handler)
  }, [])

  const install = async () => {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  const dismissInstall = () => setInstallEvent(null)
  const reload = () => window.location.reload()

  if (!installEvent && !showUpdate) return null

  return (
    <div className="pwa-banner" role="region" aria-label="App install">
      {showUpdate ? (
        <>
          <div className="pwa-banner__text">
            <strong>{t('pwa.updateTitle')}</strong>
            <span className="muted">{t('pwa.updateText')}</span>
          </div>
          <div className="pwa-banner__actions">
            <button type="button" className="pwa-banner__btn pwa-banner__btn--primary" onClick={reload}>
              {t('pwa.updateButton')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="pwa-banner__text">
            <strong>{t('pwa.installTitle')}</strong>
            <span className="muted">{t('pwa.installText')}</span>
          </div>
          <div className="pwa-banner__actions">
            <button type="button" className="pwa-banner__btn pwa-banner__btn--primary" onClick={install}>
              {t('pwa.installButton')}
            </button>
            <button type="button" className="pwa-banner__btn" onClick={dismissInstall}>
              {t('pwa.installDismiss')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
