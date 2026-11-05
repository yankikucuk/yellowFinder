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
import { randomUUID } from "node:crypto";

/**
 * A named combination of categories and cities that the scanner visits.
 * Profiles can be switched off without losing their selection.
 *
 * @typedef {object} SearchProfile
 * @property {string} id Stable identifier.
 * @property {string} name Label shown to the user.
 * @property {boolean} enabled Whether scans include this profile.
 * @property {string[]} categories Category slugs.
 * @property {string[]} cities City slugs.
 */

/**
 * @typedef {object} Settings
 * @property {SearchProfile[]} profiles Saved searches.
 * @property {number} intervalMinutes Minutes between automatic scans.
 * @property {number} maxPagesPerSearch How many result pages to read per category and city.
 * @property {boolean} autoScan Whether the scheduler runs automatically.
 * @property {string} extraQuery Extra query string appended to every search URL.
 * @property {number} minDelaySeconds Smallest pause between two page loads.
 * @property {number} maxDelaySeconds Largest pause between two page loads.
 * @property {"system" | "light" | "dark"} theme Colour scheme of the interface.
 */

/** Accepted values of the theme setting. */
export const THEMES = Object.freeze(["system", "light", "dark"]);

/** Upper bound on saved profiles, to keep the sidebar and the scan length sane. */
export const MAX_PROFILES = 20;

/** Name given to the profile created from the flat category/city settings of versions before 0.2.0. */
const MIGRATED_PROFILE_NAME = "Varsayılan";

/**
 * Builds a fresh profile.
 *
 * @param {Partial<SearchProfile>} [partial] Fields to set.
 * @returns {SearchProfile} Profile with defaults filled in.
 */
export function createProfile(partial = {}) {
  return {
    id: typeof partial.id === "string" && partial.id.length > 0 ? partial.id : randomUUID(),
    name: typeof partial.name === "string" && partial.name.trim().length > 0 ? partial.name.trim().slice(0, 60) : "Yeni arama",
    enabled: partial.enabled !== false,
    categories: onlyStrings(partial.categories),
    cities: onlyStrings(partial.cities)
  };
}

/** @type {Settings} */
export const DEFAULT_SETTINGS = Object.freeze({
  profiles: [],
  intervalMinutes: 60,
  maxPagesPerSearch: 2,
  autoScan: true,
  extraQuery: "",
  minDelaySeconds: 4,
  maxDelaySeconds: 9,
  theme: "system"
});

/**
 * @param {unknown} list Any value.
 * @returns {string[]} The strings in the list, or an empty list.
 */
function onlyStrings(list) {
  return Array.isArray(list) ? list.filter((item) => typeof item === "string") : [];
}

/**
 * Builds the profile list from a candidate settings object. A file written
 * by a version without profiles carries flat `categories` and `cities`;
 * those become one profile so the user's selection survives the upgrade.
 *
 * @param {object} candidate Settings as given, before defaults are merged in.
 * @returns {SearchProfile[]} Sanitised profiles.
 */
function sanitiseProfiles(candidate) {
  if (Array.isArray(candidate.profiles)) {
    const seenIds = new Set();
    const profiles = [];
    for (const entry of candidate.profiles) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const profile = createProfile(entry);
      if (seenIds.has(profile.id)) {
        profile.id = randomUUID();
      }
      seenIds.add(profile.id);
      profiles.push(profile);
      if (profiles.length === MAX_PROFILES) {
        break;
      }
    }
    return profiles;
  }
  if (Array.isArray(candidate.categories) || Array.isArray(candidate.cities)) {
    return [createProfile({ name: MIGRATED_PROFILE_NAME, categories: candidate.categories, cities: candidate.cities })];
  }
  return [createProfile({ name: MIGRATED_PROFILE_NAME, categories: ["satilik-daire"], cities: ["istanbul"] })];
}

/**
 * Merges a partial object over the defaults and clamps numeric fields to safe
 * ranges. Unknown keys are dropped.
 *
 * @param {Partial<Settings> & {categories?: string[], cities?: string[]}} partial Candidate settings.
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
  const minDelay = clampInteger(merged.minDelaySeconds, 2, 120, DEFAULT_SETTINGS.minDelaySeconds);
  return {
    profiles: sanitiseProfiles(partial ?? {}),
    intervalMinutes: clampInteger(merged.intervalMinutes, 15, 24 * 60, DEFAULT_SETTINGS.intervalMinutes),
    maxPagesPerSearch: clampInteger(merged.maxPagesPerSearch, 1, 20, DEFAULT_SETTINGS.maxPagesPerSearch),
    autoScan: Boolean(merged.autoScan),
    extraQuery: typeof merged.extraQuery === "string" ? merged.extraQuery.trim() : "",
    minDelaySeconds: minDelay,
    maxDelaySeconds: Math.max(minDelay, clampInteger(merged.maxDelaySeconds, 2, 300, DEFAULT_SETTINGS.maxDelaySeconds)),
    theme: THEMES.includes(merged.theme) ? merged.theme : DEFAULT_SETTINGS.theme
  };
}

/**
 * Lists the category and city pairs the scanner must visit: every pair of
 * every enabled profile, each pair once even when profiles overlap.
 *
 * @param {Settings} settings Current settings.
 * @returns {Array<{categorySlug: string, citySlug: string}>} Unique pairs in profile order.
 */
export function searchPairs(settings) {
  const seen = new Set();
  const pairs = [];
  for (const profile of settings.profiles) {
    if (!profile.enabled) {
      continue;
    }
    for (const categorySlug of profile.categories) {
      for (const citySlug of profile.cities) {
        const key = `${categorySlug}|${citySlug}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ categorySlug, citySlug });
        }
      }
    }
  }
  return pairs;
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
    return structuredClone(this.settings);
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
