# Layout Assistant

A local-first, desktop-oriented scientific multi-panel figure composer. The UI is in Chinese and all imported images stay in the browser.

## MVP features

- Import 2-12 PNG, JPEG, or WebP images by picker or drag-and-drop.
- Generate three deterministic layouts: classic grid, compact adaptive, and balanced.
- Reorder, replace, or remove panels; switch between contain and cover; tune zoom and focal point.
- Configure gap, padding, white/transparent background, and A-L/a-l labels.
- Export a self-contained editable SVG or a high-resolution PNG from 500-10000 px wide.
- Auto-save the active project to IndexedDB.
- Export/import a versioned `.figgrid` ZIP bundle with SHA-256 asset integrity checks.
- No backend, account, telemetry, or image upload.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite in Microsoft Edge or Chrome. The optimized UI requires a viewport at least 1024 px wide.

## Verification

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The end-to-end suite uses the installed Microsoft Edge channel and checks six-panel export, nine-panel layout, invalid-file handling, visual snapshots, and absence of external requests.

## Project structure

- `src/lib/layout.ts`: deterministic layout enumeration, scoring, and frame solving.
- `src/components/FigureCanvas.tsx`: canonical SVG preview renderer.
- `src/lib/export.ts`: self-contained SVG and PNG generation.
- `src/lib/storage.ts`: IndexedDB auto-save.
- `src/lib/project-file.ts`: `.figgrid` archive and integrity validation.

## MVP limits

TIFF, PDF/PPTX export, journal mm/DPI presets, raw microscopy data, freeform canvas editing, scale bars, cloud sync, AI layout, and collaboration are intentionally out of scope.