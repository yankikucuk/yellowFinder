/**
 * Entry point for exports: narrows the list, picks the format, asks for a
 * destination and writes the file.
 *
 * @module main/exporters
 */

import { writeFile } from "node:fs/promises";
import { dialog } from "electron";
import { renderText } from "./text-exporter.js";
import { renderCsv } from "./csv-exporter.js";
import { renderPdf } from "./pdf-exporter.js";
import { renderXlsx } from "./xlsx-exporter.js";
import { selectForExport } from "./export-selection.js";

/** @typedef {"txt" | "csv" | "pdf" | "xlsx"} ExportFormat */

export const EXPORT_FORMATS = Object.freeze(["txt", "csv", "pdf", "xlsx"]);

const FORMAT_FILTERS = Object.freeze({
  txt: { name: "Metin", extensions: ["txt"] },
  csv: { name: "CSV", extensions: ["csv"] },
  pdf: { name: "PDF", extensions: ["pdf"] },
  xlsx: { name: "Excel", extensions: ["xlsx"] }
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
    case "xlsx":
      return renderXlsx(records);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Shows a save dialog and writes the export. Resolves to the chosen path
 * and the number of listings written, or null when the user cancelled.
 *
 * @param {import("electron").BrowserWindow} parent Window that owns the dialog.
 * @param {ExportFormat} format Target format.
 * @param {import("../storage/results-store.js").ListingRecord[]} records All listings.
 * @param {import("./export-selection.js").ExportSelection} [selection] Which listings to include.
 * @returns {Promise<{path: string, count: number} | null>} Result.
 */
export async function exportToFile(parent, format, records, selection = {}) {
  const filter = FORMAT_FILTERS[format];
  if (!filter) {
    throw new Error(`Unsupported export format: ${format}`);
  }
  const chosen = selectForExport(records, selection);
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: `yellowfinder-${stamp}.${format}`,
    filters: [filter]
  });
  if (canceled || !filePath) {
    return null;
  }
  const content = await renderExport(format, chosen);
  await writeFile(filePath, content);
  return { path: filePath, count: chosen.length };
}
