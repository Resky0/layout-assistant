import { useCallback, useEffect, useRef, useState } from 'react'
import { useBackupSettings } from '../hooks/useBackupSettings'
import {
  copyProjectAsNew,
  createEmptyProject,
  normalizeProjectTitle,
} from '../lib/project'
import { readFiggridBundle } from '../lib/project-file'
import {
  deleteProject,
  duplicateProject,
  listProjectSummaries,
  renameProject,
  saveProject,
  setLastOpenProjectId,
} from '../lib/storage'
import type { ProjectSummary } from '../types'

interface ProjectsPageProps {
  onOpenProject: (projectId: string) => void
  onOpenSettings: () => void
}

function ProjectThumbnail({ summary }: { summary: ProjectSummary }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!summary.thumbnail) {
      setUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(summary.thumbnail)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [summary.thumbnail])

  return (
    <div className={`project-thumbnail${url ? ' has-image' : ''}`}>
      {url ? (
        <img src={url} alt={`${summary.title} 预览`} />
      ) : (
        <div className="project-placeholder" aria-label="暂无工程预览">
          {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
        </div>
      )}
      <span>{summary.panelCount} 个面板</span>
    </div>
  )
}

export function ProjectsPage({
  onOpenProject,
  onOpenSettings,
}: ProjectsPageProps) {
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)
  const backup = useBackupSettings()

  const refresh = useCallback(async () => {
    const next = await listProjectSummaries()
    setSummaries(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    listProjectSummaries()
      .then((next) => {
        if (!cancelled) setSummaries(next)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error
            ? loadError.message
            : '无法读取本地工程。')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openProject = async (projectId: string) => {
    await setLastOpenProjectId(projectId)
    onOpenProject(projectId)
  }

  const createProject = async () => {
    setBusy('create')
    setError(null)
    try {
      const project = createEmptyProject()
      await saveProject(project)
      await openProject(project.id)
    } catch (createError) {
      setError(createError instanceof Error
        ? createError.message
        : '新建工程失败。')
    } finally {
      setBusy(null)
    }
  }

  const importProject = async (file: File) => {
    setBusy('import')
    setError(null)
    let restored: Awaited<ReturnType<typeof readFiggridBundle>> | null = null
    try {
      restored = await readFiggridBundle(file)
      const imported = copyProjectAsNew(restored)
      await saveProject(imported)
      await openProject(imported.id)
    } catch (importError) {
      setError(importError instanceof Error
        ? importError.message
        : '工程文件无法导入。')
    } finally {
      restored?.assets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl))
      setBusy(null)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const confirmRename = async (projectId: string) => {
    setBusy(projectId)
    setError(null)
    try {
      const renamed = await renameProject(projectId, renameValue)
      renamed.assets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl))
      setRenamingId(null)
      await refresh()
    } catch (renameError) {
      setError(renameError instanceof Error
        ? renameError.message
        : '重命名失败。')
    } finally {
      setBusy(null)
    }
  }

  const copyProject = async (projectId: string) => {
    setBusy(projectId)
    setError(null)
    try {
      const duplicate = await duplicateProject(projectId)
      duplicate.assets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl))
      await refresh()
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '复制工程失败。')
    } finally {
      setBusy(null)
    }
  }

  const removeProject = async (summary: ProjectSummary) => {
    if (!window.confirm(`确定删除“${summary.title}”吗？磁盘备份不会被删除。`)) {
      return
    }
    setBusy(summary.id)
    setError(null)
    try {
      await deleteProject(summary.id)
      await refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error
        ? deleteError.message
        : '删除工程失败。')
    } finally {
      setBusy(null)
    }
  }

  const backupReady = Boolean(
    backup.supported && backup.enabled &&
    backup.permission === 'granted' && backup.rootFolderName,
  )

  return (
    <div className="dashboard-page projects-page">
      <div className={`dashboard-backup-banner${backupReady ? ' is-ready' : ''}`}>
        <div>
          <i />
          <span>
            <strong>{backupReady ? '本地文件夹备份已开启' : '设置额外的本地备份'}</strong>
            <small>
              {backupReady
                ? `工程将在打开或修改后写入“${backup.rootFolderName}”`
                : '浏览器会保存工程；还可以选择一个文件夹保存完整副本。'}
            </small>
          </span>
        </div>
        <button type="button" onClick={onOpenSettings}>通用设置</button>
      </div>

      <header className="dashboard-page-header projects-header">
        <div>
          <span>LOCAL PROJECTS</span>
          <h1>我的工程</h1>
          <p>所有工程和原图均保存在当前浏览器中。</p>
        </div>
        <div className="projects-header-actions">
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={busy !== null}
          >
            导入工程
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void createProject()}
            disabled={busy !== null}
          >
            ＋ 新建工程
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".figgrid,application/x-figgrid"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importProject(file)
            }}
          />
        </div>
      </header>

      {error && <div className="dashboard-error" role="alert">{error}</div>}

      {loading ? (
        <div className="projects-loading">正在读取本地工程…</div>
      ) : (
        <div className="project-grid">
          <button
            type="button"
            className="new-project-card"
            onClick={() => void createProject()}
            disabled={busy !== null}
          >
            <span>＋</span>
            <strong>新建工程</strong>
            <small>从空白画布开始排图</small>
          </button>

          {summaries.map((summary) => (
            <article className="project-card" key={summary.id}>
              <button
                type="button"
                className="project-card-open"
                onClick={() => void openProject(summary.id)}
                disabled={busy !== null}
                aria-label={`打开工程：${summary.title}`}
              >
                <ProjectThumbnail summary={summary} />
              </button>
              <div className="project-card-info">
                {renamingId === summary.id ? (
                  <div className="project-rename-row">
                    <input
                      value={renameValue}
                      maxLength={80}
                      autoFocus
                      aria-label="新工程名称"
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void confirmRename(summary.id)
                        if (event.key === 'Escape') setRenamingId(null)
                      }}
                    />
                    <button type="button" onClick={() => void confirmRename(summary.id)}>
                      保存
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="project-card-title-button"
                    onClick={() => void openProject(summary.id)}
                  >
                    <h2>{summary.title}</h2>
                    <p>
                      {summary.panelCount} 个面板 · 更新于{' '}
                      {new Date(summary.updatedAt).toLocaleString('zh-CN')}
                    </p>
                  </button>
                )}
                {renamingId === summary.id && (
                  <p>
                    {summary.panelCount} 个面板 · 更新于{' '}
                    {new Date(summary.updatedAt).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
              <div className="project-card-actions">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(summary.id)
                    setRenameValue(normalizeProjectTitle(summary.title))
                  }}
                  disabled={busy !== null}
                >
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => void copyProject(summary.id)}
                  disabled={busy !== null}
                >
                  复制
                </button>
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => void removeProject(summary)}
                  disabled={busy !== null}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
