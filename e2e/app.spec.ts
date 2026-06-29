import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
let server: ViteDevServer

test.beforeAll(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { host: '127.0.0.1', port: 4173, strictPort: true },
    logLevel: 'silent',
  })
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

function imageFiles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `panel-${index + 1}.png`,
    mimeType: 'image/png',
    buffer: png,
  }))
}

async function createProject(page: import('@playwright/test').Page) {
  await page.goto('/#projects')
  await expect(page.getByRole('heading', { name: '我的工程' })).toBeVisible()
  await page.locator('.new-project-card').click()
  await expect(page).toHaveURL(/#editor\/.+/)
  await expect(page.getByTestId('image-input')).toBeAttached()
}

test('landing page introduces the product and opens the editor', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /让科研排图/ })).toBeVisible()
  await expect(page.locator('.landing-hero')).toHaveScreenshot('landing-hero.png', {
    animations: 'disabled',
  })
  await page.getByRole('button', { name: /立即开始/ }).click()
  await expect(page.getByRole('heading', { name: '我的工程' })).toBeVisible()
  const importButton = page.getByRole('button', { name: '导入工程' })
  expect((await importButton.boundingBox())!.width).toBeGreaterThanOrEqual(96)
  expect((await importButton.boundingBox())!.height).toBeLessThan(50)
  expect(await page.locator('.dashboard-sidebar nav button').first().evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).fontSize),
  )).toBeGreaterThanOrEqual(14)
  expect(await page.locator('.projects-page .dashboard-page-header h1').evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).fontSize),
  )).toBeGreaterThanOrEqual(34)
  await expect(page.locator('.dashboard-shell')).toHaveScreenshot('project-center.png', {
    animations: 'disabled',
  })
  await page.locator('.new-project-card').click()
  await expect(page.locator('.workspace')).toBeVisible()
  await expect(page.getByTestId('image-input')).toBeAttached()
  await expect(page).toHaveURL(/#editor\/.+$/)
})

test('six-panel workflow exports a PNG without external requests', async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname !== '127.0.0.1' && url.protocol !== 'blob:') {
      externalRequests.push(request.url())
    }
  })

  await createProject(page)
  await page.getByTestId('image-input').setInputFiles(imageFiles(6))
  await expect(page.getByText('6 \u4e2a\u9762\u677f')).toBeVisible()
  await expect(page.getByRole('button', { name: /\u7d27\u51d1\u81ea\u9002\u5e94/ })).toBeVisible()
  await page.getByRole('button', { name: /\u7d27\u51d1\u81ea\u9002\u5e94/ }).click()

  await expect(page.locator('.workspace')).toHaveScreenshot('six-panel-workspace.png', {
    animations: 'disabled',
  })

  await page.locator('.field-grid label').filter({ hasText: '字体' })
    .locator('select').selectOption('georgia')
  await page.getByRole('button', { name: '标签位置：右下角' }).click()
  await page.getByRole('button', { name: '半粗' }).click()
  await page.locator('.range-row').filter({ hasText: '水平边距' }).locator('input').fill('28')
  await page.locator('.range-row').filter({ hasText: '垂直边距' }).locator('input').fill('22')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '\u5bfc\u51fa\u9ad8\u6e05 PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const pngPath = await download.path()
  expect(pngPath).not.toBeNull()
  const pngBytes = await readFile(pngPath!)
  expect(pngBytes.readUInt32BE(16)).toBe(3000)

  const svgDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '\u5bfc\u51fa\u53ef\u7f16\u8f91 SVG' }).click()
  const svgDownload = await svgDownloadPromise
  const svgPath = await svgDownload.path()
  expect(svgPath).not.toBeNull()
  const svgText = await readFile(svgPath!, 'utf8')
  expect(svgText).toContain('<text')
  expect(svgText).toContain('data:image/png;base64,')
  expect(svgText).toContain('font-family="Georgia, &quot;Times New Roman&quot;, serif"')
  expect(svgText).toContain('font-weight="600"')
  expect(svgText).toContain('text-anchor="end"')
  expect(externalRequests).toEqual([])

})

test('nine-panel workflow keeps three candidates and stable visuals', async ({ page }) => {
  await createProject(page)
  await page.getByTestId('image-input').setInputFiles(imageFiles(9))
  await expect(page.getByText('9 \u4e2a\u9762\u677f')).toBeVisible()
  await expect(page.locator('.candidate-card')).toHaveCount(3)
  await expect(page.locator('.workspace')).toHaveScreenshot('nine-panel-workspace.png', {
    animations: 'disabled',
  })
})

