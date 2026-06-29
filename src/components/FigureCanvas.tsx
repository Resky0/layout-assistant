import { useId } from 'react'
import type {
  FigureProjectV2,
  ImageAsset,
  SolvedLayout,
} from '../types'
import { getImageRenderRect, getPanelLabel } from '../lib/geometry'
import { getLabelPlacement } from '../lib/labels'

interface FigureCanvasProps {
  project: FigureProjectV2
  solved: SolvedLayout
  selectedAssetId?: string | null
  interactive?: boolean
  onSelect?: (assetId: string) => void
  className?: string
}

export function FigureCanvas({
  project,
  solved,
  selectedAssetId,
  interactive = false,
  onSelect,
  className = '',
}: FigureCanvasProps) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const assetMap = new Map<string, ImageAsset>(
    project.assets.map((asset) => [asset.id, asset]),
  )

  return (
    <svg
      className={`figure-svg ${className}`}
      viewBox={`0 0 ${solved.width} ${solved.height}`}
      role="img"
      aria-label="科研多面板图片预览"
      data-testid="figure-canvas"
    >
      {project.style.background !== 'transparent' && (
        <rect width="100%" height="100%" fill="#ffffff" />
      )}
      <defs>
        {solved.frames.map((frame) => (
          <clipPath
            id={`${instanceId}-clip-${frame.assetId}`}
            key={frame.assetId}
          >
            <rect
              x={frame.x}
              y={frame.y}
              width={frame.width}
              height={frame.height}
            />
          </clipPath>
        ))}
      </defs>
      {solved.frames.map((frame) => {
        const asset = assetMap.get(frame.assetId)
        const panel = project.panels[frame.assetId]
        if (!asset || !panel) return null
        const rect = getImageRenderRect(frame, asset, panel)
        const index = project.panelOrder.indexOf(asset.id)
        const label = getPanelLabel(index, project.style.labelMode)
        const placement = getLabelPlacement(frame, project.style)

        return (
          <g
            key={frame.assetId}
            className={interactive ? 'figure-panel is-interactive' : 'figure-panel'}
            onClick={() => interactive && onSelect?.(frame.assetId)}
            data-panel-id={frame.assetId}
          >
            <image
              href={asset.previewUrl}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              clipPath={`url(#${instanceId}-clip-${frame.assetId})`}
              preserveAspectRatio="none"
            />
            {label && !panel.hiddenLabel && (
              <text
                x={placement.x}
                y={placement.y}
                textAnchor={placement.textAnchor}
                fontFamily={placement.fontFamily}
                fontSize={project.style.labelSize}
                fontWeight={placement.fontWeight}
                fill={project.style.labelColor}
                stroke="#ffffff"
                strokeWidth={project.style.labelSize * 0.1}
                paintOrder="stroke fill"
              >
                {label}
              </text>
            )}
            {interactive && (
              <rect
                x={frame.x}
                y={frame.y}
                width={frame.width}
                height={frame.height}
                className={
                  selectedAssetId === frame.assetId
                    ? 'panel-hitbox is-selected'
                    : 'panel-hitbox'
                }
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
