import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// GitHub Pages serves project sites under /<repo>/ – the deploy workflow sets VITE_BASE accordingly.
const base = process.env.VITE_BASE ?? '/'

// Shown in the footer so you can tell at a glance which deploy a phone is running.
const commit = (process.env.GITHUB_SHA ?? '').slice(0, 7)
const builtAt = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_BUILD__: JSON.stringify({ commit, builtAt }),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New deploys take over immediately and the open page reloads onto them (see src/pwa.ts).
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Enthalpy – HVAC Psychrometrics',
        short_name: 'Enthalpy',
        description:
          'Psychrometric calculator for HVAC: dew point, enthalpy, cooling coil moisture removal and heat addition.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // jsPDF's optional HTML-rendering helpers are split into their own chunks and never
        // requested by the report generator, so keep them out of the offline cache.
        globIgnores: ['**/html2canvas-*.js', '**/purify.es-*.js', '**/index.es-*.js'],
      },
      // Service worker only in production builds; in dev it just serves stale precaches.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4731,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4732,
  },
})
