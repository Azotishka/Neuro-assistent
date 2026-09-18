let worker = null;
let seq = 0;
let idleTimer = null;
const pending = new Map();
const IDLE_SHUTDOWN_MS = 75_000;

function clearIdleShutdown() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
}

function scheduleIdleShutdown() {
  clearIdleShutdown();
  idleTimer = setTimeout(() => {
    if (pending.size) return;
    worker?.terminate();
    worker = null;
    idleTimer = null;
  }, IDLE_SHUTDOWN_MS);
}

function ensureWorker() {
  clearIdleShutdown();
  if (worker) return worker;
  worker = new Worker("./py-worker.js?v=3.9.4");
  worker.onmessage = (event) => {
    const { id, ok, result, error, phase } = event.data || {};
    const item = pending.get(id);
    if (!item) return;
    if (phase) { item.onProgress?.(phase); return; }
    pending.delete(id);
    ok ? item.resolve(result) : item.reject(new Error(error || "Ошибка Python"));
    if (!pending.size) scheduleIdleShutdown();
  };
  const failWorker = (message) => {
    for (const item of pending.values()) item.reject(new Error(message || "Сбой процесса Python"));
    pending.clear();
    clearIdleShutdown();
    worker?.terminate();
    worker = null;
  };
  worker.onerror = (event) => failWorker(event.message || "Сбой процесса Python");
  worker.onmessageerror = () => failWorker("Python вернул данные, которые браузер не смог прочитать");
  return worker;
}

export function runPython(code, { onProgress } = {}) {
  clearIdleShutdown();
  const w = ensureWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    try { w.postMessage({ id, code: String(code || "") }); }
    catch (err) {
      pending.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
      if (!pending.size) scheduleIdleShutdown();
    }
  });
}

export function stopPython() {
  clearIdleShutdown();
  worker?.terminate();
  worker = null;
  for (const item of pending.values()) item.reject(new Error("Python остановлен"));
  pending.clear();
}
