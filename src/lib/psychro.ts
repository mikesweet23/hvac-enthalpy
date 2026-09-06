/**
 * Moist-air psychrometrics (SI). Formulations follow ASHRAE Fundamentals
 * (Hyland–Wexler saturation pressure) and are valid from -100 °C to +200 °C,
 * comfortably covering the -50 °C … +50 °C range used by the app.
 *
 * Conventions
 *  - temperatures in °C, pressures in Pa
 *  - W  = humidity ratio, kg water / kg dry air
 *  - h  = specific enthalpy, kJ / kg dry air
 *  - v  = specific volume, m³ / kg dry air
 */

export const P_ATM = 101_325 // Pa, sea level standard

const T0 = 273.15
const CP_DA = 1.006 // kJ/kg·K dry air
const CP_WV = 1.86 // kJ/kg·K water vapour
const H_FG = 2501 // kJ/kg latent heat of vaporisation at 0 °C
const R_DA = 0.287042 // kJ/kg·K dry air

/** Saturation vapour pressure over ice (t <= 0 °C) or liquid water (t > 0 °C). */
export function satPressure(tC: number): number {
  const T = tC + T0
  if (tC <= 0) {
    return Math.exp(
      -5.6745359e3 / T +
        6.3925247 -
        9.677843e-3 * T +
        6.2215701e-7 * T ** 2 +
        2.0747825e-9 * T ** 3 -
        9.484024e-13 * T ** 4 +
        4.1635019 * Math.log(T),
    )
  }
  return Math.exp(
    -5.8002206e3 / T +
      1.3914993 -
      4.8640239e-2 * T +
      4.1764768e-5 * T ** 2 -
      1.4452093e-8 * T ** 3 +
      6.5459673 * Math.log(T),
  )
}

export function humidityRatioFromVapourPressure(pw: number, p = P_ATM): number {
  return (0.621945 * pw) / (p - pw)
}

export function vapourPressureFromHumidityRatio(W: number, p = P_ATM): number {
  return (p * W) / (0.621945 + W)
}

export function saturationHumidityRatio(tC: number, p = P_ATM): number {
  return humidityRatioFromVapourPressure(satPressure(tC), p)
}

export function enthalpy(tC: number, W: number): number {
  return CP_DA * tC + W * (H_FG + CP_WV * tC)
}

/** Dry-bulb temperature that gives enthalpy h at humidity ratio W. */
export function temperatureFromEnthalpy(h: number, W: number): number {
  return (h - H_FG * W) / (CP_DA + CP_WV * W)
}

export function specificVolume(tC: number, W: number, p = P_ATM): number {
  return (R_DA * (tC + T0) * (1 + 1.607858 * W)) / (p / 1000)
}

/** Moist-air heat capacity per kg dry air, kJ/(kg·K). */
export function moistCp(W: number): number {
  return CP_DA + CP_WV * W
}

