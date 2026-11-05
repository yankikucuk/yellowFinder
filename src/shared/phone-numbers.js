/**
 * Phone number extraction and normalisation for Turkish numbers.
 *
 * Listing pages render phone numbers in many shapes: "0 (532) 123 45 67",
 * "+90 532 123 45 67", "05321234567". All of them are reduced to the single
 * canonical form "0532 123 45 67" so that the same number is never listed
 * twice and exports stay tidy.
 *
 * @module shared/phone-numbers
 */

/**
 * Matches Turkish mobile (5xx) and landline (2xx, 3xx, 4xx) numbers written
 * with an optional country code and arbitrary spacing, dashes or brackets.
 * The pattern is deliberately loose because the page markup is not under our
 * control; false positives are filtered by {@link normalisePhoneNumber}.
 */
const PHONE_PATTERN =
  /(?:\+?90[\s-]*)?\(?0?\)?[\s-]*\(?([2-5]\d{2})\)?[\s-]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})(?!\d)/g;

/**
 * Converts one matched number into the canonical "0XXX XXX XX XX" form.
 *
 * @param {string} areaCode Three digit area or operator code (without the leading 0).
 * @param {string} firstBlock Three digits.
 * @param {string} secondBlock Two digits.
 * @param {string} thirdBlock Two digits.
 * @returns {string} Canonical phone number.
 */
function formatCanonical(areaCode, firstBlock, secondBlock, thirdBlock) {
  return `0${areaCode} ${firstBlock} ${secondBlock} ${thirdBlock}`;
}

/**
 * Normalises a single phone number string. Returns null when the input does
 * not contain exactly one well formed Turkish number.
 *
 * @param {string} raw Any string that is expected to hold one phone number.
 * @returns {string | null} Canonical number or null.
 */
export function normalisePhoneNumber(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const digits = raw.replace(/\D/g, "");
  let national = digits;
  if (national.startsWith("90") && national.length === 12) {
    national = national.slice(2);
  }
  if (national.startsWith("0") && national.length === 11) {
    national = national.slice(1);
  }
  if (national.length !== 10 || !/^[2-5]/.test(national)) {
    return null;
  }
  return formatCanonical(
    national.slice(0, 3),
    national.slice(3, 6),
    national.slice(6, 8),
    national.slice(8, 10)
  );
}

/**
 * Finds every Turkish phone number in a block of text and returns the unique
 * canonical numbers in order of first appearance.
 *
 * @param {string} text Free text, typically the inner text of a contact box.
 * @returns {string[]} Unique canonical phone numbers.
 */
export function extractPhoneNumbers(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }
  const found = new Set();
  for (const match of text.matchAll(PHONE_PATTERN)) {
    const canonical = normalisePhoneNumber(match[0]);
    if (canonical !== null) {
      found.add(canonical);
    }
  }
  return [...found];
}

