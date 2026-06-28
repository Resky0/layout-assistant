<p align="center">
  <img src="public/icon.svg" width="88" alt="论文图片排版助手图标" />
</p>

# 论文图片排版助手

> Paper Figure Layout Assistant

一个本地优先、面向科研论文的多面板图片排版工具。导入图片后即可生成多种确定性布局，完成面板微调，并导出高清 PNG、可编辑 SVG 或可恢复的 `.figgrid` 工程文件。

A local-first multi-panel figure composer for scientific papers. Import images, compare deterministic layouts, fine-tune panels, and export a high-resolution PNG, editable SVG, or recoverable `.figgrid` project.

[中文](#中文说明) · [English](#english)

## 界面预览

### 网站首页

![论文图片排版助手网站首页](docs/screenshots/homepage.png)

### 六宫格：紧凑比例自适应

![论文图片排版助手六宫格界面](docs/screenshots/six-panel-workspace.png)

### 九宫格：经典网格

![论文图片排版助手九宫格界面](docs/screenshots/nine-panel-workspace.png)

---

## 中文说明

### 为什么使用论文图片排版助手？

科研图片排版经常需要在 PowerPoint、Illustrator 或其他绘图软件中反复调整尺寸、间距和标签。论文图片排版助手把最常见的流程压缩成四步：

1. 导入 2–12 张图片。
2. 从三种自动布局中选择一个起点。
3. 调整面板显示方式、间距、背景和标签。
4. 导出高清图片或保存工程。

所有图片处理都在浏览器本地完成，无需账号、后端或图片上传。

### 主要功能

- **三种自动布局**：经典等宽网格、紧凑比例自适应、均衡多行布局。
- **保持科研信息完整**：默认完整显示图片，不主动裁剪实验信息。
- **面板管理**：添加、删除、替换和调整图片顺序，标签自动更新为 `A–L`。
- **面板微调**：支持“完整显示”和“铺满裁剪”；裁剪模式可调整缩放与焦点。
- **统一样式**：设置图片间距、画布外边距、白色或透明背景。
- **标签设置**：大写、小写或隐藏标签，并设置字号、颜色和左右位置。
- **高清导出**：导出 2000、3000、4000 px 或 500–10000 px 自定义宽度的 PNG。
- **可编辑 SVG**：原图内嵌于 SVG，面板标签保持为可编辑文本。
- **工程保存**：自动保存当前工程，并支持导入、导出 `.figgrid` 工程文件。
- **隐私优先**：无后端、无账号、无遥测，运行期间不会上传图片。

### 使用方法

打开网站后，点击“立即开始”进入排图工作台。

#### 1. 导入图片

将图片拖入左侧“添加图片”区域，或点击该区域选择文件。支持 PNG、JPEG 和 WebP：

- 图片数量：2–12 张
- 单文件大小：不超过 25 MB
- 单张图片像素：不超过 4000 万像素
- 全部文件总大小：不超过 150 MB

导入后可以在左侧列表中调整顺序、替换或删除图片。

#### 2. 选择自动布局

顶部会生成三个不重复的候选方案：

- **经典网格**：面板大小规整，适合六宫格、九宫格等标准布局。
- **紧凑自适应**：根据原图比例减少留白。
- **均衡布局**：平衡各行高度和面板面积。

点击候选卡片即可切换。调整图片顺序后，候选布局和字母标签会自动重新计算。

#### 3. 微调面板

点击中间预览中的面板，然后在右侧设置：

- **完整显示**：显示整张图片，可能产生少量留白。
- **铺满裁剪**：填满面板区域，可调整缩放、水平焦点和垂直焦点。
- **隐藏标签**：仅隐藏当前面板的字母标签。

MVP 不支持自由移动面板、合并面板、比例尺、文字框和科研标注。

#### 4. 调整全局样式

右侧“画布”和“面板标签”区域可以设置：

- 图片间距与画布外边距
- 白色或透明背景
- 标签大写、小写或隐藏
- 标签位置、字号和颜色

#### 5. 导出或保存工程

- **高清 PNG**：默认宽度为 3000 px，高度根据画布比例自动计算。
- **可编辑 SVG**：适合继续在 Illustrator、Inkscape 或浏览器中编辑。
- **`.figgrid` 工程**：包含布局、样式和原始图片，可以稍后恢复编辑。

浏览器会通过 IndexedDB 自动保存当前工程；刷新页面后可以恢复。自动保存与本地数据绑定当前浏览器和网站地址，清理浏览器数据前建议导出 `.figgrid` 备份。

### 本地运行

需要 Node.js 和最新版 Microsoft Edge 或 Chrome。界面针对宽度不低于 1024 px 的桌面屏幕优化。

Windows PowerShell：

```powershell
npm.cmd install
npm.cmd run dev
```

macOS / Linux：

```bash
npm install
npm run dev
```

打开终端中 Vite 输出的本地地址即可使用。

### 构建与部署

```powershell
npm.cmd run build
```

构建产物位于 `dist`，可以部署到任意静态网站托管平台。使用 EdgeOne Makers 时：

```powershell
edgeone makers deploy ".\dist" --name layout-assistant
```

### 开发检查

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

浏览器测试覆盖六宫格 PNG 导出、九宫格布局、非法格式提示、视觉快照，以及运行期间不产生外部网络请求。

### 项目结构

```text
src/
├─ components/          界面组件与 SVG 预览
├─ hooks/               撤销、重做和工程历史
├─ lib/
│  ├─ layout.ts         布局枚举、评分和坐标计算
│  ├─ export.ts         SVG 与 PNG 导出
│  ├─ storage.ts        IndexedDB 自动保存
│  └─ project-file.ts   .figgrid 打包与完整性校验
└─ types.ts             工程、图片、面板和样式类型
e2e/                    Playwright 浏览器测试与视觉快照
```

### MVP 功能边界

当前版本暂不支持 TIFF、PDF/PPTX 导出、期刊毫米/DPI 预设、原始显微数据、自由画布、比例尺、AI 排版、云同步和多人协作。

---

## English

### Why Paper Figure Layout Assistant?

Composing scientific figures often means repeatedly resizing panels, aligning gaps, and updating labels in PowerPoint, Illustrator, or similar tools. Paper Figure Layout Assistant condenses that workflow into four steps:

1. Import 2–12 images.
2. Choose one of three generated layouts.
3. Adjust panel fitting, spacing, background, and labels.
4. Export the figure or save a recoverable project.

Everything runs locally in the browser. No account, backend, telemetry, or image upload is required.

### Features

- **Three deterministic layouts:** classic grid, compact adaptive, and balanced multi-row.
- **No automatic information loss:** images use contain mode by default instead of being cropped.
- **Panel management:** add, remove, replace, and reorder images with automatic `A–L` labels.
- **Panel controls:** switch between contain and cover; adjust zoom and focal point in cover mode.
- **Global styling:** configure gaps, outer padding, and a white or transparent background.
- **Figure labels:** use uppercase, lowercase, or hidden labels with configurable size, color, and position.
- **High-resolution PNG:** export at 2000, 3000, 4000 px or a custom width from 500–10000 px.
- **Editable SVG:** source raster images are embedded while labels remain editable SVG text.
- **Recoverable projects:** auto-save locally and import/export versioned `.figgrid` project bundles.
- **Local-first privacy:** imported images never leave the browser.

### How to use

Open the website and select **Start now** to enter the figure editor.

#### 1. Import images

Drop files onto the add-images area in the left sidebar, or click it to open the file picker. PNG, JPEG, and WebP are supported.

- Image count: 2–12
- Maximum file size: 25 MB per image
- Maximum resolution: 40 megapixels per image
- Maximum combined size: 150 MB

Use the image list to reorder, replace, or remove panels.

#### 2. Choose a layout

The app generates three unique candidates:

- **Classic grid:** regular panel sizes for standard six- or nine-panel figures.
- **Compact adaptive:** follows source aspect ratios to reduce whitespace.
- **Balanced layout:** balances row heights and panel areas.

Select a candidate card to apply it. Reordering images deterministically recalculates both layouts and letter labels.

#### 3. Fine-tune panels

Select a panel in the central preview, then use the right inspector:

- **Contain:** keeps the entire image visible and may leave a small amount of whitespace.
- **Cover:** fills the panel and enables zoom plus horizontal and vertical focal-point controls.
- **Hide label:** hides the label for the selected panel only.

Freeform panel movement, merged panels, scale bars, text boxes, and scientific annotations are outside the MVP scope.

#### 4. Style the figure

The canvas and label sections let you configure:

- Image gap and outer padding
- White or transparent background
- Uppercase, lowercase, or hidden labels
- Label position, font size, and color

#### 5. Export or save

- **High-resolution PNG:** defaults to 3000 px wide; height is calculated automatically.
- **Editable SVG:** suitable for further editing in Illustrator, Inkscape, or a browser.
- **`.figgrid` project:** preserves layout, styling, and original images for later editing.

The active project is automatically stored in IndexedDB and restored after a refresh. Auto-save data belongs to the current browser and site origin, so export a `.figgrid` backup before clearing browser storage.

### Run locally

Node.js and the latest Microsoft Edge or Chrome are required. The desktop UI is optimized for viewports at least 1024 px wide.

Windows PowerShell:

```powershell
npm.cmd install
npm.cmd run dev
```

macOS / Linux:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

### Build and deploy

```powershell
npm.cmd run build
```

The production bundle is written to `dist` and can be hosted by any static-site provider. For EdgeOne Makers:

```powershell
edgeone makers deploy ".\dist" --name layout-assistant
```

### Verification

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The browser suite covers six-panel PNG export, nine-panel layout, invalid-file feedback, visual snapshots, and the absence of external network requests while the app is running.

### MVP limitations

TIFF, PDF/PPTX export, journal-specific mm/DPI presets, raw microscopy data, freeform canvas editing, scale bars, AI layout, cloud sync, and collaboration are intentionally out of scope.

## License

本项目采用 [MIT License](LICENSE) 开源，可自由使用、修改和分发，但需保留原始版权与许可声明。

This project is open sourced under the [MIT License](LICENSE). You may use, modify, and distribute it while retaining the original copyright and license notice.
