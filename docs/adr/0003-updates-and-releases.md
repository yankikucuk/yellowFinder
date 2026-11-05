# ADR 0003: Releases from tags, updates from GitHub releases

Date: 2026-11-05. Status: accepted.

## Context

Installers for three platforms are needed and installed apps should
update themselves.

## Decision

- `electron-builder` packages the app: dmg and zip for macOS (x64 and
  arm64), nsis for Windows, AppImage and deb for Linux.
- Pushing a tag `v*` runs `.github/workflows/release.yml`, which builds on
  the three GitHub hosted runners and publishes to a GitHub release with
  `--publish always`. `releaseType: release` makes the release public
  immediately so the updater can see it.
- `electron-updater` with the GitHub provider checks on start and on
  demand, downloads automatically and installs on quit.

## Consequences

- The repository (or at least the releases) must be public for the
  updater to work without a token. A private source repository can keep a
  public releases repository by changing `publish.repo`.
- macOS updates require a signed app. The workflow currently disables
  signing (`CSC_IDENTITY_AUTO_DISCOVERY=false`); adding a Developer ID
  certificate and notarisation is a follow up.
- Version numbers come from `package.json` only; the tag must match.
