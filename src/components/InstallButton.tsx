import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Shows an Install button when the browser offers a native install prompt (Chrome/Edge/Android). */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !promptEvent) return null

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        if (outcome === 'accepted') setPromptEvent(null)
      }}
    >
      <Download data-icon="inline-start" />
      Install
    </Button>
  )
}
