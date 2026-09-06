import { Droplets, Snowflake, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { SliderField } from '@/components/SliderField'
import { Stat, StatGrid } from '@/components/Stat'
import { UnitToggle } from '@/components/UnitToggle'
import { COIL_PRESETS, coilPreset, type CoilId } from '@/lib/presets'
import { frostAccumulation, iceCp, type CoilResult, type MoistAirState } from '@/lib/psychro'
import { fmt, fmtAuto, signed } from '@/lib/format'

export type MoistureUnit = 'ls' | 'lh'

interface Props {
  coilId: CoilId
  adp: number
  bf: number
  onCoil: (id: CoilId) => void
  onAdp: (v: number) => void
  onBf: (v: number) => void
  entering: MoistAirState
  result: CoilResult | null
  moistureUnit: MoistureUnit
  onMoistureUnit: (u: MoistureUnit) => void
  runHours: number
  onRunHours: (h: number) => void
}

function rate(kgS: number, unit: MoistureUnit): string {
  return fmtAuto(unit === 'ls' ? kgS : kgS * 3600)
}

export function CoolingCoilCard({
  coilId,
  adp,
  bf,
  onCoil,
  onAdp,
  onBf,
  entering,
  result,
  moistureUnit,
  onMoistureUnit,
  runHours,
  onRunHours,
}: Props) {
  const preset = coilPreset(coilId)
  const off = coilId === 'off'
  const leaving = result?.leaving ?? entering
  const frosting = !!result?.frosting
  const removedKgS = result?.condensateKgS ?? 0
  const drainKgS = result?.drainKgS ?? 0
  const frostKgS = result?.frostKgS ?? 0
  const primaryUnit = moistureUnit === 'ls' ? 'L/s' : 'L/h'
  const secondaryUnit = moistureUnit === 'ls' ? 'L/h' : 'L/s'
  const otherUnit: MoistureUnit = moistureUnit === 'ls' ? 'lh' : 'ls'
  const frost = frostAccumulation(frostKgS, adp, runHours)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Snowflake className="size-4" />
          </span>
          Cooling coil
          <span className="ml-auto rounded-full bg-sky-500 text-white text-xs font-bold size-6 grid place-items-center">
            B
          </span>
        </CardTitle>
        <CardDescription>
          Pick a coil by type and rows. Each sets a typical apparatus dew point and bypass factor you can
          fine-tune.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <ToggleGroup
            type="single"
            value={coilId}
            onValueChange={(v) => {
              if (v) onCoil(v as CoilId)
            }}
            variant="outline"
            spacing={2}
            className="grid grid-cols-3 w-full"
            aria-label="Coil type"
          >
            {COIL_PRESETS.map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                className="h-9 w-full data-[state=on]:bg-sky-500 data-[state=on]:text-white data-[state=on]:border-sky-500 text-xs sm:text-sm"
              >
                {c.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-snug space-y-1">
            <p>
              <span className="font-semibold text-foreground">{preset.label}</span>
              {!off && coilId !== 'custom' ? (
                <span className="text-muted-foreground">
                  {' '}
                  · ADP {fmt(preset.adp, 0)} °C · BF {fmt(preset.bf, 2)}
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground">{preset.description}</p>
            <p className="flex items-start gap-1 text-foreground/90">
              <Sparkles className="size-3 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>
                <span className="font-medium">Example:</span> {preset.example}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <SliderField
            label="Apparatus dew point"
            hint="Effective coil surface temperature. Below 0 °C the coil frosts."
            value={adp}
            onChange={onAdp}
            min={-45}
            max={30}
            step={0.5}
            unit="°C"
            digits={1}
            disabled={off}
          />
          <SliderField
            label="Bypass factor"
            hint="Share of air that misses the fins – fewer rows means more bypass"
            value={bf}
            onChange={onBf}
            min={0}
            max={0.6}
            step={0.01}
            unit=""
            digits={2}
            disabled={off}
          />
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Droplets className="size-4 text-sky-600 dark:text-sky-400" />
              Moisture removed from air
            </span>
            <UnitToggle
              value={moistureUnit}
              onChange={onMoistureUnit}
              ariaLabel="Moisture removal unit"
              options={[
                { value: 'ls', label: 'L/s' },
                { value: 'lh', label: 'L/h' },
              ]}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tabular-nums leading-none">
              {off ? '0' : rate(removedKgS, moistureUnit)}
            </span>
            <span className="text-sm text-muted-foreground">{primaryUnit}</span>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {off ? '0' : rate(removedKgS, otherUnit)} {secondaryUnit}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              className={
                'rounded-lg border px-3 py-2 ' +
                (!frosting && drainKgS > 0 ? 'border-sky-500/40 bg-background/60' : 'border-border/60 bg-background/30')
              }
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Liquid to drain</p>
              <p className="font-mono text-lg font-semibold tabular-nums leading-tight">
                {off ? '0' : rate(drainKgS, moistureUnit)}{' '}
                <span className="text-xs font-normal text-muted-foreground">{primaryUnit}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{off ? '0' : fmt(drainKgS * 86400, 0)} L/day</p>
            </div>
            <div
              className={
                'rounded-lg border px-3 py-2 ' +
                (frosting ? 'border-cyan-300/60 bg-cyan-400/10' : 'border-border/60 bg-background/30')
              }
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Held as frost</p>
              <p className="font-mono text-lg font-semibold tabular-nums leading-tight">
                {off ? '0' : fmtAuto(frostKgS * 3600)}{' '}
                <span className="text-xs font-normal text-muted-foreground">kg/h</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {frosting ? `ice at ${fmt(adp, 1)} °C` : 'coil above 0 °C'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="secondary" className="font-mono">
              Δ {off ? '0.00' : fmt((entering.W - leaving.W) * 1000, 2)} g/kg
            </Badge>
            {result?.dryCoil && !off ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                Dry coil – ADP above entering dew point
              </Badge>
            ) : null}
          </div>
        </div>

        {frosting ? (
          <div className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Snowflake className="size-4 text-cyan-600 dark:text-cyan-300" />
              Frost build-up &amp; defrost
            </div>
            <SliderField
              label="Run time before defrost"
              value={runHours}
              onChange={onRunHours}
              min={0.5}
              max={24}
              step={0.5}
              unit="h"
              digits={1}
              inputMax={168}
            />
            <StatGrid>
              <Stat
                label="Frost on coil"
                value={fmtAuto(frost.massKg)}
                unit="kg"
                emphasis="cool"
                sub={`ready to defrost after ${fmt(runHours, 1)} h`}
              />
              <Stat
                label="Meltwater at defrost"
                value={fmtAuto(frost.meltwaterL)}
                unit="L"
                emphasis="cool"
                sub="to drain when the coil clears"
              />
              <Stat
                label="Defrost energy"
                value={fmt(frost.defrostKwh, 2)}
                unit="kWh"
                sub={`warm ${fmt(frost.sensibleKwh, 2)} + melt ${fmt(frost.meltKwh, 2)} kWh`}
              />
              <Stat
                label="Frost load on coil"
                value={fmt(result?.frostKw ?? 0, 2)}
                unit="kW"
                sub={`freeze + cool ice · cp ${fmt(iceCp(adp), 2)} kJ/kg·K`}
              />
            </StatGrid>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Ice specific heat falls from 2.11 kJ/kg·K at 0 °C to 1.72 at −50 °C; the mean over the frost
              temperature range is used. Melting takes 333.6 kJ/kg. Drain heaters and meltwater warming are
              not included.
            </p>
          </div>
        ) : null}

        <StatGrid>
          <Stat
            label="Leaving temperature"
            value={fmt(leaving.t, 1)}
            unit="°C"
            emphasis="cool"
            sub={off ? 'Unchanged' : `${signed(leaving.t - entering.t, 1)} K`}
          />
          <Stat
            label="Leaving RH"
            value={fmt(leaving.rh * 100, 0)}
            unit="%"
            emphasis="cool"
            sub={off ? 'Unchanged' : `${signed((leaving.rh - entering.rh) * 100, 0)} pts`}
          />
          <Stat label="Leaving dew point" value={fmt(leaving.td, 1)} unit="°C" />
          <Stat label="Leaving enthalpy" value={fmt(leaving.h, 1)} unit="kJ/kg" />
          <Stat
            label="Total cooling"
            value={fmtAuto(result?.totalKw ?? 0)}
            unit="kW"
            sub={result ? `SHR ${fmt(result.shr, 2)}${frosting ? ' · incl. frost load' : ''}` : undefined}
          />
          <Stat
            label="Sensible / latent"
            value={`${fmtAuto(result?.sensibleKw ?? 0)} / ${fmtAuto(result?.latentKw ?? 0)}`}
            unit="kW"
          />
        </StatGrid>
      </CardContent>
    </Card>
  )
}
