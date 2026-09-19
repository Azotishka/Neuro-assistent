import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("POCO mode exposes a simple quick-start card", () => {
  assert.match(read("index.html"), /id="pocoQuickCard"/);
  assert.match(read("mobile-shell.css"), /is-poco-x6-pro/);
  assert.match(read("device-profile.js"), /isPocoX6Pro/);
});
