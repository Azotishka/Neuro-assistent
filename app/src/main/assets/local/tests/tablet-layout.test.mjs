import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "mobile-shell.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
test("Neuro Studio design system is present", () => {
  assert.match(css, /NeuroAssistant DESIGN 5\.0/);
  assert.match(css, /--ns-accent/);
  assert.match(css, /--ns-radius-xl/);
  assert.match(css, /linear-gradient\(135deg,var\(--ns-accent\)/);
});
test("tablet landscape keeps the studio three-pane layout", () => {
  assert.match(css, /@media \(min-width:840px\) and \(orientation:landscape\)/);
  assert.match(css, /desktop-chat-rail/);
  assert.match(css, /tablet-tool-rail/);
  assert.match(css, /composer-wrap[\s\S]*position:fixed/);
});
test("tablet portrait has dedicated side rail", () => {
  assert.match(css, /@media \(min-width:600px\) and \(orientation:portrait\)/);
  assert.match(css, /--na-panel:228px/);
});
test("UI assets use the new 4.0 cache version", () => {
  assert.match(html, /styles\.css\?v=4\.0\.0/);
  assert.match(html, /features\.css\?v=4\.0\.0/);
  assert.match(html, /mobile-shell\.css\?v=4\.0\.0/);
  assert.match(html, /app-compat\.js\?v=4\.0\.0/);
});
