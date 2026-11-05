/**
 * Runs one full scan: for every selected category and city it reads the
 * newest result pages, opens each listing that was not visited before, keeps
 * the owner listings together with their phone numbers and skips the rest.
 *
 * Progress is reported through an event callback so the renderer can show a
 * live log. A scan can be cancelled between page loads. When the site asks
 * for a login or a verification the scan stops and reports it in the
 * returned summary, so the caller can hold automatic scans until the user
 * has dealt with the page.
 *
 * @module main/scanner/listing-scanner
 */

import { buildSearchUrl, absoluteListingUrl, listingIdFromUrl, isSiteUrl, PAGE_SIZE } from "../../shared/search-url.js";
import { classifySeller, collectPhones } from "./listing-classifier.js";
import { searchPairs } from "../storage/settings-store.js";

/**
 * @typedef {object} ScanEvent
 * @property {"info" | "warning" | "error" | "blocked" | "found" | "done"} level Event kind.
 * @property {string} message Human readable message (Turkish, shown to the user).
 * @property {object} [data] Optional payload such as the listing record.
 */

/**
 * @typedef {object} ScanSummary
 * @property {number} newListings Owner listings kept during this scan.
 * @property {number} visited Detail pages opened.
 * @property {boolean} stoppedByBlock True when the site asked for user interaction.
 * @property {boolean} cancelled True when the user stopped the scan.
 */

/**
 * Waits a random time between the two bounds so page loads are spread out.
 *
 * @param {number} minSeconds Lower bound.
 * @param {number} maxSeconds Upper bound.
 * @returns {Promise<void>} Resolves after the pause.
 */
function randomPause(minSeconds, maxSeconds) {
  const seconds = minSeconds + Math.random() * Math.max(0, maxSeconds - minSeconds);
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * Resolves the listing id of a result row: the row attribute first, the
 * detail link as fallback.
 *
 * @param {{id: string, href: string}} row Result row.
 * @returns {string | null} Listing id, or null when neither source has one.
 */
function listingIdOfRow(row) {
  return row.id || listingIdFromUrl(absoluteListingUrl(row.href));
}

/**
 * Keeps one row per listing id, in page order, dropping rows without an id
 * and rows whose link leaves the site. Result pages repeat showcase rows,
 * and injected content could point elsewhere.
 *
 * @param {Array<{id: string, href: string}>} rows Rows as read from the page.
 * @returns {Array<{row: object, id: string, url: string}>} Unique, on-site rows.
 */
function uniqueSiteRows(rows) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const id = listingIdOfRow(row);
    const url = absoluteListingUrl(row.href);
    if (!id || seen.has(id) || !isSiteUrl(url)) {
      continue;
    }
    seen.add(id);
    unique.push({ row, id, url });
  }
  return unique;
}

/**
 * Orchestrates scans over a {@link SiteSession}.
 */
export class ListingScanner {
  /**
   * @param {object} dependencies Collaborators.
   * @param {import("./site-session.js").SiteSession} dependencies.session Site window wrapper.
   * @param {import("../storage/results-store.js").ResultsStore} dependencies.results Listing store.
   * @param {(event: ScanEvent) => void} dependencies.onEvent Progress sink.
   */
  constructor({ session, results, onEvent }) {
    this.session = session;
    this.results = results;
    this.onEvent = onEvent;
    this.running = false;
    this.cancelRequested = false;
  }

  /** Asks a running scan to stop after the current page. */
  cancel() {
    if (this.running) {
      this.cancelRequested = true;
    }
  }

  /**
   * Runs a scan with the given settings. Resolves when it finished, was
   * cancelled, or had to stop because the site asked for user interaction.
   *
   * @param {import("../storage/settings-store.js").Settings} settings Current settings.
   * @returns {Promise<ScanSummary>} Summary.
   */
  async run(settings) {
    if (this.running) {
      throw new Error("A scan is already running");
    }
    this.running = true;
    this.cancelRequested = false;
    /** @type {ScanSummary} */
    const summary = { newListings: 0, visited: 0, stoppedByBlock: false, cancelled: false };
    try {
      const pairs = searchPairs(settings);
      if (pairs.length === 0) {
        this.onEvent({ level: "warning", message: "Etkin bir arama profili yok. Soldan bir profil açın ve kategori ile şehir seçin." });
      }
      for (const { categorySlug, citySlug } of pairs) {
        const outcome = await this.#scanSearch({ categorySlug, citySlug, settings, summary });
        if (outcome === "stop") {
          return summary;
        }
      }
      this.onEvent({
        level: "done",
        message: `Tarama bitti: ${summary.visited} ilan incelendi, ${summary.newListings} yeni sahibinden ilanı bulundu.`
      });
      return summary;
    } finally {
      this.running = false;
      this.session.release();
    }
  }

