export type CoilId = 'off' | 'dx' | 'chw' | 'chw-ht' | 'dehum' | 'custom'

export interface CoilPreset {
  id: CoilId
  label: string
  short: string
  description: string
  /** apparatus dew point, °C */
  adp: number
  /** bypass factor, 0..1 */
  bf: number
}

export const COIL_PRESETS: CoilPreset[] = [
  {
    id: 'off',
    label: 'Off',
    short: 'Off',
    description: 'Coil bypassed – air passes through unchanged.',
    adp: 0,
    bf: 1,
  },
  {
    id: 'dx',
    label: 'DX coil',
    short: 'DX',
    description: 'Direct-expansion refrigerant coil, 4-row. Strong dehumidification.',
    adp: 7,
    bf: 0.1,
  },
  {
    id: 'chw',
    label: 'Chilled water',
    short: 'CHW',
    description: 'Standard 6/12 °C chilled-water coil, 4–6 rows.',
    adp: 9,
    bf: 0.15,
  },
  {
    id: 'chw-ht',
    label: 'High-temp CHW',
    short: 'HT CHW',
    description: '14/18 °C chilled water for radiant / chilled-beam plant. Mostly sensible.',
    adp: 14,
    bf: 0.2,
  },
  {
    id: 'dehum',
    label: 'Dehumidifier',
    short: 'Dehum',
    description: 'Deep low-ADP coil as used in pool halls and drying rooms.',
    adp: 4,
    bf: 0.05,
  },
  {
    id: 'custom',
    label: 'Custom',
    short: 'Custom',
    description: 'Set the apparatus dew point and bypass factor yourself.',
    adp: 10,
    bf: 0.15,
  },
]

export function coilPreset(id: CoilId): CoilPreset {
  return COIL_PRESETS.find((c) => c.id === id) ?? COIL_PRESETS[0]
}

export type HeatMode = 'off' | 'gains' | 'heater'

export interface HeatModeInfo {
  id: HeatMode
  label: string
  description: string
  max: number
  step: number
}

export const HEAT_MODES: HeatModeInfo[] = [
  {
    id: 'off',
    label: 'Off',
    description: 'No heat added after the coil.',
    max: 0,
    step: 0.1,
  },
  {
    id: 'gains',
    label: 'Room gains',
    description:
      'Sensible gains picked up in the space – people (~75 W each), lighting, equipment and solar.',
    max: 25,
    step: 0.1,
  },
  {
    id: 'heater',
    label: 'Heater',
    description: 'Electric, LPHW or gas reheat battery in the duct.',
    max: 60,
    step: 0.5,
  },
]

export type FlowUnit = 'ls' | 'm3h'

export const FLOW_UNITS: Record<FlowUnit, { label: string; toLs: (v: number) => number; fromLs: (v: number) => number; step: number; max: number }> = {
  ls: { label: 'L/s', toLs: (v) => v, fromLs: (v) => v, step: 5, max: 3000 },
  m3h: {
    label: 'm³/h',
    toLs: (v) => v / 3.6,
    fromLs: (v) => v * 3.6,
    step: 10,
    max: 10_800,
  },
}
