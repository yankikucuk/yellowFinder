import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { ScanScheduler } from "../src/main/scheduler.js";

test("reconfiguring during a scan does not leave two timers armed", async () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  let releaseScan;
  const runScan = mock.fn(() => new Promise((resolve) => { releaseScan = resolve; }));
  const scheduler = new ScanScheduler(runScan);
  scheduler.configure({ autoScan: true, intervalMinutes: 15 });

  mock.timers.tick(15 * 60 * 1000);
  assert.equal(runScan.mock.callCount(), 1, "first tick starts a scan");

  scheduler.configure({ autoScan: true, intervalMinutes: 15 });
  releaseScan();
  await Promise.resolve();
  await Promise.resolve();

  mock.timers.tick(15 * 60 * 1000);
  assert.equal(runScan.mock.callCount(), 2, "exactly one timer fires per interval");
  scheduler.stop();
  mock.timers.reset();
});

test("stopping clears the next run", () => {
  const scheduler = new ScanScheduler(async () => {});
  scheduler.configure({ autoScan: true, intervalMinutes: 60 });
  assert.notEqual(scheduler.getNextRunAt(), null);
  scheduler.stop();
  assert.equal(scheduler.getNextRunAt(), null);
  scheduler.configure({ autoScan: false, intervalMinutes: 60 });
  assert.equal(scheduler.getNextRunAt(), null);
});
