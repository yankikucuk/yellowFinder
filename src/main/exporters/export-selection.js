/**
 * Narrows the listing list for an export: by explicit ids and by the day
 * the listing was found. Kept free of Electron so it can be unit tested.
 *
 * @module main/exporters/export-selection
 */

/**
 * @typedef {object} ExportSelection
 * @property {string[]} [ids] Only these listing ids. Omit for all.
 * @property {string} [from] Inclusive start day as "YYYY-MM-DD" (local time).
 * @property {string} [to] Inclusive end day as "YYYY-MM-DD" (local time).
 */

/**
 * Parses a "YYYY-MM-DD" string into a local midnight. Invalid input yields null.
 *
 * @param {unknown} value Candidate.
 * @returns {Date | null} Local midnight.
 */
function parseDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Applies the selection to the records, keeping the input order.
 *
 * @param {import("../storage/results-store.js").ListingRecord[]} records All listings.
 * @param {ExportSelection} [selection] Filter.
 * @returns {import("../storage/results-store.js").ListingRecord[]} Listings to export.
 */
export function selectForExport(records, selection = {}) {
  const ids = Array.isArray(selection.ids) ? new Set(selection.ids.filter((id) => typeof id === "string")) : null;
  const from = parseDay(selection.from);
  const to = parseDay(selection.to);
  const end = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1) : null;
  return records.filter((record) => {
    if (ids && !ids.has(record.id)) {
      return false;
    }
    const seenAt = new Date(record.seenAt);
    if (from && seenAt < from) {
      return false;
    }
    if (end && seenAt >= end) {
      return false;
    }
    return true;
  });
}
