/**
 * PDF export rendered by Chromium itself: the list is laid out as HTML,
 * written to a temporary file, loaded in a hidden window and printed with
 * `printToPDF`. A file is used rather than a `data:` URL because Chromium
 * rejects URLs above 2 MiB and a few thousand listings exceed that once
 * percent-encoded.
 *
 * @module main/exporters/pdf-exporter
 */

import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BrowserWindow } from "electron";
import { renderPdfHtml } from "./pdf-document.js";

/** Upper bound for laying out the document before the export gives up. */
const LOAD_TIMEOUT_MS = 60_000;

/**
 * Renders the records to a PDF buffer.
 *
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {Promise<Buffer>} PDF bytes.
 */
export async function renderPdf(records) {
  const directory = await mkdtemp(join(tmpdir(), "yellowfinder-pdf-"));
  const htmlPath = join(directory, "export.html");
  await writeFile(htmlPath, renderPdfHtml(records), "utf8");
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  try {
    await Promise.race([
      window.loadFile(htmlPath),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error("PDF layout timed out")), LOAD_TIMEOUT_MS))
    ]);
    return await window.webContents.printToPDF({ pageSize: "A4", printBackground: true });
  } finally {
    window.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
