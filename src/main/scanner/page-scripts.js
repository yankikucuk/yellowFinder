/**
 * JavaScript that runs inside the site's pages through
 * `webContents.executeJavaScript`. Each script is a self contained function
 * serialised with `toString()` so it can be reviewed and tested as normal code.
 *
 * The scripts only read the rendered DOM. They never click, submit or alter
 * anything on the page.
 *
 * @module main/scanner/page-scripts
 */

import { SEARCH_PAGE, DETAIL_PAGE, BLOCKING_PAGE } from "./selectors.js";

/**
 * Wraps a function and its argument into an expression string.
 *
 * @param {Function} pageFunction Function to run in the page.
 * @param {object} argument JSON serialisable argument.
 * @returns {string} Expression that calls the function with the argument.
 */
function toExpression(pageFunction, argument) {
  return `(${pageFunction.toString()})(${JSON.stringify(argument)})`;
}

/**
 * Runs inside a page and tells whether it is a login or challenge page.
 *
 * @param {{urlFragments: string[], titleFragments: string[], bodyFragments: string[]}} markers Blocking markers.
 * @returns {{blocked: boolean, reason: string}} Result.
 */
function detectBlockingPage(markers) {
  const url = window.location.href;
  const title = document.title || "";
  const bodyText = (document.body && document.body.innerText) || "";
  for (const fragment of markers.urlFragments) {
    if (url.includes(fragment)) {
      return { blocked: true, reason: `url:${fragment}` };
    }
  }
  for (const fragment of markers.titleFragments) {
    if (title.includes(fragment)) {
      return { blocked: true, reason: `title:${fragment}` };
    }
  }
  for (const fragment of markers.bodyFragments) {
    if (bodyText.includes(fragment) && bodyText.length < 4000) {
      return { blocked: true, reason: `body:${fragment}` };
    }
  }
  return { blocked: false, reason: "" };
}

/**
 * Runs inside a search result page and lists the rows.
 *
 * @param {typeof SEARCH_PAGE} selectors Search page selectors.
 * @returns {{rows: Array<{id: string, href: string, title: string, price: string, location: string, storeHint: boolean}>, rowSelectorUsed: string}} Rows found.
 */
function collectSearchRows(selectors) {
  const firstMatch = (root, candidates) => {
    for (const candidate of candidates) {
      const element = root.querySelector(candidate);
      if (element) {
        return element;
      }
    }
    return null;
  };
  const textOf = (element) => (element ? element.textContent.replace(/\s+/g, " ").trim() : "");
  let rowElements = [];
  let rowSelectorUsed = "";
  for (const candidate of selectors.rows) {
    rowElements = [...document.querySelectorAll(candidate)];
    if (rowElements.length > 0) {
      rowSelectorUsed = candidate;
      break;
    }
  }
  const rows = [];
  for (const row of rowElements) {
    const link = firstMatch(row, selectors.titleLink);
    if (!link) {
      continue;
    }
    rows.push({
      id: row.getAttribute("data-id") || "",
      href: link.getAttribute("href") || "",
      title: textOf(link),
      price: textOf(firstMatch(row, selectors.price)),
      location: textOf(firstMatch(row, selectors.location)),
      storeHint: firstMatch(row, selectors.storeHint) !== null
    });
  }
  return { rows, rowSelectorUsed };
}

/**
 * Runs inside a listing detail page and reads the seller attribute, store
 * markers and the text of the contact box.
 *
 * @param {typeof DETAIL_PAGE} selectors Detail page selectors.
 * @returns {{title: string, sellerAttribute: string, hasStoreMarker: boolean, phoneCandidates: string[], contactText: string}} Extracted data.
 */
function collectDetailData(selectors) {
  const textOf = (element) => (element ? element.textContent.replace(/\s+/g, " ").trim() : "");
  const allMatches = (candidates) => {
    for (const candidate of candidates) {
      const elements = [...document.querySelectorAll(candidate)];
      if (elements.length > 0) {
        return elements;
      }
    }
    return [];
  };

  let sellerAttribute = "";
  for (const item of allMatches(selectors.attributeList)) {
    const label = textOf(item.querySelector("strong")) || textOf(item.firstElementChild);
    if (label.replace(":", "").trim() === selectors.sellerAttributeLabel) {
      sellerAttribute = textOf(item.querySelector("span")) || textOf(item).replace(label, "").trim();
      break;
    }
  }

  const hasStoreMarker = selectors.storeMarkers.some((candidate) => document.querySelector(candidate) !== null);

  const phoneCandidates = [];
  for (const element of allMatches(selectors.phoneItems)) {
    const dataContent = element.getAttribute("data-content");
    const href = element.getAttribute("href") || "";
    phoneCandidates.push(dataContent || href.replace(/^tel:/, "") || textOf(element));
  }

  const contactText = allMatches(selectors.contactBox).map((element) => element.innerText || element.textContent).join("\n");

  return {
    title: textOf(document.querySelector("h1")) || document.title,
    sellerAttribute,
    hasStoreMarker,
    phoneCandidates,
    contactText
  };
}

export const PAGE_SCRIPTS = Object.freeze({
  detectBlockingPage: toExpression(detectBlockingPage, BLOCKING_PAGE),
  collectSearchRows: toExpression(collectSearchRows, SEARCH_PAGE),
  collectDetailData: toExpression(collectDetailData, DETAIL_PAGE)
});

/** Exported for unit tests; not used by the scanner directly. */
export const PAGE_FUNCTIONS = Object.freeze({ detectBlockingPage, collectSearchRows, collectDetailData });
