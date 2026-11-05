import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { buildXlsx, zip, columnLetters } from "../src/main/exporters/xlsx-writer.js";
import { renderXlsx } from "../src/main/exporters/xlsx-exporter.js";

/**
 * Reads the entries of a ZIP produced by `zip()` back out of the central
 * directory, enough to check names and contents.
 *
 * @param {Buffer} archive ZIP bytes.
 * @returns {Map<string, string>} File name to UTF-8 content.
 */
function readZip(archive) {
  const endOffset = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = archive.readUInt16LE(endOffset + 10);
  let cursor = archive.readUInt32LE(endOffset + 16);
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    assert.equal(archive.readUInt32LE(cursor), 0x02014b50, "central header signature");
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const dataStart = localOffset + 30 + localNameLength;
    files.set(name, inflateRawSync(archive.subarray(dataStart, dataStart + compressedSize)).toString("utf8"));
    cursor += 46 + nameLength;
  }
  return files;
}

test("column letters follow the spreadsheet convention", () => {
  assert.equal(columnLetters(0), "A");
  assert.equal(columnLetters(25), "Z");
  assert.equal(columnLetters(26), "AA");
  assert.equal(columnLetters(701), "ZZ");
});

test("zip round-trips file names and contents", () => {
  const archive = zip([
    { name: "a.txt", data: Buffer.from("hello") },
    { name: "dir/b.xml", data: Buffer.from("<x>ğüş</x>") }
  ]);
  const files = readZip(archive);
  assert.deepEqual([...files.keys()], ["a.txt", "dir/b.xml"]);
  assert.equal(files.get("a.txt"), "hello");
  assert.equal(files.get("dir/b.xml"), "<x>ğüş</x>");
});

test("the workbook holds the required parts with escaped cell text", () => {
  const archive = buildXlsx({ sheetName: "Test", header: ["A & B"], rows: [["<1>"], ["two"]] });
  const files = readZip(archive);
  assert.ok(files.has("[Content_Types].xml"));
  assert.ok(files.has("xl/workbook.xml"));
  assert.ok(files.has("xl/styles.xml"));
  const sheet = files.get("xl/worksheets/sheet1.xml");
  assert.match(sheet, /A &amp; B/);
  assert.match(sheet, /&lt;1&gt;/);
  assert.match(sheet, /<row r="3">/);
});

test("renderXlsx writes one row per listing with joined phones", () => {
  const files = readZip(
    renderXlsx([
      {
        id: "1",
        url: "https://www.sahibinden.com/ilan/x-1/detay",
        title: "Daire",
        price: "1 TL",
        location: "Kadıköy",
        categorySlug: "satilik-daire",
        citySlug: "istanbul",
        phones: ["0532 123 45 67", "0212 555 11 22"],
        seenAt: "2026-11-05T10:00:00.000Z"
      }
    ])
  );
  assert.match(files.get("xl/worksheets/sheet1.xml"), /0532 123 45 67 \| 0212 555 11 22/);
});
