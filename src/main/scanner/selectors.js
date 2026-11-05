/**
 * Every CSS selector and text marker the scanner relies on, in one place.
 *
 * sahibinden.com changes its markup from time to time. When the scanner stops
 * finding rows or phone numbers, this is the file to adjust; nothing else
 * knows about the page structure. Each entry lists several candidates that are
 * tried in order, so a single rename on the site rarely breaks the scan.
 *
 * @module main/scanner/selectors
 */

export const SEARCH_PAGE = Object.freeze({
  /** Result rows carrying `data-id` with the listing id. */
  rows: ["tr.searchResultsItem[data-id]", "tr[data-id].searchResultsItem", "tbody.searchResultsRowClass > tr[data-id]"],
  /** Link to the detail page inside a row. */
  titleLink: ["td.searchResultsTitleValue a.classifiedTitle", "a.classifiedTitle", "a[href*='/ilan/']"],
  price: ["td.searchResultsPriceValue", ".classified-price-container"],
  location: ["td.searchResultsLocationValue"],
  /** Present on agency rows in some layouts; absent on owner rows. Used only as a hint. */
  storeHint: ["td.searchResultsStoreValue", "a.store-link", "img.store-logo"]
});

export const DETAIL_PAGE = Object.freeze({
  /** Attribute list with `<li><strong>Label</strong><span>Value</span></li>` pairs. */
  attributeList: ["ul.classifiedInfoList li", ".classifiedInfoList li", ".classified-info-list li"],
  /** Label of the attribute that says who posted the listing. */
  sellerAttributeLabel: "Kimden",
  /** Value that identifies an owner listing. */
  ownerAttributeValue: "Sahibinden",
  /** Blocks that hold the seller name and phone numbers. */
  contactBox: [
    ".classifiedUserBox",
    ".user-info-phones",
    ".classifiedUserContent",
    ".classified-user-content",
    "#classifiedUserBox",
    ".user-info-agent"
  ],
  /** Elements that only appear for agencies and stores. */
  storeMarkers: [".store-info", ".storeHeader", "a.store-link", ".user-info-store-name", ".classifiedUserBox .store-name"],
  /** Elements that hold a single phone number; `data-content` wins over text when present. */
  phoneItems: [".user-info-phones li span", ".pretty-phone-part", ".user-info-phones li", "a[href^='tel:']"]
});

/**
 * Markers that identify a page the scanner must not read through: login,
 * verification challenge, rate limiting. The scanner pauses and asks the user
 * to deal with the page in the visible window.
 */
export const BLOCKING_PAGE = Object.freeze({
  urlFragments: ["/giris", "secure.sahibinden.com/giris", "/dogrulama", "/captcha"],
  titleFragments: ["Just a moment", "Erişim Engellendi", "Access Denied", "Doğrulama"],
  bodyFragments: ["Basılı Tutun", "Press & Hold", "Press and hold", "Lütfen giriş yapın", "Üye Girişi"]
});
