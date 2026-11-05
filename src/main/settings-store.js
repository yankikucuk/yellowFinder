/**
 * Persists user settings as a JSON file inside Electron's userData folder.
 *
 * A plain file is used instead of a settings library so that the format stays
 * readable and the app has no runtime dependency for it.
 *
 * @module main/settings-store
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

/**
 * @typedef {object} Settings
 * @property {string[]} categories Selected category slugs.
 * @property {string[]} cities Selected city slugs.
 * @property {number} intervalMinutes Minutes between automatic scans.
 * @property {number} maxPagesPerSearch How many result pages to read per category and city.
 * @property {boolean} autoScan Whether the scheduler runs automatically.
 * @property {string} extraQuery Extra query string appended to every search URL.
 * @property {number} minDelaySeconds Smallest pause between two page loads.
 * @property {number} maxDelaySeconds Largest pause between two page loads.
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = Object.freeze({
  categories: ["satilik-daire"],
  cities: ["istanbul"],
  intervalMinutes: 60,
  maxPagesPerSearch: 2,
  autoScan: true,
  extraQuery: "",
  minDelaySeconds: 4,
  maxDelaySeconds: 9
});

/**
 * Merges a partial object over the defaults and clamps numeric fields to safe
 * ranges. Unknown keys are dropped.
 *
 * @param {Partial<Settings>} partial Candidate settings.
 * @returns {Settings} Sanitised settings.
 */
export function sanitiseSettings(partial) {
  const merged = { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
  const clampInteger = (value, min, max, fallback) => {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  };
  const onlyStrings = (list) => (Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);
  const minDelay = clampInteger(merged.minDelaySeconds, 2, 120, DEFAULT_SETTINGS.minDelaySeconds);
  return {
    categories: onlyStrings(merged.categories),
    cities: onlyStrings(merged.cities),
    intervalMinutes: clampInteger(merged.intervalMinutes, 15, 24 * 60, DEFAULT_SETTINGS.intervalMinutes),
    maxPagesPerSearch: clampInteger(merged.maxPagesPerSearch, 1, 20, DEFAULT_SETTINGS.maxPagesPerSearch),
    autoScan: Boolean(merged.autoScan),
    extraQuery: typeof merged.extraQuery === "string" ? merged.extraQuery.trim() : "",
    minDelaySeconds: minDelay,
    maxDelaySeconds: Math.max(minDelay, clampInteger(merged.maxDelaySeconds, 2, 300, DEFAULT_SETTINGS.maxDelaySeconds))
  };
}

/**
 * File backed settings store.
 */
export class SettingsStore {
  /**
   * @param {string} filePath Absolute path of the JSON file.
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.settings = this.#load();
  }

  /** @returns {Settings} Current settings. */
  get() {
    return { ...this.settings };
  }

  /**
   * Replaces the settings with a sanitised copy of the input and saves them.
   *
   * @param {Partial<Settings>} partial New settings.
   * @returns {Settings} Stored settings.
   */
  update(partial) {
    this.settings = sanitiseSettings({ ...this.settings, ...partial });
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), "utf8");
    return this.get();
  }

  /** @returns {Settings} Settings read from disk, or defaults. */
  #load() {
    if (!existsSync(this.filePath)) {
      return sanitiseSettings({});
    }
    try {
      return sanitiseSettings(JSON.parse(readFileSync(this.filePath, "utf8")));
    } catch {
      return sanitiseSettings({});
    }
  }
}
