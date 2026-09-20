import { Link } from 'react-router-dom'

import { IconAlert } from '../ui/Icons'
import { Logo } from './Navbar'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__col">
            <Logo />
            <p className="small muted" style={{ marginTop: 'var(--sp-3)', maxWidth: '34ch' }}>
              An explainable scam and fraud warning assistant for SMS, calls, email, links and UPI
              payment requests. Built for safer everyday digital decisions.
            </p>
          </div>

          <div className="footer__col">
            <h4>Product</h4>
            <Link to="/scanner">Scanner</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/history">Scan history</Link>
            <Link to="/intel">Threat intel</Link>
          </div>

          <div className="footer__col">
            <h4>Community</h4>
            <Link to="/community">Reported scams</Link>
            <Link to="/community">Report a scam</Link>
            <Link to="/about">About the project</Link>
          </div>

          <div className="footer__col">
            <h4>Official help</h4>
            <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener">
              cybercrime.gov.in
            </a>
            <a href="tel:1930">Helpline 1930</a>
            <a href="https://www.rbi.org.in" target="_blank" rel="noreferrer noopener">
              RBI Sachet
            </a>
          </div>
        </div>

        <div className="footer__safety">
          <span className="risk--danger" aria-hidden="true">
            <IconAlert size={20} />
          </span>
          <span>
            Already lost money? Report at{' '}
            <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer noopener">
              cybercrime.gov.in
            </a>{' '}
            or call <a href="tel:1930">1930</a>. Reporting within the first few hours is what makes a
            freeze possible.
          </span>
        </div>

        <div className="footer__bottom">
          <span>CREDIFY.ai</span>
          <span>
            Detection only. We never contact anyone on your behalf, and scan text is truncated
            before storage.
          </span>
        </div>
      </div>
    </footer>
  )
}
