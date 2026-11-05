/**
 * Preload script: the only bridge between the renderer and the main process.
 *
 * It exposes a small, typed `window.yellowFinder` object. The renderer cannot
 * reach Node or Electron directly. This file is CommonJS because Electron
 * loads sandboxed preload scripts as CommonJS.
 */

const { contextBridge, ipcRenderer } = require("electron");

/** Channel names, duplicated from `src/main/ipc-channels.js` because the sandboxed preload cannot import ES modules. */
const INVOKE = {
  getBootstrap: "app:get-bootstrap",
  updateSettings: "settings:update",
  listResults: "results:list",
  clearResults: "results:clear",
  startScan: "scan:start",
  stopScan: "scan:stop",
  openSite: "site:open",
  exportResults: "results:export",
  checkForUpdates: "update:check",
  installUpdate: "update:install",
  openExternal: "shell:open-external"
};

const EVENTS = {
  scanEvent: "scan:event",
  scanState: "scan:state",
  updateStatus: "update:status"
};

/**
 * Subscribes to a main process event and returns an unsubscribe function.
 *
 * @param {string} channel Event channel.
 * @param {(payload: unknown) => void} listener Callback.
 * @returns {() => void} Unsubscribe.
 */
function subscribe(channel, listener) {
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld("yellowFinder", {
  getBootstrap: () => ipcRenderer.invoke(INVOKE.getBootstrap),
  updateSettings: (partial) => ipcRenderer.invoke(INVOKE.updateSettings, partial),
  listResults: () => ipcRenderer.invoke(INVOKE.listResults),
  clearResults: () => ipcRenderer.invoke(INVOKE.clearResults),
  startScan: () => ipcRenderer.invoke(INVOKE.startScan),
  stopScan: () => ipcRenderer.invoke(INVOKE.stopScan),
  openSite: () => ipcRenderer.invoke(INVOKE.openSite),
  exportResults: (format, selection) => ipcRenderer.invoke(INVOKE.exportResults, format, selection),
  checkForUpdates: () => ipcRenderer.invoke(INVOKE.checkForUpdates),
  installUpdate: () => ipcRenderer.invoke(INVOKE.installUpdate),
  openExternal: (url) => ipcRenderer.invoke(INVOKE.openExternal, url),
  onScanEvent: (listener) => subscribe(EVENTS.scanEvent, listener),
  onScanState: (listener) => subscribe(EVENTS.scanState, listener),
  onUpdateStatus: (listener) => subscribe(EVENTS.updateStatus, listener)
});
