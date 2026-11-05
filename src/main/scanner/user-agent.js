/**
 * User agent handling for the site window.
 *
 * Electron's default user agent carries the application name and an
 * "Electron/<version>" token. sahibinden.com refuses the login page to
 * anything carrying that token, so the site session presents the plain
 * Chrome identity of the Chromium that actually renders the page, which
 * Electron's own documentation recommends. Nothing else about the browser
 * is changed; docs/adr/0002-site-access-policy.md draws the line.
 *
 * @module main/scanner/user-agent
 */

/**
 * Removes the application and Electron tokens from a default user agent.
 *
 * @param {string} defaultUserAgent The session's default user agent.
 * @param {string} appName The application name as it appears in that string.
 * @returns {string} User agent with the two tokens removed.
 */
export function plainChromeUserAgent(defaultUserAgent, appName) {
  const escapedAppName = appName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return defaultUserAgent
    .replace(new RegExp(`\\s*${escapedAppName}/\\S+`, "i"), "")
    .replace(/\s*Electron\/\S+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
