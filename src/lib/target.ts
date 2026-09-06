import {
  heatForTemperatureRise,
  saturationHumidityRatio,
  stateFromTempRh,
  stateFromTempW,
  temperatureForRelativeHumidity,
  type MoistAirState,
} from '@/lib/psychro'

/** Room / supply condition the engineer is trying to hit after the heater. */
export interface TargetSpec {
  /** design dry-bulb, °C */
  tempC: number
  /** allowed deviation either side of tempC, K */
  tolK: number
  /** required relative humidity, % */
  rhPct: number
}

export interface TargetAnalysis {
  spec: TargetSpec
  /** air heated (at constant moisture) to the target temperature */
  atTarget: MoistAirState
  /** moisture content exceeds saturation at the target temperature – it would fog / condense */
  saturatedAtTarget: boolean
  /** heat to reach the target temperature from the coil leaving condition, kW – null if the air is already warmer */
  kwToTarget: number | null
  /** temperature at which the air (constant W) sits at the target RH */
  tForRh: number | null
  /** heat to reach tForRh, kW – null when it is below the coil leaving temperature */
  kwForRh: number | null
  band: {
    lo: number
    hi: number
    /** RH at the cold end of the band (the highest RH the band can give) */
    rhAtLo: number
    /** RH at the warm end of the band (the lowest RH the band can give) */
    rhAtHi: number
  }
  /** the required RH can be met somewhere inside the temperature band */
  rhInBand: boolean
  /** what the air would need to hold to hit tempC AND rhPct */
  required: {
    W: number
    td: number | null
    /** required minus actual, kg/kg (positive = needs humidifying) */
    deltaW: number
    /** moisture to add (+) or remove (−) at the design airflow, kg/h */
    kgPerH: number
  }
}

const EPS = 1e-6

export function analyseTarget(afterCoil: MoistAirState, massFlowKgS: number, spec: TargetSpec): TargetAnalysis {
  const W = afterCoil.W
  const rh = Math.min(Math.max(spec.rhPct, 0), 100) / 100
  const tol = Math.max(spec.tolK, 0)

  const atTarget = stateFromTempW(spec.tempC, W)
  const saturatedAtTarget = W > saturationHumidityRatio(spec.tempC) + EPS
  const kwToTarget =
    spec.tempC >= afterCoil.t - EPS ? heatForTemperatureRise(afterCoil, spec.tempC, massFlowKgS) : null

  const tForRh = temperatureForRelativeHumidity(W, rh)
  const kwForRh =
    tForRh !== null && tForRh >= afterCoil.t - EPS ? heatForTemperatureRise(afterCoil, tForRh, massFlowKgS) : null

  const lo = spec.tempC - tol
  const hi = spec.tempC + tol
  const band = { lo, hi, rhAtLo: stateFromTempW(lo, W).rh, rhAtHi: stateFromTempW(hi, W).rh }
  const rhInBand = tForRh !== null && tForRh >= lo - EPS && tForRh <= hi + EPS

  const req = stateFromTempRh(spec.tempC, rh)
  const deltaW = req.W - W
  const required = { W: req.W, td: req.td, deltaW, kgPerH: deltaW * massFlowKgS * 3600 }

  return { spec, atTarget, saturatedAtTarget, kwToTarget, tForRh, kwForRh, band, rhInBand, required }
}
