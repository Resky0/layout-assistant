export type AcceptedMime = 'image/png' | 'image/jpeg' | 'image/webp'
export type ImageFit = 'contain' | 'cover'
export type LabelMode = 'uppercase' | 'lowercase' | 'none'
export type LabelPosition = 'top-left' | 'top-right'
export type LayoutKind = 'equal-grid' | 'justified'
export type LayoutProfile = 'classic' | 'compact' | 'balanced'

export interface ImageAsset {
  id: string
  name: string
  mime: AcceptedMime
  width: number
  height: number
  size: number
  blob: Blob
  previewUrl: string
}

export interface PanelState {
  assetId: string
  fit: ImageFit
  zoom: number
  offsetX: number
  offsetY: number
  hiddenLabel: boolean
}

export interface FigureStyle {
  gap: number
  padding: number
  background: '#ffffff' | 'transparent'
  labelMode: LabelMode
  labelPosition: LabelPosition
  labelSize: number
  labelColor: string
}

export interface ExportSettings {
  width: number
}

export interface FigureProjectV1 {
  schemaVersion: 1
  id: string
  title: string
  createdAt: string
  updatedAt: string
  assets: ImageAsset[]
  panelOrder: string[]
  panels: Record<string, PanelState>
  layoutProfile: LayoutProfile
  style: FigureStyle
  exportSettings: ExportSettings
}

export interface LayoutCandidate {
  id: string
  profile: LayoutProfile
  name: string
  description: string
  kind: LayoutKind
  rows: number[]
  score: number
}

export interface PanelFrame {
  assetId: string
  x: number
  y: number
  width: number
  height: number
  rowIndex: number
  columnIndex: number
}

export interface SolvedLayout {
  width: number
  height: number
  frames: PanelFrame[]
}

export interface ImageRenderRect {
  x: number
  y: number
  width: number
  height: number
  maxOffsetX: number
  maxOffsetY: number
}

export type StoredImageAsset = Omit<ImageAsset, 'previewUrl'>

export interface StoredFigureProjectV1 extends Omit<FigureProjectV1, 'assets'> {
  assets: StoredImageAsset[]
}

export interface ProjectManifestAsset {
  id: string
  name: string
  mime: AcceptedMime
  width: number
  height: number
  size: number
  path: string
  sha256: string
}

export interface FiggridManifestV1 extends Omit<FigureProjectV1, 'assets'> {
  assets: ProjectManifestAsset[]
}
