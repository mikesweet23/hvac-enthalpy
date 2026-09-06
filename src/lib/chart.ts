import { satPressure, humidityRatioFromVapourPressure } from '@/lib/psychro'
import type { MoistAirState } from '@/lib/psychro'

export interface ChartPoint {
  id: string
  label: string
  state: MoistAirState
  color: string
}

/** Chart canvas in abstract units; the SVG and the PDF both scale from this box. */
export const CHART_W = 360
export const CHART_H = 230
export const CHART_PAD = { l: 34, r: 38, t: 10, b: 28 }
export const RH_LINES = [0.2, 0.4, 0.6, 0.8]

export type XY = [number, number]

export interface ChartLayout {
  xMin: number
  xMax: number
  yMax: number
  xTicks: number[]
  yTicks: number[]
  /** dry-bulb °C → x */
  sx: (t: number) => number
  /** moisture content g/kg → y */
  sy: (wGkg: number) => number
  /** polyline for a constant-RH curve across the visible temperature range */
  rhCurve: (rh: number) => XY[]
  /** where to put the label for a constant-RH curve (right edge or top exit) */
  rhLabelPos: (rh: number) => XY
  inPlot: (x: number, y: number) => boolean
}

/**
 * Works out axis ranges, ticks and projection helpers for a set of air states so the
 * chart always frames the process with a little breathing room.
 */
export function chartLayout(points: ChartPoint[]): ChartLayout {
  const ts = points.map((p) => p.state.t)
  const ws = points.map((p) => p.state.W * 1000)
  let lo = Math.floor((Math.min(...ts) - 8) / 10) * 10
  let hi = Math.ceil((Math.max(...ts) + 8) / 10) * 10
  lo = Math.max(-50, lo)
  hi = Math.min(50, hi)
  while (hi - lo < 40) {
    if (lo > -50) lo -= 10
    else if (hi < 50) hi += 10
    else break
  }
  const xMin = lo
  const xMax = hi
  const wMax = Math.max(...ws, 0)
  const yMax = Math.min(90, Math.max(5, Math.ceil((wMax * 1.35) / 5) * 5))

  const sx = (t: number) =>
    CHART_PAD.l + ((t - xMin) / (xMax - xMin)) * (CHART_W - CHART_PAD.l - CHART_PAD.r)
  const sy = (wgkg: number) =>
    CHART_H - CHART_PAD.b - (wgkg / yMax) * (CHART_H - CHART_PAD.t - CHART_PAD.b)

  const xTicks: number[] = []
  const xStep = xMax - xMin > 60 ? 20 : 10
  for (let t = xMin; t <= xMax; t += xStep) xTicks.push(t)
  const yTicks: number[] = []
  const yStep = yMax > 40 ? 20 : yMax > 15 ? 10 : yMax > 8 ? 5 : 1
  for (let w = 0; w <= yMax; w += yStep) yTicks.push(w)

  const rhCurve = (rh: number): XY[] => {
    const pts: XY[] = []
    for (let t = xMin; t <= xMax + 0.001; t += 1) {
      const w = humidityRatioFromVapourPressure(rh * satPressure(t)) * 1000
      pts.push([sx(t), sy(w)])
    }
    return pts
  }

  const rhLabelPos = (rh: number): XY => {
    const wAtRight = humidityRatioFromVapourPressure(rh * satPressure(xMax)) * 1000
    if (wAtRight <= yMax) return [sx(xMax) + 3, sy(wAtRight) + 3]
    // find t where the curve crosses the top of the plot
    let a = xMin
    let b = xMax
    for (let i = 0; i < 40; i++) {
      const mid = (a + b) / 2
      const w = humidityRatioFromVapourPressure(rh * satPressure(mid)) * 1000
      if (w > yMax) b = mid
      else a = mid
    }
    return [sx(a) - 4, sy(yMax) + 9]
  }

  const inPlot = (x: number, y: number) =>
    x >= CHART_PAD.l && x <= CHART_W - CHART_PAD.r && y >= CHART_PAD.t && y <= CHART_H - CHART_PAD.b

  return { xMin, xMax, yMax, xTicks, yTicks, sx, sy, rhCurve, rhLabelPos, inPlot }
}
