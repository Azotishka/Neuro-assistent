import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "mobile-shell.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("tablet hub defines two-pane layout from 840dp", () => {
  assert.match(css, /@media\s*\(min-width:\s*840px\)/);
  assert.match(css, /is-tablet[^}]*desktop-chat-rail/);
  assert.match(css, /is-tablet[^}]*chat[^}]*margin-left/);
});

test("large tablet hub exposes a third tool rail", () => {
  assert.match(css, /@media\s*\(min-width:\s*1200px\)/);
  assert.match(css, /\.tablet-tool-rail/);
  assert.match(html, /id="tabletToolRail"/);
});
