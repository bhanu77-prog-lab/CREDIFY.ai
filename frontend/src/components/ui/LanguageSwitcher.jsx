import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'hi', label: 'हि', full: 'हिन्दी' },
  { code: 'kn', label: 'ಕ', full: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'த', full: 'தமிழ்' },
]

/**
 * Compact inline toggle placed in the Navbar action bar.
 * Renders as a segmented button pair so it occupies minimal space.
 */
export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage || i18n.language || 'en'

  return (
    <div
      className="lang-switcher"
      role="group"
      aria-label={t('common.language')}
    >
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-switcher__btn${current === lang.code ? ' lang-switcher__btn--active' : ''}`}
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={current === lang.code}
          title={lang.full}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
