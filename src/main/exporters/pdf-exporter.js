/**
 * PDF export rendered by Chromium itself: the list is laid out as HTML in a
 * hidden window and printed with `printToPDF`, so no PDF library is needed.
 *
 * @module main/exporters/pdf-exporter
 */

import { BrowserWindow } from "electron";
import { renderPdfHtml } from "./pdf-document.js";

/**
 * Renders the records to a PDF buffer.
 *
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {Promise<Buffer>} PDF bytes.
 */
export async function renderPdf(records) {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  try {
    const html = renderPdfHtml(records);
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return await window.webContents.printToPDF({ pageSize: "A4", printBackground: true });
  } finally {
    window.destroy();
  }
}
