/**
 * XLSX export: one row per listing, phone numbers joined with " | ".
 *
 * @module main/exporters/xlsx-exporter
 */

import { buildXlsx } from "./xlsx-writer.js";

/**
 * @param {import("../storage/results-store.js").ListingRecord[]} records Listings to export.
 * @returns {Buffer} Workbook bytes.
 */
export function renderXlsx(records) {
  return buildXlsx({
    sheetName: "İlanlar",
    header: ["İlan No", "Başlık", "Fiyat", "Konum", "Kategori", "Şehir", "Telefon", "Bağlantı", "Bulunma"],
    widths: [12, 48, 16, 28, 18, 14, 34, 60, 22],
    rows: records.map((record) => [
      record.id,
      record.title,
      record.price,
      record.location,
      record.categorySlug,
      record.citySlug,
      record.phones.join(" | "),
      record.url,
      new Date(record.seenAt).toLocaleString("tr-TR")
    ])
  });
}
