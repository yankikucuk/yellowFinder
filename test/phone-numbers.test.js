import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPhoneNumbers, normalisePhoneNumber, isMobileNumber } from "../src/shared/phone-numbers.js";

test("normalises common Turkish spellings to one canonical form", () => {
  const expected = "0532 123 45 67";
  for (const raw of ["0 (532) 123 45 67", "+90 532 123 45 67", "05321234567", "532-123-45-67", "90 532 123 4567"]) {
    assert.equal(normalisePhoneNumber(raw), expected, raw);
  }
});

test("rejects strings that are not a single Turkish number", () => {
  assert.equal(normalisePhoneNumber("12345"), null);
  assert.equal(normalisePhoneNumber("0 800 123 45 67"), null);
  assert.equal(normalisePhoneNumber(undefined), null);
});

test("extracts unique numbers from free text in order of appearance", () => {
  const text = "Ara: 0 (532) 123 45 67 veya 0212 555 11 22. Tekrar: 05321234567.";
  assert.deepEqual(extractPhoneNumbers(text), ["0532 123 45 67", "0212 555 11 22"]);
});

test("extracts nothing from text without numbers", () => {
  assert.deepEqual(extractPhoneNumbers("Fiyat 2.500.000 TL, 120 m2, 3+1"), []);
});

test("tells mobile numbers apart", () => {
  assert.equal(isMobileNumber("0532 123 45 67"), true);
  assert.equal(isMobileNumber("0212 555 11 22"), false);
});
