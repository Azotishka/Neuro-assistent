import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../webmcp.js");
const script = fs.readFileSync(file, "utf8");

function harness({ documentContext = undefined, navigatorContext = undefined } = {}) {
  const events = new Map();
  const registered = [];
  const ctx = documentContext ?? { registerTool(tool) { registered.push(tool); } };
  const core = {
    getSelectedKey: () => "fast",
    MODELS: { fast: { label: "Qwen3 1.7B" }, lite: { label: "SmolLM2 360M" } },
    isModelCached: key => key === "fast",
  };
  const window = {
    addEventListener: (type, callback) => events.set(type, callback),
    NeuroQwenCore: core,
    QwenMobileBridge: { getState: () => ({ loadedKey: "fast", apiKey: "SECRET", selectedKey: "fast", isGenerating: false }) },
  };
  const sandbox = {
    window,
    document: { modelContext: documentContext === null ? undefined : ctx },
    navigator: { modelContext: navigatorContext },
    console: { warn() {} },
  };
  vm.runInNewContext(script, sandbox);
  return { window, registered, fire() { events.get("qwen:app-ready")?.(); } };
}

test("registers read-only tools when app becomes ready", async () => {
  const h = harness(); h.fire();
  assert.deepEqual(h.registered.map(t => t.name), ["neuro_local_model_status", "neuro_list_local_models"]);
  assert.ok(h.registered.every(t => t.annotations?.readOnlyHint === true));
  const status = await h.registered[0].execute({});
  assert.equal(status.selectedModel, "fast");
  assert.equal(status.modelLoaded, true);
  assert.equal(status.apiKey, undefined);
  const models = await h.registered[1].execute({});
  assert.equal(models.length, 2);
  assert.equal(models[0].cached, true);
});

test("does not register twice on repeated ready events", () => {
  const h = harness(); h.fire(); h.fire();
  assert.equal(h.registered.length, 2);
});

test("unsupported browsers do not register tools", () => {
  const h = harness({ documentContext: null }); h.fire();
  assert.equal(h.registered.length, 0);
  assert.equal(h.window.NeuroWebMCP.supported, false);
});

test("supports legacy navigator modelContext when document API is missing", () => {
  const legacy = [];
  const h = harness({ documentContext: null, navigatorContext: { registerTool: tool => legacy.push(tool) } });
  h.fire(); assert.equal(legacy.length, 2);
});

test("tools do not leak personal content or credentials", async () => {
  const h = harness(); h.fire();
  const result = JSON.stringify(await Promise.all(h.registered.map(tool => tool.execute({}))));
  for (const secret of ["SECRET", "messages", "conversations", "memory", "apiKey"]) {
    assert.ok(!result.includes(secret));
  }
});
