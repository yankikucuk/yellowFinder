/**
 * SQLite backed store for everything the scanner learned about listings.
 *
 * Two tables live in `userData/results.sqlite`:
 *
 * - `listings`: owner listings that were kept, with their phone numbers.
 * - `visits`: every listing id the scanner opened, with the outcome, the
 *   time and, for outcomes worth a second look, the time after which the
 *   listing may be opened again.
 *
 * The store answers one question for the scanner: should this listing id be
 * skipped right now? Agency listings are skipped for good, kept listings
 * too; listings that had no visible phone number are retried after a few
 * days because the usual cause is a session that was not logged in. Visit
 * rows older than a retention window are purged on open so the file does
 * not grow without bound.
 *
 * Node's built in `node:sqlite` is used, so no native module has to be
 * compiled per platform. See docs/adr/0004-sqlite-store.md.
 *
 * @module main/results-store
 */

import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, renameSync } from "node:fs";

/**
 * @typedef {object} ListingRecord
 * @property {string} id Numeric listing id as a string.
 * @property {string} url Detail page URL.
 * @property {string} title Listing title.
 * @property {string} price Price text as shown on the site.
 * @property {string} location Location text as shown on the site.
 * @property {string} categorySlug Category the listing was found in.
 * @property {string} citySlug City the listing was found in.
 * @property {"owner" | "unknown"} sellerKind Seller verdict at the time of the visit.
 * @property {string[]} phones Canonical phone numbers.
 * @property {string} seenAt ISO timestamp of the visit that kept the listing.
 */

/**
 * @typedef {"kept" | "agency" | "no-phone"} VisitOutcome
 */

/** Default days before a listing without a visible phone number is opened again. */
const DEFAULT_RETRY_NO_PHONE_DAYS = 3;

/** Default days a visit row is remembered before it is purged. */
const DEFAULT_VISIT_RETENTION_DAYS = 180;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    price TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    category_slug TEXT NOT NULL DEFAULT '',
    city_slug TEXT NOT NULL DEFAULT '',
    seller_kind TEXT NOT NULL DEFAULT 'owner',
    phones TEXT NOT NULL DEFAULT '[]',
    seen_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    outcome TEXT NOT NULL,
    visited_at TEXT NOT NULL,
    retry_after TEXT
  );
  CREATE INDEX IF NOT EXISTS visits_visited_at ON visits (visited_at);
