import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "mobile-shell.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const device = fs.readFileSync(path.join(root, "device-profile.js"), "utf8");

test("tablet landscape has three-pane workspace", () => {
  assert.match(css, /@media\s*\(min-width:\s*840px\)\s*and\s*\(orientation:\s*landscape\)/);
  assert.match(css, /--na-panel/);
  assert.match(css, /desktop-chat-rail[\s\S]*tablet-tool-rail/);
  assert.match(css, /composer-wrap[\s\S]*position:fixed/);
});
test("tablet portrait keeps a dedicated chat rail", () => {
  assert.match(css, /@media\s*\(min-width:\s*600px\)\s*and\s*\(orientation:\s*portrait\)/);
  assert.match(css, /--na-panel:\s*224px/);
  assert.match(css, /tablet-tool-rail\s*\{\s*display:none/);
});
test("tablet rendering uses containment and reduced compositing", () => {
  assert.match(css, /content-visibility:auto/);
  assert.match(css, /contain:\s*layout paint style/);
  assert.match(css, /backdrop-filter:none/);
});
test("tablet profile has conservative memory/performance budgets", () => {
  assert.match(device, /performanceMode/);
  assert.match(device, /high.*tablet-balanced/);
  assert.match(device, /maxOutputTokens/);
});
test("UI assets are cache-busted to 3.15", () => {
  assert.match(html, /styles\.css\?v=3\.15\.0/);
  assert.match(html, /mobile-shell\.css\?v=3\.15\.0/);
  assert.match(html, /app-compat\.js\?v=3\.15\.0/);
});
