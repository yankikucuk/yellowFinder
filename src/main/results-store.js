/**
 * Keeps every owner listing the scanner has found, keyed by listing id, in a
 * JSON file under userData. The scanner consults it to skip listings that were
 * already visited, so repeated hourly scans only cost one page load per new
 * listing.
 *
 * @module main/results-store
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

/**
 * @typedef {object} ListingRecord
 * @property {string} id Numeric listing id as a string.
 * @property {string} url Detail page URL.
 * @property {string} title Listing title.
 * @property {string} price Price text as shown on the site.
 * @property {string} location Location text as shown on the site.
 * @property {string} categorySlug Category the listing was found in.
 * @property {string} citySlug City the listing was found in.
 * @property {string[]} phones Canonical phone numbers.
 * @property {string} seenAt ISO timestamp of the first visit.
 */

/**
 * File backed listing store.
 */
export class ResultsStore {
  /**
   * @param {string} filePath Absolute path of the JSON file.
   */
  constructor(filePath) {
    this.filePath = filePath;
    /** @type {Map<string, ListingRecord>} */
    this.records = new Map();
    /** @type {Set<string>} ids visited but rejected (agency listings, no phone) so they are not fetched again. */
    this.skippedIds = new Set();
    this.#load();
  }

  /** @returns {ListingRecord[]} Newest first. */
  all() {
    return [...this.records.values()].sort((left, right) => right.seenAt.localeCompare(left.seenAt));
  }

  /**
   * @param {string} id Listing id.
   * @returns {boolean} True when the listing was already visited (kept or skipped).
   */
  hasVisited(id) {
    return this.records.has(id) || this.skippedIds.has(id);
  }

  /**
   * Adds or replaces a listing and saves.
   *
   * @param {ListingRecord} record Listing to keep.
   */
  upsert(record) {
    this.records.set(record.id, record);
    this.#save();
  }

  /**
   * Remembers that a listing was visited but not kept.
   *
   * @param {string} id Listing id.
   */
  markSkipped(id) {
    this.skippedIds.add(id);
    this.#save();
  }

  /** Removes every kept listing and every skip mark. */
  clear() {
    this.records.clear();
    this.skippedIds.clear();
    this.#save();
  }

  #load() {
    if (!existsSync(this.filePath)) {
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8"));
      for (const record of parsed.records ?? []) {
        this.records.set(record.id, record);
      }
      for (const id of parsed.skippedIds ?? []) {
        this.skippedIds.add(id);
      }
    } catch {
      // A corrupt file is treated as empty; the next save rewrites it.
    }
  }

  #save() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const payload = { records: [...this.records.values()], skippedIds: [...this.skippedIds] };
    writeFileSync(this.filePath, JSON.stringify(payload, null, 2), "utf8");
  }
}
