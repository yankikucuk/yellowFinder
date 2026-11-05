import { test } from "node:test";
import assert from "node:assert/strict";
import { plainChromeUserAgent } from "../src/main/scanner/user-agent.js";

const DEFAULT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) yellowFinder/0.1.0 Chrome/140.0.0.0 Electron/45.2.3 Safari/537.36";

test("drops the app and Electron tokens and keeps the rest intact", () => {
  assert.equal(
    plainChromeUserAgent(DEFAULT, "yellowFinder"),
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  );
});

test("leaves a user agent without those tokens unchanged", () => {
  const plain = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
  assert.equal(plainChromeUserAgent(plain, "yellowFinder"), plain);
});
