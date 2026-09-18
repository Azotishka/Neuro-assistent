const PYODIDE_VERSION = "314.0.6";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
let pyodide = null;
let initPromise = null;

async function init(id) {
  if (pyodide) return pyodide;
  if (!initPromise) {
    initPromise = (async () => {
      postMessage({ id, phase: "Загружаю среду Python…" });
      importScripts(`${INDEX_URL}pyodide.js`);
      pyodide = await loadPyodide({ indexURL: INDEX_URL });
      return pyodide;
    })().catch((err) => {
      // A transient CDN/init failure must not poison this worker forever.
      pyodide = null;
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

self.onmessage = async (event) => {
  const { id, code } = event.data || {};
  try {
    const py = await init(id);
    const stdout = [], stderr = [];
    py.setStdout({ batched: (s) => stdout.push(s) });
    py.setStderr({ batched: (s) => stderr.push(s) });
    postMessage({ id, phase: "Проверяю импорты…" });
    try { await py.loadPackagesFromImports(code); } catch (err) { stderr.push(`packages: ${err.message || err}`); }
    postMessage({ id, phase: "Выполняю локально…" });
    const pyValue = await py.runPythonAsync(code);
    let value = pyValue;
    try {
      if (pyValue && typeof pyValue.toJs === "function") {
        try { value = pyValue.toJs({ dict_converter: Object.fromEntries }); }
        catch { value = String(pyValue); }
      }
    } finally {
      // Destroy the ORIGINAL PyProxy, not the already converted JS value.
      try { pyValue?.destroy?.(); } catch {}
    }
    let result = { stdout: stdout.join("\n"), stderr: stderr.join("\n"), value };
    try { postMessage({ id, ok: true, result }); }
    catch {
      // Some Python values cannot be structured-cloned; preserve useful output.
      result = { ...result, value: String(value ?? "") };
      postMessage({ id, ok: true, result });
    }
  } catch (err) {
    const raw = err?.message ?? err;
    let text;
    if (typeof raw === "string") text = raw;
    else { try { text = JSON.stringify(raw); } catch { text = String(raw); } }
    postMessage({ id, ok: false, error: text || "Ошибка Python" });
  }
};
