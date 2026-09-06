import { Droplets, Snowflake } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { SliderField } from '@/components/SliderField'
import { Stat, StatGrid } from '@/components/Stat'
import { UnitToggle } from '@/components/UnitToggle'
import { COIL_PRESETS, coilPreset, type CoilId } from '@/lib/presets'
import type { CoilResult, MoistAirState } from '@/lib/psychro'
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
}: Props) {
  const preset = coilPreset(coilId)
  const off = coilId === 'off'
  const leaving = result?.leaving ?? entering
  const condensateLs = result?.condensateKgS ?? 0
  const condensateLh = condensateLs * 3600
  const primaryMoisture = moistureUnit === 'ls' ? condensateLs : condensateLh
  const secondaryMoisture = moistureUnit === 'ls' ? condensateLh : condensateLs

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
          Pick a coil type to see how much moisture it wrings out of the airstream.
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
          <p className="text-xs text-muted-foreground leading-snug">
            <span className="font-medium text-foreground">{preset.label}.</span> {preset.description}
          </p>
        </div>

        <div className="space-y-4">
          <SliderField
            label="Apparatus dew point"
            hint="Effective coil surface temperature"
            value={adp}
            onChange={onAdp}
            min={-10}
            max={30}
            step={0.5}
            unit="°C"
            digits={1}
            disabled={off}
          />
          <SliderField
            label="Bypass factor"
            hint="Share of air that misses the fins (fewer rows = higher)"
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

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Droplets className="size-4 text-sky-600 dark:text-sky-400" />
              Moisture removed
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
              {off ? '0' : fmtAuto(primaryMoisture)}
            </span>
            <span className="text-sm text-muted-foreground">
              {moistureUnit === 'ls' ? 'L/s' : 'L/h'}
            </span>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {off ? '0' : fmtAuto(secondaryMoisture)} {moistureUnit === 'ls' ? 'L/h' : 'L/s'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="secondary" className="font-mono">
              {off ? '0' : fmt(condensateLh * 24, 0)} L/day
            </Badge>
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
            value={fmt(result?.totalKw ?? 0, 2)}
            unit="kW"
            sub={result ? `SHR ${fmt(result.shr, 2)}` : undefined}
          />
          <Stat
            label="Sensible / latent"
            value={`${fmt(result?.sensibleKw ?? 0, 1)} / ${fmt(result?.latentKw ?? 0, 1)}`}
            unit="kW"
          />
        </StatGrid>
      </CardContent>
    </Card>
  )
}
