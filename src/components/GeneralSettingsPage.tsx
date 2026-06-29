import { useBackupSettings } from '../hooks/useBackupSettings'

export function GeneralSettingsPage() {
  const backup = useBackupSettings()
  const backupActive = backup.enabled && backup.permission === 'granted'
  const status = !backup.supported
    ? '当前环境不支持'
    : backup.permission !== 'granted' && backup.rootFolderName
      ? '需要重新授权'
      : backupActive
        ? '自动备份已开启'
        : '自动备份已暂停'

  return (
    <div className="dashboard-page settings-page">
      <header className="dashboard-page-header">
        <div>
          <span>GENERAL SETTINGS</span>
          <h1>通用设置</h1>
          <p>管理所有工程共用的本地备份位置。</p>
        </div>
      </header>

      <section className="settings-card" aria-labelledby="backup-settings-title">
        <div className="settings-card-heading">
          <div className="settings-card-icon" aria-hidden="true">⌂</div>
          <div>
            <h2 id="backup-settings-title">自动备份文件夹</h2>
            <p>工程仍保存在浏览器中；这里配置额外的磁盘灾备副本。</p>
          </div>
          <span className={`settings-status${backupActive ? ' is-enabled' : ''}`}>
            <i />{status}
          </span>
        </div>

        {!backup.loaded ? (
          <div className="settings-loading">正在读取备份设置…</div>
        ) : !backup.supported ? (
          <div className="settings-warning">
            <strong>需要 HTTPS 和最新版 Chrome / Edge</strong>
            <p>当前环境仍可使用浏览器工程库和全部手动导出功能。</p>
          </div>
        ) : (
          <>
            <div className="settings-folder-row">
              <div>
                <span>当前文件夹</span>
                <strong>{backup.rootFolderName ?? '尚未选择'}</strong>
                <small>
                  {backup.lastBackupAt
                    ? `最近写入：${new Date(backup.lastBackupAt).toLocaleString('zh-CN')}`
                    : '选择后，工程会在下次打开或修改时开始备份。'}
                </small>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => void backup.selectFolder()}
              >
                {backup.rootFolderName ? '更换文件夹' : '选择文件夹'}
              </button>
            </div>

            {backup.error && <p className="settings-error" role="alert">{backup.error}</p>}

            {backup.rootFolderName && (
              <div className="settings-actions">
                {backup.permission !== 'granted' ? (
                  <button type="button" onClick={() => void backup.reauthorize()}>
                    重新授权
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void backup.setEnabled(!backup.enabled)}
                  >
                    {backup.enabled ? '暂停自动备份' : '继续自动备份'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="settings-path-example">
          <span>文件结构</span>
          <code>{`工程名-工程ID/\n├─ latest.figgrid\n└─ history/ 最近 10 份历史快照`}</code>
        </div>
        <ul className="settings-notes">
          <li>停止编辑 2 秒后更新完整工程。</li>
          <li>历史快照最多每 5 分钟生成一次。</li>
          <li>首次选择目录不会批量打包已有工程。</li>
        </ul>
      </section>
    </div>
  )
}
