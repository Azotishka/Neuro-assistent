import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("Android bridge keeps the POCO profile automatic", () => {
  const bridge = read("native-bridge.js");
  assert.match(bridge, /2311drk48/);
  assert.match(bridge, /poco-x6-pro/);
  assert.match(bridge, /setItem\("qwen:selected",\s*"fast"\)/);
  const shell = read("neuro-shell.js");
  assert.match(shell, /setBackgroundState/);
  assert.match(shell, /Фоновый режим включён/);
});
