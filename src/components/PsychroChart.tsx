import { useMemo } from 'react'
import {
  CHART_H,
  CHART_PAD as PAD,
  CHART_W,
  RH_LINES,
  chartLayout,
  type ChartPoint,
  type XY,
} from '@/lib/chart'
import { fmt } from '@/lib/format'

export type { ChartPoint } from '@/lib/chart'

interface PsychroChartProps {
  points: ChartPoint[]
}

const W = CHART_W
const H = CHART_H

const toPolyline = (pts: XY[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

export function PsychroChart({ points }: PsychroChartProps) {
  const layout = useMemo(() => chartLayout(points), [points])
  const { sx, sy, xTicks, yTicks, rhCurve, rhLabelPos, inPlot } = layout

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
        {RH_LINES.map((rh) => (
          <polyline
            key={rh}
            points={toPolyline(rhCurve(rh))}
            fill="none"
            className="stroke-muted-foreground/50"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
        ))}
        <polyline
          points={toPolyline(rhCurve(1))}
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
      {[...RH_LINES, 1].map((rh) => {
        const [x, y] = rhLabelPos(rh)
        return (
          <text key={`l${rh}`} x={x} y={y} fontSize={8} className="fill-muted-foreground">
            {Math.round(rh * 100)}%
          </text>
        )
      })}

      {/* state points */}
      {points.map((p) => {
        const x = sx(p.state.t)
        const y = sy(p.state.W * 1000)
        if (!inPlot(x, y)) return null
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
