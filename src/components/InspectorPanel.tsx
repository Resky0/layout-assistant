import { EXPORT_WIDTH_PRESETS } from '../constants'
import type {
  ExportSettings,
  FigureStyle,
  ImageAsset,
  PanelState,
} from '../types'

interface InspectorPanelProps {
  selectedAsset: ImageAsset | null
  selectedPanel: PanelState | null
  style: FigureStyle
  exportSettings: ExportSettings
  estimatedHeight: number
  canExport: boolean
  busyAction: string | null
  onPanelChange: (patch: Partial<PanelState>) => void
  onStyleChange: (patch: Partial<FigureStyle>) => void
  onExportChange: (patch: Partial<ExportSettings>) => void
  onExportPng: () => void
  onExportSvg: () => void
}

function RangeRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  disabled = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className={`range-row${disabled ? ' is-disabled' : ''}`}>
      <span>
        {label}
        <output>{value}{unit}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function InspectorPanel({
  selectedAsset,
  selectedPanel,
  style,
  exportSettings,
  estimatedHeight,
  canExport,
  busyAction,
  onPanelChange,
  onStyleChange,
  onExportChange,
  onExportPng,
  onExportSvg,
}: InspectorPanelProps) {
  return (
    <aside className="sidebar inspector-sidebar" aria-label="排版设置">
      <div className="sidebar-heading">
        <div>
          <span className="eyebrow">微调</span>
          <h2>排版设置</h2>
        </div>
      </div>

      <section className="inspector-section">
        <div className="inspector-title">
          <h3>当前面板</h3>
          {selectedAsset && <span>{selectedAsset.name}</span>}
        </div>
        {!selectedAsset || !selectedPanel ? (
          <p className="muted-copy">在画布或左侧列表中选择一张图片。</p>
        ) : (
          <>
            <div className="segmented-control">
              <button
                type="button"
                className={selectedPanel.fit === 'contain' ? 'is-active' : ''}
                onClick={() =>
                  onPanelChange({ fit: 'contain', zoom: 1, offsetX: 0, offsetY: 0 })
                }
              >
                完整显示
              </button>
              <button
                type="button"
                className={selectedPanel.fit === 'cover' ? 'is-active' : ''}
                onClick={() => onPanelChange({ fit: 'cover' })}
              >
                铺满裁剪
              </button>
            </div>
            <RangeRow
              label="缩放"
              value={selectedPanel.zoom}
              min={1}
              max={3}
              step={0.05}
              unit="×"
              disabled={selectedPanel.fit !== 'cover'}
              onChange={(zoom) => onPanelChange({ zoom })}
            />
            <RangeRow
              label="水平焦点"
              value={Math.round(selectedPanel.offsetX * 100)}
              min={-100}
              max={100}
              unit="%"
              disabled={selectedPanel.fit !== 'cover'}
              onChange={(offsetX) => onPanelChange({ offsetX: offsetX / 100 })}
            />
            <RangeRow
              label="垂直焦点"
              value={Math.round(selectedPanel.offsetY * 100)}
              min={-100}
              max={100}
              unit="%"
              disabled={selectedPanel.fit !== 'cover'}
              onChange={(offsetY) => onPanelChange({ offsetY: offsetY / 100 })}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={selectedPanel.hiddenLabel}
                onChange={(event) =>
                  onPanelChange({ hiddenLabel: event.target.checked })
                }
              />
              隐藏该面板标签
            </label>
          </>
        )}
      </section>

      <section className="inspector-section">
        <h3>画布</h3>
        <RangeRow
          label="图片间距"
          value={style.gap}
          min={0}
          max={64}
          unit=" px"
          onChange={(gap) => onStyleChange({ gap })}
        />
        <RangeRow
          label="外边距"
          value={style.padding}
          min={0}
          max={64}
          unit=" px"
          onChange={(padding) => onStyleChange({ padding })}
        />
        <span className="field-label">背景</span>
        <div className="segmented-control">
          <button
            type="button"
            className={style.background === '#ffffff' ? 'is-active' : ''}
            onClick={() => onStyleChange({ background: '#ffffff' })}
          >
            白色
          </button>
          <button
            type="button"
            className={style.background === 'transparent' ? 'is-active' : ''}
            onClick={() => onStyleChange({ background: 'transparent' })}
          >
            透明
          </button>
        </div>
      </section>

      <section className="inspector-section">
        <h3>面板标签</h3>
        <div className="field-grid two-columns">
          <label>
            <span>样式</span>
            <select
              value={style.labelMode}
              onChange={(event) =>
                onStyleChange({
                  labelMode: event.target.value as FigureStyle['labelMode'],
                })
              }
            >
              <option value="uppercase">A, B, C</option>
              <option value="lowercase">a, b, c</option>
              <option value="none">不显示</option>
            </select>
          </label>
          <label>
            <span>位置</span>
            <select
              value={style.labelPosition}
              onChange={(event) =>
                onStyleChange({
                  labelPosition: event.target.value as FigureStyle['labelPosition'],
                })
              }
            >
              <option value="top-left">左上角</option>
              <option value="top-right">右上角</option>
            </select>
          </label>
        </div>
        <RangeRow
          label="字号"
          value={style.labelSize}
          min={18}
          max={64}
          unit=" px"
          onChange={(labelSize) => onStyleChange({ labelSize })}
        />
        <label className="color-row">
          <span>颜色</span>
          <input
            type="color"
            value={style.labelColor}
            onChange={(event) => onStyleChange({ labelColor: event.target.value })}
          />
          <code>{style.labelColor.toUpperCase()}</code>
        </label>
      </section>

      <section className="inspector-section export-section">
        <div className="inspector-title">
          <h3>导出</h3>
          {canExport && (
            <span>{exportSettings.width} × {estimatedHeight}px</span>
          )}
        </div>
        <div className="preset-row">
          {EXPORT_WIDTH_PRESETS.map((width) => (
            <button
              type="button"
              className={exportSettings.width === width ? 'is-active' : ''}
              onClick={() => onExportChange({ width })}
              key={width}
            >
              {width}
            </button>
          ))}
        </div>
        <label className="number-field">
          <span>自定义宽度</span>
          <input
            type="number"
            min={500}
            max={10000}
            step={100}
            value={exportSettings.width}
            onChange={(event) => {
              const width = Number(event.target.value)
              if (Number.isFinite(width)) onExportChange({ width })
            }}
            onBlur={(event) =>
              onExportChange({
                width: Math.min(10000, Math.max(500, Number(event.target.value) || 3000)),
              })
            }
          />
          <small>500–10000 px</small>
        </label>
        <button
          type="button"
          className="primary-button export-button"
          onClick={onExportPng}
          disabled={!canExport || busyAction !== null}
        >
          {busyAction === 'png' ? '正在生成 PNG…' : '导出高清 PNG'}
        </button>
        <button
          type="button"
          className="secondary-button export-button"
          onClick={onExportSvg}
          disabled={!canExport || busyAction !== null}
        >
          {busyAction === 'svg' ? '正在生成 SVG…' : '导出可编辑 SVG'}
        </button>
      </section>
    </aside>
  )
}
