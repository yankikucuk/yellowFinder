import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INVOKE, EVENTS } from "../src/main/ipc-channels.js";

test("the sandboxed preload lists exactly the channels of ipc-channels.js", () => {
  const preload = readFileSync(new URL("../src/preload/index.cjs", import.meta.url), "utf8");
  for (const channel of [...Object.values(INVOKE), ...Object.values(EVENTS)]) {
    assert.ok(preload.includes(`"${channel}"`), `preload is missing channel ${channel}`);
  }
  const preloadChannels = [...preload.matchAll(/"([a-z-]+:[a-z-]+)"/g)].map((match) => match[1]);
  const known = new Set([...Object.values(INVOKE), ...Object.values(EVENTS)]);
  for (const channel of preloadChannels) {
    assert.ok(known.has(channel), `preload has unknown channel ${channel}`);
  }
});
