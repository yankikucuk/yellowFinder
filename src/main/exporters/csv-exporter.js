/**
 * CSV export with a UTF-8 byte order mark so Excel opens Turkish characters
 * correctly. Phone numbers are joined with " | " inside one cell.
 *
 * @module main/exporters/csv-exporter
 */

const SEPARATOR = ";";

/**
 * Quotes a cell when it contains the separator, quotes or line breaks.
 *
 * @param {string} value Cell value.
 * @returns {string} Escaped cell.
 */
export function escapeCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {string} File content including the BOM.
 */
export function renderCsv(records) {
  const header = ["id", "title", "price", "location", "category", "city", "phones", "url", "seenAt"];
  const rows = records.map((record) =>
    [
      record.id,
      record.title,
      record.price,
      record.location,
      record.categorySlug,
      record.citySlug,
      record.phones.join(" | "),
      record.url,
      record.seenAt
    ]
      .map(escapeCsvCell)
      .join(SEPARATOR)
  );
  return `\uFEFF${[header.join(SEPARATOR), ...rows].join("\r\n")}\r\n`;
}
