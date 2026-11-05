import { test } from "node:test";
import assert from "node:assert/strict";
import { ListingScanner } from "../src/main/scanner/listing-scanner.js";
import { ResultsStore } from "../src/main/storage/results-store.js";

/**
 * Stand-in for SiteSession: serves canned page data by URL instead of
 * loading pages, so a whole scan can run in plain Node.
 */
class FakeSession {
  constructor(pages) {
    this.pages = pages;
    this.current = null;
    this.visited = [];
  }

  async navigate(url) {
    this.visited.push(url);
    this.current = this.pages.find((page) => url.includes(page.match));
    if (!this.current) {
      throw new Error(`no fixture for ${url}`);
    }
    return { blocked: Boolean(this.current.blocked), reason: this.current.blocked ? "fixture" : "" };
  }

  async readSearchRows() {
    return { rows: this.current.rows, rowSelectorUsed: "fixture" };
  }

  async readDetail() {
    return this.current.detail;
  }

  showToUser() {}
  release() {}
}

const row = (id, title) => ({ id, href: `/ilan/emlak-konut-satilik-daire-${id}/detay`, title, price: "1 TL", location: "Kadıköy" });

const searchPage = {
  match: "/satilik-daire/istanbul",
  rows: [row("1", "Sahibinden ilan"), row("2", "Emlakçı ilanı"), row("1", "Vitrin tekrarı"), row("3", "Telefonsuz"), { id: "9", href: "https://reklam.example/ilan/x-9/detay", title: "Dış", price: "", location: "" }]
};

const detailPages = [
  { match: "-1/detay", detail: { title: "Sahibinden ilan", sellerAttribute: "Sahibinden", hasStoreMarker: false, phoneCandidates: ["0 (532) 123 45 67"], contactText: "" } },
  { match: "-2/detay", detail: { title: "Emlakçı ilanı", sellerAttribute: "Emlak Ofisinden", hasStoreMarker: true, phoneCandidates: ["0216 444 00 00"], contactText: "" } },
  { match: "-3/detay", detail: { title: "Telefonsuz", sellerAttribute: "Sahibinden", hasStoreMarker: false, phoneCandidates: [], contactText: "Giriş yapın" } }
];

const settings = {
  profiles: [{ id: "p", name: "Test", enabled: true, categories: ["satilik-daire"], cities: ["istanbul"] }],
  maxPagesPerSearch: 1,
  extraQuery: "",
  minDelaySeconds: 0,
  maxDelaySeconds: 0
};

test("a scan keeps owner listings with phones and remembers the rest", async () => {
  const session = new FakeSession([searchPage, ...detailPages]);
  const results = new ResultsStore(":memory:");
  const events = [];
  const scanner = new ListingScanner({ session, results, onEvent: (event) => events.push(event) });

  const summary = await scanner.run(settings);

  assert.deepEqual(summary, { newListings: 1, visited: 3, stoppedByBlock: false, cancelled: false });
  const kept = results.all();
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, "1");
  assert.deepEqual(kept[0].phones, ["0532 123 45 67"]);
  assert.equal(results.shouldSkip("2"), true, "agency listing is remembered");
  assert.equal(results.shouldSkip("3"), true, "no-phone listing waits for its retry");
  assert.equal(session.visited.filter((url) => url.includes("-1/detay")).length, 1, "showcase duplicate is opened once");
  assert.equal(session.visited.some((url) => url.includes("reklam.example")), false, "off-site link is never followed");
  assert.equal(events.filter((event) => event.level === "found").length, 1);
  assert.equal(events.at(-1).level, "done");
  results.close();
});

test("a second scan opens nothing that was already decided", async () => {
  const results = new ResultsStore(":memory:");
  await new ListingScanner({ session: new FakeSession([searchPage, ...detailPages]), results, onEvent: () => {} }).run(settings);

  const second = new FakeSession([searchPage, ...detailPages]);
  const summary = await new ListingScanner({ session: second, results, onEvent: () => {} }).run(settings);

  assert.equal(summary.visited, 0);
  assert.deepEqual(second.visited.filter((url) => url.includes("/detay")), []);
  results.close();
});

test("a blocking page stops the scan and reports it", async () => {
  const session = new FakeSession([{ ...searchPage, blocked: true }]);
  const results = new ResultsStore(":memory:");
  const events = [];
  const summary = await new ListingScanner({ session, results, onEvent: (event) => events.push(event) }).run(settings);

  assert.equal(summary.stoppedByBlock, true);
  assert.equal(events.some((event) => event.level === "blocked"), true);
  assert.equal(results.all().length, 0);
  results.close();
});
