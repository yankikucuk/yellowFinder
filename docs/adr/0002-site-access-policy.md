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
  account. The window presents the plain Chrome user agent (see the
  amendment below).
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

## Amendment 2026-11-05: plain Chrome user agent

The site refuses the login page to any browser whose user agent carries an
"Electron/" token, so the user could not log in at all. The site session
now removes the application and Electron tokens from the default user
agent and keeps the Chrome identity of the Chromium that renders the page
(`src/main/scanner/user-agent.js`), as Electron's documentation recommends.

This is the whole extent of it. Patching `navigator` properties,
fingerprint changes, stealth plugins, proxies and automated handling of
verification steps remain out of scope. If the site still blocks the login
after this change, the answer is to say so, not to go further.
