import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGE_SCRIPTS } from "../src/main/scanner/page-scripts.js";

test("page scripts are self contained expressions", () => {
  for (const [name, script] of Object.entries(PAGE_SCRIPTS)) {
    assert.ok(script.startsWith("(function"), `${name} should be a function expression`);
    assert.ok(script.endsWith(")"), `${name} should be called`);
    assert.doesNotThrow(() => new Function(`return ${script.slice(0, script.lastIndexOf(")(") + 1)}`), name);
  }
});
