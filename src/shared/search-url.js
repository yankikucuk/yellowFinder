/**
 * Builds sahibinden.com search URLs from the user's selection.
 *
 * The site addresses a search as `/<category>/<city>` followed by query
 * parameters. Only the parameters that are documented by public scrapers are
 * set here (sorting and paging). Any extra filter the user discovers on the
 * site, such as the "Kimden" facet, can be pasted into the settings as an
 * extra query string and is appended verbatim.
 *
 * @module shared/search-url
 */

export const SITE_ORIGIN = "https://www.sahibinden.com";

/** Login page the "Siteyi aç / giriş yap" button opens. */
export const SITE_LOGIN_URL = "https://secure.sahibinden.com/giris";

/** Listings per result page. The site accepts 20 or 50. */
export const PAGE_SIZE = 50;

/**
 * Builds the URL of one search result page.
 *
 * @param {object} options Search options.
 * @param {string} options.categorySlug Category slug, e.g. "satilik-daire".
 * @param {string} options.citySlug City slug, e.g. "istanbul".
 * @param {number} [options.pageIndex=0] Zero based page index.
 * @param {string} [options.extraQuery=""] Extra query string copied from the site, with or without a leading "?".
 * @returns {string} Absolute URL.
 */
export function buildSearchUrl({ categorySlug, citySlug, pageIndex = 0, extraQuery = "" }) {
  const url = new URL(`/${encodeURIComponent(categorySlug)}/${encodeURIComponent(citySlug)}`, SITE_ORIGIN);
  // The user's query goes first; paging and sorting are set afterwards so a
  // pagingOffset copied from the site cannot pin every page to the same one.
  const cleanedExtra = extraQuery.trim().replace(/^\?/, "");
  if (cleanedExtra.length > 0) {
    for (const [key, value] of new URLSearchParams(cleanedExtra)) {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set("sorting", "date_desc");
  url.searchParams.set("pagingSize", String(PAGE_SIZE));
  url.searchParams.delete("pagingOffset");
  if (pageIndex > 0) {
    url.searchParams.set("pagingOffset", String(pageIndex * PAGE_SIZE));
  }
  return url.toString();
}

/**
 * Turns a relative listing link found on a result page into an absolute URL.
 *
 * @param {string} href Link as found in the page.
 * @returns {string} Absolute URL on the site origin.
 */
export function absoluteListingUrl(href) {
  return new URL(href, SITE_ORIGIN).toString();
}

/**
 * Extracts the numeric listing id from a detail URL such as
 * `https://www.sahibinden.com/ilan/emlak-konut-satilik-daire-123/detay`.
 *
 * @param {string} url Listing URL.
 * @returns {string | null} The id, or null when the URL has none.
 */
export function listingIdFromUrl(url) {
  const match = /-(\d+)\/detay/.exec(url);
  return match ? match[1] : null;
}

/**
 * Tells whether a URL stays on the site. The scanner only follows links that
 * do, so injected or advertising content cannot send the logged in session
 * elsewhere.
 *
 * @param {string} url Absolute URL.
 * @returns {boolean} True when the URL is on the site origin.
 */
export function isSiteUrl(url) {
  try {
    return new URL(url).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
}
