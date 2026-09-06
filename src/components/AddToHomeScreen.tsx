import { useEffect, useState, type ReactNode } from 'react'
import { EllipsisVertical, Menu, Share, Smartphone, SquarePlus, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { browser, isStandalone, platform } from '@/lib/platform'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * "Add to Home Screen" for every platform:
 *  - Android / desktop Chromium: fires the native install prompt when the browser offers one.
 *  - iOS (no install API) and everything else: opens step-by-step instructions for the current browser.
 * Hidden once the app is running from the home screen.
 */
export function AddToHomeScreen({ className }: { className?: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
      setOpen(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const install = async () => {
    if (promptEvent) {
      // The native prompt can only be used once; a later tap falls back to the manual steps.
      setPromptEvent(null)
      try {
        await promptEvent.prompt()
        await promptEvent.userChoice
        return
      } catch {
        // prompt blocked or already consumed – show the manual steps instead
      }
    }
    setOpen(true)
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={install} className={className}>
        <Smartphone data-icon="inline-start" />
        <span className="sm:hidden">Install</span>
        <span className="hidden sm:inline">Add to Home Screen</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Wind className="size-4" />
              </span>
              Add Enthalpy to your Home Screen
            </DialogTitle>
            <DialogDescription>
              Once added it opens full-screen like a native app, works offline and keeps your inputs.
            </DialogDescription>
          </DialogHeader>

          <Steps />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Got it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface Step {
  icon?: ReactNode
  text: ReactNode
}

function Steps() {
  const p = platform()
  const b = browser()
  const { steps, note } = instructionsFor(p, b)

  return (
    <div className="space-y-3">
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="leading-snug pt-0.5">{s.text}</span>
          </li>
        ))}
      </ol>
      {note ? <p className="text-xs text-muted-foreground leading-snug">{note}</p> : null}
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/60 px-1.5 py-0.5 text-xs font-medium align-middle">
      {children}
    </span>
  )
}

function instructionsFor(p: ReturnType<typeof platform>, b: ReturnType<typeof browser>) {
  const shareIcon = <Share className="size-3.5" />
  const addIcon = <SquarePlus className="size-3.5" />
  const dots = <EllipsisVertical className="size-3.5" />
  const burger = <Menu className="size-3.5" />

  if (p === 'ios') {
    if (b === 'safari' || b === 'other') {
      return {
        steps: [
          {
            text: (
              <>
                Tap the <Kbd>{shareIcon} Share</Kbd> button in Safari's toolbar (bottom of the screen
                on iPhone, top-right on iPad).
              </>
            ),
          },
          {
            text: (
              <>
                Scroll down the sheet and tap <Kbd>{addIcon} Add to Home Screen</Kbd>.
              </>
            ),
          },
          {
            text: (
              <>
                Tap <Kbd>Add</Kbd> in the top-right corner.
              </>
            ),
          },
        ] satisfies Step[],
        note: null,
      }
    }
    return {
      steps: [
        {
          text: (
            <>
              Tap the <Kbd>{shareIcon} Share</Kbd> button next to the address bar
              {b === 'chrome' ? ' (or the ••• menu)' : ''}.
            </>
          ),
        },
        {
          text: (
            <>
              Tap <Kbd>{addIcon} Add to Home Screen</Kbd>.
            </>
          ),
        },
        {
          text: (
            <>
              Tap <Kbd>Add</Kbd> to confirm.
            </>
          ),
        },
      ] satisfies Step[],
      note: "If you don't see the option, open this page in Safari and add it from there – iOS only lets some browsers add home-screen apps.",
    }
  }

  if (p === 'android') {
    if (b === 'samsung') {
      return {
        steps: [
          {
            text: (
              <>
                Tap the <Kbd>{burger} Menu</Kbd> button in the bottom toolbar.
              </>
            ),
          },
          {
            text: (
              <>
                Tap <Kbd>Add page to</Kbd> then <Kbd>Home screen</Kbd>.
              </>
            ),
          },
          {
            text: (
              <>
                Tap <Kbd>Add</Kbd> to confirm.
              </>
            ),
          },
        ] satisfies Step[],
        note: null,
      }
    }
    if (b === 'firefox') {
      return {
        steps: [
          {
            text: (
              <>
                Tap the <Kbd>{dots} Menu</Kbd> button.
              </>
            ),
          },
          {
            text: (
              <>
                Tap <Kbd>Install</Kbd> or <Kbd>Add to Home screen</Kbd>.
              </>
            ),
          },
          {
            text: (
              <>
                Tap <Kbd>Add</Kbd> to confirm.
              </>
            ),
          },
        ] satisfies Step[],
        note: null,
      }
    }
    return {
      steps: [
        {
          text: (
            <>
              Tap the <Kbd>{dots} Menu</Kbd> button in the top-right corner.
            </>
          ),
        },
        {
          text: (
            <>
              Tap <Kbd>Add to Home screen</Kbd> or <Kbd>Install app</Kbd>.
            </>
          ),
        },
        {
          text: (
            <>
              Tap <Kbd>Install</Kbd> to confirm.
            </>
          ),
        },
      ] satisfies Step[],
      note: 'Chrome usually shows an install prompt directly – if it did not, the menu route above always works.',
    }
  }

  // desktop
  if (b === 'chrome' || b === 'edge') {
    return {
      steps: [
        {
          text: (
            <>
              Click the <Kbd>install</Kbd> icon at the right-hand end of the address bar.
            </>
          ),
        },
        {
          text: (
            <>
              Or open the browser menu and choose{' '}
              {b === 'edge' ? (
                <>
                  <Kbd>Apps</Kbd> then <Kbd>Install this site as an app</Kbd>
                </>
              ) : (
                <>
                  <Kbd>Cast, save and share</Kbd> then <Kbd>Install page as app</Kbd>
                </>
              )}
              .
            </>
          ),
        },
      ] satisfies Step[],
      note: 'On your phone, open this page and tap Add to Home Screen to get it as an app there too.',
    }
  }
  if (b === 'safari') {
    return {
      steps: [
        {
          text: (
            <>
              In the menu bar choose <Kbd>File</Kbd> then <Kbd>Add to Dock</Kbd>.
            </>
          ),
        },
      ] satisfies Step[],
      note: 'Requires macOS Sonoma or later. On iPhone or iPad use Share then Add to Home Screen.',
    }
  }
  return {
    steps: [
      {
        text: <>Open this page in Chrome or Edge and use the install icon in the address bar.</>,
      },
      {
        text: (
          <>
            On a phone, open the page and tap <Kbd>{addIcon} Add to Home Screen</Kbd> from the browser's
            share or menu button.
          </>
        ),
      },
    ] satisfies Step[],
    note: null,
  }
}
