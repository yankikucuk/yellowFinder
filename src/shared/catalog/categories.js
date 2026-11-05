/**
 * Real estate categories offered by sahibinden.com, as URL slugs.
 *
 * The list covers the common "emlak" categories. The slugs mirror the first
 * path segment of a sahibinden.com search URL (for example
 * `https://www.sahibinden.com/satilik-daire/istanbul`). Anything missing can
 * be added here without touching the scanner.
 *
 * @module shared/catalog/categories
 */

/**
 * @typedef {object} Category
 * @property {string} slug URL segment used by sahibinden.com.
 * @property {string} label Human readable category name (Turkish, as on the site).
 * @property {string} group Group label used to organise the picker.
 */

/** @type {Category[]} */
export const CATEGORIES = [
  { slug: "satilik-daire", label: "Satılık Daire", group: "Konut" },
  { slug: "kiralik-daire", label: "Kiralık Daire", group: "Konut" },
  { slug: "satilik-residence", label: "Satılık Residence", group: "Konut" },
  { slug: "kiralik-residence", label: "Kiralık Residence", group: "Konut" },
  { slug: "satilik-mustakil-ev", label: "Satılık Müstakil Ev", group: "Konut" },
  { slug: "kiralik-mustakil-ev", label: "Kiralık Müstakil Ev", group: "Konut" },
  { slug: "satilik-villa", label: "Satılık Villa", group: "Konut" },
  { slug: "kiralik-villa", label: "Kiralık Villa", group: "Konut" },
  { slug: "satilik-yazlik", label: "Satılık Yazlık", group: "Konut" },
  { slug: "kiralik-yazlik", label: "Kiralık Yazlık", group: "Konut" },
  { slug: "satilik-arsa", label: "Satılık Arsa", group: "Arsa" },
  { slug: "kiralik-arsa", label: "Kiralık Arsa", group: "Arsa" },
  { slug: "satilik-isyeri", label: "Satılık İş Yeri", group: "İş Yeri" },
  { slug: "kiralik-isyeri", label: "Kiralık İş Yeri", group: "İş Yeri" },
  { slug: "devren-satilik-isyeri", label: "Devren Satılık İş Yeri", group: "İş Yeri" },
  { slug: "satilik-bina", label: "Satılık Bina", group: "Bina" },
  { slug: "kiralik-bina", label: "Kiralık Bina", group: "Bina" },
  { slug: "satilik-devre-mulk", label: "Satılık Devre Mülk", group: "Devre Mülk" },
  { slug: "kiralik-devre-mulk", label: "Kiralık Devre Mülk", group: "Devre Mülk" }
];

/**
 * Looks a category up by slug.
 *
 * @param {string} slug Category slug.
 * @returns {Category | undefined} The category, if known.
 */
export function findCategory(slug) {
  return CATEGORIES.find((category) => category.slug === slug);
}
