import '../test/setup'
import { describe, expect, it } from 'vitest'
import type { PanelFrame, PanelState } from '../types'
import { getImageRenderRect } from './geometry'

const frame: PanelFrame = {
  assetId: 'asset', x: 10, y: 20, width: 300, height: 200, rowIndex: 0, columnIndex: 0,
}

function panel(fit: 'contain' | 'cover', patch: Partial<PanelState> = {}): PanelState {
  return {
    assetId: 'asset', fit, zoom: 1, offsetX: 0, offsetY: 0, hiddenLabel: false, ...patch,
  }
}

describe('image geometry', () => {
  it('contains the complete image without cropping', () => {
    const rect = getImageRenderRect(frame, { width: 1000, height: 1000 }, panel('contain'))
    expect(rect.x).toBeGreaterThanOrEqual(frame.x)
    expect(rect.y).toBeGreaterThanOrEqual(frame.y)
    expect(rect.x + rect.width).toBeLessThanOrEqual(frame.x + frame.width)
    expect(rect.y + rect.height).toBeLessThanOrEqual(frame.y + frame.height)
    expect(rect.width / rect.height).toBeCloseTo(1)
  })

  it('cover mode always fills the frame and clamps focal offsets', () => {
    const rect = getImageRenderRect(
      frame,
      { width: 1000, height: 500 },
      panel('cover', { zoom: 1.5, offsetX: 9, offsetY: -9 }),
    )
    expect(rect.width).toBeGreaterThanOrEqual(frame.width)
    expect(rect.height).toBeGreaterThanOrEqual(frame.height)
    expect(rect.x).toBeLessThanOrEqual(frame.x)
    expect(rect.x + rect.width).toBeGreaterThanOrEqual(frame.x + frame.width)
    expect(rect.y).toBeLessThanOrEqual(frame.y)
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(frame.y + frame.height)
  })
})