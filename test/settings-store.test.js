import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sanitiseSettings, SettingsStore, DEFAULT_SETTINGS } from "../src/main/storage/settings-store.js";

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


test("theme accepts only the known values", () => {
  assert.equal(sanitiseSettings({ theme: "dark" }).theme, "dark");
  assert.equal(sanitiseSettings({ theme: "purple" }).theme, "system");
  assert.equal(sanitiseSettings({}).theme, "system");
});
