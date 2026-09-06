import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatProps {
  label: string
  value: string
  unit?: string
  sub?: ReactNode
  emphasis?: 'default' | 'primary' | 'cool' | 'warm'
  className?: string
}

const toneClasses: Record<NonNullable<StatProps['emphasis']>, string> = {
  default: 'bg-muted/40 border-border',
  primary: 'bg-primary/10 border-primary/30',
  cool: 'bg-sky-500/10 border-sky-500/30',
  warm: 'bg-orange-500/10 border-orange-500/30',
}

export function Stat({ label, value, unit, sub, emphasis = 'default', className }: StatProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 flex flex-col gap-0.5 min-w-0',
        toneClasses[emphasis],
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </span>
      <span className="flex items-baseline gap-1 min-w-0">
        <span className="font-mono text-xl font-semibold tabular-nums leading-none truncate">
          {value}
        </span>
        {unit ? <span className="text-xs text-muted-foreground shrink-0">{unit}</span> : null}
      </span>
      {sub ? <span className="text-[11px] text-muted-foreground leading-tight">{sub}</span> : null}
    </div>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-2', className)}>{children}</div>
}