function bisect(
  f: (x: number) => number,
  lo: number,
  hi: number,
  iterations = 80,
): number {
  let fLo = f(lo)
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2
    const fMid = f(mid)
    if (fMid === 0) return mid
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid
      fLo = fMid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/**
 * Dew point (frost point below 0 °C) for a given vapour pressure.
 * Returns null when there is no water vapour present.
 */
export function dewPointFromVapourPressure(pw: number): number | null {
  if (!(pw > 0)) return null
  return bisect((t) => satPressure(t) - pw, -100, 100)
}

/** Thermodynamic wet-bulb temperature via the ASHRAE psychrometer relation. */
export function wetBulb(tC: number, W: number, p = P_ATM): number {
  const residual = (twb: number) => {
    const Ws = saturationHumidityRatio(twb, p)
    const Wcalc =
      twb >= 0
        ? ((H_FG - 2.326 * twb) * Ws - CP_DA * (tC - twb)) /
          (H_FG + CP_WV * tC - 4.186 * twb)
        : ((2830 - 0.24 * twb) * Ws - CP_DA * (tC - twb)) /
          (2830 + CP_WV * tC - 2.1 * twb)
    return Wcalc - W
  }
  return bisect(residual, -100, tC)
}

export interface MoistAirState {
  /** dry-bulb, °C */
  t: number
  /** relative humidity, 0..1 */
  rh: number
  /** humidity ratio, kg/kg dry air */
  W: number
  /** partial pressure of water vapour, Pa */
  pw: number
  /** saturation pressure at t, Pa */
  pws: number
  /** enthalpy, kJ/kg dry air */
  h: number
  /** specific volume, m³/kg dry air */
  v: number
  /** moist-air density, kg/m³ */
  rho: number
  /** dew / frost point, °C (null when bone dry) */
  td: number | null
  /** wet-bulb, °C */
  twb: number
}

export function stateFromTempRh(tC: number, rh: number, p = P_ATM): MoistAirState {
  const rhClamped = Math.min(Math.max(rh, 0), 1)
  const pws = satPressure(tC)
  const pw = rhClamped * pws
  const W = humidityRatioFromVapourPressure(pw, p)
  return finishState(tC, rhClamped, W, pw, pws, p)
}

export function stateFromTempW(tC: number, W: number, p = P_ATM): MoistAirState {
  const pws = satPressure(tC)
  const Wc = Math.max(W, 0)
  const pw = vapourPressureFromHumidityRatio(Wc, p)
  const rh = pws > 0 ? Math.min(pw / pws, 1) : 0
  return finishState(tC, rh, Wc, pw, pws, p)
}

function finishState(
  t: number,
  rh: number,
  W: number,
  pw: number,
  pws: number,
  p: number,
): MoistAirState {
  const v = specificVolume(t, W, p)
  return {
    t,
    rh,
    W,
    pw,
    pws,
    h: enthalpy(t, W),
    v,
    rho: (1 + W) / v,
    td: dewPointFromVapourPressure(pw),
    twb: wetBulb(t, W, p),
  }
}

/** Dry-air mass flow (kg/s) for a volume flow (m³/s) measured at the given state. */
export function dryAirMassFlow(volumeFlowM3s: number, state: MoistAirState): number {
  return volumeFlowM3s / state.v
}

/** Latent heat of fusion of water at 0 °C, kJ/kg. */
export const H_FUSION = 333.6
/** Specific heat of liquid water, kJ/kg·K. */
export const CP_WATER = 4.186

/**
 * Specific heat of ice / frost, kJ/(kg·K). Falls almost linearly from
 * 2.10 at 0 °C to about 1.72 at -50 °C (CRC / ASHRAE data).
 */
export function iceCp(tC: number): number {
  const t = Math.min(tC, 0)
  return 2.108 + 0.0077 * t
}

/**
 * Enthalpy of frost at temperature t relative to liquid water at 0 °C, kJ/kg.
 * Negative: energy must be *added* to bring frost back to liquid at 0 °C.
 * Uses the mean ice cp over 0 → t for the sensible part.
 */
export function frostEnthalpy(tC: number): number {
  const t = Math.min(tC, 0)
  const cpMean = (iceCp(0) + iceCp(t)) / 2
  return -(H_FUSION + cpMean * -t)
}

export interface CoilResult {
  leaving: MoistAirState
  /** total water removed from the air, kg/s */
  condensateKgS: number
  /** liquid running to the drain, kg/s (≈ L/s) */
  drainKgS: number
  /** water deposited as frost on the coil, kg/s */
  frostKgS: number
  /** true when the coil surface is below 0 °C and moisture freezes on it */
  frosting: boolean
  /** extra coil load from freezing and sub-cooling the frost, kW */
  frostKw: number
  totalKw: number
  sensibleKw: number
  latentKw: number
  /** sensible heat ratio, 0..1 */
  shr: number
  /** true when the coil surface is dry and no dehumidification occurs */
  dryCoil: boolean
}

/**
 * Cooling coil modelled with an apparatus dew point (ADP) and bypass factor (BF).
 * Leaving air is the mixture of BF fraction of untouched entering air and
 * (1 - BF) of air saturated at the ADP. When the entering dew point is below
 * the ADP the coil runs dry and only sensible cooling occurs.
 *
 * Below 0 °C the coil surface is frosted: the removed moisture is held on the
 * fins as ice rather than draining, and the coil must additionally reject the
 * heat of fusion plus the sensible heat of cooling the ice to the ADP.
 */
export function coolingCoil(
  entering: MoistAirState,
  adpC: number,
  bypassFactor: number,
  massFlowKgS: number,
  p = P_ATM,
): CoilResult {
  const bf = Math.min(Math.max(bypassFactor, 0), 1)
  const tOut = bf * entering.t + (1 - bf) * adpC
  const WsAdp = saturationHumidityRatio(adpC, p)
  const dryCoil = entering.W <= WsAdp
  const WOut = dryCoil ? entering.W : bf * entering.W + (1 - bf) * WsAdp

  const leaving = stateFromTempW(tOut, WOut, p)
  const condensateKgS = Math.max(massFlowKgS * (entering.W - leaving.W), 0)
  const frosting = adpC < 0 && condensateKgS > 0
  const frostKgS = frosting ? condensateKgS : 0
  const drainKgS = frosting ? 0 : condensateKgS

  // Energy balance: Q = m_da (h_in - h_out) - m_w h_w, with h_w the enthalpy of the
  // water leaving the airstream. Liquid condensate at ~ADP carries a little heat away;
  // frost has strongly negative enthalpy, so it *adds* to the coil load.
  const airKw = Math.max(massFlowKgS * (entering.h - leaving.h), 0)
  const frostKw = frosting ? frostKgS * -frostEnthalpy(adpC) : 0
  const drainKw = drainKgS * CP_WATER * Math.max(adpC, 0)
  const totalKw = Math.max(airKw + frostKw - drainKw, 0)
  const sensibleKw = Math.min(
    Math.max(massFlowKgS * moistCp(leaving.W) * (entering.t - leaving.t), 0),
    totalKw,
  )
  const latentKw = Math.max(totalKw - sensibleKw, 0)
  return {
    leaving,
    condensateKgS,
    drainKgS,
    frostKgS,
    frosting,
    frostKw,
    totalKw,
    sensibleKw,
    latentKw,
    shr: totalKw > 0 ? sensibleKw / totalKw : 1,
    dryCoil,
  }
}

export interface FrostAccumulation {
  /** frost mass built up on the coil over the run period, kg */
  massKg: number
  /** energy to warm the frost to 0 °C and melt it, kWh */
  defrostKwh: number
  /** …of which sensible (ice warming) part, kWh */
  sensibleKwh: number
  /** …of which latent (melting) part, kWh */
  meltKwh: number
  /** water released to drain when the coil is defrosted, L */
  meltwaterL: number
}

/** Frost held on the coil after `hours` of running, and what it takes to clear it. */
export function frostAccumulation(frostKgS: number, frostTempC: number, hours: number): FrostAccumulation {
  const massKg = Math.max(frostKgS * hours * 3600, 0)
  const t = Math.min(frostTempC, 0)
  const cpMean = (iceCp(0) + iceCp(t)) / 2
  const sensibleKj = massKg * cpMean * -t
  const meltKj = massKg * H_FUSION
  return {
    massKg,
    defrostKwh: (sensibleKj + meltKj) / 3600,
    sensibleKwh: sensibleKj / 3600,
    meltKwh: meltKj / 3600,
    meltwaterL: massKg,
  }
}

export interface HeatingResult {
  leaving: MoistAirState
  /** temperature rise, K */
  deltaT: number
}

/** Sensible heat addition at constant humidity ratio. */
export function sensibleHeating(
  entering: MoistAirState,
  heatKw: number,
  massFlowKgS: number,
  p = P_ATM,
): HeatingResult {
  if (!(massFlowKgS > 0) || !(heatKw > 0)) {
    return { leaving: entering, deltaT: 0 }
  }
  const hOut = entering.h + heatKw / massFlowKgS
  const tOut = temperatureFromEnthalpy(hOut, entering.W)
  const leaving = stateFromTempW(tOut, entering.W, p)
  return { leaving, deltaT: tOut - entering.t }
}

/** Heat (kW) needed to raise air from one dry-bulb to another at constant W. */
export function heatForTemperatureRise(
  entering: MoistAirState,
  targetC: number,
  massFlowKgS: number,
): number {
  const hOut = enthalpy(targetC, entering.W)
  return Math.max(massFlowKgS * (hOut - entering.h), 0)
}
