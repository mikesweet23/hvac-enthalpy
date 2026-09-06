import { useMemo } from 'react'
import { ArrowRight, RotateCcw, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EnteringAirCard } from '@/components/sections/EnteringAirCard'
import { CoolingCoilCard, type MoistureUnit } from '@/components/sections/CoolingCoilCard'
import { HeatAddedCard } from '@/components/sections/HeatAddedCard'
import { PsychroChart } from '@/components/PsychroChart'
import { InstallButton } from '@/components/InstallButton'
import { usePersistentState } from '@/hooks/usePersistentState'
import { COIL_PRESETS, coilPreset, type CoilId, type FlowUnit, type HeatMode } from '@/lib/presets'
import { coolingCoil, dryAirMassFlow, sensibleHeating, stateFromTempRh } from '@/lib/psychro'
import { fmt } from '@/lib/format'

const DEFAULTS = {
  tempC: 27,
  rhPct: 55,
  flowLs: 500,
  flowUnit: 'ls' as FlowUnit,
  coilId: 'chw6' as CoilId,
  adp: 9,
  bf: 0.1,
  heatMode: 'gains' as HeatMode,
  heatKw: 5,
  moistureUnit: 'lh' as MoistureUnit,
  runHours: 8,
}

export default function App() {
  const [tempC, setTempC] = usePersistentState('tempC', DEFAULTS.tempC)
  const [rhPct, setRhPct] = usePersistentState('rhPct', DEFAULTS.rhPct)
  const [flowLs, setFlowLs] = usePersistentState('flowLs', DEFAULTS.flowLs)
  const [flowUnit, setFlowUnit] = usePersistentState<FlowUnit>('flowUnit', DEFAULTS.flowUnit)
  const [storedCoilId, setCoilId] = usePersistentState<CoilId>('coilId', DEFAULTS.coilId)
  // Coil ids were renamed when row-based presets arrived; fall back gracefully for saved values.
  const coilId: CoilId = COIL_PRESETS.some((c) => c.id === storedCoilId) ? storedCoilId : 'custom'
  const [runHours, setRunHours] = usePersistentState('runHours', DEFAULTS.runHours)
  const [adp, setAdp] = usePersistentState('adp', DEFAULTS.adp)
  const [bf, setBf] = usePersistentState('bf', DEFAULTS.bf)
  const [heatMode, setHeatMode] = usePersistentState<HeatMode>('heatMode', DEFAULTS.heatMode)
  const [heatKw, setHeatKw] = usePersistentState('heatKw', DEFAULTS.heatKw)
  const [moistureUnit, setMoistureUnit] = usePersistentState<MoistureUnit>(
    'moistureUnit',
    DEFAULTS.moistureUnit,
  )

  const entering = useMemo(() => stateFromTempRh(tempC, rhPct / 100), [tempC, rhPct])
  const massFlow = useMemo(() => dryAirMassFlow(flowLs / 1000, entering), [flowLs, entering])

  const coil = useMemo(
    () => (coilId === 'off' ? null : coolingCoil(entering, adp, bf, massFlow)),
    [coilId, entering, adp, bf, massFlow],
  )
  const afterCoil = coil?.leaving ?? entering

  const heating = useMemo(
    () =>
      heatMode === 'off'
        ? { leaving: afterCoil, deltaT: 0 }
        : sensibleHeating(afterCoil, heatKw, massFlow),
    [heatMode, afterCoil, heatKw, massFlow],
  )
  const final = heating.leaving

  const selectCoil = (id: CoilId) => {
    setCoilId(id)
    if (id !== 'off' && id !== 'custom') {
      const p = coilPreset(id)
      setAdp(p.adp)
      setBf(p.bf)
    }
  }
  const adjustAdp = (v: number) => {
    setAdp(v)
    if (coilId !== 'off') setCoilId('custom')
  }
  const adjustBf = (v: number) => {
    setBf(v)
    if (coilId !== 'off') setCoilId('custom')
  }

  const reset = () => {
    setTempC(DEFAULTS.tempC)
    setRhPct(DEFAULTS.rhPct)
    setFlowLs(DEFAULTS.flowLs)
    setFlowUnit(DEFAULTS.flowUnit)
    setCoilId(DEFAULTS.coilId)
    setAdp(DEFAULTS.adp)
    setBf(DEFAULTS.bf)
    setHeatMode(DEFAULTS.heatMode)
    setHeatKw(DEFAULTS.heatKw)
    setMoistureUnit(DEFAULTS.moistureUnit)
    setRunHours(DEFAULTS.runHours)
  }

  const chartPoints = [
    { id: 'A', label: 'Entering', state: entering, color: 'var(--primary)' },
    { id: 'B', label: 'After coil', state: afterCoil, color: '#0ea5e9' },
    { id: 'C', label: 'Final', state: final, color: '#f97316' },
  ]

  return (
    <div className="min-h-dvh bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wind className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight">Enthalpy</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              HVAC psychrometrics · sea level 101.325 kPa
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <InstallButton />
            <Button size="sm" variant="ghost" onClick={reset} aria-label="Reset to defaults">
              <RotateCcw data-icon="inline-start" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-2 text-sm">
          <ProcessChip id="A" t={entering.t} rh={entering.rh} color="bg-primary" />
          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
          <ProcessChip id="B" t={afterCoil.t} rh={afterCoil.rh} color="bg-sky-500" />
          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
          <ProcessChip id="C" t={final.t} rh={final.rh} color="bg-orange-500" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EnteringAirCard
            tempC={tempC}
            rhPct={rhPct}
            flowLs={flowLs}
            flowUnit={flowUnit}
            onTemp={setTempC}
            onRh={setRhPct}
            onFlowLs={setFlowLs}
            onFlowUnit={setFlowUnit}
            state={entering}
            massFlowKgS={massFlow}
          />
          <CoolingCoilCard
            coilId={coilId}
            adp={adp}
            bf={bf}
            onCoil={selectCoil}
            onAdp={adjustAdp}
            onBf={adjustBf}
            entering={entering}
            result={coil}
            moistureUnit={moistureUnit}
            onMoistureUnit={setMoistureUnit}
            runHours={runHours}
            onRunHours={setRunHours}
          />
          <HeatAddedCard
            mode={heatMode}
            heatKw={heatKw}
            onMode={setHeatMode}
            onHeatKw={setHeatKw}
            entering={afterCoil}
            result={heating}
            massFlowKgS={massFlow}
          />
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>Psychrometric chart</CardTitle>
              <CardDescription>
                Blue line is the coil process (towards the apparatus dew point), orange is sensible heating
                along a constant moisture line.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PsychroChart points={chartPoints} />
            </CardContent>
          </Card>
        </div>

        <footer className="text-[11px] text-muted-foreground leading-relaxed px-1 pb-4">
          Properties from ASHRAE Fundamentals (Hyland–Wexler) at standard atmospheric pressure. Coil model uses
          apparatus dew point and bypass factor; condensate density taken as 1 kg/L. Below 0 °C removed
          moisture is held as frost (heat of fusion 333.6 kJ/kg, temperature-dependent ice specific heat) until
          defrost. Results are for design sizing and diagnostics – verify against manufacturer selection data
          before committing.
        </footer>
      </main>
    </div>
  )
}

function ProcessChip({ id, t, rh, color }: { id: string; t: number; rh: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${color}`}>
        {id}
      </span>
      <span className="font-mono tabular-nums text-xs sm:text-sm whitespace-nowrap">
        {fmt(t, 1)}°C · {fmt(rh * 100, 0)}%
      </span>
    </div>
  )
}
