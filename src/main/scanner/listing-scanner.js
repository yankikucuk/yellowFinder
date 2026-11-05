/**
 * Runs one full scan: for every selected category and city it reads the
 * newest result pages, opens each listing that was not visited before, keeps
 * the owner listings together with their phone numbers and skips the rest.
 *
 * Progress is reported through an event callback so the renderer can show a
 * live log. A scan can be cancelled between page loads.
 *
 * @module main/scanner/listing-scanner
 */

import { buildSearchUrl, absoluteListingUrl, listingIdFromUrl, PAGE_SIZE } from "../../shared/search-url.js";
import { classifySeller, collectPhones } from "./listing-classifier.js";

/**
 * @typedef {object} ScanEvent
 * @property {"info" | "warning" | "error" | "blocked" | "found" | "done"} level Event kind.
 * @property {string} message Human readable message (Turkish, shown to the user).
 * @property {object} [data] Optional payload such as the listing record.
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
   * @returns {Promise<{newListings: number, visited: number, stoppedByBlock: boolean}>} Summary.
   */
  async run(settings) {
    if (this.running) {
      throw new Error("A scan is already running");
    }
    this.running = true;
    this.cancelRequested = false;
    const summary = { newListings: 0, visited: 0, stoppedByBlock: false };
    try {
      for (const categorySlug of settings.categories) {
        for (const citySlug of settings.cities) {
          const outcome = await this.#scanSearch({ categorySlug, citySlug, settings, summary });
          if (outcome === "stop") {
            return summary;
          }
        }
      }
      this.onEvent({
        level: "done",
        message: `Tarama bitti: ${summary.visited} ilan incelendi, ${summary.newListings} yeni sahibinden ilanı bulundu.`
      });
      return summary;
    } finally {
      this.running = false;
    }
  }

  /**
   * Scans the result pages for one category and city.
   *
   * @returns {Promise<"continue" | "stop">} Whether the outer loop may go on.
   */
  async #scanSearch({ categorySlug, citySlug, settings, summary }) {
    for (let pageIndex = 0; pageIndex < settings.maxPagesPerSearch; pageIndex += 1) {
      if (this.cancelRequested) {
        this.onEvent({ level: "info", message: "Tarama kullanıcı isteğiyle durduruldu." });
        return "stop";
      }
      const url = buildSearchUrl({ categorySlug, citySlug, pageIndex, extraQuery: settings.extraQuery });
      this.onEvent({ level: "info", message: `Liste açılıyor: ${categorySlug} / ${citySlug} / sayfa ${pageIndex + 1}` });
      const blocked = await this.#navigateOrReport(url);
      if (blocked === null) {
        continue;
      }
      if (blocked.blocked) {
        summary.stoppedByBlock = true;
        return "stop";
      }
      const { rows, rowSelectorUsed } = await this.session.readSearchRows();
      if (rows.length === 0) {
        this.onEvent({
          level: "warning",
          message: `Bu sayfada ilan satırı bulunamadı (${rowSelectorUsed || "seçici eşleşmedi"}). Site yapısı değişmiş olabilir.`
        });
        break;
      }
      const fresh = rows.filter((row) => !this.results.shouldSkip(listingIdOfRow(row) ?? ""));
      this.onEvent({ level: "info", message: `${rows.length} ilan listelendi, ${fresh.length} tanesi yeni.` });
      for (const row of fresh) {
        if (this.cancelRequested) {
          this.onEvent({ level: "info", message: "Tarama kullanıcı isteğiyle durduruldu." });
          return "stop";
        }
        await randomPause(settings.minDelaySeconds, settings.maxDelaySeconds);
        const outcome = await this.#visitListing({ row, categorySlug, citySlug, summary });
        if (outcome === "stop") {
          summary.stoppedByBlock = true;
          return "stop";
        }
      }
      if (rows.length < PAGE_SIZE) {
        break;
      }
      await randomPause(settings.minDelaySeconds, settings.maxDelaySeconds);
    }
    return "continue";
  }

  /**
   * Opens one listing and records it when it is an owner listing.
   *
   * @returns {Promise<"continue" | "stop">} Whether scanning may go on.
   */
  async #visitListing({ row, categorySlug, citySlug, summary }) {
    const url = absoluteListingUrl(row.href);
    const id = listingIdOfRow(row);
    if (!id) {
      this.onEvent({ level: "warning", message: `İlan kimliği okunamadı, atlandı: ${url}` });
      return "continue";
    }
    const blocked = await this.#navigateOrReport(url);
    if (blocked === null) {
      return "continue";
    }
    if (blocked.blocked) {
      return "stop";
    }
    summary.visited += 1;
    const detail = await this.session.readDetail();
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
   * Navigates and translates failures into events.
   *
   * @param {string} url Page to open.
   * @returns {Promise<{blocked: boolean, reason: string} | null>} Verdict, or null when the load failed.
   */
  async #navigateOrReport(url) {
    try {
      const verdict = await this.session.navigate(url);
      if (verdict.blocked) {
        this.session.showToUser();
        this.onEvent({
          level: "blocked",
          message: `Site giriş veya doğrulama istiyor (${verdict.reason}). Açılan pencerede tamamlayıp taramayı yeniden başlatın.`
        });
      }
      return verdict;
    } catch (error) {
      this.onEvent({ level: "error", message: `Sayfa yüklenemedi: ${url} (${error.message})` });
      return null;
    }
  }
}
