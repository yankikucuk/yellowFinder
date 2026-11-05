# ADR 0002: Visit the site as the user, never around its protections

Date: 2026-11-05. Status: accepted.

## Context

sahibinden.com blocks plain HTTP clients (a direct request answers 403),
shows phone numbers only to logged in users and may present a
"press and hold" verification. Public scrapers rely on residential
proxies and fingerprint tricks to get through.

## Decision

- The app opens the site in a normal, visible Electron window with a
  persistent session partition. The user logs in there with their own
  account.
- Pages are loaded one at a time with a random pause (default 4 to 9
  seconds) between loads. Listings that were already visited are never
  loaded again.
- When a page looks like a login, verification or access denied page the
  scan stops, the window is brought to the front and the user is asked to
  deal with it. The app does not attempt to solve or bypass such pages,
  does not spoof its identity and does not use proxies.
- Only the rendered DOM is read; the app never clicks, submits or
  changes anything on the site.

## Consequences

- Scans are slow by design: a few hundred listings per hour at most.
- The user carries the responsibility for their account and for how the
  collected numbers are used. The numbers are contact details that owners
  published for their listing; the app only gathers what the logged in
  user could read by hand.
- A stricter protection on the site shows up as repeated "blocked" events
  rather than as silent empty results.
