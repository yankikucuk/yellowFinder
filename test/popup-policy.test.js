import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedPopup } from "../src/main/scanner/popup-policy.js";

test("site and sign-in provider pop-ups are allowed", () => {
  assert.equal(isAllowedPopup("https://secure.sahibinden.com/giris"), true);
  assert.equal(isAllowedPopup("https://accounts.google.com/o/oauth2/auth?x=1"), true);
  assert.equal(isAllowedPopup("https://appleid.apple.com/auth/authorize"), true);
  assert.equal(isAllowedPopup("https://www.facebook.com/dialog/oauth"), true);
});

test("other hosts, look-alikes and plain http stay blocked", () => {
  assert.equal(isAllowedPopup("https://reklam.example/kampanya"), false);
  assert.equal(isAllowedPopup("https://sahibinden.com.evil.example/giris"), false);
  assert.equal(isAllowedPopup("https://notsahibinden.com/"), false);
  assert.equal(isAllowedPopup("http://secure.sahibinden.com/giris"), false);
  assert.equal(isAllowedPopup("javascript:alert(1)"), false);
});
