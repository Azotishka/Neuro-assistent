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


test("landscape tablet uses a dedicated three-pane workspace", () => {
  assert.match(css, /@media\s*\(min-width:\s*840px\)\s*and\s*\(orientation:\s*landscape\)/);
  assert.match(css, /--tablet-left:\s*248px/);
  assert.match(css, /--tablet-right:\s*232px/);
  assert.match(css, /desktop-chat-rail[\s\S]*tablet-tool-rail/);
  assert.match(css, /mobile-nav.*display:\s*none\s*!important/);
  assert.match(css, /composer-wrap[\s\S]*width:\s*min\(calc\(100vw - var\(--tablet-left\)/);
});


test("landscape tablet override does not depend on runtime device class", () => {
  const css = read("mobile-shell.css");
  assert.match(css, /FINAL TABLET OVERRIDE 3\.14/);
  assert.match(css, /@media \(min-width:840px\) and \(orientation:landscape\)/);
  assert.match(css, /html \.desktop-chat-rail/);
  assert.match(css, /html \.tablet-tool-rail/);
});
test("shell cache-busts UI assets", () => {
  const html = read("index.html");
  assert.match(html, /styles\.css\?v=3\.14\.0/);
  assert.match(html, /mobile-shell\.css\?v=3\.14\.0/);
});
