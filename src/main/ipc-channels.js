/**
 * Names of every IPC channel shared by the main process, the preload script
 * and the renderer. Keeping them in one module avoids typos on either side.
 *
 * @module main/ipc-channels
 */

export const INVOKE = Object.freeze({
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
});

export const EVENTS = Object.freeze({
  scanEvent: "scan:event",
  scanState: "scan:state",
  updateStatus: "update:status"
});
