# ADR 0001: Electron with a plain main process and a Vue renderer

Date: 2026-11-05. Status: accepted.

## Context

The app has to run on macOS, Windows and Linux, drive a real browser
session on sahibinden.com and offer a small control interface.

## Decision

- Electron. The main process is plain ES modules loaded directly by
  Electron (no bundler), the renderer is Vue 3 built by Vite into
  `dist/renderer`, the preload is a sandboxed CommonJS context bridge.
- Settings are a JSON file in `userData` read by a small store class.
  Listings started the same way; ADR 0004 moved them to SQLite.
- Everything that knows about the site's markup lives in
  `src/main/scanner/selectors.js`; everything that runs inside the site's
  pages lives in `page-scripts.js` as reviewable functions.
- Pure decision logic (phone parsing, URL building, seller verdict,
  exports) is kept free of Electron so it can be unit tested with
  `node:test`.

## Consequences

- Only one runtime dependency (electron-updater). Fewer moving parts to
  keep up to date.
- A site markup change is a one file fix.
- The main process is not bundled, so every file it imports must be listed
  in `electron-builder.yml` (`files`).
