import assert from "node:assert/strict";
import test from "node:test";
import {
  getPocoDefaults,
  isPocoX6ProUserAgent,
  pocoMaxTokens,
} from "../poco-performance.js";

test("recognizes POCO X6 Pro model identifiers", () => {
  assert.equal(isPocoX6ProUserAgent("Mozilla/5.0 Android 14 2311DRK48G"), true);
  assert.equal(isPocoX6ProUserAgent("Mozilla/5.0 Android 14 POCO X6 Pro"), true);
  assert.equal(isPocoX6ProUserAgent("Mozilla/5.0 Android 14 Pixel 8"), false);
});

test("returns a conservative fast POCO profile", () => {
  assert.deepEqual(getPocoDefaults(), {
    modelKey: "fast",
    context: "1536",
    thinking: false,
    runtime: "worker",
    tuningPreset: "speed",
    autoRelease: false,
  });
});

test("caps POCO output without making short answers impossible", () => {
  assert.equal(pocoMaxTokens("fast", false, 900), 560);
  assert.equal(pocoMaxTokens("fast", true, 900), 280);
  assert.equal(pocoMaxTokens("lite", false, 900), 320);
  assert.equal(pocoMaxTokens("unknown", false, 900), 420);
});
