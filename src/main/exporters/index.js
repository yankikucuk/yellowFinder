/**
 * Entry point for exports: picks the format, asks for a destination and
 * writes the file.
 *
 * @module main/exporters
 */

import { writeFile } from "node:fs/promises";
import { dialog } from "electron";
import { renderText } from "./text-exporter.js";
import { renderCsv } from "./csv-exporter.js";
import { renderPdf } from "./pdf-exporter.js";

/** @typedef {"txt" | "csv" | "pdf"} ExportFormat */

const FORMAT_FILTERS = Object.freeze({
  txt: { name: "Metin", extensions: ["txt"] },
  csv: { name: "CSV", extensions: ["csv"] },
  pdf: { name: "PDF", extensions: ["pdf"] }
});

/**
 * Produces the file content for a format.
 *
 * @param {ExportFormat} format Target format.
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {Promise<string | Buffer>} Content.
 */
export async function renderExport(format, records) {
  switch (format) {
    case "txt":
      return renderText(records);
    case "csv":
      return renderCsv(records);
    case "pdf":
      return renderPdf(records);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Shows a save dialog and writes the export. Resolves to the chosen path, or
 * null when the user cancelled.
 *
 * @param {import("electron").BrowserWindow} parent Window that owns the dialog.
 * @param {ExportFormat} format Target format.
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {Promise<string | null>} Saved file path.
 */
export async function exportToFile(parent, format, records) {
  const filter = FORMAT_FILTERS[format];
  if (!filter) {
    throw new Error(`Unsupported export format: ${format}`);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: `yellowfinder-${stamp}.${format}`,
    filters: [filter]
  });
  if (canceled || !filePath) {
    return null;
  }
  const content = await renderExport(format, records);
  await writeFile(filePath, content);
  return filePath;
}
