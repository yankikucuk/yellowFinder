import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchUrl, absoluteListingUrl, listingIdFromUrl } from "../src/shared/search-url.js";

test("builds the first page without an offset", () => {
  const url = new URL(buildSearchUrl({ categorySlug: "satilik-daire", citySlug: "istanbul" }));
  assert.equal(url.pathname, "/satilik-daire/istanbul");
  assert.equal(url.searchParams.get("sorting"), "date_desc");
  assert.equal(url.searchParams.get("pagingSize"), "50");
  assert.equal(url.searchParams.has("pagingOffset"), false);
});

test("adds the offset for later pages and merges the extra query", () => {
  const url = new URL(buildSearchUrl({ categorySlug: "kiralik-daire", citySlug: "izmir", pageIndex: 2, extraQuery: "?a=1&b=2" }));
  assert.equal(url.searchParams.get("pagingOffset"), "100");
  assert.equal(url.searchParams.get("a"), "1");
  assert.equal(url.searchParams.get("b"), "2");
});

test("resolves relative listing links and reads the id", () => {
  const url = absoluteListingUrl("/ilan/emlak-konut-satilik-daire-123456789/detay");
  assert.equal(url, "https://www.sahibinden.com/ilan/emlak-konut-satilik-daire-123456789/detay");
  assert.equal(listingIdFromUrl(url), "123456789");
  assert.equal(listingIdFromUrl("https://www.sahibinden.com/"), null);
});
