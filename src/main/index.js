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
import { fileURLToPath } from "node:url";
import { SettingsStore } from "./settings-store.js";
import { ResultsStore } from "./results-store.js";
import { SiteSession } from "./scanner/site-session.js";
import { ListingScanner } from "./scanner/listing-scanner.js";
import { ScanScheduler } from "./scheduler.js";
import { exportToFile } from "./exporters/index.js";
import { createUpdater } from "./updater.js";
import { INVOKE, EVENTS } from "./ipc-channels.js";
import { CITIES } from "../shared/catalog/cities.js";
import { CATEGORIES } from "../shared/catalog/categories.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const RENDERER_INDEX = join(currentDirectory, "..", "..", "dist", "renderer", "index.html");
const PRELOAD_SCRIPT = join(currentDirectory, "..", "preload", "index.cjs");

/** Started with `--smoke-test`: print renderer console output and quit after a few seconds (used by developers and CI to verify the app boots). */
const SMOKE_TEST = process.argv.includes("--smoke-test");
const SMOKE_TEST_DURATION_MS = 6_000;

/** @type {BrowserWindow | null} */
let controlWindow = null;

const settingsStore = new SettingsStore(join(app.getPath("userData"), "settings.json"));
const resultsStore = new ResultsStore(join(app.getPath("userData"), "results.json"));
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

const scanner = new ListingScanner({
  session: siteSession,
  results: resultsStore,
  onEvent: (event) => broadcast(EVENTS.scanEvent, { ...event, at: new Date().toISOString() })
});

/**
 * Runs a scan unless one is already running, and keeps the renderer informed.
 *
 * @returns {Promise<void>} Resolves when the scan ended.
 */
async function runScan() {
  if (scanner.running) {
    return;
  }
  broadcast(EVENTS.scanState, { running: true, nextRunAt: scheduler.getNextRunAt() });
  try {
    await scanner.run(settingsStore.get());
  } catch (error) {
    broadcast(EVENTS.scanEvent, { level: "error", message: `Tarama hatası: ${error.message}`, at: new Date().toISOString() });
  } finally {
    broadcast(EVENTS.scanState, { running: false, nextRunAt: scheduler.getNextRunAt() });
  }
}

const scheduler = new ScanScheduler(runScan);
const updater = createUpdater((status) => broadcast(EVENTS.updateStatus, status));

/**
 * Creates the control window that hosts the Vue interface.
 */
function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: "yellowFinder",
    backgroundColor: "#fffbe6",
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
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
  setTimeout(() => {
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
    nextRunAt: scheduler.getNextRunAt()
  }));

  ipcMain.handle(INVOKE.updateSettings, (_event, partial) => {
    const settings = settingsStore.update(partial);
    scheduler.configure(settings);
    broadcast(EVENTS.scanState, { running: scanner.running, nextRunAt: scheduler.getNextRunAt() });
    return settings;
  });

  ipcMain.handle(INVOKE.listResults, () => resultsStore.all());

  ipcMain.handle(INVOKE.clearResults, () => {
    resultsStore.clear();
    return [];
  });

  ipcMain.handle(INVOKE.startScan, () => {
    runScan();
    return true;
  });

  ipcMain.handle(INVOKE.stopScan, () => {
    scanner.cancel();
    return true;
  });

  ipcMain.handle(INVOKE.openSite, async () => {
    await siteSession.openForUser();
    return true;
  });

  ipcMain.handle(INVOKE.exportResults, async (_event, format) => {
    if (!["txt", "csv", "pdf"].includes(format)) {
      throw new Error("Unsupported format");
    }
    return exportToFile(controlWindow, format, resultsStore.all());
  });

  ipcMain.handle(INVOKE.checkForUpdates, () => updater.check());
  ipcMain.handle(INVOKE.installUpdate, () => updater.install());

  ipcMain.handle(INVOKE.openExternal, (_event, url) => {
    if (typeof url === "string" && url.startsWith("https://www.sahibinden.com/")) {
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
});
