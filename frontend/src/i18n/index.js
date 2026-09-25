import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import hi from './locales/hi.json'
import kn from './locales/kn.json'
import ta from './locales/ta.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      kn: { translation: kn },
      ta: { translation: ta },
    },
    // The detector checks: querystring ?lng=, localStorage 'i18nextLng',
    // navigator.language, then falls back here.
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'kn', 'ta'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'credify-language',
    },
    interpolation: {
      // React already escapes values, so we do not need i18next to do it.
      escapeValue: false,
    },
  })

export default i18n
