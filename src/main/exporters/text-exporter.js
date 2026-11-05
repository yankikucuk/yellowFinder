/**
 * Plain text export: one listing per block, phone numbers one per line.
 *
 * @module main/exporters/text-exporter
 */

/**
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {string} File content.
 */
export function renderText(records) {
  const lines = [`yellowFinder listesi · ${new Date().toLocaleString("tr-TR")}`, `${records.length} ilan`, ""];
  for (const record of records) {
    lines.push(record.title);
    lines.push(`${record.price} · ${record.location}`);
    lines.push(record.url);
    for (const phone of record.phones) {
      lines.push(`  ${phone}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
