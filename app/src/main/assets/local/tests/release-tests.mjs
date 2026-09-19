import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("classic bundle is generated from the POCO source", () => {
  const index = read("index.html");
  const bundle = read("app-compat.js");
  assert.match(index, /app-compat\.js\?v=3\.10\.0/);
  assert.match(index, /neuro-shell\.js\?v=0\.11\.0/);
  assert.match(bundle, /__qwen_poco/);
  assert.match(bundle, /pocoSpeedPresetBtn/);
  assert.match(bundle, /powerPreference:\s*["']high-performance["']/);
  assert.match(bundle, /window\.NeuroQwenCore\s*=\s*coreApi/);
});

test("key web assets parse as JavaScript", () => {
  for (const file of ["app.js", "app-compat.js", "native-bridge.js", "device-profile.js", "poco-performance.js"]) {
    execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "pipe" });
  }
});

test("service worker points at the current release assets", () => {
  assert.match(read("sw.js"), /qwen-local-shell-v28-poco/);
  assert.match(read("sw.js"), /app-compat\.js\?v=3\.10\.0/);
});

test("Android live controls have a background animation and audio settings", () => {
  const shell = read("neuro-shell.js");
  assert.match(shell, /neuroLiveCard/);
  assert.match(shell, /neuroVolume/);
  assert.match(shell, /saveAudioSettings/);
});
