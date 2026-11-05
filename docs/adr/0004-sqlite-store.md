# ADR 0004: SQLite for listings and visit history

Date: 2026-11-05. Status: accepted. Supersedes the "no database" line of ADR 0001.

## Context

Hourly scans over several categories and cities visit tens of thousands
of listings over a few months. The first version kept listings and a flat
list of skipped ids in one JSON file that was rewritten on every change,
and it skipped a listing forever once it had been opened, even when the
only problem was a session that was not logged in.

## Decision

- Listings and visits are stored in `userData/results.sqlite` through
  Node's built in `node:sqlite` module (Node 24 inside Electron 45). No
  native module, so the three platform builds stay unchanged.
- Every opened listing gets a `visits` row with an outcome: `kept`,
  `agency` or `no-phone`, plus the visit time.
- `kept` and `agency` are skipped for good. `no-phone` rows carry a
  `retry_after` time three days ahead; after that the listing is opened
  once more.
- Visit rows other than `kept` older than 180 days are purged when the
  store opens, so the file stays small and listings that reappear long
  after are looked at again.
- The JSON file of version 0.1.0 is imported on first start and renamed
  to `results.json.imported`. Its skipped ids become `no-phone` visits
  because the old file did not record why they were skipped.

## Consequences

- The scanner's contract with the store is two calls: `shouldSkip(id)`
  and `markSkipped(id, outcome)` or `upsert(record)`.
- The retry and retention windows are constructor options; they are not
  user settings yet.
- `npm test` needs Node 22.13 or newer for `node:sqlite`; CI uses Node 24
  to match the Electron runtime.
