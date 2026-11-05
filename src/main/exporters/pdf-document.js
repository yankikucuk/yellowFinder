/**
 * Builds the HTML document that the PDF export prints. Kept free of Electron
 * so the layout and the escaping can be unit tested.
 *
 * @module main/exporters/pdf-document
 */

/**
 * Escapes text for safe insertion into HTML.
 *
 * @param {string} value Raw text.
 * @returns {string} Escaped text.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the listing table as a printable HTML document.
 *
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @param {Date} [generatedAt=new Date()] Timestamp printed in the header.
 * @returns {string} HTML document.
 */
export function renderPdfHtml(records, generatedAt = new Date()) {
  const rows = records
    .map(
      (record) => `<tr>
        <td>${escapeHtml(record.title)}<br><small>${escapeHtml(record.price)} · ${escapeHtml(record.location)}</small><br><small>${escapeHtml(record.url)}</small></td>
        <td class="phones">${record.phones.map(escapeHtml).join("<br>")}</td>
      </tr>`
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>YellowFinder</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #1d1d1f; margin: 24px; }
  h1 { font-size: 16pt; margin: 0 0 4px; }
  p.meta { color: #6e6e73; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #e5e5ea; }
  th { background: #fff5c2; }
  td.phones { white-space: nowrap; font-variant-numeric: tabular-nums; }
  small { color: #6e6e73; }
</style></head><body>
<h1>YellowFinder listesi</h1>
<p class="meta">${escapeHtml(generatedAt.toLocaleString("tr-TR"))} · ${records.length} ilan</p>
<table><thead><tr><th>İlan</th><th>Telefon</th></tr></thead><tbody>
${rows}
</tbody></table></body></html>`;
}
