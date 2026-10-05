import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

function setBrowserEnv({ ua, memory, width, height, touch }) {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: ua, deviceMemory: memory, maxTouchPoints: touch },
    configurable: true
  });
  globalThis.screen = { width, height };
  globalThis.innerWidth = width;
  globalThis.innerHeight = height;
  globalThis.window = globalThis;
  globalThis.location = { search: "" };
  globalThis.matchMedia = () => ({ matches: false });
}

async function loadProfile(id) {
  const url = pathToFileURL(new URL("../device-profile.js", import.meta.url).pathname);
  return (await import(`${url}?profile-test=${id}`)).detectDeviceProfile();
}

test("Pad 7 Pro exposes high-memory tablet capabilities", async () => {
  setBrowserEnv({ ua: "Mozilla/5.0 Android Xiaomi Pad 7 Pro", memory: 8, width: 1280, height: 800, touch: 10 });
  const profile = await loadProfile("pad");
  assert.equal(profile.capabilities.tablet, true);
  assert.equal(profile.capabilities.memoryClass, "high");
  assert.equal(profile.capabilities.contextBudget, 4096);
  assert.equal(profile.capabilities.maxOutputTokens, 896);
});

test("generic tablet gets tablet capabilities without Xiaomi identity", async () => {
  setBrowserEnv({ ua: "Mozilla/5.0 Android Tablet", memory: 6, width: 1280, height: 800, touch: 10 });
  const profile = await loadProfile("generic");
  assert.equal(profile.capabilities.tablet, true);
  assert.equal(profile.capabilities.memoryClass, "standard");
  assert.equal(profile.capabilities.wideLayout, true);
});

test("phone keeps conservative capabilities", async () => {
  setBrowserEnv({ ua: "Mozilla/5.0 Android Phone", memory: 4, width: 390, height: 844, touch: 5 });
  const profile = await loadProfile("phone");
  assert.equal(profile.capabilities.tablet, false);
  assert.equal(profile.capabilities.memoryClass, "constrained");
  assert.equal(profile.capabilities.contextBudget, 2048);
});
