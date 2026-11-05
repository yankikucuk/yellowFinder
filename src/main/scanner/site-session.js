/**
 * Owns the browser window that visits sahibinden.com.
 *
 * The window is a normal, visible Chromium window with a persistent session
 * partition. The user logs in there once; cookies survive restarts. When the
 * site shows a login or verification page the scanner stops and waits for the
 * user to handle it in this same window. Nothing is done to hide the fact
 * that a program is driving the window.
 *
 * @module main/scanner/site-session
 */

import { BrowserWindow } from "electron";
import { PAGE_SCRIPTS } from "./page-scripts.js";
import { SITE_ORIGIN } from "../../shared/search-url.js";

/** Session partition shared by the login window and the scan window. */
export const SITE_PARTITION = "persist:sahibinden";

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
    this.window = new BrowserWindow({
      width: 1200,
      height: 860,
      show,
      title: "yellowFinder · sahibinden.com",
      webPreferences: {
        partition: SITE_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
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
