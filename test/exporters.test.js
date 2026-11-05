import { test } from "node:test";
import assert from "node:assert/strict";
import { renderText } from "../src/main/exporters/text-exporter.js";
import { renderCsv, escapeCsvCell } from "../src/main/exporters/csv-exporter.js";

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
