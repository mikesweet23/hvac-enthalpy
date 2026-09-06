import { Flame } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { SliderField } from '@/components/SliderField'
import { Stat, StatGrid } from '@/components/Stat'
import { TargetPanel } from '@/components/sections/TargetPanel'
import { HEAT_MODES, type HeatMode } from '@/lib/presets'
import type { HeatingResult, MoistAirState } from '@/lib/psychro'
import { heatForTemperatureRise } from '@/lib/psychro'
import type { TargetSpec } from '@/lib/target'
import { fmt, fmtAuto, signed } from '@/lib/format'

interface Props {
  mode: HeatMode
  heatKw: number
  onMode: (m: HeatMode) => void
  onHeatKw: (v: number) => void
  entering: MoistAirState
  result: HeatingResult
  massFlowKgS: number
  target: TargetSpec
  onTarget: (t: TargetSpec) => void
}

const TARGETS = [18, 21, 24]

/** Round up to 1, 2 or 5 × 10ⁿ so the slider ends on a tidy number. */
function niceCeil(v: number): number {
  const mag = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 5, 10]) {
    if (v <= m * mag) return m * mag
  }
  return 10 * mag
}

export function HeatAddedCard({
  mode,
  heatKw,
  onMode,
  onHeatKw,
  entering,
  result,
  massFlowKgS,
  target,
  onTarget,
}: Props) {
  const info = HEAT_MODES.find((m) => m.id === mode) ?? HEAT_MODES[0]
  const off = mode === 'off'
  const applyKw = (kw: number) => {
    if (off) onMode('heater')
    onHeatKw(kw)
  }
  const leaving = result.leaving
  const outOfRange = leaving.t > 50
  // Scale the slider to the airflow: enough kW for the mode's typical temperature rise.
  const rawMax = Math.max(heatForTemperatureRise(entering, entering.t + info.riseK, massFlowKgS), 5)
  const sliderMax = niceCeil(rawMax)
  const sliderStep = sliderMax >= 1000 ? 5 : sliderMax >= 200 ? 1 : sliderMax >= 50 ? 0.5 : 0.1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400">
            <Flame className="size-4" />
          </span>
          Heat added
          <span className="ml-auto rounded-full bg-orange-500 text-white text-xs font-bold size-6 grid place-items-center">
            C
          </span>
        </CardTitle>
        <CardDescription>
          Sensible heat after the coil. Moisture content stays fixed, so RH falls as the air warms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (v) onMode(v as HeatMode)
            }}
            variant="outline"
            spacing={2}
            className="grid grid-cols-3 w-full"
            aria-label="Heat source"
          >
            {HEAT_MODES.map((m) => (
              <ToggleGroupItem
                key={m.id}
                value={m.id}
                className="h-9 w-full data-[state=on]:bg-orange-500 data-[state=on]:text-white data-[state=on]:border-orange-500 text-xs sm:text-sm"
              >
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground leading-snug">{info.description}</p>
        </div>

        <SliderField
          label={mode === 'heater' ? 'Heater output' : 'Sensible gains'}
          value={heatKw}
          onChange={onHeatKw}
          min={0}
          max={sliderMax}
          step={sliderStep}
          unit="kW"
          digits={1}
          disabled={off}
          inputMax={100_000}
          hint={heatKw < 10 ? `${fmt(heatKw * 1000, 0)} W` : `${fmt(heatKw / 1000, 2)} MW`}
        />

        {!off ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Heat to reach:</span>
            {TARGETS.map((t) => {
              const kw = heatForTemperatureRise(entering, t, massFlowKgS)
              const reachable = t > entering.t && massFlowKgS > 0
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!reachable}
                  onClick={() => onHeatKw(Math.ceil(kw * 10) / 10)}
                  className="rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-xs font-medium tabular-nums hover:bg-orange-500/20 disabled:opacity-40 disabled:hover:bg-orange-500/10"
                >
                  {t} °C → {reachable ? `${fmtAuto(kw)} kW` : 'n/a'}
                </button>
              )
            })}
          </div>
        ) : null}

        <StatGrid>
          <Stat
            label="Final temperature"
            value={fmt(leaving.t, 1)}
            unit="°C"
            emphasis="warm"
            sub={off ? 'Unchanged' : `${signed(result.deltaT, 1)} K rise`}
          />
          <Stat
            label="Final RH"
            value={fmt(leaving.rh * 100, 0)}
            unit="%"
            emphasis="warm"
            sub={off ? 'Unchanged' : `${signed((leaving.rh - entering.rh) * 100, 0)} pts`}
          />
          <Stat label="Dew point" value={fmt(leaving.td, 1)} unit="°C" sub="Constant – no moisture change" />
          <Stat label="Final enthalpy" value={fmt(leaving.h, 1)} unit="kJ/kg" />
          <Stat label="Wet bulb" value={fmt(leaving.twb, 1)} unit="°C" />
          <Stat label="Moisture content" value={fmt(leaving.W * 1000, 2)} unit="g/kg" />
        </StatGrid>

        {outOfRange ? (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
            Final temperature is above the 50 °C chart range
          </Badge>
        ) : null}

        <TargetPanel
          entering={entering}
          massFlowKgS={massFlowKgS}
          target={target}
          onTarget={onTarget}
          onApplyKw={applyKw}
        />
      </CardContent>
    </Card>
  )
}
