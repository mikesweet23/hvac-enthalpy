import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa'

// Keep the theme in sync if the OS switches between light and dark while the app is open.
const scheme = window.matchMedia('(prefers-color-scheme: dark)')
scheme.addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches)
})

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
