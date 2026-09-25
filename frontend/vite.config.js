import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The dev server proxies /api to FastAPI so the frontend needs zero
// configuration: `npm run dev` just works next to `uvicorn main:app`.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Emit the sw-update custom event so PwaPrompt.jsx can pick it up.
      selfDestroying: false,
      injectRegister: null, // we register manually in main.jsx
      manifest: {
        name: 'CREDIFY.ai — Scam Detector',
        short_name: 'CREDIFY.ai',
        description:
          'Paste any suspicious SMS, call, email, link or UPI request and get an instant, explainable risk verdict.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B1220',
        theme_color: '#0B1220',
        lang: 'en',
        categories: ['utilities', 'finance', 'security'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/scanner.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Scanner',
          },
        ],
      },
      workbox: {
        // Cache the app shell and all static assets.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Cache the API analyze endpoint responses for 24 h so the app
        // can show the last verdict when offline.
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/analyze/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-analyze',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 10,
            },
          },
          // Cache Google Fonts so the app renders correctly offline.
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        // Keep the service worker active in dev so we can test the install
        // prompt and update banner without a production build.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 4173, host: true },
  build: { outDir: 'dist', sourcemap: false },
})
