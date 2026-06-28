// @vitest-environment node
import { File as NodeFile } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { createEmptyProject, defaultPanelState } from './project'
import { createFiggridBundle, readFiggridBundle } from './project-file'

function projectWithTwoAssets() {
  const project = createEmptyProject()
  for (let index = 0; index < 2; index += 1) {
    const blob = new Blob([`image-${index}`], { type: 'image/png' })
    const id = `asset-${index}`
    project.assets.push({
      id,
      name: `panel-${index}.png`,
      mime: 'image/png',
      width: 100 + index,
      height: 80,
      size: blob.size,
      blob,
      previewUrl: `blob:${id}`,
    })
    project.panelOrder.push(id)
    project.panels[id] = defaultPanelState(id)
  }
  return project
}

describe('.figgrid project files', () => {
  it('round-trips its manifest, resources, and integrity hashes', async () => {
    const source = projectWithTwoAssets()
    const bundle = await createFiggridBundle(source)
    const file = new NodeFile([new Uint8Array(await bundle.arrayBuffer())], 'fixture.figgrid', {
      type: 'application/x-figgrid',
    }) as unknown as File
    const restored = await readFiggridBundle(file)

    expect(restored.schemaVersion).toBe(1)
    expect(restored.panelOrder).toEqual(source.panelOrder)
    expect(restored.assets.map((asset) => asset.name)).toEqual(
      source.assets.map((asset) => asset.name),
    )
    expect(restored.assets[0].blob.size).toBe(source.assets[0].blob.size)
  })

  it('rejects a corrupt project file', async () => {
    const file = new NodeFile(['not-a-zip'], 'broken.figgrid') as unknown as File
    await expect(readFiggridBundle(file)).rejects.toThrow()
  })
})