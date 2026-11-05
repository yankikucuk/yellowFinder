import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sanitiseSettings, SettingsStore, DEFAULT_SETTINGS } from "../src/main/settings-store.js";
import { ResultsStore } from "../src/main/results-store.js";

test("sanitise clamps numbers and drops unknown keys", () => {
  const settings = sanitiseSettings({ intervalMinutes: 1, maxPagesPerSearch: 999, minDelaySeconds: 50, maxDelaySeconds: 3, bogus: true });
  assert.equal(settings.intervalMinutes, 15);
  assert.equal(settings.maxPagesPerSearch, 20);
  assert.equal(settings.maxDelaySeconds >= settings.minDelaySeconds, true);
  assert.equal("bogus" in settings, false);
});

test("settings survive a round trip through disk", () => {
  const directory = mkdtempSync(join(tmpdir(), "yellowfinder-"));
  const path = join(directory, "settings.json");
  new SettingsStore(path).update({ cities: ["ankara"], autoScan: false });
  const reloaded = new SettingsStore(path).get();
  assert.deepEqual(reloaded.cities, ["ankara"]);
  assert.equal(reloaded.autoScan, false);
  assert.equal(reloaded.intervalMinutes, DEFAULT_SETTINGS.intervalMinutes);
});

test("results store remembers kept and skipped listings", () => {
  const directory = mkdtempSync(join(tmpdir(), "yellowfinder-"));
  const path = join(directory, "results.json");
  const store = new ResultsStore(path);
  store.upsert({ id: "1", phones: ["0532 123 45 67"], seenAt: "2026-11-05T10:00:00.000Z" });
  store.markSkipped("2");
  const reloaded = new ResultsStore(path);
  assert.equal(reloaded.hasVisited("1"), true);
  assert.equal(reloaded.hasVisited("2"), true);
  assert.equal(reloaded.hasVisited("3"), false);
  assert.equal(reloaded.all().length, 1);
});
