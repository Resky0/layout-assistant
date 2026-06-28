import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CandidatePicker } from './components/CandidatePicker'
import { FigureCanvas } from './components/FigureCanvas'
import { ImageSidebar } from './components/ImageSidebar'
import { InspectorPanel } from './components/InspectorPanel'
import { MIN_PANEL_COUNT } from './constants'
import { useProjectHistory } from './hooks/useProjectHistory'
import { createPngBlob, createSvgBlob, downloadBlob } from './lib/export'
import { importImageFiles, replaceImageFile } from './lib/images'
import { generateLayoutCandidates, solveLayout } from './lib/layout'
import {
  createEmptyProject,
  defaultPanelState,
  projectFileName,
} from './lib/project'
import { createFiggridBundle, readFiggridBundle } from './lib/project-file'
import {
  clearActiveProject,
  loadActiveProject,
  saveActiveProject,
} from './lib/storage'
import type {
  FigureProjectV1,
  FigureStyle,
  LayoutCandidate,
  PanelState,
} from './types'

interface Notice {
  type: 'error' | 'success' | 'info'
  text: string
}

function revokeProjectUrls(project: FigureProjectV1) {
  project.assets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl))
}

export default function App() {
  const {
    project,
    commit,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProjectHistory(createEmptyProject())
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [saveStatus, setSaveStatus] = useState('准备就绪')
  const projectInputRef = useRef<HTMLInputElement>(null)

  const orderedAssets = useMemo(() => {
    const assetMap = new Map(project.assets.map((asset) => [asset.id, asset]))
    return project.panelOrder
      .map((id) => assetMap.get(id))
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
  }, [project.assets, project.panelOrder])

  const candidates = useMemo(
    () => generateLayoutCandidates(orderedAssets),
    [orderedAssets],
  )
  const solvedCandidates = useMemo(() => {
    const result = new Map()
    candidates.forEach((candidate) => {
      result.set(candidate.id, solveLayout(candidate, orderedAssets, project.style))
    })
    return result
  }, [candidates, orderedAssets, project.style])
  const selectedCandidate =
    candidates.find((candidate) => candidate.profile === project.layoutProfile) ??
    candidates[0]
  const solved = selectedCandidate
    ? solvedCandidates.get(selectedCandidate.id)
    : undefined
  const selectedAsset =
    project.assets.find((asset) => asset.id === selectedAssetId) ?? null
  const selectedPanel = selectedAssetId
    ? project.panels[selectedAssetId] ?? null
    : null
  const estimatedHeight = solved
    ? Math.round(
        (solved.height / solved.width) * project.exportSettings.width,
      )
    : 0

  useEffect(() => {
    let cancelled = false
    loadActiveProject()
      .then((restored) => {
        if (cancelled || !restored) return
        replace(restored)
        setSelectedAssetId(restored.panelOrder[0] ?? null)
        setNotice({ type: 'info', text: '已恢复上次未完成的工程。' })
      })
      .catch(() => {
        setNotice({ type: 'error', text: '自动保存的工程无法读取，已打开空白工程。' })
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [replace])

  useEffect(() => {
    if (!hydrated) return
    setSaveStatus('正在保存…')
    const timer = window.setTimeout(() => {
      saveActiveProject(project)
        .then(() => setSaveStatus('已自动保存'))
        .catch(() => setSaveStatus('自动保存失败'))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [hydrated, project])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [redo, undo])

  const showErrors = (errors: string[]) => {
    if (errors.length === 0) return
    const suffix = errors.length > 1 ? `（另有 ${errors.length - 1} 个问题）` : ''
    setNotice({ type: 'error', text: `${errors[0]}${suffix}` })
  }

  const handleFiles = useCallback(
    async (files: File[]) => {
      setBusyAction('import')
      const result = await importImageFiles(files, project.assets)
      if (result.assets.length > 0) {
        commit((current) => {
          const panels = { ...current.panels }
          result.assets.forEach((asset) => {
            panels[asset.id] = defaultPanelState(asset.id)
          })
          return {
            ...current,
            assets: [...current.assets, ...result.assets],
            panelOrder: [
              ...current.panelOrder,
              ...result.assets.map((asset) => asset.id),
            ],
            panels,
            layoutProfile: 'classic',
          }
        })
        setSelectedAssetId(result.assets[0].id)
        setNotice({
          type: 'success',
          text: `已导入 ${result.assets.length} 张图片。`,
        })
      }
      showErrors(result.errors)
      setBusyAction(null)
    },
    [commit, project.assets],
  )

  const updatePanel = (patch: Partial<PanelState>) => {
    if (!selectedAssetId) return
    commit((current) => ({
      ...current,
      panels: {
        ...current.panels,
        [selectedAssetId]: {
          ...current.panels[selectedAssetId],
          ...patch,
        },
      },
    }))
  }

  const updateStyle = (patch: Partial<FigureStyle>) => {
    commit((current) => ({
      ...current,
      style: { ...current.style, ...patch },
    }))
  }

  const selectCandidate = (candidate: LayoutCandidate) => {
    commit((current) => ({
      ...current,
      layoutProfile: candidate.profile,
    }))
  }

  const reorderAssets = (draggedId: string, targetId: string) => {
    commit((current) => {
      const order = current.panelOrder.filter((id) => id !== draggedId)
      const targetIndex = order.indexOf(targetId)
      order.splice(targetIndex, 0, draggedId)
      return { ...current, panelOrder: order }
    })
  }

  const moveAsset = (assetId: string, direction: -1 | 1) => {
    commit((current) => {
      const order = [...current.panelOrder]
      const index = order.indexOf(assetId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current
      ;[order[index], order[nextIndex]] = [order[nextIndex], order[index]]
      return { ...current, panelOrder: order }
    })
  }

  const removeAsset = (assetId: string) => {
    commit((current) => {
      const panels = { ...current.panels }
      delete panels[assetId]
      return {
        ...current,
        assets: current.assets.filter((asset) => asset.id !== assetId),
        panelOrder: current.panelOrder.filter((id) => id !== assetId),
        panels,
      }
    })
    if (selectedAssetId === assetId) {
      setSelectedAssetId(project.panelOrder.find((id) => id !== assetId) ?? null)
    }
  }

  const replaceAsset = async (assetId: string, file: File) => {
    const previous = project.assets.find((asset) => asset.id === assetId)
    if (!previous) return
    setBusyAction('replace')
    try {
      const replacement = await replaceImageFile(file, previous, project.assets)
      commit((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === assetId ? replacement : asset,
        ),
      }))
      setNotice({ type: 'success', text: '图片已替换，面板设置保持不变。' })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : '替换图片失败。',
      })
    } finally {
      setBusyAction(null)
    }
  }

  const requireSolved = () => {
    if (!solved || project.assets.length < MIN_PANEL_COUNT) {
      setNotice({ type: 'error', text: '请至少导入 2 张图片后再导出。' })
      return null
    }
    return solved
  }

  const exportPng = async () => {
    const layout = requireSolved()
    if (!layout) return
    setBusyAction('png')
    try {
      const blob = await createPngBlob(
        project,
        layout,
        project.exportSettings.width,
      )
      downloadBlob(blob, projectFileName(project, 'png'))
      setNotice({ type: 'success', text: '高清 PNG 已生成。' })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'PNG 导出失败。',
      })
    } finally {
      setBusyAction(null)
    }
  }

  const exportSvg = async () => {
    const layout = requireSolved()
    if (!layout) return
    setBusyAction('svg')
    try {
      downloadBlob(
        await createSvgBlob(project, layout),
        projectFileName(project, 'svg'),
      )
      setNotice({ type: 'success', text: '可编辑 SVG 已生成。' })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'SVG 导出失败。',
      })
    } finally {
      setBusyAction(null)
    }
  }

  const saveProjectFile = async () => {
    setBusyAction('project')
    try {
      const bundle = await createFiggridBundle(project)
      downloadBlob(bundle, projectFileName(project, 'figgrid'))
      setNotice({ type: 'success', text: '工程文件已保存。' })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : '工程文件保存失败。',
      })
    } finally {
      setBusyAction(null)
    }
  }

  const openProjectFile = async (file: File) => {
    if (
      project.assets.length > 0 &&
      !window.confirm('打开工程将替换当前内容。是否继续？')
    ) {
      return
    }
    setBusyAction('open-project')
    try {
      const restored = await readFiggridBundle(file)
      revokeProjectUrls(project)
      replace(restored)
      setSelectedAssetId(restored.panelOrder[0] ?? null)
      setNotice({ type: 'success', text: '工程文件已打开并通过完整性校验。' })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : '工程文件无法打开。',
      })
    } finally {
      setBusyAction(null)
      if (projectInputRef.current) projectInputRef.current.value = ''
    }
  }

  const newProject = async () => {
    if (
      project.assets.length > 0 &&
      !window.confirm('新建工程会清空当前画布。建议先保存工程文件。是否继续？')
    ) {
      return
    }
    revokeProjectUrls(project)
    replace(createEmptyProject())
    setSelectedAssetId(null)
    await clearActiveProject()
    setNotice({ type: 'info', text: '已新建空白工程。' })
  }

  return (
    <div className="app-shell">
      <div className="mobile-blocker">
        <strong>请在电脑上使用 Layout Assistant</strong>
        <span>当前 MVP 针对 1024px 以上的桌面屏幕设计。</span>
      </div>

      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">LA</span>
          <div>
            <strong>Layout Assistant</strong>
            <span>科研多面板排图</span>
          </div>
        </div>
        <input
          className="project-title-input"
          value={project.title}
          aria-label="工程名称"
          onChange={(event) =>
            commit((current) => ({ ...current, title: event.target.value }))
          }
        />
        <div className="topbar-actions">
          <span className="save-status"><i />{saveStatus}</span>
          <button type="button" onClick={undo} disabled={!canUndo} title="撤销">
            ↶ <span>撤销</span>
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="重做">
            ↷ <span>重做</span>
          </button>
          <button type="button" onClick={newProject}>新建</button>
          <button type="button" onClick={() => projectInputRef.current?.click()}>
            打开工程
          </button>
          <button
            type="button"
            className="toolbar-primary"
            onClick={saveProjectFile}
            disabled={busyAction !== null}
          >
            {busyAction === 'project' ? '正在保存…' : '保存工程'}
          </button>
          <input
            ref={projectInputRef}
            type="file"
            accept=".figgrid,application/x-figgrid"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void openProjectFile(file)
            }}
          />
        </div>
      </header>

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示">×</button>
        </div>
      )}

      <main className="workspace">
        <ImageSidebar
          assets={orderedAssets}
          selectedAssetId={selectedAssetId}
          onFiles={(files) => void handleFiles(files)}
          onSelect={setSelectedAssetId}
          onRemove={removeAsset}
          onReplace={(id, file) => void replaceAsset(id, file)}
          onReorder={reorderAssets}
          onMove={moveAsset}
        />

        <div className="canvas-column">
          {orderedAssets.length < MIN_PANEL_COUNT ? (
            <div className="welcome-state">
              <div className="welcome-visual" aria-hidden="true">
                <span /><span /><span /><span /><span /><span />
              </div>
              <span className="eyebrow">从原图开始</span>
              <h1>把科研图片，排得准确又整齐</h1>
              <p>
                {orderedAssets.length === 0
                  ? '拖入 2–12 张 PNG、JPG 或 WebP，我们会生成三种不裁图的布局方案。'
                  : '已添加 1 张图片，再添加至少 1 张即可生成布局。'}
              </p>
              <div className="welcome-points">
                <span>✓ 本地处理</span>
                <span>✓ 保留原图比例</span>
                <span>✓ 高清导出</span>
              </div>
            </div>
          ) : (
            <>
              <CandidatePicker
                project={project}
                candidates={candidates}
                solvedCandidates={solvedCandidates}
                onSelect={selectCandidate}
              />
              {solved && (
                <section className="figure-stage" aria-labelledby="figure-stage-title">
                  <div className="section-heading compact">
                    <div>
                      <span className="eyebrow">Figure 预览</span>
                      <h2 id="figure-stage-title">{selectedCandidate?.name}</h2>
                    </div>
                    <span className="section-note">
                      点击面板后在右侧微调
                    </span>
                  </div>
                  <div
                    className={`canvas-frame${
                      project.style.background === 'transparent'
                        ? ' checkerboard'
                        : ''
                    }`}
                  >
                    <FigureCanvas
                      project={project}
                      solved={solved}
                      selectedAssetId={selectedAssetId}
                      interactive
                      onSelect={setSelectedAssetId}
                    />
                  </div>
                  <div className="canvas-footer">
                    <span>{orderedAssets.length} 个面板</span>
                    <span>画布比例 {(solved.width / solved.height).toFixed(2)} : 1</span>
                    <span>SVG 画布 {Math.round(solved.width)} × {Math.round(solved.height)}</span>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <InspectorPanel
          selectedAsset={selectedAsset}
          selectedPanel={selectedPanel}
          style={project.style}
          exportSettings={project.exportSettings}
          estimatedHeight={estimatedHeight}
          canExport={Boolean(solved && project.assets.length >= MIN_PANEL_COUNT)}
          busyAction={busyAction}
          onPanelChange={updatePanel}
          onStyleChange={updateStyle}
          onExportChange={(patch) =>
            commit((current) => ({
              ...current,
              exportSettings: { ...current.exportSettings, ...patch },
            }))
          }
          onExportPng={() => void exportPng()}
          onExportSvg={() => void exportSvg()}
        />
      </main>
    </div>
  )
}
