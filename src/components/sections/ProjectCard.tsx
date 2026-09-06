import { useEffect, useState } from 'react'
import { Check, FileDown, FolderPen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isIOS, isTouchDevice } from '@/lib/platform'
import type { ExportOutcome } from '@/lib/report'

interface Props {
  projectRef: string
  notes: string
  onProjectRef: (v: string) => void
  onNotes: (v: string) => void
  onExport: () => Promise<ExportOutcome>
}

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; text: string } | { kind: 'error'; text: string }

export function ProjectCard({ projectRef, notes, onProjectRef, onNotes, onExport }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    if (status.kind !== 'done') return
    const t = setTimeout(() => setStatus({ kind: 'idle' }), 4000)
    return () => clearTimeout(t)
  }, [status])

  const run = async () => {
    setStatus({ kind: 'busy' })
    try {
      const outcome = await onExport()
      if (outcome === 'cancelled') setStatus({ kind: 'idle' })
      else if (outcome === 'shared') setStatus({ kind: 'done', text: 'PDF handed to the share sheet' })
      else setStatus({ kind: 'done', text: 'PDF saved to your downloads' })
    } catch (e) {
      console.error(e)
      setStatus({ kind: 'error', text: 'Could not create the PDF – please try again.' })
    }
  }

  const hint = isIOS()
    ? 'Opens the share sheet – choose Save to Files, or send it straight to mail or Teams.'
    : isTouchDevice()
      ? 'Opens the share sheet or saves to your downloads with the full A/B/C results and chart.'
      : 'Downloads an A4 report with the project reference, all inputs, results and the chart.'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-muted text-foreground/80">
            <FolderPen className="size-4" />
          </span>
          Project reference
        </CardTitle>
        <CardDescription>Label this calculation and export it as a PDF for the job file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="project-ref">Project / reference</Label>
            <Input
              id="project-ref"
              value={projectRef}
              onChange={(e) => onProjectRef(e.target.value)}
              placeholder="e.g. 2419 – Unit 4 AHU-02"
              autoComplete="off"
              enterKeyHint="done"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="project-notes"
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
              placeholder="Design case, assumptions, who it's for…"
              rows={2}
              maxLength={600}
              className="min-h-[2.6rem]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            onClick={run}
            disabled={status.kind === 'busy'}
            size="lg"
            className="w-full sm:w-auto"
            aria-live="polite"
          >
            {status.kind === 'busy' ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : status.kind === 'done' ? (
              <Check data-icon="inline-start" />
            ) : (
              <FileDown data-icon="inline-start" />
            )}
            {status.kind === 'busy' ? 'Preparing PDF…' : status.kind === 'done' ? 'Done' : 'Save as PDF'}
          </Button>
          <p
            className={
              'text-xs leading-snug ' +
              (status.kind === 'error' ? 'text-destructive' : 'text-muted-foreground')
            }
          >
            {status.kind === 'done' || status.kind === 'error' ? status.text : hint}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
