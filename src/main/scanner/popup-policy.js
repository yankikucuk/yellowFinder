/**
 * Decides which pop-up windows the site window may open.
 *
 * Sign-in with Google, Apple or Facebook runs in a pop-up; blocking every
 * pop-up made those buttons do nothing. Pop-ups to the site itself and to
 * these sign-in providers open as child windows on the same session, so the
 * login they complete is the one the scanner uses. Everything else stays
 * blocked. Kept free of Electron so the rule can be unit tested.
 *
 * @module main/scanner/popup-policy
 */

/** Hosts (and their subdomains) that may open in a child window. */
const ALLOWED_HOSTS = Object.freeze(["sahibinden.com", "accounts.google.com", "appleid.apple.com", "facebook.com"]);

/**
 * @param {string} url Pop-up target.
 * @returns {boolean} True when the pop-up may open.
 */
export function isAllowedPopup(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  return ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
}
