import type { jsPDF } from 'jspdf'
import { CHART_H, CHART_PAD, CHART_W, RH_LINES, chartLayout, type ChartPoint } from '@/lib/chart'
import { fmt, fmtAuto, signed } from '@/lib/format'
import { FLOW_UNITS, HEAT_MODES, coilPreset, type CoilId, type FlowUnit, type HeatMode } from '@/lib/presets'
import { frostAccumulation, iceCp, type CoilResult, type HeatingResult, type MoistAirState } from '@/lib/psychro'
import { analyseTarget, type TargetSpec } from '@/lib/target'
import { isTouchDevice } from '@/lib/platform'

export interface ReportInputs {
  tempC: number
  rhPct: number
  flowLs: number
  flowUnit: FlowUnit
  coilId: CoilId
  adp: number
  bf: number
  heatMode: HeatMode
  heatKw: number
  runHours: number
  moistureUnit: 'ls' | 'lh'
}

export interface ReportData {
  projectRef: string
  notes: string
  inputs: ReportInputs
  entering: MoistAirState
  massFlowKgS: number
  coil: CoilResult | null
  afterCoil: MoistAirState
  heating: HeatingResult
  final: MoistAirState
  target: TargetSpec
  chartPoints: ChartPoint[]
}

export type ExportOutcome = 'shared' | 'downloaded' | 'cancelled'

// ---------------------------------------------------------------------------
// Page geometry (A4 portrait, mm)
// ---------------------------------------------------------------------------
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_H = 16

const COLOR = {
  ink: '#111827',
  muted: '#6b7280',
  faint: '#e5e7eb',
  panel: '#f3f4f6',
  primary: '#0e7490',
  a: '#0e7490',
  b: '#0ea5e9',
  c: '#f97316',
  frost: '#06b6d4',
  warn: '#b45309',
}

/** jsPDF's built-in fonts only cover WinAnsi – swap the few symbols the app uses that fall outside it. */
function pdfText(s: string): string {
  return s
    .replace(/[\u202f\u00a0\u2009]/g, ' ')
    .replace(/\u2192/g, '->')
    .replace(/\u0394/g, 'delta ')
    .replace(/\u2248/g, '~')
    .replace(/\u2212/g, '-')
    .replace(/\u2026/g, '...')
}

type Row = [label: string, value: string, sub?: string]

class Layout {
  y = MARGIN
  page = 1
  private doc: jsPDF
  private footer: (page: number) => void

  constructor(doc: jsPDF, footer: (page: number) => void) {
    this.doc = doc
    this.footer = footer
  }

  ensure(height: number) {
    if (this.y + height > PAGE_H - MARGIN - FOOTER_H) {
      this.footer(this.page)
      this.doc.addPage()
      this.page += 1
      this.y = MARGIN
    }
  }

  gap(mm: number) {
    this.y += mm
  }

  sectionTitle(letter: string, title: string, color: string, subtitle?: string) {
    const doc = this.doc
    // keep the heading with at least a few rows of its content
    this.ensure(14 + 20)
    doc.setFillColor(color)
    doc.roundedRect(MARGIN, this.y, 7, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    if (letter) {
      doc.setTextColor('#ffffff')
      doc.setFontSize(9)
      doc.text(letter, MARGIN + 3.5, this.y + 4.9, { align: 'center' })
    } else {
      // no letter: draw a tiny rising line as a "chart" glyph
      doc.setDrawColor('#ffffff')
      doc.setLineWidth(0.6)
      doc.setLineCap('round')
      doc.line(MARGIN + 1.8, this.y + 5.2, MARGIN + 3.3, this.y + 3.4)
      doc.line(MARGIN + 3.3, this.y + 3.4, MARGIN + 4.4, this.y + 4.4)
      doc.line(MARGIN + 4.4, this.y + 4.4, MARGIN + 5.4, this.y + 2.2)
    }
    doc.setTextColor(COLOR.ink)
    doc.setFontSize(12)
    doc.text(pdfText(title), MARGIN + 10, this.y + 5.2)
    if (subtitle) {
      const tw = doc.getTextWidth(pdfText(title))
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(COLOR.muted)
      doc.text(pdfText(subtitle), MARGIN + 10 + tw + 3, this.y + 5.2)
    }
    this.y += 9
    doc.setDrawColor(COLOR.faint)
    doc.setLineWidth(0.25)
    doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y)
    this.y += 3
  }

