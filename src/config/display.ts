export const TILE_SIZE = 16 as const

export type ViewportPresetKey = 'classic' | 'widescreen' | 'cinematic'

interface ViewportPreset {
  key: ViewportPresetKey
  label: string
  description: string
  cols: number
  rows: number
}

export const VIEWPORT_PRESETS: Record<ViewportPresetKey, ViewportPreset> = {
  classic: {
    key: 'classic',
    label: 'Classic 4:3',
    description: '24×16 tiles (384×256)',
    cols: 24,
    rows: 16
  },
  widescreen: {
    key: 'widescreen',
    label: 'Widescreen 16:9',
    description: '32×18 tiles (512×288)',
    cols: 32,
    rows: 18
  },
  cinematic: {
    key: 'cinematic',
    label: 'Cinematic 16:9',
    description: '48×27 tiles (768×432)',
    cols: 48,
    rows: 27
  }
}

export interface ViewportDimensions extends ViewportPreset {
  width: number
  height: number
}

export function resolveViewport(preset: ViewportPresetKey): ViewportDimensions {
  const config = VIEWPORT_PRESETS[preset] ?? VIEWPORT_PRESETS.widescreen
  return {
    ...config,
    width: config.cols * TILE_SIZE,
    height: config.rows * TILE_SIZE
  }
}
