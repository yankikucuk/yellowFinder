/**
 * Application entry point for the Electron main process.
 *
 * Responsibilities: create the control window, own the stores, the scanner,
 * the scheduler and the updater, and expose them to the renderer over IPC.
 * The renderer never touches the site; everything that talks to
 * sahibinden.com lives in `scanner/`.
 *
 * @module main
 */

import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join, dirname } from "node:path";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SettingsStore } from "./storage/settings-store.js";
import { ResultsStore } from "./storage/results-store.js";
import { SiteSession } from "./scanner/site-session.js";
import { ListingScanner } from "./scanner/listing-scanner.js";
import { ScanScheduler } from "./scheduler.js";
import { exportToFile, EXPORT_FORMATS } from "./exporters/index.js";
import { createUpdater } from "./updater.js";
import { INVOKE, EVENTS } from "./ipc-channels.js";
import { CITIES } from "../shared/catalog/cities.js";
import { CATEGORIES } from "../shared/catalog/categories.js";
import { SITE_ORIGIN } from "../shared/search-url.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const RENDERER_INDEX = join(currentDirectory, "..", "..", "dist", "renderer", "index.html");
const PRELOAD_SCRIPT = join(currentDirectory, "..", "preload", "index.cjs");

/** Started with `--smoke-test`: print renderer console output and quit after a few seconds (used by developers to verify the app boots). */
const SMOKE_TEST = process.argv.includes("--smoke-test");
const SMOKE_TEST_DURATION_MS = 6_000;

/** @type {BrowserWindow | null} */
let controlWindow = null;

/** Last updater status, replayed to the renderer in the bootstrap payload because the first check runs before it subscribes. */
let lastUpdateStatus = { state: "idle", message: "" };

/**
 * True after a scan stopped on a login or verification page. Automatic scans
 * are held until the user starts one by hand, so the window the user is
 * working in is not navigated away from under them.
 */
let waitingForUser = false;

const settingsStore = new SettingsStore(join(app.getPath("userData"), "settings.json"));
const resultsStore = new ResultsStore(join(app.getPath("userData"), "results.sqlite"));
resultsStore.importLegacyJson(join(app.getPath("userData"), "results.json"));
const siteSession = new SiteSession();

/**
 * Sends an event to the control window when it exists.
 *
 * @param {string} channel Event channel.
 * @param {unknown} payload JSON serialisable payload.
 */
function broadcast(channel, payload) {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send(channel, payload);
  }
}

/**
 * Emits a scan log line with a timestamp.
 *
 * @param {"info" | "warning" | "error" | "blocked" | "found" | "done"} level Event kind.
 * @param {string} message Message in Turkish.
 */
function logScanEvent(level, message) {
  broadcast(EVENTS.scanEvent, { level, message, at: new Date().toISOString() });
}

const scanner = new ListingScanner({
  session: siteSession,
  results: resultsStore,
  onEvent: (event) => broadcast(EVENTS.scanEvent, { ...event, at: new Date().toISOString() })
});

/**
 * Runs a scan unless one is already running, and keeps the renderer informed.
 *
 * @param {"manual" | "scheduled"} trigger Who asked for the scan.
 * @returns {Promise<void>} Resolves when the scan ended.
 */
async function runScan(trigger) {
  if (scanner.running) {
    return;
  }
  if (trigger === "scheduled" && waitingForUser) {
    logScanEvent("info", "Otomatik tarama bekletildi: site penceresinde giriş veya doğrulama tamamlanmayı bekliyor.");
    return;
  }
  waitingForUser = false;
  broadcast(EVENTS.scanState, { running: true, nextRunAt: scheduler.getNextRunAt() });
  try {
    const summary = await scanner.run(settingsStore.get());
    waitingForUser = summary.stoppedByBlock;
  } catch (error) {
    logScanEvent("error", `Tarama hatası: ${error.message}`);
  } finally {
    broadcast(EVENTS.scanState, { running: false, nextRunAt: scheduler.getNextRunAt() });
  }
}

const scheduler = new ScanScheduler(() => runScan("scheduled"));
const updater = createUpdater((status) => {
  lastUpdateStatus = status;
  broadcast(EVENTS.updateStatus, status);
});

/**
 * Creates the control window that hosts the Vue interface.
 */
