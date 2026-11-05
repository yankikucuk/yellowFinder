import { test } from "node:test";
import assert from "node:assert/strict";
import { selectForExport } from "../src/main/exporters/export-selection.js";

const atLocal = (year, month, day, hour) => new Date(year, month - 1, day, hour).toISOString();

const records = [
  { id: "1", seenAt: atLocal(2026, 11, 1, 9) },
  { id: "2", seenAt: atLocal(2026, 11, 3, 23) },
  { id: "3", seenAt: atLocal(2026, 11, 5, 0) }
];

test("no selection keeps everything in order", () => {
  assert.deepEqual(selectForExport(records).map((record) => record.id), ["1", "2", "3"]);
});

test("ids narrow the list", () => {
  assert.deepEqual(selectForExport(records, { ids: ["3", "1"] }).map((record) => record.id), ["1", "3"]);
});

test("the day range is inclusive on both ends in local time", () => {
  assert.deepEqual(selectForExport(records, { from: "2026-11-03", to: "2026-11-03" }).map((record) => record.id), ["2"]);
  assert.deepEqual(selectForExport(records, { from: "2026-11-02" }).map((record) => record.id), ["2", "3"]);
  assert.deepEqual(selectForExport(records, { to: "2026-11-01" }).map((record) => record.id), ["1"]);
});

test("malformed dates are ignored rather than excluding everything", () => {
  assert.equal(selectForExport(records, { from: "yesterday", to: 42 }).length, 3);
});
