import '../test/setup'
import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject, defaultPanelState } from './project'
import { clearActiveProject, loadActiveProject, saveActiveProject } from './storage'

describe('IndexedDB project storage', () => {
  beforeEach(async () => {
    await clearActiveProject()
  })

  it('saves and restores the active project with its image blob', async () => {
    const project = createEmptyProject()
    const blob = new NodeBlob(['image'], { type: 'image/png' }) as unknown as Blob
    const asset = {
      id: 'asset-1',
      name: 'panel.png',
      mime: 'image/png' as const,
      width: 400,
      height: 300,
      size: blob.size,
      blob,
      previewUrl: 'blob:fixture',
    }
    project.assets = [asset]
    project.panelOrder = [asset.id]
    project.panels = { [asset.id]: defaultPanelState(asset.id) }

    await saveActiveProject(project)
    const restored = await loadActiveProject()

    expect(restored?.panelOrder).toEqual(['asset-1'])
    expect(restored?.assets[0].blob.size).toBe(blob.size)
    expect(restored?.assets[0].previewUrl).toMatch(/^blob:/)
  })
})