test('unsupported files show a clear validation error', async ({ page }) => {
  await createProject(page)
  await page.getByTestId('image-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await expect(page.locator('.notice-error')).toContainText('\u4e0d\u652f\u6301\u8be5\u683c\u5f0f')
})

test('folder backup writes immediately and again after two idle seconds', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as Window & {
      __backupWriteCount: number
      __latestBackupSize: number
      __latestBackup: Blob | null
    }
    state.__backupWriteCount = 0
    state.__latestBackupSize = 0
    state.__latestBackup = null

    class MockFileHandle {
      readonly kind = 'file'
      constructor(
        readonly name: string,
        private readonly directory: MockDirectoryHandle,
      ) {}

      async createWritable() {
        let pending: Blob | null = null
        return {
          write: async (data: Blob) => {
            pending = data
          },
          close: async () => {
            if (!pending) return
            this.directory.files.set(this.name, pending)
            state.__backupWriteCount += 1
            if (this.name === 'latest.figgrid') {
              state.__latestBackupSize = pending.size
              state.__latestBackup = pending
            }
          },
          abort: async () => {
            pending = null
          },
        }
      }
    }

    class MockDirectoryHandle {
      readonly kind = 'directory'
      readonly files = new Map<string, Blob>()
      readonly directories = new Map<string, MockDirectoryHandle>()

      constructor(readonly name: string) {}

      async queryPermission() {
        return 'granted' as const
      }

      async requestPermission() {
        return 'granted' as const
      }

      async getFileHandle(name: string) {
        return new MockFileHandle(name, this)
      }

      async getDirectoryHandle(name: string) {
        let directory = this.directories.get(name)
        if (!directory) {
          directory = new MockDirectoryHandle(name)
          this.directories.set(name, directory)
        }
        return directory
      }

      async removeEntry(name: string) {
        this.files.delete(name)
      }

      async *entries() {
        for (const name of this.files.keys()) {
          yield [name, new MockFileHandle(name, this)] as const
        }
      }
    }

    const root = new MockDirectoryHandle('论文备份')
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () => root,
    })
  })

  await page.goto('/#settings')
  await page.getByRole('button', { name: '选择文件夹' }).click()
  await expect(page.getByText('自动备份已开启')).toBeVisible()
  const folderRow = page.locator('.settings-folder-row')
  const folderCopy = folderRow.locator('> div')
  const folderButton = folderRow.getByRole('button', { name: '更换文件夹' })
  await expect(folderCopy).toBeVisible()
  await expect(folderButton).toBeVisible()
  expect((await folderCopy.boundingBox())!.width).toBeGreaterThan(300)
  expect((await folderButton.boundingBox())!.width).toBeLessThan(180)
  expect((await folderRow.boundingBox())!.height).toBeLessThan(120)
  await expect(page.locator('.settings-card')).toHaveScreenshot(
    'general-settings-configured.png',
    { animations: 'disabled' },
  )
  await page.getByRole('button', { name: '我的工程' }).click()
  await page.locator('.new-project-card').click()
  await page.getByTestId('image-input').setInputFiles(imageFiles(2))
  await expect(page.getByText('已备份', { exact: true })).toBeVisible()

  const firstWriteCount = await page.evaluate(() =>
    (window as Window & { __backupWriteCount: number }).__backupWriteCount,
  )
  expect(firstWriteCount).toBe(2)

  await page.getByRole('button', { name: '标签位置：左下角' }).click()
  await expect(page.getByText('等待备份', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __backupWriteCount: number }).__backupWriteCount,
  )).toBe(3)
  expect(await page.evaluate(() =>
    (window as Window & { __latestBackupSize: number }).__latestBackupSize,
  )).toBeGreaterThan(0)

  const latestBytes = await page.evaluate(async () => {
    const latest = (window as Window & { __latestBackup: Blob | null })
      .__latestBackup
    if (!latest) return []
    return Array.from(new Uint8Array(await latest.arrayBuffer()))
  })
  const previousUrl = page.url()
  await page.getByRole('button', { name: '我的工程', exact: true }).click()
  await page.locator('.projects-header-actions input[accept*=".figgrid"]').setInputFiles({
    name: 'folder-backup.figgrid',
    mimeType: 'application/x-figgrid',
    buffer: Buffer.from(latestBytes),
  })
  await expect(page).toHaveURL(/#editor\/.+/)
  expect(page.url()).not.toBe(previousUrl)
  await expect(page.getByRole('button', { name: '标签位置：左下角' }))
    .toHaveClass(/is-active/)
})

test('project center manages saved projects and real thumbnails', async ({ page }) => {
  await createProject(page)
  await page.getByLabel('工程名称').fill('细胞实验 Figure')
  await page.getByTestId('image-input').setInputFiles(imageFiles(2))
  await expect(page.getByText('2 个面板')).toBeVisible()
  await page.getByRole('button', { name: '我的工程', exact: true }).click()

  await expect(page.getByRole('heading', { name: '细胞实验 Figure' })).toBeVisible()
  await expect(page.locator('.project-card .project-thumbnail img')).toBeVisible()

  const originalCard = page.locator('.project-card').filter({
    hasText: '细胞实验 Figure',
  })
  await originalCard.getByRole('button', { name: '重命名' }).click()
  await page.getByLabel('新工程名称').fill('投稿 Figure 1')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('heading', { name: '投稿 Figure 1' })).toBeVisible()

  await page.getByRole('button', { name: '复制' }).click()
  await expect(page.locator('.project-card')).toHaveCount(2)
  const duplicateCard = page.locator('.project-card').filter({ hasText: '副本' })
  await expect(duplicateCard).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await duplicateCard.getByRole('button', { name: '删除' }).click()
  await expect(page.locator('.project-card')).toHaveCount(1)

  await page.reload()
  await expect(page.getByRole('heading', { name: '投稿 Figure 1' })).toBeVisible()
})

test('general settings explain unavailable folder access', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: undefined,
    })
  })
  await page.goto('/#settings')

  await expect(page.getByRole('heading', { name: '通用设置' })).toBeVisible()
  await expect(page.getByText('需要 HTTPS 和最新版 Chrome / Edge')).toBeVisible()
  expect(await page.locator('.settings-card-heading h2').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  )).toBeGreaterThanOrEqual(18)
  expect(await page.locator('.settings-notes').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  )).toBeGreaterThanOrEqual(11)
  await expect(page.locator('.dashboard-shell')).toHaveScreenshot('general-settings.png', {
    animations: 'disabled',
  })
})
