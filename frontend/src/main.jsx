import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import PwaPrompt from './components/ui/PwaPrompt'

// i18n must be imported before the app renders so the instance is ready.
import './i18n'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/pages.css'

// Register the Vite PWA service worker in production.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: false,
      onNeedRefresh: () => window.dispatchEvent(new Event('sw-update')),
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
            <PwaPrompt />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
