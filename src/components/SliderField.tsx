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
  /** logarithmic track – useful for ranges spanning several decades (min must be > 0) */
  scale?: 'linear' | 'log'
}

const LOG_STEPS = 1000

/** Round to 3 significant figures so log-slider values look like real selections (e.g. 1 250 not 1 247.3). */
function roundSig(v: number, sig = 3): number {
  if (v === 0) return 0
  const mag = Math.floor(Math.log10(Math.abs(v)))
  const factor = 10 ** (sig - 1 - mag)
  return Math.round(v * factor) / factor
}

function formatBound(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
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
  scale = 'linear',
}: SliderFieldProps) {
  const id = useId()
  // While the user is typing we show their draft; otherwise mirror the live value.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value.toFixed(digits)

  const commit = () => {
    const parsed = Number.parseFloat(text.replace(/[,\s]/g, ''))
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(Math.max(parsed, inputMin), inputMax)
      onChange(Number(clamped.toFixed(digits)))
    }
    setDraft(null)
  }

  const isLog = scale === 'log' && min > 0
  const clamped = Math.min(Math.max(value, min), max)
  const toPos = (v: number) =>
    isLog ? ((Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))) * LOG_STEPS : v
  const fromPos = (p: number) =>
    isLog ? roundSig(Math.exp(Math.log(min) + (p / LOG_STEPS) * (Math.log(max) - Math.log(min)))) : p

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
            className={cn(
              'rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-base tabular-nums font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              inputMax >= 10_000 ? 'w-24' : 'w-20',
            )}
          />
          <span className="text-sm text-muted-foreground w-9">{unit}</span>
        </div>
      </div>
      <Slider
        value={[toPos(clamped)]}
        min={isLog ? 0 : min}
        max={isLog ? LOG_STEPS : max}
        step={isLog ? 1 : step}
        disabled={disabled}
        onValueChange={([p]) => {
          const v = fromPos(p)
          // Snap the ends exactly so the bounds are reachable.
          if (isLog && p === 0) onChange(min)
          else if (isLog && p === LOG_STEPS) onChange(max)
          else onChange(v)
        }}
        aria-label={label}
        className="py-1"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums -mt-1">
        <span>
          {formatBound(min)} {unit}
        </span>
        {isLog ? <span className="italic">log scale</span> : null}
        <span>
          {formatBound(max)} {unit}
        </span>
      </div>
    </div>
  )
}
