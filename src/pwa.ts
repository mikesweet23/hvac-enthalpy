import { registerSW } from 'virtual:pwa-register'

/** How often to look for a new deploy while the app stays open. */
const CHECK_EVERY_MS = 30 * 60 * 1000

/**
 * Registers the service worker so a new deploy always pulls through:
 *  - on every launch / reload the browser fetches sw.js fresh and, if it changed, the new
 *    worker installs, takes over straight away and the page reloads itself onto the new build;
 *  - while the app is open (or resumed from the background on a phone, where it is often not
 *    reloaded at all) it re-checks for updates, so a change shows up without reinstalling.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      let lastCheck = Date.now()

      const check = async () => {
        if (registration.installing || !navigator.onLine) return
        lastCheck = Date.now()
        try {
          // Bypass any HTTP cache so a fresh deploy is seen immediately.
          const res = await fetch(swUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
          if (res.status === 200) await registration.update()
        } catch {
          // offline or flaky connection – try again next time
        }
      }

      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        // Home-screen apps are usually resumed rather than reloaded, so check when they come back.
        if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60_000) void check()
      })
    },
  })
}
