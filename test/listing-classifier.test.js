import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySeller, collectPhones } from "../src/main/scanner/listing-classifier.js";

test("the Kimden attribute decides when present", () => {
  assert.equal(classifySeller({ sellerAttribute: "Sahibinden", hasStoreMarker: true }), "owner");
  assert.equal(classifySeller({ sellerAttribute: "Emlak Ofisinden", hasStoreMarker: false }), "agency");
});

test("store markers decide when the attribute is missing", () => {
  assert.equal(classifySeller({ sellerAttribute: "", hasStoreMarker: true }), "agency");
  assert.equal(classifySeller({ sellerAttribute: "", hasStoreMarker: false }), "unknown");
});

test("dedicated phone elements win over the contact text", () => {
  const phones = collectPhones({ phoneCandidates: ["0 (532) 123 45 67", "05321234567"], contactText: "0212 555 11 22" });
  assert.deepEqual(phones, ["0532 123 45 67"]);
});

test("falls back to the contact text when no phone element matched", () => {
  const phones = collectPhones({ phoneCandidates: [], contactText: "Ahmet · 0212 555 11 22" });
  assert.deepEqual(phones, ["0212 555 11 22"]);
});
