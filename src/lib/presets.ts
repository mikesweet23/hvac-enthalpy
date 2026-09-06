export type CoilId =
  | 'off'
  | 'dx3'
  | 'dx4'
  | 'dx5'
  | 'dx6'
  | 'chw6'
  | 'chw8'
  | 'freezer'
  | 'custom'

export interface CoilPreset {
  id: CoilId
  /** short label for the toggle button */
  short: string
  label: string
  /** typical application(s) this coil is found in */
  example: string
  description: string
  /** apparatus dew point, °C */
  adp: number
  /** bypass factor, 0..1 */
  bf: number
}

/**
 * Bypass factors are typical for 12 fpi coils at ~2.5 m/s face velocity;
 * ADPs are typical selection points for the stated system.
 */
export const COIL_PRESETS: CoilPreset[] = [
  {
    id: 'off',
    short: 'Off',
    label: 'Coil off',
    example: 'Bypass / free cooling',
    description: 'Air passes through unchanged.',
    adp: 0,
    bf: 1,
  },
  {
    id: 'dx3',
    short: 'DX 3R',
    label: 'DX coil, 3 rows',
    example: 'Packaged rooftops, small fan-coils, light-duty comfort cooling',
    description: 'Shallow coil with high bypass – mostly sensible cooling, modest dehumidification.',
    adp: 7,
    bf: 0.22,
  },
  {
    id: 'dx4',
    short: 'DX 4R',
    label: 'DX coil, 4 rows',
    example: 'VRF and split systems, close-control units',
    description: 'The everyday comfort-cooling coil. Balanced sensible and latent duty.',
    adp: 6,
    bf: 0.12,
  },
  {
    id: 'dx5',
    short: 'DX 5R',
    label: 'DX coil, 5 rows',
    example: 'DX air-handling units, gyms, restaurants with high latent gains',
    description: 'Closer approach to the evaporating temperature for stronger moisture removal.',
    adp: 5,
    bf: 0.08,
  },
  {
    id: 'dx6',
    short: 'DX 6R',
    label: 'DX coil, 6 rows',
    example: 'Deep dehumidification – pool halls, drying rooms, archives',
    description: 'Deep coil with very little bypass; leaving air is almost saturated at a low ADP.',
    adp: 4,
    bf: 0.05,
  },
  {
    id: 'chw6',
    short: 'CHW 6R',
    label: 'Chilled water, 6 rows',
    example: 'Standard 6/12 °C AHU coil in offices, retail and hospitals',
    description: 'Typical chilled-water selection. ADP sits a few degrees above the flow temperature.',
    adp: 9,
    bf: 0.1,
  },
  {
    id: 'chw8',
    short: 'CHW 8R',
    label: 'Chilled water, 8 rows',
    example: 'Laboratories, clean rooms, tropical fresh-air handling',
    description: 'Eight-row coil for a close approach and high latent capacity at 6/12 °C.',
    adp: 8,
    bf: 0.04,
  },
  {
    id: 'freezer',
    short: 'Freezer',
    label: 'Low-temperature evaporator',
    example: 'Cold stores, blast freezers, freezer-room coolers',
    description: 'Coil surface well below 0 °C – moisture freezes onto the fins and must be defrosted.',
    adp: -25,
    bf: 0.15,
  },
  {
    id: 'custom',
    short: 'Custom',
    label: 'Custom coil',
    example: 'Manufacturer selection data',
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
  /** temperature rise (K) the slider should span at the current airflow */
  riseK: number
}

export const HEAT_MODES: HeatModeInfo[] = [
  {
    id: 'off',
    label: 'Off',
    description: 'No heat added after the coil.',
    riseK: 10,
  },
  {
    id: 'gains',
    label: 'Room gains',
    description:
      'Sensible gains picked up in the space – people (~75 W each), lighting, equipment and solar.',
    riseK: 15,
  },
  {
    id: 'heater',
    label: 'Heater',
    description: 'Electric, LPHW or gas reheat battery in the duct.',
    riseK: 40,
  },
]

export type FlowUnit = 'ls' | 'm3h'

export interface FlowUnitInfo {
  label: string
  toLs: (v: number) => number
  fromLs: (v: number) => number
  /** slider range (log scale) */
  min: number
  max: number
}

export const FLOW_UNITS: Record<FlowUnit, FlowUnitInfo> = {
  ls: { label: 'L/s', toLs: (v) => v, fromLs: (v) => v, min: 10, max: 28_000 },
  m3h: {
    label: 'm³/h',
    toLs: (v) => v / 3.6,
    fromLs: (v) => v * 3.6,
    min: 36,
    max: 100_000,
  },
}
