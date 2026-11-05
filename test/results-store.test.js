import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResultsStore } from "../src/main/storage/results-store.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Builds a store with a controllable clock.
 *
 * @param {string} path Database path.
 * @param {{ time: number }} clock Mutable clock.
 * @returns {ResultsStore} Store.
 */
function storeWithClock(path, clock) {
  return new ResultsStore(path, { now: () => new Date(clock.time) });
}

const sampleListing = {
  id: "1",
  url: "https://www.sahibinden.com/ilan/x-1/detay",
  title: "Daire",
  price: "1 TL",
  location: "Kadıköy",
  categorySlug: "satilik-daire",
  citySlug: "istanbul",
  sellerKind: "owner",
  phones: ["0532 123 45 67"],
  seenAt: "2026-11-05T10:00:00.000Z"
};

test("kept and agency listings are skipped for good, no-phone ones are retried after the window", () => {
  const clock = { time: Date.parse("2026-11-05T10:00:00.000Z") };
  const store = storeWithClock(":memory:", clock);
  store.upsert(sampleListing);
  store.markSkipped("2", "agency");
  store.markSkipped("3", "no-phone");

  assert.equal(store.shouldSkip("1"), true);
  assert.equal(store.shouldSkip("2"), true);
  assert.equal(store.shouldSkip("3"), true);
  assert.equal(store.shouldSkip("4"), false);

  clock.time += 4 * DAY_MS;
  assert.equal(store.shouldSkip("1"), true);
  assert.equal(store.shouldSkip("2"), true);
  assert.equal(store.shouldSkip("3"), false, "no-phone listings are retried after three days");
  store.close();
});

test("listings survive a round trip through the file and read back as records", () => {
  const path = join(mkdtempSync(join(tmpdir(), "yellowfinder-")), "results.sqlite");
  const first = new ResultsStore(path);
  first.upsert(sampleListing);
  first.close();

  const second = new ResultsStore(path);
  assert.deepEqual(second.all(), [sampleListing]);
  second.close();
});

test("old visits are purged on open, kept listings stay", () => {
  const path = join(mkdtempSync(join(tmpdir(), "yellowfinder-")), "results.sqlite");
  const clock = { time: Date.parse("2026-01-01T00:00:00.000Z") };
  const first = storeWithClock(path, clock);
  first.upsert({ ...sampleListing, seenAt: new Date(clock.time).toISOString() });
  first.markSkipped("2", "agency");
  first.close();

  clock.time += 200 * DAY_MS;
  const second = storeWithClock(path, clock);
  assert.equal(second.shouldSkip("2"), false, "agency visit expired");
  assert.equal(second.shouldSkip("1"), true, "kept listing never expires");
  assert.equal(second.all().length, 1);
  second.close();
});

test("the legacy JSON file is imported once and renamed", () => {
  const directory = mkdtempSync(join(tmpdir(), "yellowfinder-"));
  const legacyPath = join(directory, "results.json");
  writeFileSync(legacyPath, JSON.stringify({ records: [sampleListing], skippedIds: ["9"] }));

  const store = new ResultsStore(join(directory, "results.sqlite"));
  assert.equal(store.importLegacyJson(legacyPath), 1);
  assert.equal(store.shouldSkip("1"), true);
  assert.equal(store.shouldSkip("9"), true, "old skips are retried later rather than dropped");
  assert.equal(existsSync(legacyPath), false);
  assert.equal(existsSync(`${legacyPath}.imported`), true);
  assert.equal(store.importLegacyJson(legacyPath), 0);
  store.close();
});

test("clear removes listings and visits", () => {
  const store = new ResultsStore(":memory:");
  store.upsert(sampleListing);
  store.markSkipped("2", "agency");
  store.clear();
  assert.deepEqual(store.all(), []);
  assert.equal(store.shouldSkip("1"), false);
  assert.equal(store.shouldSkip("2"), false);
  store.close();
});

test("a legacy file that is not an object is set aside instead of crashing", () => {
  const directory = mkdtempSync(join(tmpdir(), "yellowfinder-"));
  const legacyPath = join(directory, "results.json");
  writeFileSync(legacyPath, "null");
  const store = new ResultsStore(":memory:");
  assert.equal(store.importLegacyJson(legacyPath), 0);
  assert.equal(existsSync(`${legacyPath}.unreadable`), true);
  store.close();
});
