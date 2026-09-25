import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'

import { IconAlert, IconShield } from '../ui/Icons'
import { Logo } from './Navbar'

export default function Footer() {
  const year = new Date().getFullYear()
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__col">
            <Logo />
            <p className="small muted" style={{ marginTop: 'var(--sp-4)', maxWidth: '36ch', lineHeight: 1.7 }}>
              {t('footer.tagline')}
            </p>
            <div className="row gap-2" style={{ marginTop: 'var(--sp-4)' }}>
              <span
                className="badge badge--safe"
                style={{ fontSize: 'var(--fs-11)' }}
              >
                <IconShield size={11} /> {t('footer.accuracyBadge')}
              </span>
              <span
                className="badge badge--accent"
                style={{ fontSize: 'var(--fs-11)' }}
              >
                {t('footer.offlineBadge')}
              </span>
            </div>
          </div>

          <div className="footer__col">
            <h4>{t('footer.product')}</h4>
            <Link to="/scanner">{t('footer.scanner')}</Link>
            <Link to="/dashboard">{t('footer.dashboard')}</Link>
            <Link to="/history">{t('footer.history')}</Link>
            <Link to="/intel">{t('footer.intel')}</Link>
          </div>

          <div className="footer__col">
            <h4>{t('footer.community')}</h4>
            <Link to="/community">{t('footer.reportedScams')}</Link>
            <Link to="/community">{t('footer.reportScam')}</Link>
            <Link to="/about">{t('footer.aboutProject')}</Link>
            <Link to="/gallery">{t('footer.gallery')}</Link>
          </div>

          <div className="footer__col">
            <h4>{t('footer.officialHelp')}</h4>
            <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener">
              cybercrime.gov.in
            </a>
            <a href="tel:1930">Helpline 1930</a>
            <a href="https://www.rbi.org.in" target="_blank" rel="noreferrer noopener">
              RBI Sachet
            </a>
            <a href="https://www.trai.gov.in" target="_blank" rel="noreferrer noopener">
              TRAI DND
            </a>
          </div>
        </div>

        <div className="footer__safety">
          <span className="risk--danger" aria-hidden="true">
            <IconAlert size={20} />
          </span>
          <span>
            <Trans i18nKey="footer.safetyBanner">
              Already lost money? Report immediately at{' '}
              <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener">cybercrime.gov.in</a>
              {' '}or call <strong><a href="tel:1930">1930</a></strong>. The first few hours are critical — accounts can still be frozen.
            </Trans>
          </span>
        </div>

        <div className="footer__bottom">
          <span>{t('footer.copyright', { year })}</span>
          <span className="muted" style={{ fontSize: 'var(--fs-13)' }}>
            {t('footer.disclaimer')}
          </span>
        </div>
      </div>
    </footer>
  )
}
