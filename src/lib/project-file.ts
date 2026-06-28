import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  ACCEPTED_MIME_TYPES,
  MAX_PANEL_COUNT,
  MAX_TOTAL_BYTES,
  SCHEMA_VERSION,
} from '../constants'
import type {
  AcceptedMime,
  FiggridManifestV1,
  FigureProjectV1,
  ImageAsset,
  ProjectManifestAsset,
} from '../types'

function extensionForMime(mime: AcceptedMime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

async function sha256(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function blobFromBytes(bytes: Uint8Array, mime: string) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type: mime })
}

export async function createFiggridBundle(
  project: FigureProjectV1,
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  const manifestAssets: ProjectManifestAsset[] = []

  for (const asset of project.assets) {
    const path = `assets/${asset.id}.${extensionForMime(asset.mime)}`
    files[path] = new Uint8Array(await asset.blob.arrayBuffer())
    manifestAssets.push({
      id: asset.id,
      name: asset.name,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      size: asset.size,
      path,
      sha256: await sha256(asset.blob),
    })
  }

  const manifest: FiggridManifestV1 = {
    ...project,
    assets: manifestAssets,
  }
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
  const zipped = zipSync(files, { level: 6 })
  return blobFromBytes(zipped, 'application/x-figgrid')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateManifest(value: unknown): asserts value is FiggridManifestV1 {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('工程文件版本不受支持。')
  }
  if (!Array.isArray(value.assets) || value.assets.length > MAX_PANEL_COUNT) {
    throw new Error('工程中的图片数量无效。')
  }
  if (!Array.isArray(value.panelOrder) || !isRecord(value.panels)) {
    throw new Error('工程文件缺少面板信息。')
  }
  for (const asset of value.assets) {
    if (
      !isRecord(asset) ||
      typeof asset.id !== 'string' ||
      typeof asset.name !== 'string' ||
      typeof asset.path !== 'string' ||
      typeof asset.sha256 !== 'string' ||
      typeof asset.width !== 'number' ||
      typeof asset.height !== 'number' ||
      typeof asset.size !== 'number' ||
      !ACCEPTED_MIME_TYPES.includes(asset.mime as AcceptedMime) ||
      asset.path.includes('..') ||
      !asset.path.startsWith('assets/')
    ) {
      throw new Error('工程中包含无效的图片资源。')
    }
  }
}

export async function readFiggridBundle(file: File): Promise<FigureProjectV1> {
  if (file.size > MAX_TOTAL_BYTES + 10 * 1024 * 1024) {
    throw new Error('工程文件过大。')
  }

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error('工程文件损坏，无法解压。')
  }

  const manifestBytes = files['manifest.json']
  if (!manifestBytes) throw new Error('工程文件缺少 manifest.json。')

  let manifestValue: unknown
  try {
    manifestValue = JSON.parse(strFromU8(manifestBytes))
  } catch {
    throw new Error('工程清单不是有效的 JSON。')
  }
  validateManifest(manifestValue)
  const manifest = manifestValue

  let totalBytes = 0
  const assets: ImageAsset[] = []
  for (const entry of manifest.assets) {
    const bytes = files[entry.path]
    if (!bytes) throw new Error(`工程缺少资源：${entry.name}`)
    totalBytes += bytes.byteLength
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error('工程资源总大小超过 150MB。')
    if (bytes.byteLength !== entry.size) {
      throw new Error(`资源大小校验失败：${entry.name}`)
    }
    const blob = blobFromBytes(bytes, entry.mime)
    if ((await sha256(blob)) !== entry.sha256) {
      throw new Error(`资源完整性校验失败：${entry.name}`)
    }
    assets.push({
      id: entry.id,
      name: entry.name,
      mime: entry.mime,
      width: entry.width,
      height: entry.height,
      size: entry.size,
      blob,
      previewUrl: URL.createObjectURL(blob),
    })
  }

  const assetIds = new Set(assets.map((asset) => asset.id))
  if (
    manifest.panelOrder.length !== assets.length ||
    manifest.panelOrder.some((id) => !assetIds.has(id)) ||
    Object.keys(manifest.panels).some((id) => !assetIds.has(id))
  ) {
    throw new Error('工程中的面板顺序与图片资源不一致。')
  }

  return { ...manifest, assets }
}
