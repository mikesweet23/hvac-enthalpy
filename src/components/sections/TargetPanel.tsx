import { useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import { NumberField } from '@/components/NumberField'
import { Stat, StatGrid } from '@/components/Stat'
import { analyseTarget, type TargetSpec } from '@/lib/target'
import type { MoistAirState } from '@/lib/psychro'
import { fmt, fmtAuto, signed } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  /** air entering the heater (coil leaving condition) */
  entering: MoistAirState
  massFlowKgS: number
  target: TargetSpec
  onTarget: (t: TargetSpec) => void
  /** set the heater to the given output (kW) */
  onApplyKw: (kw: number) => void
}

export function TargetPanel({ entering, massFlowKgS, target, onTarget, onApplyKw }: Props) {
  const a = useMemo(() => analyseTarget(entering, massFlowKgS, target), [entering, massFlowKgS, target])
  const { spec, band, required } = a
  const canFlow = massFlowKgS > 0
  const tooMoist = required.deltaW < 0

  const bandLabel =
    spec.tolK > 0 ? `${fmt(band.lo, 1)} – ${fmt(band.hi, 1)} °C` : `${fmt(spec.tempC, 1)} °C`

  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Crosshair className="size-4 text-orange-600 dark:text-orange-400" />
          Target room condition
        </div>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
          Where the air needs to end up after heating. Moisture is fixed by the coil, so temperature and RH
          are tied together.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="Temperature"
          value={spec.tempC}
          onChange={(v) => onTarget({ ...spec, tempC: v })}
          unit="°C"
          min={-50}
          max={60}
          digits={1}
        />
        <NumberField
          label="Tolerance"
          value={spec.tolK}
          onChange={(v) => onTarget({ ...spec, tolK: v })}
          unit="± K"
          min={0}
          max={20}
          digits={1}
        />
        <NumberField
          label="Humidity"
          value={spec.rhPct}
          onChange={(v) => onTarget({ ...spec, rhPct: v })}
          unit="%"
          min={1}
          max={100}
          digits={0}
        />
      </div>

      <StatGrid>
        <Stat
          label={`RH at ${fmt(spec.tempC, 1)} °C`}
          value={fmt(a.atTarget.rh * 100, 0)}
          unit="%"
          emphasis="warm"
          sub={
            a.saturatedAtTarget
              ? 'saturated – moisture would condense'
              : a.kwToTarget === null
                ? 'coil air is already warmer than this'
                : `${fmtAuto(a.kwToTarget)} kW · ${signed(spec.tempC - entering.t, 1)} K`
          }
        />
        <Stat
          label={`${fmt(spec.rhPct, 0)} % RH reached at`}
          value={a.tForRh === null ? '—' : fmt(a.tForRh, 1)}
          unit="°C"
          emphasis="warm"
          sub={
            a.tForRh === null
              ? 'not reachable at this moisture content'
              : a.kwForRh === null
                ? 'below the coil leaving temperature'
                : `${fmtAuto(a.kwForRh)} kW · ${signed(a.tForRh - entering.t, 1)} K`
          }
        />
      </StatGrid>

      <div
        className={cn(
          'rounded-lg border px-3 py-2 text-xs leading-snug',
          a.rhInBand
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
        )}
      >
        {a.rhInBand && a.tForRh !== null ? (
          <>
            <span className="font-semibold">Achievable by heating alone.</span> {fmt(spec.rhPct, 0)} % RH lands
            at {fmt(a.tForRh, 1)} °C, inside the {bandLabel} band
            {a.kwForRh !== null ? ` – ${fmtAuto(a.kwForRh)} kW of heat.` : '.'}
          </>
        ) : (
          <>
            <span className="font-semibold">Not achievable by heating alone.</span> Across {bandLabel} the RH
            would run {fmt(band.rhAtLo * 100, 0)} – {fmt(band.rhAtHi * 100, 0)} %, so {fmt(spec.rhPct, 0)} %
            needs the moisture content changed.
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-snug">
        {fmt(spec.tempC, 1)} °C / {fmt(spec.rhPct, 0)} % needs{' '}
        <span className="font-medium text-foreground">{fmt(required.W * 1000, 2)} g/kg</span> (dew point{' '}
        {fmt(required.td, 1)} °C). The air after the coil holds {fmt(entering.W * 1000, 2)} g/kg
        {Math.abs(required.deltaW) * 1000 < 0.05 ? (
          ' – spot on.'
        ) : tooMoist ? (
          <>
            {' '}
            – <span className="font-medium text-foreground">remove {fmt(-required.deltaW * 1000, 2)} g/kg</span>
            {canFlow ? ` (≈ ${fmtAuto(-required.kgPerH)} kg/h)` : ''}: lower the coil ADP or use a deeper coil.
          </>
        ) : (
          <>
            {' '}
            – <span className="font-medium text-foreground">add {fmt(required.deltaW * 1000, 2)} g/kg</span>
            {canFlow ? ` (≈ ${fmtAuto(required.kgPerH)} kg/h)` : ''}: a humidifier is needed.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Set heater to:</span>
        <ApplyButton
          kw={a.kwToTarget}
          label={`${fmt(spec.tempC, 1)} °C`}
          disabled={!canFlow}
          onApply={onApplyKw}
        />
        <ApplyButton
          kw={a.kwForRh}
          label={`${fmt(spec.rhPct, 0)} % RH`}
          disabled={!canFlow}
          onApply={onApplyKw}
        />
      </div>
    </div>
  )
}

function ApplyButton({
  kw,
  label,
  disabled,
  onApply,
}: {
  kw: number | null
  label: string
  disabled: boolean
  onApply: (kw: number) => void
}) {
  const ok = kw !== null && !disabled
  return (
    <button
      type="button"
      disabled={!ok}
      onClick={() => {
        if (kw !== null) onApply(Math.ceil(kw * 10) / 10)
      }}
      className="rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-xs font-medium tabular-nums hover:bg-orange-500/20 disabled:opacity-40 disabled:hover:bg-orange-500/10"
    >
      {label} → {kw === null ? 'n/a' : `${fmtAuto(kw)} kW`}
    </button>
  )
}
