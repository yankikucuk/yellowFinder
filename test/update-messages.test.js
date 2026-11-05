import { test } from "node:test";
import assert from "node:assert/strict";
import { describeUpdateError } from "../src/main/update-messages.js";

test("a missing release reads as no update available", () => {
  assert.match(describeUpdateError(new Error("HttpError: 404 Not Found")), /yayınlanmış bir güncelleme bulunamadı/);
  assert.match(describeUpdateError(new Error("Unable to find latest version on GitHub")), /yayınlanmış bir güncelleme bulunamadı/);
});

test("network failures point at the connection", () => {
  assert.match(describeUpdateError(new Error("getaddrinfo ENOTFOUND github.com")), /İnternet bağlantınızı/);
  assert.match(describeUpdateError(new Error("net::ERR_INTERNET_DISCONNECTED")), /İnternet bağlantınızı/);
});

test("anything else gets a calm generic message without the raw text", () => {
  const message = describeUpdateError(new Error("ZIP file not provided: something internal"));
  assert.match(message, /bir sorun oluştu/);
  assert.doesNotMatch(message, /ZIP/);
});
