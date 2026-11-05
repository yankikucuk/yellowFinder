/**
 * Wires electron-updater to GitHub Releases.
 *
 * The provider and repository come from `electron-builder.yml`, which
 * electron-builder copies into the packaged app as `app-update.yml`. Updates
 * are only checked in packaged builds; in development the check is a no-op.
 *
 * @module main/updater
 */

import { app } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

/**
 * @typedef {object} UpdateStatus
 * @property {"idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error"} state Phase.
 * @property {string} message Human readable message (Turkish).
 * @property {string} [version] Version involved, when known.
 */

/**
 * Turns an updater error into a message the user can act on. Unsigned macOS
 * builds cannot install updates (Squirrel.Mac refuses them), so that case
 * points at the release page instead of showing a code signature error.
 *
 * @param {Error} error Updater error.
 * @returns {string} Message in Turkish.
 */
function describeUpdateError(error) {
  const text = error?.message ?? String(error);
  if (process.platform === "darwin" && /code signature|signed|codesign/i.test(text)) {
    return "Bu macOS sürümü imzasız olduğu için kendini güncelleyemiyor. Yeni sürümü GitHub Releases sayfasından indirin.";
  }
  if (/404|Not Found|Unable to find latest version/i.test(text)) {
    return "Güncelleme bilgisi bulunamadı. Depo özel olabilir ya da henüz bir sürüm yayınlanmamış olabilir.";
  }
  return `Güncelleme hatası: ${text}`;
}

/**
 * Sets up the updater and forwards its events.
 *
 * @param {(status: UpdateStatus) => void} onStatus Status sink.
 * @returns {{check: () => Promise<void>, install: () => void}} Controls.
 */
export function createUpdater(onStatus) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => onStatus({ state: "checking", message: "Güncelleme denetleniyor…" }));
  autoUpdater.on("update-available", (info) =>
    onStatus({ state: "available", message: `Yeni sürüm bulundu: ${info.version}. İndiriliyor…`, version: info.version })
  );
  autoUpdater.on("update-not-available", (info) =>
    onStatus({ state: "not-available", message: `Uygulama güncel (${info.version}).`, version: info.version })
  );
  autoUpdater.on("download-progress", (progress) =>
    onStatus({ state: "downloading", message: `İndiriliyor: %${Math.round(progress.percent)}` })
  );
  autoUpdater.on("update-downloaded", (info) =>
    onStatus({
      state: "downloaded",
      message: `Sürüm ${info.version} indirildi. Yeniden başlatınca kurulacak.`,
      version: info.version
    })
  );
  autoUpdater.on("error", (error) => onStatus({ state: "error", message: describeUpdateError(error) }));

  return {
    async check() {
      if (!app.isPackaged) {
        onStatus({ state: "idle", message: "Geliştirme modunda güncelleme denetlenmez." });
        return;
      }
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        onStatus({ state: "error", message: `Güncelleme hatası: ${error.message}` });
      }
    },
    install() {
      autoUpdater.quitAndInstall();
    }
  };
}
