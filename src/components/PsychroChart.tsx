import { useMemo } from 'react'
import { satPressure, humidityRatioFromVapourPressure } from '@/lib/psychro'
import type { MoistAirState } from '@/lib/psychro'
import { fmt } from '@/lib/format'

interface ChartPoint {
  id: string
  label: string
  state: MoistAirState
  color: string
}

interface PsychroChartProps {
  points: ChartPoint[]
}

const W = 360
const H = 230
const PAD = { l: 34, r: 38, t: 10, b: 28 }

export function PsychroChart({ points }: PsychroChartProps) {
  const { xMin, xMax, yMax } = useMemo(() => {
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
    const wMax = Math.max(...ws, 0)
    const y = Math.min(90, Math.max(5, Math.ceil((wMax * 1.35) / 5) * 5))
    return { xMin: lo, xMax: hi, yMax: y }
  }, [points])

  const sx = (t: number) => PAD.l + ((t - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const sy = (wgkg: number) => H - PAD.b - (wgkg / yMax) * (H - PAD.t - PAD.b)

  const rhCurve = (rh: number) => {
    const pts: string[] = []
    for (let t = xMin; t <= xMax + 0.001; t += 1) {
      const w = humidityRatioFromVapourPressure(rh * satPressure(t)) * 1000
      pts.push(`${sx(t).toFixed(1)},${sy(w).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  const rhLines = [0.2, 0.4, 0.6, 0.8]
  const xTicks: number[] = []
  const xStep = xMax - xMin > 60 ? 20 : 10
  for (let t = xMin; t <= xMax; t += xStep) xTicks.push(t)
  const yTicks: number[] = []
  const yStep = yMax > 40 ? 20 : yMax > 15 ? 10 : yMax > 8 ? 5 : 1
  for (let w = 0; w <= yMax; w += yStep) yTicks.push(w)

  // Where each RH curve exits the plot area (right edge or top) for labelling.
  const rhLabelPos = (rh: number) => {
    const wAtRight = humidityRatioFromVapourPressure(rh * satPressure(xMax)) * 1000
    if (wAtRight <= yMax) return { x: sx(xMax) + 3, y: sy(wAtRight) + 3 }
    // find t where curve crosses yMax
    let lo = xMin
    let hi = xMax
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      const w = humidityRatioFromVapourPressure(rh * satPressure(mid)) * 1000
      if (w > yMax) hi = mid
      else lo = mid
    }
    return { x: sx(lo) - 4, y: sy(yMax) + 9 }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Psychrometric chart showing the air states"
    >
      <defs>
        <clipPath id="plot">
          <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
        </clipPath>
      </defs>

      {/* grid */}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line
            x1={sx(t)}
            x2={sx(t)}
            y1={PAD.t}
            y2={H - PAD.b}
            className="stroke-border"
            strokeWidth={0.6}
          />
          <text
            x={sx(t)}
            y={H - PAD.b + 12}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {t}
          </text>
        </g>
      ))}
      {yTicks.map((w) => (
        <g key={`y${w}`}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={sy(w)}
            y2={sy(w)}
            className="stroke-border"
            strokeWidth={0.6}
          />
          <text
            x={PAD.l - 4}
            y={sy(w) + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {w}
          </text>
        </g>
      ))}
      <text
        x={(PAD.l + W - PAD.r) / 2}
        y={H - 3}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={9}
      >
        Dry bulb °C
      </text>
      <text
        x={8}
        y={(PAD.t + H - PAD.b) / 2}
        textAnchor="middle"
        transform={`rotate(-90 8 ${(PAD.t + H - PAD.b) / 2})`}
        className="fill-muted-foreground"
        fontSize={9}
      >
        g/kg
      </text>

      <g clipPath="url(#plot)">
        {rhLines.map((rh) => (
          <polyline
            key={rh}
            points={rhCurve(rh)}
            fill="none"
            className="stroke-muted-foreground/50"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
        ))}
        <polyline
          points={rhCurve(1)}
          fill="none"
          className="stroke-foreground/70"
          strokeWidth={1.4}
        />

        {/* process lines */}
        {points.slice(1).map((p, i) => {
          const prev = points[i]
          if (prev.state.t === p.state.t && prev.state.W === p.state.W) return null
          return (
            <line
              key={`${prev.id}-${p.id}`}
              x1={sx(prev.state.t)}
              y1={sy(prev.state.W * 1000)}
              x2={sx(p.state.t)}
              y2={sy(p.state.W * 1000)}
              stroke={p.color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )
        })}
      </g>

      {/* RH labels */}
      {[...rhLines, 1].map((rh) => {
        const pos = rhLabelPos(rh)
        return (
          <text
            key={`l${rh}`}
            x={pos.x}
            y={pos.y}
            fontSize={8}
            className="fill-muted-foreground"
          >
            {Math.round(rh * 100)}%
          </text>
        )
      })}

      {/* state points */}
      {points.map((p) => {
        const x = sx(p.state.t)
        const y = sy(p.state.W * 1000)
        const inPlot = x >= PAD.l && x <= W - PAD.r && y >= PAD.t && y <= H - PAD.b
        if (!inPlot) return null
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={5} fill={p.color} className="stroke-background" strokeWidth={1.5} />
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              fontSize={7}
              fontWeight={700}
              className="fill-background"
            >
              {p.id}
            </text>
          </g>
        )
      })}

      {/* legend */}
      <g transform={`translate(${PAD.l + 4} ${PAD.t + 4})`}>
        {points.map((p, i) => (
          <g key={p.id} transform={`translate(0 ${i * 12})`}>
            <circle cx={4} cy={4} r={3.5} fill={p.color} />
            <text x={11} y={7} fontSize={8} className="fill-foreground">
              {p.id} · {p.label} · {fmt(p.state.t, 1)}°C / {fmt(p.state.rh * 100, 0)}%
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