  /** Two side-by-side key/value columns; rows fill down the left column first. */
  kvTable(rows: Row[]) {
    const doc = this.doc
    const colGap = 6
    const colW = (CONTENT_W - colGap) / 2
    const rowH = 6.4
    const perCol = Math.ceil(rows.length / 2)
    const height = perCol * rowH
    this.ensure(height + 2)
    const startY = this.y
    rows.forEach((row, i) => {
      const col = i < perCol ? 0 : 1
      const idx = col === 0 ? i : i - perCol
      const x = MARGIN + col * (colW + colGap)
      const y = startY + idx * rowH
      const [label, value, sub] = row
      doc.setDrawColor(COLOR.faint)
      doc.setLineWidth(0.2)
      doc.line(x, y + rowH - 0.8, x + colW, y + rowH - 0.8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(COLOR.muted)
      doc.text(pdfText(label), x, y + 3.9)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(COLOR.ink)
      const v = pdfText(value)
      doc.text(v, x + colW, y + 3.9, { align: 'right' })
      if (sub) {
        const vw = doc.getTextWidth(v)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(COLOR.muted)
        doc.text(pdfText(sub), x + colW - vw - 2, y + 3.9, { align: 'right' })
      }
    })
    this.y = startY + height + 3
  }

  note(text: string, color = COLOR.muted, size = 8) {
    const doc = this.doc
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(pdfText(text), CONTENT_W) as string[]
    const h = lines.length * size * 0.42 + 1
    this.ensure(h)
    doc.text(lines, MARGIN, this.y + size * 0.35)
    this.y += h
  }

  paragraph(text: string, size = 9.5, color = COLOR.ink) {
    const doc = this.doc
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(pdfText(text), CONTENT_W) as string[]
    const lineH = size * 0.46
    this.ensure(lines.length * lineH + 1)
    doc.text(lines, MARGIN, this.y + size * 0.35)
    this.y += lines.length * lineH + 1
  }
}

// ---------------------------------------------------------------------------
// Chart (vector, scaled from the same layout the on-screen SVG uses)
// ---------------------------------------------------------------------------
type Box = { x0: number; y0: number; x1: number; y1: number }

/** Liang–Barsky segment clip against an axis-aligned box. */
function clipSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  b: Box,
): [number, number, number, number] | null {
  let t0 = 0
  let t1 = 1
  const dx = x2 - x1
  const dy = y2 - y1
  const check = (p: number, q: number) => {
    if (p === 0) return q >= 0
    const r = q / p
    if (p < 0) {
      if (r > t1) return false
      if (r > t0) t0 = r
    } else {
      if (r < t0) return false
      if (r < t1) t1 = r
    }
    return true
  }
  if (!check(-dx, x1 - b.x0)) return null
  if (!check(dx, b.x1 - x1)) return null
  if (!check(-dy, y1 - b.y0)) return null
  if (!check(dy, b.y1 - y1)) return null
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy]
}

function pointColor(p: ChartPoint): string {
  if (p.color.startsWith('var(')) return COLOR.a
  return p.color
}

