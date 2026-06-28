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

test('six-panel workflow exports a PNG without external requests', async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname !== '127.0.0.1' && url.protocol !== 'blob:') {
      externalRequests.push(request.url())
    }
  })

  await page.goto('/')
  await page.getByTestId('image-input').setInputFiles(imageFiles(6))
  await expect(page.getByText('6 \u4e2a\u9762\u677f')).toBeVisible()
  await expect(page.getByRole('button', { name: /\u7d27\u51d1\u81ea\u9002\u5e94/ })).toBeVisible()
  await page.getByRole('button', { name: /\u7d27\u51d1\u81ea\u9002\u5e94/ }).click()

  await expect(page.locator('.workspace')).toHaveScreenshot('six-panel-workspace.png', {
    animations: 'disabled',
  })

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
  expect(externalRequests).toEqual([])

})

test('nine-panel workflow keeps three candidates and stable visuals', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('image-input').setInputFiles(imageFiles(9))
  await expect(page.getByText('9 \u4e2a\u9762\u677f')).toBeVisible()
  await expect(page.locator('.candidate-card')).toHaveCount(3)
  await expect(page.locator('.workspace')).toHaveScreenshot('nine-panel-workspace.png', {
    animations: 'disabled',
  })
})

test('unsupported files show a clear validation error', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('image-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await expect(page.locator('.notice-error')).toContainText('\u4e0d\u652f\u6301\u8be5\u683c\u5f0f')
})