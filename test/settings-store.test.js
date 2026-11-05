import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sanitiseSettings, searchPairs, SettingsStore, DEFAULT_SETTINGS } from "../src/main/storage/settings-store.js";

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
  new SettingsStore(path).update({ profiles: [{ name: "Ankara", categories: ["kiralik-daire"], cities: ["ankara"] }], autoScan: false });
  const reloaded = new SettingsStore(path).get();
  assert.equal(reloaded.profiles.length, 1);
  assert.equal(reloaded.profiles[0].name, "Ankara");
  assert.deepEqual(reloaded.profiles[0].cities, ["ankara"]);
  assert.equal(reloaded.profiles[0].enabled, true);
  assert.equal(reloaded.autoScan, false);
  assert.equal(reloaded.intervalMinutes, DEFAULT_SETTINGS.intervalMinutes);
});

test("flat categories and cities from the first version become one profile", () => {
  const settings = sanitiseSettings({ categories: ["satilik-daire", "satilik-villa"], cities: ["izmir"] });
  assert.equal(settings.profiles.length, 1);
  assert.equal(settings.profiles[0].name, "Varsayılan");
  assert.deepEqual(settings.profiles[0].categories, ["satilik-daire", "satilik-villa"]);
  assert.equal("categories" in settings, false);
});

test("search pairs come from enabled profiles only, each pair once", () => {
  const settings = sanitiseSettings({
    profiles: [
      { name: "A", categories: ["satilik-daire"], cities: ["istanbul", "ankara"] },
      { name: "B", categories: ["satilik-daire", "kiralik-daire"], cities: ["ankara"] },
      { name: "C", enabled: false, categories: ["satilik-villa"], cities: ["mugla"] }
    ]
  });
  assert.deepEqual(searchPairs(settings), [
    { categorySlug: "satilik-daire", citySlug: "istanbul" },
    { categorySlug: "satilik-daire", citySlug: "ankara" },
    { categorySlug: "kiralik-daire", citySlug: "ankara" }
  ]);
});

test("duplicate profile ids are made unique and the list is capped", () => {
  const profiles = Array.from({ length: 25 }, (_, index) => ({ id: "same", name: `P${index}` }));
  const settings = sanitiseSettings({ profiles });
  assert.equal(settings.profiles.length, 20);
  assert.equal(new Set(settings.profiles.map((profile) => profile.id)).size, 20);
});


test("theme accepts only the known values", () => {
  assert.equal(sanitiseSettings({ theme: "dark" }).theme, "dark");
  assert.equal(sanitiseSettings({ theme: "purple" }).theme, "system");
  assert.equal(sanitiseSettings({}).theme, "system");
});
