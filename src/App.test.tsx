import './test/setup'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDB } from 'idb'
import App from './App'
import { createEmptyProject } from './lib/project'
import { clearBackupPreferences, saveProject } from './lib/storage'

async function resetDatabase() {
  const database = await openDB('layout-assistant', 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects')
      if (!db.objectStoreNames.contains('project-summaries')) {
        db.createObjectStore('project-summaries')
      }
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences')
      }
    },
  })
  const transaction = database.transaction(
    ['projects', 'project-summaries', 'preferences'],
    'readwrite',
  )
  await Promise.all([
    transaction.objectStore('projects').clear(),
    transaction.objectStore('project-summaries').clear(),
    transaction.objectStore('preferences').clear(),
  ])
  await transaction.done
  database.close()
  await clearBackupPreferences()
}

describe('论文图片排版助手', () => {
  beforeEach(async () => {
    window.history.replaceState(null, '', '/')
    await resetDatabase()
  })

  afterEach(() => {
    cleanup()
  })

  it('opens the project center from the landing page and creates a project', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /让科研排图/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /立即开始/ }))
    expect(await screen.findByRole('heading', { name: '我的工程' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /新建工程/ }).at(-1)!)
    expect(await screen.findByTestId('image-input')).toBeInTheDocument()
  })

  it('loads a specific project and presents three layout candidates', async () => {
    const user = userEvent.setup()
    const project = createEmptyProject()
    await saveProject(project)
    window.history.replaceState(null, '', `/#editor/${project.id}`)
    render(<App />)
    const input = await screen.findByTestId('image-input')
    const files = Array.from(
      { length: 6 },
      (_, index) =>
        new File([`image-${index}`], `panel-${index}.png`, { type: 'image/png' }),
    )

    await user.upload(input, files)

    await waitFor(() => {
      expect(screen.getAllByText('经典网格')).toHaveLength(2)
      expect(screen.getByText('紧凑自适应')).toBeInTheDocument()
      expect(screen.getByText('均衡布局')).toBeInTheDocument()
    })
    expect(screen.getAllByTestId('figure-canvas')).toHaveLength(4)
    expect(screen.getByText('6 个面板')).toBeInTheDocument()
  })

  it('switches from project center to general settings', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/#projects')
    render(<App />)
    await screen.findByRole('heading', { name: '我的工程' })

    await user.click(screen.getAllByRole('button', { name: '通用设置' })[0])

    expect(await screen.findByRole('heading', { name: '通用设置' })).toBeInTheDocument()
    expect(screen.getByText('自动备份文件夹')).toBeInTheDocument()
  })
})
