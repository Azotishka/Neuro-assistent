import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAutomation, validateAutomation, interpolate, runAutomation } from "../automation-engine.js";

test("normalizes and validates a multi-step automation", () => {
  const automation = normalizeAutomation({ name: "Daily", steps: [
    { type: "prompt", value: "Сделай {{input}}" },
    { type: "memory", value: "{{last}}" },
  ]});
  assert.equal(validateAutomation(automation).valid, true);
});

test("rejects empty automation", () => {
  assert.equal(validateAutomation(normalizeAutomation({ name: "Empty", steps: [] })).valid, false);
});

test("interpolates previous output", () => {
  assert.equal(interpolate("{{input}} -> {{last}}", { input: "A", last: "B" }), "A -> B");
});

test("runs steps sequentially", async () => {
  const events = [];
  const result = await runAutomation(
    normalizeAutomation({ name: "Flow", steps: [
      { type: "prompt", value: "one" },
      { type: "prompt", value: "two: {{last}}" },
    ]}),
    {
      prompt: async (text) => { events.push(text); return text.toUpperCase(); },
    },
    "input"
  );
  assert.deepEqual(events, ["one", "two: ONE"]);
  assert.equal(result.text, "TWO: ONE");
});