function drawChart(doc: jsPDF, points: ChartPoint[], ox: number, oy: number, widthMm: number) {
  const s = widthMm / CHART_W
  const X = (x: number) => ox + x * s
  const Y = (y: number) => oy + y * s
  const pt = (units: number) => units * s * (72 / 25.4)
  const layout = chartLayout(points)
  const { sx, sy, xTicks, yTicks, rhCurve, rhLabelPos } = layout
  const plot: Box = { x0: CHART_PAD.l, y0: CHART_PAD.t, x1: CHART_W - CHART_PAD.r, y1: CHART_H - CHART_PAD.b }

  // frame
  doc.setDrawColor(COLOR.faint)
  doc.setLineWidth(0.3)
  doc.rect(X(plot.x0), Y(plot.y0), (plot.x1 - plot.x0) * s, (plot.y1 - plot.y0) * s, 'S')

  // grid + tick labels
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR.muted)
  doc.setFontSize(pt(9))
  doc.setLineWidth(0.15)
  for (const t of xTicks) {
    doc.line(X(sx(t)), Y(plot.y0), X(sx(t)), Y(plot.y1))
    doc.text(String(t), X(sx(t)), Y(CHART_H - CHART_PAD.b + 12), { align: 'center' })
  }
  for (const w of yTicks) {
    doc.line(X(plot.x0), Y(sy(w)), X(plot.x1), Y(sy(w)))
    doc.text(String(w), X(CHART_PAD.l - 4), Y(sy(w) + 3), { align: 'right' })
  }
  doc.text('Dry bulb °C', X((CHART_PAD.l + CHART_W - CHART_PAD.r) / 2), Y(CHART_H - 3), { align: 'center' })
  doc.text('g/kg', X(8), Y((CHART_PAD.t + CHART_H - CHART_PAD.b) / 2), { align: 'center', angle: 90 })

  const polyline = (pts: [number, number][]) => {
    for (let i = 1; i < pts.length; i++) {
      const seg = clipSegment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], plot)
      if (seg) doc.line(X(seg[0]), Y(seg[1]), X(seg[2]), Y(seg[3]))
    }
  }

  // constant RH curves
  doc.setDrawColor('#9ca3af')
  doc.setLineWidth(0.2)
  doc.setLineDashPattern([0.8, 0.8], 0)
  for (const rh of RH_LINES) polyline(rhCurve(rh))
  doc.setLineDashPattern([], 0)
  doc.setDrawColor('#374151')
  doc.setLineWidth(0.4)
  polyline(rhCurve(1))

  // RH labels
  doc.setFontSize(pt(8))
  doc.setTextColor(COLOR.muted)
  for (const rh of [...RH_LINES, 1]) {
    const [lx, ly] = rhLabelPos(rh)
    doc.text(`${Math.round(rh * 100)}%`, X(lx), Y(ly))
  }

  // process lines
  doc.setLineCap('round')
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const p = points[i]
    if (prev.state.t === p.state.t && prev.state.W === p.state.W) continue
    doc.setDrawColor(pointColor(p))
    doc.setLineWidth(0.7)
    polyline([
      [sx(prev.state.t), sy(prev.state.W * 1000)],
      [sx(p.state.t), sy(p.state.W * 1000)],
    ])
  }

  // state points
  for (const p of points) {
    const x = sx(p.state.t)
    const y = sy(p.state.W * 1000)
    if (!layout.inPlot(x, y)) continue
    doc.setFillColor(pointColor(p))
    doc.setDrawColor('#ffffff')
    doc.setLineWidth(0.3)
    doc.circle(X(x), Y(y), 5 * s, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(pt(7))
    doc.setTextColor('#ffffff')
    doc.text(p.id, X(x), Y(y + 2.6), { align: 'center' })
  }

  // legend
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(pt(8))
  points.forEach((p, i) => {
    const lx = CHART_PAD.l + 4
    const ly = CHART_PAD.t + 4 + i * 12
    doc.setFillColor(pointColor(p))
    doc.circle(X(lx + 4), Y(ly + 4), 3.5 * s, 'F')
    doc.setTextColor(COLOR.ink)
    doc.text(
      pdfText(`${p.id} · ${p.label} · ${fmt(p.state.t, 1)}°C / ${fmt(p.state.rh * 100, 0)}%`),
      X(lx + 11),
      Y(ly + 7),
    )
  })

  return CHART_H * s
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
function timestamp(): string {
  return new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function buildReport(doc: jsPDF, data: ReportData): jsPDF {
  const { inputs, entering, massFlowKgS, coil, afterCoil, heating, final } = data
  const projectRef = data.projectRef.trim()
  const notes = data.notes.trim()
  const generated = timestamp()
  const preset = coilPreset(inputs.coilId)
  const coilOff = inputs.coilId === 'off'
  const heatOff = inputs.heatMode === 'off'
  const heatInfo = HEAT_MODES.find((m) => m.id === inputs.heatMode) ?? HEAT_MODES[0]
  const flowInfo = FLOW_UNITS[inputs.flowUnit]
  const frosting = !!coil?.frosting
  const mu = inputs.moistureUnit
  const rate = (kgS: number) => `${fmtAuto(mu === 'ls' ? kgS : kgS * 3600)} ${mu === 'ls' ? 'L/s' : 'L/h'}`
  const rateAlt = (kgS: number) => `${fmtAuto(mu === 'ls' ? kgS * 3600 : kgS)} ${mu === 'ls' ? 'L/h' : 'L/s'}`

  doc.setProperties({
    title: projectRef ? `Enthalpy – ${projectRef}` : 'Enthalpy – psychrometric report',
    subject: 'HVAC psychrometric calculation',
    creator: 'Enthalpy – HVAC psychrometrics',
  })

  const footer = (page: number) => {
    const y = PAGE_H - MARGIN - FOOTER_H + 4
    doc.setDrawColor(COLOR.faint)
    doc.setLineWidth(0.25)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(COLOR.muted)
    const text = doc.splitTextToSize(
      pdfText(
        'Properties from ASHRAE Fundamentals (Hyland–Wexler) at standard atmospheric pressure 101.325 kPa. ' +
          'Coil modelled with apparatus dew point and bypass factor; condensate density 1 kg/L. Below 0 °C removed ' +
          'moisture is held as frost (heat of fusion 333.6 kJ/kg). Results are for design sizing and diagnostics – ' +
          'verify against manufacturer selection data before committing.',
      ),
      CONTENT_W - 30,
    ) as string[]
    doc.text(text, MARGIN, y + 3.4)
    doc.setFont('helvetica', 'bold')
    doc.text(`Page ${page}`, PAGE_W - MARGIN, y + 3.4, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(pdfText(projectRef || 'Enthalpy'), PAGE_W - MARGIN, y + 6.8, { align: 'right' })
  }

  const L = new Layout(doc, footer)

  // Title band -------------------------------------------------------------
  const bandH = 24
  doc.setFillColor(COLOR.primary)
  doc.roundedRect(MARGIN, L.y, CONTENT_W, bandH, 2.5, 2.5, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Enthalpy', MARGIN + 6, L.y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(pdfText('HVAC psychrometrics · cooling coil & reheat report'), MARGIN + 6, L.y + 16.5)
  doc.setFontSize(8)
  doc.text('Generated', PAGE_W - MARGIN - 6, L.y + 9, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(pdfText(generated), PAGE_W - MARGIN - 6, L.y + 14, { align: 'right' })
  L.gap(bandH + 6)

  // Project block ----------------------------------------------------------
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLOR.muted)
  doc.text('PROJECT REFERENCE', MARGIN, L.y + 3)
  L.gap(4.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(projectRef ? COLOR.ink : COLOR.muted)
  const refLines = doc.splitTextToSize(pdfText(projectRef || 'No project reference entered'), CONTENT_W) as string[]
  doc.text(refLines, MARGIN, L.y + 5)
  L.gap(refLines.length * 6.2 + 1)
  if (notes) {
    L.paragraph(notes, 9.5, '#374151')
  }
  L.gap(3)

  // Process summary chips ----------------------------------------------------
  const chipW = (CONTENT_W - 8) / 3
  const chipH = 15
  L.ensure(chipH + 4)
  const chips: { id: string; label: string; state: MoistAirState; color: string }[] = [
    { id: 'A', label: 'Entering air', state: entering, color: COLOR.a },
    { id: 'B', label: coilOff ? 'After coil (off)' : 'After coil', state: afterCoil, color: COLOR.b },
    { id: 'C', label: heatOff ? 'Final (no heat)' : 'Final', state: final, color: COLOR.c },
  ]
  chips.forEach((c, i) => {
    const x = MARGIN + i * (chipW + 4)
    doc.setFillColor(COLOR.panel)
    doc.roundedRect(x, L.y, chipW, chipH, 2, 2, 'F')
    doc.setFillColor(c.color)
    doc.circle(x + 6, L.y + chipH / 2, 3.2, 'F')
    doc.setTextColor('#ffffff')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(c.id, x + 6, L.y + chipH / 2 + 1.1, { align: 'center' })
    doc.setTextColor(COLOR.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(pdfText(c.label), x + 12, L.y + 5.2)
    doc.setTextColor(COLOR.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(pdfText(`${fmt(c.state.t, 1)} °C · ${fmt(c.state.rh * 100, 0)} %`), x + 12, L.y + 11.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(COLOR.muted)
    doc.text(pdfText(`${fmt(c.state.h, 1)} kJ/kg`), x + chipW - 3, L.y + 11.2, { align: 'right' })
  })
  L.gap(chipH + 7)

  // A · Entering air ---------------------------------------------------------
  L.sectionTitle('A', 'Entering air', COLOR.a, 'condition before treatment')
  L.kvTable([
    ['Dry-bulb temperature', `${fmt(inputs.tempC, 1)} °C`],
    ['Relative humidity', `${fmt(inputs.rhPct, 0)} %`],
    [
      'Airflow',
      `${fmt(flowInfo.fromLs(inputs.flowLs), 0)} ${flowInfo.label}`,
      inputs.flowUnit === 'ls' ? `${fmt(inputs.flowLs * 3.6, 0)} m³/h` : `${fmt(inputs.flowLs, 0)} L/s`,
    ],
    ['Dry-air mass flow', `${fmt(massFlowKgS, massFlowKgS < 1 ? 3 : 2)} kg/s`],
    ['Vapour pressure', `${fmt(entering.pw / 1000, 3)} kPa`],
    ['Dew / frost point', `${fmt(entering.td, 1)} °C`, entering.td !== null && entering.td <= 0 ? 'frost point' : undefined],
    ['Wet bulb', `${fmt(entering.twb, 1)} °C`],
    ['Enthalpy', `${fmt(entering.h, 1)} kJ/kg`],
    ['Moisture content', `${fmt(entering.W * 1000, 2)} g/kg`],
    ['Density', `${fmt(entering.rho, 3)} kg/m³`],
  ])
  L.gap(3)

  // B · Cooling coil ---------------------------------------------------------
  L.sectionTitle('B', 'Cooling coil', COLOR.b, preset.label)
  if (coilOff || !coil) {
    L.paragraph('Coil off – air passes through unchanged.', 9.5, COLOR.muted)
  } else {
    const leaving = coil.leaving
    const rows: Row[] = [
      ['Coil', preset.label],
      ['Apparatus dew point', `${fmt(inputs.adp, 1)} °C`],
      ['Bypass factor', fmt(inputs.bf, 2)],
      ['Leaving temperature', `${fmt(leaving.t, 1)} °C`, `${signed(leaving.t - entering.t, 1)} K`],
      ['Leaving RH', `${fmt(leaving.rh * 100, 0)} %`, `${signed((leaving.rh - entering.rh) * 100, 0)} pts`],
      ['Leaving dew point', `${fmt(leaving.td, 1)} °C`],
      ['Leaving enthalpy', `${fmt(leaving.h, 1)} kJ/kg`],
      ['Moisture content', `${fmt(leaving.W * 1000, 2)} g/kg`, `from ${fmt(entering.W * 1000, 2)}`],
      ['Moisture removed', rate(coil.condensateKgS), rateAlt(coil.condensateKgS)],
      ['Liquid to drain', rate(coil.drainKgS), `${fmt(coil.drainKgS * 86400, 0)} L/day`],
      ['Held as frost', `${fmtAuto(coil.frostKgS * 3600)} kg/h`, frosting ? `ice at ${fmt(inputs.adp, 1)} °C` : undefined],
      ['Total cooling', `${fmtAuto(coil.totalKw)} kW`, `SHR ${fmt(coil.shr, 2)}`],
      ['Sensible cooling', `${fmtAuto(coil.sensibleKw)} kW`],
      ['Latent cooling', `${fmtAuto(coil.latentKw)} kW`],
    ]
    L.kvTable(rows)
    if (coil.dryCoil) {
      L.note('Dry coil – the apparatus dew point is above the entering dew point, so no moisture is removed.', COLOR.warn, 8.5)
    }
    if (frosting) {
      const frost = frostAccumulation(coil.frostKgS, inputs.adp, inputs.runHours)
      L.gap(2)
      L.sectionTitle('B', 'Frost build-up & defrost', COLOR.frost, `after ${fmt(inputs.runHours, 1)} h run time`)
      L.kvTable([
        ['Run time before defrost', `${fmt(inputs.runHours, 1)} h`],
        ['Frost on coil', `${fmtAuto(frost.massKg)} kg`],
        ['Meltwater at defrost', `${fmtAuto(frost.meltwaterL)} L`],
        ['Frost load on coil', `${fmt(coil.frostKw, 2)} kW`, `cp ice ${fmt(iceCp(inputs.adp), 2)} kJ/kg·K`],
        ['Defrost energy', `${fmt(frost.defrostKwh, 2)} kWh`, `warm ${fmt(frost.sensibleKwh, 2)} + melt ${fmt(frost.meltKwh, 2)}`],
      ])
      L.note(
        'Mean ice specific heat over the frost temperature range; melting takes 333.6 kJ/kg. Drain heaters and meltwater warming are not included.',
      )
    }
  }
  L.gap(3)

  // C · Heat added -----------------------------------------------------------
  L.sectionTitle('C', 'Heat added', COLOR.c, heatInfo.label)
  if (heatOff) {
    L.paragraph('No heat added after the coil – the final condition equals the coil leaving condition.', 9.5, COLOR.muted)
  } else {
    L.kvTable([
      ['Heat source', heatInfo.label],
      [inputs.heatMode === 'heater' ? 'Heater output' : 'Sensible gains', `${fmt(inputs.heatKw, 1)} kW`],
      ['Final temperature', `${fmt(final.t, 1)} °C`, `${signed(heating.deltaT, 1)} K rise`],
      ['Final RH', `${fmt(final.rh * 100, 0)} %`, `${signed((final.rh - afterCoil.rh) * 100, 0)} pts`],
      ['Dew point', `${fmt(final.td, 1)} °C`, 'constant'],
      ['Final enthalpy', `${fmt(final.h, 1)} kJ/kg`],
      ['Wet bulb', `${fmt(final.twb, 1)} °C`],
      ['Moisture content', `${fmt(final.W * 1000, 2)} g/kg`],
    ])
    if (final.t > 50) L.note('Final temperature is above the 50 °C chart range.', COLOR.warn, 8.5)
  }
  L.gap(3)

  // Target room condition ---------------------------------------------------------
  const ta = analyseTarget(afterCoil, massFlowKgS, data.target)
  const bandLabel =
    ta.spec.tolK > 0 ? `${fmt(ta.band.lo, 1)} – ${fmt(ta.band.hi, 1)} °C` : `${fmt(ta.spec.tempC, 1)} °C`
  L.sectionTitle(
    'C',
    'Target room condition',
    COLOR.c,
    `${fmt(ta.spec.tempC, 1)} °C ± ${fmt(ta.spec.tolK, 1)} K · ${fmt(ta.spec.rhPct, 0)} % RH`,
  )
  L.kvTable([
    ['Target temperature', `${fmt(ta.spec.tempC, 1)} °C`, `band ${bandLabel}`],
    ['Target RH', `${fmt(ta.spec.rhPct, 0)} %`],
    [
      `RH at ${fmt(ta.spec.tempC, 1)} °C`,
      `${fmt(ta.atTarget.rh * 100, 0)} %`,
      ta.saturatedAtTarget ? 'saturated' : undefined,
    ],
    [
      `Heat to reach ${fmt(ta.spec.tempC, 1)} °C`,
      ta.kwToTarget === null ? 'n/a' : `${fmtAuto(ta.kwToTarget)} kW`,
      ta.kwToTarget === null ? 'coil air already warmer' : `${signed(ta.spec.tempC - afterCoil.t, 1)} K`,
    ],
    [`${fmt(ta.spec.rhPct, 0)} % RH reached at`, ta.tForRh === null ? 'n/a' : `${fmt(ta.tForRh, 1)} °C`],
    [
      `Heat to reach ${fmt(ta.spec.rhPct, 0)} % RH`,
      ta.kwForRh === null ? 'n/a' : `${fmtAuto(ta.kwForRh)} kW`,
      ta.kwForRh === null && ta.tForRh !== null ? 'below coil leaving temperature' : undefined,
    ],
    ['RH across the band', `${fmt(ta.band.rhAtLo * 100, 0)} – ${fmt(ta.band.rhAtHi * 100, 0)} %`],
    [
      'Moisture needed',
      `${fmt(ta.required.W * 1000, 2)} g/kg`,
      `dew point ${fmt(ta.required.td, 1)} °C · have ${fmt(afterCoil.W * 1000, 2)}`,
    ],
  ])
  if (ta.rhInBand && ta.tForRh !== null) {
    L.note(
      `Achievable by heating alone: ${fmt(ta.spec.rhPct, 0)} % RH lands at ${fmt(ta.tForRh, 1)} °C, inside the ${bandLabel} band` +
        (ta.kwForRh !== null ? ` with ${fmtAuto(ta.kwForRh)} kW of heat.` : '.'),
      '#047857',
      8.5,
    )
  } else {
    const d = ta.required.deltaW * 1000
    const fix =
      Math.abs(d) < 0.05
        ? ''
        : d < 0
          ? ` Remove ${fmt(-d, 2)} g/kg (~${fmtAuto(-ta.required.kgPerH)} kg/h): lower the coil ADP or use a deeper coil.`
          : ` Add ${fmt(d, 2)} g/kg (~${fmtAuto(ta.required.kgPerH)} kg/h): a humidifier is needed.`
    L.note(
      `Not achievable by heating alone: across ${bandLabel} the RH would run ${fmt(ta.band.rhAtLo * 100, 0)} – ${fmt(ta.band.rhAtHi * 100, 0)} %.` +
        fix,
      COLOR.warn,
      8.5,
    )
  }
  L.gap(3)

  // Chart --------------------------------------------------------------------
  const ratio = CHART_H / CHART_W
  const titleH = 12
  const remaining = PAGE_H - MARGIN - FOOTER_H - L.y
  const fitW = (remaining - titleH - 4) / ratio
  // Tuck the chart under the tables when it still reads well (>= 100 mm wide); otherwise give it a fresh page.
  const chartW = fitW >= 100 ? Math.min(fitW, 124) : 160
  const chartH = ratio * chartW
  L.ensure(chartH + titleH + 4)
  L.sectionTitle('', 'Psychrometric chart', '#374151', 'blue: coil process · orange: sensible heating')
  const chartX = MARGIN + (CONTENT_W - chartW) / 2
  drawChart(doc, data.chartPoints, chartX, L.y, chartW)
  L.gap(chartH + 4)

  footer(L.page)
  return doc
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------
export function reportFilename(projectRef: string): string {
  const slug = projectRef
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `enthalpy${slug ? `-${slug}` : ''}-${date}.pdf`
}

/**
 * Builds the PDF and hands it to the user in the most reliable way for the device:
 * the share sheet on phones (Save to Files / Drive / mail) or a download elsewhere.
 * jsPDF is loaded on demand so it does not weigh down first paint.
 */
export async function exportReportPdf(data: ReportData): Promise<ExportOutcome> {
  const { jsPDF } = await import('jspdf')
  const doc = buildReport(new jsPDF({ unit: 'mm', format: 'a4', compress: true }), data)
  const filename = reportFilename(data.projectRef)
  const blob = doc.output('blob')

  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean
    share?: (d: ShareData) => Promise<void>
  }
  if (isTouchDevice() && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: data.projectRef.trim() || 'Enthalpy report',
        })
        return 'shared'
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
        // share unavailable for this payload – fall back to a download below
      }
    }
  }

  doc.save(filename)
  return 'downloaded'
}
