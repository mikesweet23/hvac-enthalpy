import { Thermometer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SliderField } from '@/components/SliderField'
import { Stat, StatGrid } from '@/components/Stat'
import { UnitToggle } from '@/components/UnitToggle'
import { FLOW_UNITS, type FlowUnit } from '@/lib/presets'
import type { MoistAirState } from '@/lib/psychro'
import { fmt } from '@/lib/format'

interface Props {
  tempC: number
  rhPct: number
  flowLs: number
  flowUnit: FlowUnit
  onTemp: (v: number) => void
  onRh: (v: number) => void
  onFlowLs: (v: number) => void
  onFlowUnit: (v: FlowUnit) => void
  state: MoistAirState
  massFlowKgS: number
}

export function EnteringAirCard({
  tempC,
  rhPct,
  flowLs,
  flowUnit,
  onTemp,
  onRh,
  onFlowLs,
  onFlowUnit,
  state,
  massFlowKgS,
}: Props) {
  const unit = FLOW_UNITS[flowUnit]
  const flowDisplay = unit.fromLs(flowLs)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
            <Thermometer className="size-4" />
          </span>
          Entering air
          <span className="ml-auto rounded-full bg-primary text-primary-foreground text-xs font-bold size-6 grid place-items-center">
            A
          </span>
        </CardTitle>
        <CardDescription>Condition of the air before any treatment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SliderField
          label="Dry-bulb temperature"
          value={tempC}
          onChange={onTemp}
          min={-50}
          max={50}
          step={0.5}
          unit="°C"
          digits={1}
        />
        <SliderField
          label="Relative humidity"
          value={rhPct}
          onChange={onRh}
          min={0}
          max={100}
          step={1}
          unit="%"
          digits={0}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Airflow</span>
            <UnitToggle
              value={flowUnit}
              onChange={onFlowUnit}
              ariaLabel="Airflow unit"
              options={[
                { value: 'ls', label: 'L/s' },
                { value: 'm3h', label: 'm³/h' },
              ]}
            />
          </div>
          <SliderField
            label="Volume flow"
            value={Number(flowDisplay.toFixed(0))}
            onChange={(v) => onFlowLs(unit.toLs(v))}
            min={0}
            max={unit.max}
            step={unit.step}
            unit={unit.label}
            digits={0}
            inputMax={unit.max * 20}
            hint={`≈ ${fmt(massFlowKgS, 3)} kg/s dry air · ${
              flowUnit === 'ls' ? `${fmt(flowLs * 3.6, 0)} m³/h` : `${fmt(flowLs, 0)} L/s`
            }`}
          />
        </div>

        <StatGrid>
          <Stat
            label="Dew / frost point"
            value={fmt(state.td, 1)}
            unit="°C"
            emphasis="primary"
            sub={state.td !== null && state.td <= 0 ? 'Frost point (over ice)' : undefined}
          />
          <Stat label="Enthalpy" value={fmt(state.h, 1)} unit="kJ/kg" emphasis="primary" />
          <Stat label="Wet bulb" value={fmt(state.twb, 1)} unit="°C" />
          <Stat label="Moisture content" value={fmt(state.W * 1000, 2)} unit="g/kg" />
          <Stat label="Vapour pressure" value={fmt(state.pw / 1000, 3)} unit="kPa" />
          <Stat label="Density" value={fmt(state.rho, 3)} unit="kg/m³" />
        </StatGrid>
      </CardContent>
    </Card>
  )
}