  /**
   * Checks for a cancel request and records it.
   *
   * @param {ScanSummary} summary Summary to update.
   * @returns {boolean} True when the scan must stop.
   */
  #cancelled(summary) {
    if (!this.cancelRequested) {
      return false;
    }
    summary.cancelled = true;
    this.onEvent({ level: "info", message: "Tarama kullanıcı isteğiyle durduruldu." });
    return true;
  }

  /**
   * Scans the result pages for one category and city.
   *
   * @returns {Promise<"continue" | "stop">} Whether the outer loop may go on.
   */
  async #scanSearch({ categorySlug, citySlug, settings, summary }) {
    for (let pageIndex = 0; pageIndex < settings.maxPagesPerSearch; pageIndex += 1) {
      if (this.#cancelled(summary)) {
        return "stop";
      }
      if (pageIndex > 0) {
        await randomPause(settings.minDelaySeconds, settings.maxDelaySeconds);
      }
      const url = buildSearchUrl({ categorySlug, citySlug, pageIndex, extraQuery: settings.extraQuery });
      this.onEvent({ level: "info", message: `Liste açılıyor: ${categorySlug} / ${citySlug} / sayfa ${pageIndex + 1}` });
      const page = await this.#openPage(url, () => this.session.readSearchRows());
      if (page === "blocked") {
        summary.stoppedByBlock = true;
        return "stop";
      }
      if (page === null) {
        continue;
      }
      const { rows, rowSelectorUsed } = page;
      if (rows.length === 0) {
        this.onEvent({
          level: "warning",
          message: `Bu sayfada ilan satırı bulunamadı (${rowSelectorUsed || "seçici eşleşmedi"}). Site yapısı değişmiş olabilir.`
        });
        break;
      }
      const candidates = uniqueSiteRows(rows).filter((candidate) => !this.results.shouldSkip(candidate.id));
      this.onEvent({ level: "info", message: `${rows.length} ilan listelendi, ${candidates.length} tanesi yeni.` });
      for (const candidate of candidates) {
        if (this.#cancelled(summary)) {
          return "stop";
        }
        // Re-check right before the load: the same id may have been kept on an earlier page.
        if (this.results.shouldSkip(candidate.id)) {
          continue;
        }
        await randomPause(settings.minDelaySeconds, settings.maxDelaySeconds);
        const outcome = await this.#visitListing({ ...candidate, categorySlug, citySlug, summary });
        if (outcome === "stop") {
          summary.stoppedByBlock = true;
          return "stop";
        }
      }
      if (rows.length < PAGE_SIZE) {
        break;
      }
    }
    return "continue";
  }

  /**
   * Opens one listing and records it when it is an owner listing.
   *
   * @returns {Promise<"continue" | "stop">} Whether scanning may go on.
   */
  async #visitListing({ row, id, url, categorySlug, citySlug, summary }) {
    const detail = await this.#openPage(url, () => this.session.readDetail());
    if (detail === "blocked") {
      return "stop";
    }
    if (detail === null) {
      return "continue";
    }
    summary.visited += 1;
    const seller = classifySeller(detail);
    if (seller === "agency") {
      this.results.markSkipped(id, "agency");
      this.onEvent({ level: "info", message: `Emlakçı ilanı atlandı: ${row.title}` });
      return "continue";
    }
    const phones = collectPhones(detail);
    if (phones.length === 0) {
      this.results.markSkipped(id, "no-phone");
      this.onEvent({
        level: "warning",
        message: `Telefon bulunamadı (${seller === "unknown" ? "satıcı türü belirsiz" : "sahibinden"}): ${row.title}. Giriş yapılmamış olabilir; birkaç gün sonra yeniden denenecek.`
      });
      return "continue";
    }
    const record = {
      id,
      url,
      title: detail.title || row.title,
      price: row.price,
      location: row.location,
      categorySlug,
      citySlug,
      sellerKind: seller,
      phones,
      seenAt: new Date().toISOString()
    };
    this.results.upsert(record);
    summary.newListings += 1;
    this.onEvent({ level: "found", message: `Bulundu: ${record.title} · ${phones.join(", ")}`, data: record });
    return "continue";
  }

  /**
   * Navigates to a page and reads it. Load failures and script failures
   * become warnings; a blocking page becomes a "blocked" event.
   *
   * @template T
   * @param {string} url Page to open.
   * @param {() => Promise<T>} read Reader to run once the page is up.
   * @returns {Promise<T | "blocked" | null>} The data, "blocked", or null when the page could not be read.
   */
  async #openPage(url, read) {
    let verdict;
    try {
      verdict = await this.session.navigate(url);
    } catch (error) {
      this.onEvent({ level: "error", message: `Sayfa yüklenemedi: ${url} (${error.message})` });
      return null;
    }
    if (verdict.blocked) {
      this.session.showToUser();
      this.onEvent({
        level: "blocked",
        message: `Site giriş veya doğrulama istiyor (${verdict.reason}). Açılan pencerede tamamlayıp "Şimdi tara" ile devam edin; otomatik tarama o zamana kadar bekler.`
      });
      return "blocked";
    }
    try {
      return await read();
    } catch (error) {
      this.onEvent({ level: "warning", message: `Sayfa okunamadı: ${url} (${error.message})` });
      return null;
    }
  }
}
