import { useId, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SliderFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit: string
  /** decimals shown in the number box */
  digits?: number
  hint?: string
  disabled?: boolean
  className?: string
  /** allow typing values beyond the slider range */
  inputMin?: number
  inputMax?: number
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  digits = 1,
  hint,
  disabled,
  className,
  inputMin = min,
  inputMax = max,
}: SliderFieldProps) {
  const id = useId()
  // While the user is typing we show their draft; otherwise mirror the live value.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value.toFixed(digits)

  const commit = () => {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(Math.max(parsed, inputMin), inputMax)
      onChange(Number(clamped.toFixed(digits)))
    }
    setDraft(null)
  }

  return (
    <div className={cn('space-y-2', disabled && 'opacity-50', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {hint ? (
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{hint}</p>
          ) : null}
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={text}
            disabled={disabled}
            onFocus={(e) => {
              setDraft(text)
              e.target.select()
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label={`${label} value`}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-base tabular-nums font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <span className="text-sm text-muted-foreground w-9">{unit}</span>
        </div>
      </div>
      <Slider
        value={[Math.min(Math.max(value, min), max)]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
        className="py-1"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums -mt-1">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  )
}
