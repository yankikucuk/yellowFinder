/**
 * Pure decision logic that turns raw detail page data into a verdict.
 * Kept free of Electron so it can be unit tested.
 *
 * @module main/scanner/listing-classifier
 */

import { extractPhoneNumbers, normalisePhoneNumber } from "../../shared/phone-numbers.js";
import { DETAIL_PAGE } from "./selectors.js";

/**
 * @typedef {"owner" | "agency" | "unknown"} SellerKind
 */

/**
 * Decides who posted the listing.
 *
 * The site's own "Kimden" attribute is authoritative. When it is missing the
 * store markers decide, and when those are missing too the listing is
 * reported as unknown so the user can judge it.
 *
 * @param {{sellerAttribute: string, hasStoreMarker: boolean}} detail Raw detail data.
 * @returns {SellerKind} Verdict.
 */
export function classifySeller(detail) {
  const attribute = (detail.sellerAttribute ?? "").trim().toLocaleLowerCase("tr");
  if (attribute.length > 0) {
    return attribute === DETAIL_PAGE.ownerAttributeValue.toLocaleLowerCase("tr") ? "owner" : "agency";
  }
  if (detail.hasStoreMarker) {
    return "agency";
  }
  return "unknown";
}

/**
 * Collects the unique canonical phone numbers from the detail data, preferring
 * the dedicated phone elements and falling back to the contact box text.
 *
 * @param {{phoneCandidates: string[], contactText: string}} detail Raw detail data.
 * @returns {string[]} Canonical numbers.
 */
export function collectPhones(detail) {
  const found = new Set();
  for (const candidate of detail.phoneCandidates ?? []) {
    const canonical = normalisePhoneNumber(candidate);
    if (canonical !== null) {
      found.add(canonical);
    }
  }
  if (found.size === 0) {
    for (const canonical of extractPhoneNumbers(detail.contactText ?? "")) {
      found.add(canonical);
    }
  }
  return [...found];
}
