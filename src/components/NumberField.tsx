import { useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  digits?: number
  className?: string
}

/** Compact labelled number box – drafts while typing, commits on blur / Enter. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  min = -Infinity,
  max = Infinity,
  digits = 1,
  className,
}: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value.toFixed(digits)

  const commit = () => {
    const parsed = Number.parseFloat(text.replace(/[,\s]/g, ''))
    if (Number.isFinite(parsed)) {
      onChange(Number(Math.min(Math.max(parsed, min), max).toFixed(digits)))
    }
    setDraft(null)
  }

  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onFocus={(e) => {
            setDraft(text)
            e.target.select()
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="h-9 w-full min-w-0 bg-transparent px-2 text-right font-mono text-base font-semibold tabular-nums outline-none"
        />
        {unit ? <span className="pr-2 text-xs text-muted-foreground shrink-0">{unit}</span> : null}
      </div>
    </div>
  )
}
