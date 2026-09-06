/** Light-touch device detection – only used to tailor install / export hints, never for features. */

export type Platform = 'ios' | 'android' | 'desktop'
export type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other'

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent)

export function isIOS(): boolean {
  const u = ua()
  if (/iPad|iPhone|iPod/.test(u)) return true
  // iPadOS 13+ reports itself as a Mac but has touch points.
  return (
    typeof navigator !== 'undefined' &&
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1
  )
}

export function isAndroid(): boolean {
  return /Android/.test(ua())
}

export function platform(): Platform {
  if (isIOS()) return 'ios'
  if (isAndroid()) return 'android'
  return 'desktop'
}

export function browser(): Browser {
  const u = ua()
  if (/SamsungBrowser/.test(u)) return 'samsung'
  if (/EdgiOS|EdgA|Edg\//.test(u)) return 'edge'
  if (/FxiOS|Firefox/.test(u)) return 'firefox'
  if (/CriOS|Chrome/.test(u)) return 'chrome'
  if (/Safari/.test(u)) return 'safari'
  return 'other'
}

/** True when running from the home screen / as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  )
}

/** Touch-first device, used to decide between the share sheet and a plain download. */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches || isIOS() || isAndroid()
}
