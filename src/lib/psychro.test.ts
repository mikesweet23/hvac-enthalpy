import { describe, expect, it } from 'vitest'
import {
  coolingCoil,
  dewPointFromVapourPressure,
  dryAirMassFlow,
  enthalpy,
  satPressure,
  sensibleHeating,
  stateFromTempRh,
  stateFromTempW,
  temperatureFromEnthalpy,
  wetBulb,
} from './psychro'

// Reference values from ASHRAE Fundamentals psychrometric tables.
describe('saturation pressure', () => {
  it('matches ASHRAE table values over water', () => {
    expect(satPressure(20)).toBeCloseTo(2338.8, 0)
    expect(satPressure(50)).toBeCloseTo(12351.3, -1)
    expect(satPressure(0.01)).toBeCloseTo(611.7, 0)
  })
  it('matches ASHRAE table values over ice', () => {
    expect(satPressure(-20)).toBeCloseTo(103.24, 0)
    expect(satPressure(-50)).toBeCloseTo(3.936, 1)
  })
})

describe('state properties', () => {
  it('reproduces the 20 °C / 50 % RH textbook point', () => {
    const s = stateFromTempRh(20, 0.5)
    expect(s.W * 1000).toBeCloseTo(7.29, 1)
    expect(s.h).toBeCloseTo(38.5, 0)
    expect(s.td).toBeCloseTo(9.27, 1)
    expect(s.twb).toBeCloseTo(13.8, 0)
    expect(s.v).toBeCloseTo(0.840, 2)
  })

  it('round-trips between RH and W', () => {
    const a = stateFromTempRh(35, 0.6)
    const b = stateFromTempW(35, a.W)
    expect(b.rh).toBeCloseTo(0.6, 6)
    expect(b.h).toBeCloseTo(a.h, 6)
  })

  it('handles the cold end of the range', () => {
    const s = stateFromTempRh(-50, 0.8)
    expect(s.W).toBeGreaterThan(0)
    expect(s.W).toBeLessThan(0.0001)
    expect(s.td).not.toBeNull()
    expect(s.td!).toBeLessThan(-50)
    expect(Number.isFinite(s.twb)).toBe(true)
  })

  it('returns null dew point for dry air', () => {
    expect(stateFromTempRh(25, 0).td).toBeNull()
    expect(dewPointFromVapourPressure(0)).toBeNull()
  })

  it('has dew point equal to dry bulb at saturation', () => {
    expect(stateFromTempRh(30, 1).td).toBeCloseTo(30, 4)
    expect(wetBulb(30, stateFromTempRh(30, 1).W)).toBeCloseTo(30, 2)
  })
})

describe('enthalpy inversion', () => {
  it('inverts temperatureFromEnthalpy', () => {
    const W = 0.012
    const h = enthalpy(27, W)
    expect(temperatureFromEnthalpy(h, W)).toBeCloseTo(27, 8)
  })
})

describe('cooling coil', () => {
  const entering = stateFromTempRh(27, 0.5)
  const mdot = dryAirMassFlow(1, entering) // 1 m³/s

  it('dehumidifies when entering dew point exceeds ADP', () => {
    const r = coolingCoil(entering, 9, 0.15, mdot)
    expect(r.dryCoil).toBe(false)
    expect(r.leaving.t).toBeCloseTo(0.15 * 27 + 0.85 * 9, 6)
    expect(r.leaving.W).toBeLessThan(entering.W)
    expect(r.condensateKgS).toBeGreaterThan(0)
    expect(r.totalKw).toBeGreaterThan(r.sensibleKw)
    expect(r.latentKw).toBeCloseTo(r.totalKw - r.sensibleKw, 9)
    expect(r.shr).toBeGreaterThan(0)
    expect(r.shr).toBeLessThan(1)
  })

  it('runs dry when the ADP is above the entering dew point', () => {
    const r = coolingCoil(entering, 20, 0.2, mdot)
    expect(r.dryCoil).toBe(true)
    expect(r.leaving.W).toBeCloseTo(entering.W, 12)
    expect(r.condensateKgS).toBe(0)
    expect(r.shr).toBeCloseTo(1, 3)
  })

  it('produces a sensible condensate rate for a typical AHU', () => {
    // 2000 L/s at 27 °C / 50 % through a 9 °C ADP coil
    const m = dryAirMassFlow(2, entering)
    const r = coolingCoil(entering, 9, 0.15, m)
    const litresPerHour = r.condensateKgS * 3600
    expect(litresPerHour).toBeGreaterThan(20)
    expect(litresPerHour).toBeLessThan(60)
  })
})

describe('sensible heating', () => {
  it('raises temperature, lowers RH and conserves W', () => {
    const inlet = stateFromTempRh(12, 0.9)
    const mdot = dryAirMassFlow(1, inlet)
    const r = sensibleHeating(inlet, 10, mdot)
    expect(r.leaving.W).toBeCloseTo(inlet.W, 12)
    expect(r.leaving.t).toBeGreaterThan(inlet.t)
    expect(r.leaving.rh).toBeLessThan(inlet.rh)
    // Q = m cp dT  →  dT ≈ 10 / (1.19 * 1.02) ≈ 8.2 K
    expect(r.deltaT).toBeGreaterThan(7.5)
    expect(r.deltaT).toBeLessThan(9)
  })

  it('is a no-op without heat or flow', () => {
    const inlet = stateFromTempRh(12, 0.9)
    expect(sensibleHeating(inlet, 0, 1).leaving).toBe(inlet)
    expect(sensibleHeating(inlet, 5, 0).leaving).toBe(inlet)
  })
})