`;

/**
 * Adds whole days to a time and returns an ISO string.
 *
 * @param {Date} from Start time.
 * @param {number} days Days to add (may be negative).
 * @returns {string} ISO timestamp.
 */
function daysFrom(from, days) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Listing and visit store.
 */
export class ResultsStore {
  /**
   * @param {string} filePath Absolute path of the SQLite file, or ":memory:".
   * @param {object} [options] Tuning.
   * @param {number} [options.retryNoPhoneDays] Days before a "no-phone" listing is retried.
   * @param {number} [options.visitRetentionDays] Days a visit is remembered.
   * @param {() => Date} [options.now] Clock, overridable in tests.
   */
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.retryNoPhoneDays = options.retryNoPhoneDays ?? DEFAULT_RETRY_NO_PHONE_DAYS;
    this.visitRetentionDays = options.visitRetentionDays ?? DEFAULT_VISIT_RETENTION_DAYS;
    this.now = options.now ?? (() => new Date());
    this.database = new DatabaseSync(filePath);
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec(SCHEMA);
    this.#prepareStatements();
    this.purgeExpiredVisits();
  }

  /** @returns {ListingRecord[]} Kept listings, newest first. */
  all() {
    return this.statements.allListings.all().map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      price: row.price,
      location: row.location,
      categorySlug: row.category_slug,
      citySlug: row.city_slug,
      sellerKind: row.seller_kind,
      phones: JSON.parse(row.phones),
      seenAt: row.seen_at
    }));
  }

  /**
   * Tells whether the scanner should leave a listing alone right now.
   *
   * @param {string} id Listing id.
   * @returns {boolean} True for kept and agency listings, and for "no-phone" listings whose retry time has not come.
   */
  shouldSkip(id) {
    const visit = this.statements.getVisit.get(id);
    if (!visit) {
      return false;
    }
    if (visit.retry_after === null) {
      return true;
    }
    return visit.retry_after > this.now().toISOString();
  }

  /**
   * Keeps a listing and records the visit as "kept".
   *
   * @param {ListingRecord} record Listing to keep.
   */
  upsert(record) {
    const visitedAt = record.seenAt ?? this.now().toISOString();
    this.statements.upsertListing.run(
      record.id,
      record.url ?? "",
      record.title ?? "",
      record.price ?? "",
      record.location ?? "",
      record.categorySlug ?? "",
      record.citySlug ?? "",
      record.sellerKind ?? "owner",
      JSON.stringify(record.phones ?? []),
      visitedAt
    );
    this.statements.upsertVisit.run(record.id, "kept", visitedAt, null);
  }

  /**
   * Records a visit that did not keep the listing.
   *
   * @param {string} id Listing id.
   * @param {"agency" | "no-phone"} outcome Why the listing was not kept.
   */
  markSkipped(id, outcome) {
    const visitedAt = this.now();
    const retryAfter = outcome === "no-phone" ? daysFrom(visitedAt, this.retryNoPhoneDays) : null;
    this.statements.upsertVisit.run(id, outcome, visitedAt.toISOString(), retryAfter);
  }

  /**
   * Deletes visit rows older than the retention window. Kept listings are
   * never purged; their visit row goes with them when the user clears.
   *
   * @returns {number} Rows removed.
   */
  purgeExpiredVisits() {
    const cutoff = daysFrom(this.now(), -this.visitRetentionDays);
    return Number(this.statements.purgeVisits.run(cutoff).changes);
  }

  /** Removes every listing and every visit. */
  clear() {
    this.database.exec("DELETE FROM listings; DELETE FROM visits;");
  }

  /**
   * Imports the JSON file written by version 0.1.0 and renames it so
   * the import runs once. Kept listings become "kept" visits; the old
   * undifferentiated skip list becomes "no-phone" visits that are retried,
   * because the old file did not record why a listing was skipped.
   *
   * @param {string} legacyJsonPath Path of the old results.json.
   * @returns {number} Listings imported.
   */
  importLegacyJson(legacyJsonPath) {
    if (!existsSync(legacyJsonPath)) {
      return 0;
    }
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(legacyJsonPath, "utf8"));
    } catch {
      parsed = null;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      renameSync(legacyJsonPath, `${legacyJsonPath}.unreadable`);
      return 0;
    }
    const records = Array.isArray(parsed.records) ? parsed.records.filter((record) => record && typeof record.id === "string") : [];
    const skippedIds = Array.isArray(parsed.skippedIds) ? parsed.skippedIds.filter((id) => typeof id === "string") : [];
    this.database.exec("BEGIN");
    try {
      for (const record of records) {
        this.upsert(record);
      }
      for (const id of skippedIds) {
        this.markSkipped(id, "no-phone");
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    const imported = records.length;
    renameSync(legacyJsonPath, `${legacyJsonPath}.imported`);
    return imported;
  }

  /** Closes the database file. */
  close() {
    this.database.close();
  }

  #prepareStatements() {
    this.statements = {
      allListings: this.database.prepare("SELECT * FROM listings ORDER BY seen_at DESC"),
      getVisit: this.database.prepare("SELECT outcome, retry_after FROM visits WHERE id = ?"),
      upsertListing: this.database.prepare(`
        INSERT INTO listings (id, url, title, price, location, category_slug, city_slug, seller_kind, phones, seen_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          url = excluded.url, title = excluded.title, price = excluded.price, location = excluded.location,
          category_slug = excluded.category_slug, city_slug = excluded.city_slug, seller_kind = excluded.seller_kind,
          phones = excluded.phones, seen_at = excluded.seen_at
      `),
      upsertVisit: this.database.prepare(`
        INSERT INTO visits (id, outcome, visited_at, retry_after) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET outcome = excluded.outcome, visited_at = excluded.visited_at, retry_after = excluded.retry_after
      `),
      purgeVisits: this.database.prepare("DELETE FROM visits WHERE outcome != 'kept' AND visited_at < ?")
    };
  }
}
