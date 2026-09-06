import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Keep the theme in sync if the OS switches between light and dark while the app is open.
const scheme = window.matchMedia('(prefers-color-scheme: dark)')
scheme.addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
