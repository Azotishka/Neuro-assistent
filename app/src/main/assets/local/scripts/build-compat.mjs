import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFile(path.join(root, name), "utf8");
const stripImports = (source) => source.replace(/^import[^;]+;\s*$/gm, "");
const stripExports = (source) => source.replace(/^export\s+/gm, "");
const moduleBody = async (name) => stripExports(stripImports(await read(name)));
const wrap = (name, body, prelude, exports) => [
  `const __qwen_${name} = (() => {`,
  prelude || "",
  body,
  `return { ${exports.join(", ")} };`,
  "})();",
].join("\n");

const ui = await read("ui.js");
const db = await moduleBody("db.js");
const tools = await moduleBody("tools.js");
const vault = await moduleBody("vault.js");
const python = await moduleBody("python-runner.js");
const ocr = await moduleBody("ocr.js");
const markdown = await moduleBody("markdown.js");
const poco = await moduleBody("poco-performance.js");
const device = await moduleBody("device-profile.js");
const features = await moduleBody("features.js");
const app = await moduleBody("app.js");
const shell = await moduleBody("mobile-shell.js");

const output = [
  "/* Qwen Local 3.10.0 — generated classic compatibility bundle. */",
  "/* Source of truth: modular files in this package. */",
  "(() => { window.__QWEN_CLASSIC_BUNDLE__ = true; })();",
  ui,
  wrap("db", db, "", ["openLocalDB", "getAll", "getOne", "putOne", "putMany", "deleteOne", "exportDatabase", "makeId"]),
  wrap("tools", tools, "", ["convertUnits", "calculateExpression", "prettyNumber", "tryToolRoute", "formatJson", "testRegex", "parseCSV", "csvSummary", "scoreComplexity", "escapeHtml"]),
  wrap("vault", vault, "", ["deriveVaultKey", "encryptValue", "decryptValue", "createVault", "unlockVault"]),
  wrap("python_runner", python, "", ["runPython", "stopPython"]),
  wrap("ocr", ocr, "", ["recognizeImage"]),
  wrap("markdown", markdown, "", ["renderMarkdown"]),
  wrap("poco", poco, "", ["getPocoDefaults", "isPocoX6ProUserAgent", "pocoMaxTokens", "POCO_PROFILE_VERSION"]),
  wrap("device_profile", device, "const { isPocoX6ProUserAgent, pocoMaxTokens } = __qwen_poco;", ["detectDeviceProfile", "effectiveMaxTokens", "applyDeviceProfile"]),
  wrap("features", features, [
    "const { getAll, getOne, putOne, putMany, deleteOne, exportDatabase, makeId } = __qwen_db;",
    "const { tryToolRoute, calculateExpression, prettyNumber, convertUnits, formatJson, testRegex, csvSummary, scoreComplexity, escapeHtml } = __qwen_tools;",
    "const { createVault, unlockVault, encryptValue, decryptValue } = __qwen_vault;",
    "const { runPython, stopPython } = __qwen_python_runner;",
    "const { recognizeImage } = __qwen_ocr;",
  ].join("\n"), ["initAdvancedFeatures"]),
  wrap("app", app, [
    "const { openLocalDB, getAll, getOne, putOne, deleteOne, makeId } = __qwen_db;",
    "const { initAdvancedFeatures } = __qwen_features;",
    "const { detectDeviceProfile, effectiveMaxTokens, applyDeviceProfile } = __qwen_device_profile;",
    "const { getPocoDefaults } = __qwen_poco;",
    "const { renderMarkdown } = __qwen_markdown;",
  ].join("\n"), []),
  wrap("mobile_shell", shell, "const { tryToolRoute, calculateExpression, prettyNumber } = __qwen_tools;", []),
].join("\n\n");

await fs.writeFile(path.join(root, "app-compat.js"), `${output}\n`, "utf8");
