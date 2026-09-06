export function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(digits))
  // Avoid "-0.0"
  const clean = Object.is(rounded, -0) ? 0 : rounded
  return clean.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Picks sensible precision for small vs large magnitudes. */
export function fmtAuto(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs === 0) return '0'
  if (abs < 0.01) return fmt(value, 4)
  if (abs < 1) return fmt(value, 3)
  if (abs < 10) return fmt(value, 2)
  if (abs < 1000) return fmt(value, 1)
  return fmt(value, 0)
}

export function signed(value: number, digits = 1): string {
  const s = fmt(value, digits)
  return value > 0 ? `+${s}` : s
}
