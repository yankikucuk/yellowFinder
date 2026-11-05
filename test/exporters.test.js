import { test } from "node:test";
import assert from "node:assert/strict";
import { renderText } from "../src/main/exporters/text-exporter.js";
import { renderCsv, escapeCsvCell } from "../src/main/exporters/csv-exporter.js";
import { renderPdfHtml } from "../src/main/exporters/pdf-document.js";

const sample = [
  {
    id: "1",
    url: "https://www.sahibinden.com/ilan/x-1/detay",
    title: 'Deniz manzaralı; "ferah" daire',
    price: "5.000.000 TL",
    location: "Kadıköy",
    categorySlug: "satilik-daire",
    citySlug: "istanbul",
    phones: ["0532 123 45 67", "0212 555 11 22"],
    seenAt: "2026-11-05T10:00:00.000Z"
  }
];

test("text export lists one phone per line", () => {
  const text = renderText(sample);
  assert.match(text, /1 ilan/);
  assert.match(text, /\n {2}0532 123 45 67\n {2}0212 555 11 22\n/);
});

test("csv export quotes cells with separators and starts with a BOM", () => {
  const csv = renderCsv(sample);
  assert.ok(csv.startsWith("﻿id;title;price"));
  assert.match(csv, /"Deniz manzaralı; ""ferah"" daire"/);
  assert.match(csv, /0532 123 45 67 \| 0212 555 11 22/);
});

test("escapeCsvCell leaves plain values untouched", () => {
  assert.equal(escapeCsvCell("Kadıköy"), "Kadıköy");
  assert.equal(escapeCsvCell(null), "");
});

test("pdf document escapes markup and lists every phone", () => {
  const html = renderPdfHtml([{ ...sample[0], title: "<b>Daire</b> & bahçe" }], new Date("2026-11-05T10:00:00Z"));
  assert.match(html, /&lt;b&gt;Daire&lt;\/b&gt; &amp; bahçe/);
  assert.doesNotMatch(html, /<b>Daire<\/b>/);
  assert.match(html, /0532 123 45 67<br>0212 555 11 22/);
  assert.match(html, /1 ilan/);
});
