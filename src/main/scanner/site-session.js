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

import { app, BrowserWindow, Menu, session } from "electron";
import { isAllowedPopup } from "./popup-policy.js";
import { PAGE_SCRIPTS } from "./page-scripts.js";
import { plainChromeUserAgent } from "./user-agent.js";
import { SITE_ORIGIN, SITE_LOGIN_URL } from "../../shared/search-url.js";

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
    // Sign-in pop-ups (site, Google, Apple, Facebook) open as child windows on the
    // same session so their login counts; any other pop-up stays blocked.
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (!isAllowedPopup(url)) {
        return { action: "deny" };
      }
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          parent: this.window,
          width: 520,
          height: 720,
          title: "YellowFinder · giriş",
          webPreferences: { partition: SITE_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true }
        }
      };
    });
    this.#attachNavigationMenu(this.window.webContents);
    this.window.webContents.on("did-create-window", (child) => this.#attachNavigationMenu(child.webContents));
    // Show where the user is, since the window has no address bar.
    this.window.webContents.on("page-title-updated", (event, title) => {
      event.preventDefault();
      const host = this.#currentHost();
      this.window?.setTitle(`YellowFinder · ${host ? `${host} · ` : ""}${title}`);
    });
    this.window.on("closed", () => {
      this.window = null;
    });
    return this.window;
  }

  /**
   * Opens the login page so the user can sign in or solve a challenge. When
   * the session is already logged in, the site sends the user on by itself.
   */
  async openForUser() {
    const window = this.ensureWindow(true);
    await this.#load(window, SITE_LOGIN_URL);
    window.focus();
  }

  /** @returns {boolean} True while the site window is on screen, which means the user may be using it. */
  isVisibleToUser() {
    return Boolean(this.window && !this.window.isDestroyed() && this.window.isVisible());
  }

  /**
   * Writes the site's cookies to disk. Called on quit so a login made just
   * before closing the app is not lost.
   *
   * @returns {Promise<void>} Resolves when the cookie store is flushed.
   */
  async flushCookies() {
    await session.fromPartition(SITE_PARTITION).cookies.flushStore();
  }

  /**
   * Adds a right-click menu with back, forward, reload and the login page,
   * because the window has no browser toolbar.
   *
   * @param {import("electron").WebContents} contents Page to attach to.
   */
  #attachNavigationMenu(contents) {
    contents.on("context-menu", (_event, params) => {
      const history = contents.navigationHistory;
      const template = [
        { label: "Geri", enabled: history.canGoBack(), click: () => history.goBack() },
        { label: "İleri", enabled: history.canGoForward(), click: () => history.goForward() },
        { label: "Yenile", click: () => contents.reload() },
        { type: "separator" },
        { label: "Giriş sayfası", click: () => contents.loadURL(SITE_LOGIN_URL) },
        { label: "Ana sayfa", click: () => contents.loadURL(SITE_ORIGIN) }
      ];
      if (params.isEditable) {
        template.unshift({ role: "cut", label: "Kes" }, { role: "copy", label: "Kopyala" }, { role: "paste", label: "Yapıştır" }, { type: "separator" });
      } else if (params.selectionText) {
        template.unshift({ role: "copy", label: "Kopyala" }, { type: "separator" });
      }
      Menu.buildFromTemplate(template).popup();
    });
  }

  /** @returns {string} Host of the page currently shown, or an empty string. */
  #currentHost() {
    try {
      return new URL(this.window.webContents.getURL()).hostname;
    } catch {
      return "";
    }
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
