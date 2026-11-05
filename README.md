# YellowFinder

Desktop app that watches sahibinden.com for listings posted by owners
(no real estate agency) in the categories and cities you choose, collects
the phone numbers shown on those listings and exports the list as TXT,
CSV or PDF. Runs on macOS, Windows and Linux and updates itself from
GitHub releases.

## How it works

1. You create search profiles in the sidebar: each one is a named set of
   categories (for example "Satılık Daire") and cities, and can be switched
   off without losing its selection. The gear in the header opens the app
   settings: colour scheme (system, light, dark) and software updates.
2. The app opens sahibinden.com in its own browser window. You log in
   there once; the session is kept between launches.
3. Every hour (configurable) the app loads the newest result pages for each
   category and city, opens each listing it has not seen before, reads the
   "Kimden" attribute and keeps the listing only when the site says
   "Sahibinden". Phone numbers are read from the rendered contact box.
4. Found listings appear in the table. "Dışa aktar" writes them as Excel
   (XLSX), CSV, PDF or plain text, for all rows, the current search result
   or the ticked rows, optionally limited to a range of days.

The app drives a normal, visible Chromium window with your own session.
When the site shows a login page or a verification step, the scan stops,
the window comes to the front and the log asks you to complete it. Automatic
scans are held until you start the next one by hand, so the window is not
navigated away while you are using it. Nothing
in the app tries to hide itself or to work around such pages. See
[docs/adr/0002-site-access-policy.md](docs/adr/0002-site-access-policy.md).

## Project layout

```
src/
  main/                 Electron main process
    index.js            Entry point, windows, IPC wiring
    storage/
      settings-store.js Settings persisted under userData/settings.json
      results-store.js  Listings and visit history in userData/results.sqlite
    scheduler.js        Interval based scan trigger
    updater.js          electron-updater wiring (GitHub releases)
    ipc-channels.js     IPC channel names
    scanner/
      site-session.js   The browser window that visits the site
      listing-scanner.js  One scan: result pages, detail pages, verdicts
      page-scripts.js   Read-only DOM scripts executed inside the site pages
      selectors.js      Every CSS selector and page marker in one place
      listing-classifier.js  Owner vs agency decision, phone collection
      user-agent.js     Plain Chrome user agent for the site window (ADR 0002 amendment)
    exporters/          TXT, CSV and PDF writers (pdf-document.js is the printable HTML)
  preload/index.cjs     Context bridge exposed to the renderer as window.yellowFinder
  renderer/             Vue 3 interface (Tailwind CSS 4, Font Awesome Free, Montserrat and
                        Roboto Mono bundled locally, Liquid Glass inspired) built by Vite
  shared/               Code used by both sides: catalogs, URL builder, phone parsing
test/                   Unit tests (node:test)
docs/adr/               Architecture decision records
.github/workflows/      CI (lint, test, build) and Release (tag -> installers)
build/icon.svg          Source icon; `npm run icon` renders it to build/icon.png (Windows,
                        Linux) and build/icon-mac.png (macOS inset); electron-builder
                        derives ico and icns from those
scripts/render-icon.mjs Icon renderer, runs inside Electron so no image library is needed
```

## Develop

Requires Node 22.13 or newer (the built in `node:sqlite` module). CI and the Electron runtime use Node 24.

```
npm install
npm run dev        # builds the renderer and starts Electron
npm test           # unit tests
npm run test:dom   # page scripts against the fixture pages in test/fixtures, inside Electron
npm run lint       # eslint
npx electron . --smoke-test   # boots the app, prints renderer console output, exits 0 when clean
npm run icon                  # re-renders build/icon*.png after editing build/icon.svg
YELLOWFINDER_SMOKE_SCREENSHOT=/tmp/ui.png npx electron . --smoke-test   # also saves a screenshot of the window
YELLOWFINDER_SMOKE_SIZE=1920x1200 YELLOWFINDER_SMOKE_SCREENSHOT=/tmp/ui-large.png npx electron . --smoke-test   # same, at a larger window size
YELLOWFINDER_SMOKE_CLICK='button[title="Ayarlar"]' YELLOWFINDER_SMOKE_SCREENSHOT=/tmp/ui-settings.png npx electron . --smoke-test   # clicks an element first
```

Settings (`settings.json`) and the listing database (`results.sqlite`) live
in Electron's userData folder (`~/Library/Application Support/YellowFinder`
on macOS). A listing that was opened is not opened again: owner and agency
verdicts are final, listings without a visible phone number are retried
after three days, and visit history older than 180 days is dropped. See
[docs/adr/0004-sqlite-store.md](docs/adr/0004-sqlite-store.md).

## Build installers locally

```
npm run dist         # current platform
npm run dist:mac     # dmg + zip (x64, arm64)
npm run dist:win     # nsis installer
npm run dist:linux   # AppImage + deb
```

Output goes to `release/`.

## Release and auto update

1. Bump `version` in `package.json` and commit.
2. Tag the commit `vX.Y.Z` and push the tag.
3. The Release workflow builds on macOS, Windows and Linux and publishes
   the installers plus the `latest*.yml` manifests to a GitHub release.
4. Installed apps check that release on start and through the
   "Güncelleme" panel, download the new version and install it on quit.

Notes:

- electron-updater reads releases without a token only when the repository
  is public, which it is. If the source ever goes private again, publish
  releases to a separate public repository (change `publish.repo` in
  `electron-builder.yml`).
- macOS only installs updates for code signed apps. Until an Apple
  Developer ID certificate is configured in the workflow, the macOS build
  runs but will not self update; Windows and Linux builds update without
  signing.

## When the site changes

All selectors are in `src/main/scanner/selectors.js`. If the log says no
rows were found or no phone numbers were found while you are logged in,
open the site in the app window, inspect the page and adjust the
candidates there. Agency listings are always filtered out by the scanner itself; the
optional "Gelişmiş" field only lets you append extra filters you set on
the site to every search URL.
