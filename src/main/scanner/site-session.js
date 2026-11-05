/**
 * Owns the browser window that visits sahibinden.com.
 *
 * There is one window with a persistent session partition. It stays hidden
 * while a scan runs and is shown when the user asks for it or when the site
 * wants something from the user (login, verification). Cookies survive
 * restarts, so the user logs in once. Nothing is done to hide the fact that
 * a program is driving the window; see docs/adr/0002-site-access-policy.md.
 *
 * @module main/scanner/site-session
 */

import { app, BrowserWindow, session } from "electron";
import { PAGE_SCRIPTS } from "./page-scripts.js";
import { plainChromeUserAgent } from "./user-agent.js";
import { SITE_ORIGIN } from "../../shared/search-url.js";

/** Session partition that keeps the site's cookies on disk. */
const SITE_PARTITION = "persist:sahibinden";

/** How long a page may take to finish loading before the scan gives up on it. */
const LOAD_TIMEOUT_MS = 45_000;

/** Extra time after `did-finish-load` so late scripts can render phone numbers. */
const SETTLE_DELAY_MS = 1_500;

/**
 * Wraps the site window and exposes the few operations the scanner needs.
 */
export class SiteSession {
  constructor() {
    /** @type {BrowserWindow | null} */
    this.window = null;
  }

  /**
   * Creates the window if needed and returns it.
   *
   * @param {boolean} [show=true] Whether to bring the window to the front.
   * @returns {BrowserWindow} The site window.
   */
  ensureWindow(show = true) {
    if (this.window && !this.window.isDestroyed()) {
      if (show) {
        this.window.show();
      }
      return this.window;
    }
    const siteSession = session.fromPartition(SITE_PARTITION);
    siteSession.setUserAgent(plainChromeUserAgent(siteSession.getUserAgent(), app.getName()));
    this.window = new BrowserWindow({
      width: 1200,
      height: 860,
      show,
      title: "YellowFinder · sahibinden.com",
      webPreferences: {
        partition: SITE_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        // The scan window is usually hidden; without this Chromium throttles
        // its timers and the settle delay would wait for scripts that barely run.
        backgroundThrottling: false
      }
    });
    // Pop-ups from the site would open extra windows on the same session; keep everything in this one.
    this.window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    this.window.on("closed", () => {
      this.window = null;
    });
    return this.window;
  }

  /**
   * Opens the site's home page so the user can log in or solve a challenge.
   */
  async openForUser() {
    const window = this.ensureWindow(true);
    await this.#load(window, SITE_ORIGIN);
    window.focus();
  }

  /**
   * Loads a URL and reports whether the page can be read.
   *
   * @param {string} url Page to open.
   * @returns {Promise<{blocked: boolean, reason: string}>} Blocking verdict.
   */
  async navigate(url) {
    const window = this.ensureWindow(false);
    await this.#load(window, url);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));
    return window.webContents.executeJavaScript(PAGE_SCRIPTS.detectBlockingPage, true);
  }

  /**
   * Reads the result rows of the page currently shown.
   *
   * @returns {Promise<{rows: object[], rowSelectorUsed: string}>} Rows.
   */
  readSearchRows() {
    return this.ensureWindow(false).webContents.executeJavaScript(PAGE_SCRIPTS.collectSearchRows, true);
  }

  /**
   * Reads seller and phone data from the detail page currently shown.
   *
   * @returns {Promise<object>} Raw detail data.
   */
  readDetail() {
    return this.ensureWindow(false).webContents.executeJavaScript(PAGE_SCRIPTS.collectDetailData, true);
  }

  /** Brings the window to the front so the user can act on it. */
  showToUser() {
    const window = this.ensureWindow(true);
    window.focus();
  }

  /**
   * Called when a scan ends. A hidden window is parked on a blank page so
   * the site's scripts and images do not keep memory and CPU between scans.
   * A visible window is left alone because the user may be using it.
   */
  release() {
    if (this.window && !this.window.isDestroyed() && !this.window.isVisible()) {
      this.window.webContents.loadURL("about:blank").catch(() => {});
    }
  }

  /** Closes the window. The session cookies are kept on disk. */
  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  /**
   * Loads a URL with a timeout. A failed navigation rejects.
   *
   * @param {BrowserWindow} window Target window.
   * @param {string} url URL to load.
   * @returns {Promise<void>} Resolves when the page finished loading.
   */
  #load(window, url) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out loading ${url}`)), LOAD_TIMEOUT_MS);
      window.webContents
        .loadURL(url)
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
