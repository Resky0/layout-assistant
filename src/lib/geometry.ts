import type {
  ImageAsset,
  ImageRenderRect,
  PanelFrame,
  PanelState,
} from '../types'

export function getImageRenderRect(
  frame: PanelFrame,
  asset: Pick<ImageAsset, 'width' | 'height'>,
  panel: PanelState,
): ImageRenderRect {
  const containScale = Math.min(
    frame.width / asset.width,
    frame.height / asset.height,
  )
  const coverScale = Math.max(
    frame.width / asset.width,
    frame.height / asset.height,
  )
  const baseScale = panel.fit === 'cover' ? coverScale : containScale
  const zoom = panel.fit === 'cover' ? Math.max(1, panel.zoom) : 1
  const width = asset.width * baseScale * zoom
  const height = asset.height * baseScale * zoom
  const maxOffsetX = Math.max(0, (width - frame.width) / 2)
  const maxOffsetY = Math.max(0, (height - frame.height) / 2)
  const offsetX = Math.max(-1, Math.min(1, panel.offsetX)) * maxOffsetX
  const offsetY = Math.max(-1, Math.min(1, panel.offsetY)) * maxOffsetY

  return {
    x: frame.x + (frame.width - width) / 2 + offsetX,
    y: frame.y + (frame.height - height) / 2 + offsetY,
    width,
    height,
    maxOffsetX,
    maxOffsetY,
  }
}

export function getPanelLabel(
  index: number,
  mode: 'uppercase' | 'lowercase' | 'none',
) {
  if (mode === 'none') return ''
  const base = mode === 'uppercase' ? 65 : 97
  return String.fromCharCode(base + index)
}
