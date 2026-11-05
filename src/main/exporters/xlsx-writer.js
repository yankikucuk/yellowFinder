/**
 * Minimal XLSX writer with no dependencies.
 *
 * An .xlsx file is a ZIP archive of XML parts. This module writes the five
 * parts Excel, Numbers and LibreOffice need for a single sheet of inline
 * strings, and packs them with a small ZIP encoder built on `node:zlib`.
 * It is deliberately limited: one sheet, text cells, a bold header row and
 * column widths. That is all the listing export needs.
 *
 * @module main/exporters/xlsx-writer
 */

import { deflateRawSync, crc32 } from "node:zlib";

/**
 * Escapes text for an XML text node or attribute.
 *
 * @param {unknown} value Raw value.
 * @returns {string} Escaped text.
 */
function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Control characters are not allowed in XML 1.0 and make Excel refuse the file.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/**
 * Converts a zero based column index to the letters Excel uses (0 → A, 26 → AA).
 *
 * @param {number} index Column index.
 * @returns {string} Column letters.
 */
export function columnLetters(index) {
  let letters = "";
  let remaining = index + 1;
  while (remaining > 0) {
    const digit = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + digit) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
}

/**
 * Builds the worksheet XML.
 *
 * @param {string[]} header Column titles.
 * @param {string[][]} rows Cell texts.
 * @param {number[]} widths Column widths in characters.
 * @returns {string} XML document.
 */
function sheetXml(header, rows, widths) {
  const cell = (columnIndex, rowNumber, text, styleIndex) =>
    `<c r="${columnLetters(columnIndex)}${rowNumber}" t="inlineStr"${styleIndex ? ` s="${styleIndex}"` : ""}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
  const rowXml = (cells, rowNumber, styleIndex) => `<row r="${rowNumber}">${cells.map((text, columnIndex) => cell(columnIndex, rowNumber, text, styleIndex)).join("")}</row>`;
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const body = [rowXml(header, 1, 1), ...rows.map((cells, index) => rowXml(cells, index + 2, 0))].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData>${body}</sheetData></worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs></styleSheet>`;

/**
 * @param {string} sheetName Sheet tab title.
 * @returns {string} Workbook XML.
 */
function workbookXml(sheetName) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

/**
 * Packs named files into a ZIP archive (deflate, no encryption, no zip64).
 *
 * @param {Array<{name: string, data: Buffer}>} entries Files in archive order.
 * @returns {Buffer} ZIP bytes.
 */
export function zip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data);
    const checksum = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

/**
 * Builds a single sheet workbook.
 *
 * @param {object} options Sheet content.
 * @param {string} options.sheetName Sheet tab title.
 * @param {string[]} options.header Column titles, rendered bold and frozen.
 * @param {string[][]} options.rows Cell texts.
 * @param {number[]} [options.widths] Column widths in characters; defaults to 18 each.
 * @returns {Buffer} XLSX bytes.
 */
export function buildXlsx({ sheetName, header, rows, widths }) {
  const columnWidths = widths ?? header.map(() => 18);
  const text = (content) => Buffer.from(content, "utf8");
  return zip([
    { name: "[Content_Types].xml", data: text(CONTENT_TYPES) },
    { name: "_rels/.rels", data: text(ROOT_RELS) },
    { name: "xl/workbook.xml", data: text(workbookXml(sheetName)) },
    { name: "xl/_rels/workbook.xml.rels", data: text(WORKBOOK_RELS) },
    { name: "xl/styles.xml", data: text(STYLES) },
    { name: "xl/worksheets/sheet1.xml", data: text(sheetXml(header, rows, columnWidths)) }
  ]);
}