function createControlWindow() {
  controlWindow = new BrowserWindow({
    // The default size is also the minimum: the layout is designed for it and
    // grows from there (resizable, maximisable and full screen capable).
    width: 1180,
    height: 780,
    minWidth: 1180,
    minHeight: 780,
    fullscreenable: true,
    title: "YellowFinder",
    backgroundColor: "#fffbe6",
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  controlWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  controlWindow.loadFile(RENDERER_INDEX);
  if (SMOKE_TEST) {
    attachSmokeTest(controlWindow);
  }
  controlWindow.on("closed", () => {
    controlWindow = null;
  });
}

/**
 * Forwards renderer console messages to stdout and exits with a failure code
 * when the renderer logged an error before the smoke test window elapsed.
 *
 * @param {BrowserWindow} window Control window.
 */
function attachSmokeTest(window) {
  let sawError = false;
  // YELLOWFINDER_SMOKE_SIZE=<width>x<height> resizes the window so larger layouts can be checked.
  const sizeMatch = /^(\d+)x(\d+)$/.exec(process.env.YELLOWFINDER_SMOKE_SIZE ?? "");
  if (sizeMatch) {
    window.setSize(Number(sizeMatch[1]), Number(sizeMatch[2]));
    window.center();
  }
  window.webContents.on("console-message", (details) => {
    const level = details.level ?? "info";
    if (level === "error") {
      sawError = true;
    }
    process.stdout.write(`[renderer:${level}] ${details.message}\n`);
  });
  window.webContents.on("did-fail-load", (_event, code, description) => {
    sawError = true;
    process.stdout.write(`[renderer:load-failed] ${code} ${description}\n`);
  });
  setTimeout(async () => {
    // YELLOWFINDER_SMOKE_CLICK=<css selector> clicks an element (for example the settings gear) before the screenshot.
    const clickSelector = process.env.YELLOWFINDER_SMOKE_CLICK;
    if (clickSelector) {
      const found = await window.webContents.executeJavaScript(
        `(() => { const element = document.querySelector(${JSON.stringify(clickSelector)}); if (element) { element.click(); } return Boolean(element); })()`,
        true
      );
      process.stdout.write(`smoke click ${clickSelector}: ${found ? "clicked" : "not found"}\n`);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    // YELLOWFINDER_SMOKE_SCREENSHOT=<file.png> saves the control window for a visual check.
    const screenshotPath = process.env.YELLOWFINDER_SMOKE_SCREENSHOT;
    if (screenshotPath) {
      const image = await window.webContents.capturePage();
      await writeFile(screenshotPath, image.toPNG());
      process.stdout.write(`screenshot: ${screenshotPath}\n`);
    }
    process.stdout.write(sawError ? "smoke test: FAILED\n" : "smoke test: OK\n");
    app.exit(sawError ? 1 : 0);
  }, SMOKE_TEST_DURATION_MS);
}

/**
 * Registers every IPC handler. Each handler validates its input lightly and
 * returns plain JSON.
 */
function registerIpc() {
  ipcMain.handle(INVOKE.getBootstrap, () => ({
    version: app.getVersion(),
    settings: settingsStore.get(),
    cities: CITIES,
    categories: CATEGORIES,
    results: resultsStore.all(),
    scanRunning: scanner.running,
    nextRunAt: scheduler.getNextRunAt(),
    updateStatus: lastUpdateStatus
  }));

  ipcMain.handle(INVOKE.updateSettings, (_event, partial) => {
    const before = settingsStore.get();
    const settings = settingsStore.update(partial);
    // Only timing changes restart the countdown; editing categories keeps the next run where it was.
    if (before.autoScan !== settings.autoScan || before.intervalMinutes !== settings.intervalMinutes) {
      scheduler.configure(settings);
      broadcast(EVENTS.scanState, { running: scanner.running, nextRunAt: scheduler.getNextRunAt() });
    }
    return settings;
  });

  ipcMain.handle(INVOKE.listResults, () => resultsStore.all());

  ipcMain.handle(INVOKE.clearResults, () => {
    resultsStore.clear();
    return [];
  });

  ipcMain.handle(INVOKE.startScan, () => {
    runScan("manual");
    return true;
  });

  ipcMain.handle(INVOKE.stopScan, () => {
    scanner.cancel();
    return true;
  });

  ipcMain.handle(INVOKE.openSite, async () => {
    try {
      await siteSession.openForUser();
    } catch (error) {
      logScanEvent("error", `Site açılamadı: ${error.message}`);
    }
    return true;
  });

  ipcMain.handle(INVOKE.exportResults, async (_event, format, selection) => {
    if (!EXPORT_FORMATS.includes(format)) {
      throw new Error("Unsupported format");
    }
    const safeSelection = selection && typeof selection === "object" ? selection : {};
    return exportToFile(controlWindow, format, resultsStore.all(), safeSelection);
  });

  ipcMain.handle(INVOKE.checkForUpdates, () => updater.check());
  ipcMain.handle(INVOKE.installUpdate, () => updater.install());

  ipcMain.handle(INVOKE.openExternal, (_event, url) => {
    if (typeof url === "string" && url.startsWith(`${SITE_ORIGIN}/`)) {
      return shell.openExternal(url);
    }
    return undefined;
  });
}

app.whenReady().then(() => {
  registerIpc();
  createControlWindow();
  scheduler.configure(settingsStore.get());
  if (!SMOKE_TEST) {
    updater.check();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // The scheduler keeps running on macOS while the app stays in the Dock.
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  scheduler.stop();
  siteSession.close();
  resultsStore.close();
});
