/**
 * Runs the page scripts inside real Chromium (an offscreen Electron window)
 * against the fixture pages in test/fixtures and checks what they read.
 *
 * The fixtures follow the markup that public scrapers describe for the site;
 * a pass proves the scripts and selectors work on that markup, not that the
 * live site still uses it.
 *
 *   npm run test:dom
 */

import { app, BrowserWindow } from "electron";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PAGE_SCRIPTS } from "../../src/main/scanner/page-scripts.js";
import { classifySeller, collectPhones } from "../../src/main/scanner/listing-classifier.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

/** Each case: fixture file, script to run, checks on the result. */
const CASES = [
  {
    name: "search page lists rows with ids, links, prices and locations",
    file: "search-page.html",
    script: PAGE_SCRIPTS.collectSearchRows,
    check(result) {
      assert.equal(result.rows.length, 5);
      assert.equal(result.rowSelectorUsed, "tr.searchResultsItem[data-id]");
      assert.deepEqual(result.rows[0], {
        id: "100000001",
        href: "/ilan/emlak-konut-satilik-daire-100000001/detay",
        title: "Göztepe'de 3+1 daire",
        price: "12.500.000 TL",
        location: "Kadıköy Göztepe"
      });
    }
  },
  {
    name: "owner detail page yields owner and both phones",
    file: "detail-owner.html",
    script: PAGE_SCRIPTS.collectDetailData,
    check(result) {
      assert.equal(result.sellerAttribute, "Sahibinden");
      assert.equal(classifySeller(result), "owner");
      assert.deepEqual(collectPhones(result), ["0532 123 45 67", "0212 555 11 22"]);
    }
  },
  {
    name: "agency detail page is classified as agency",
    file: "detail-agency.html",
    script: PAGE_SCRIPTS.collectDetailData,
    check(result) {
      assert.equal(classifySeller(result), "agency");
    }
  },
  {
    name: "owner page without a visible phone yields no phones",
    file: "detail-no-phone.html",
    script: PAGE_SCRIPTS.collectDetailData,
    check(result) {
      assert.equal(classifySeller(result), "owner");
      assert.deepEqual(collectPhones(result), []);
    }
  },
  {
    name: "login page is detected as blocking",
    file: "login-page.html",
    script: PAGE_SCRIPTS.detectBlockingPage,
    check(result) {
      assert.equal(result.blocked, true);
    }
  },
  {
    name: "a normal page is not detected as blocking",
    file: "detail-owner.html",
    script: PAGE_SCRIPTS.detectBlockingPage,
    check(result) {
      assert.equal(result.blocked, false);
    }
  }
];

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  let failures = 0;
  for (const testCase of CASES) {
    try {
      await window.loadFile(join(fixtures, testCase.file));
      const result = await window.webContents.executeJavaScript(testCase.script, true);
      testCase.check(result);
      process.stdout.write(`ok   ${testCase.name}\n`);
    } catch (error) {
      failures += 1;
      process.stdout.write(`FAIL ${testCase.name}\n     ${error.message.split("\n").join("\n     ")}\n`);
    }
  }
  window.destroy();
  process.stdout.write(`${CASES.length - failures}/${CASES.length} passed\n`);
  app.exit(failures === 0 ? 0 : 1);
});
