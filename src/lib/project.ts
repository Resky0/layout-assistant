import { DEFAULT_STYLE, SCHEMA_VERSION } from '../constants'
import type {
  FigureProjectV1,
  ImageAsset,
  PanelState,
  StoredFigureProjectV1,
} from '../types'
import { createId } from './browser-crypto'

export function createEmptyProject(): FigureProjectV1 {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId(),
    title: '未命名 Figure',
    createdAt: now,
    updatedAt: now,
    assets: [],
    panelOrder: [],
    panels: {},
    layoutProfile: 'classic',
    style: { ...DEFAULT_STYLE },
    exportSettings: { width: 3000 },
  }
}

export function defaultPanelState(assetId: string): PanelState {
  return {
    assetId,
    fit: 'contain',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    hiddenLabel: false,
  }
}

export function touchProject(project: FigureProjectV1): FigureProjectV1 {
  return { ...project, updatedAt: new Date().toISOString() }
}

export function toStoredProject(
  project: FigureProjectV1,
): StoredFigureProjectV1 {
  return {
    ...project,
    assets: project.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      size: asset.size,
      blob: asset.blob,
    })),
  }
}

export function fromStoredProject(
  project: StoredFigureProjectV1,
): FigureProjectV1 {
  const assets: ImageAsset[] = project.assets.map((asset) => ({
    ...asset,
    previewUrl: URL.createObjectURL(asset.blob),
  }))
  return { ...project, assets }
}

export function projectFileName(project: FigureProjectV1, extension: string) {
  const safeTitle = Array.from(project.title.trim())
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
  return `${safeTitle || 'layout-assistant'}.${extension}`
}
