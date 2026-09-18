const DB_NAME = "qwen-local-db";
const DB_VERSION = 6;

const STORES = {
  chats: [["updatedAt", "updatedAt"], ["workspaceId", "workspaceId"], ["archived", "archived"], ["favorite", "favorite"]],
  memories: [["createdAt", "createdAt"], ["workspaceId", "workspaceId"]],
  documents: [["createdAt", "createdAt"], ["workspaceId", "workspaceId"]],
  assistants: [["createdAt", "createdAt"]],
  notes: [["updatedAt", "updatedAt"], ["workspaceId", "workspaceId"]],
  tasks: [["updatedAt", "updatedAt"], ["workspaceId", "workspaceId"]],
  workspaces: [["updatedAt", "updatedAt"]],
  favorites: [["createdAt", "createdAt"], ["workspaceId", "workspaceId"]],
  benchmarks: [["createdAt", "createdAt"], ["modelKey", "modelKey"]],
  revisions: [["createdAt", "createdAt"], ["chatId", "chatId"]],
  vault: [["updatedAt", "updatedAt"]],
};

let dbPromise = null;

export function openLocalDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    let blockedTimer = null;
    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      if (blockedTimer) clearTimeout(blockedTimer);
      dbPromise = null;
      reject(error instanceof Error ? error : new Error(String(error || "IndexedDB unavailable")));
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, indexes] of Object.entries(STORES)) {
        let store;
        if (!db.objectStoreNames.contains(name)) {
          store = db.createObjectStore(name, { keyPath: "id" });
        } else {
          store = request.transaction.objectStore(name);
        }
        for (const [indexName, keyPath] of indexes) {
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath);
            continue;
          }
          const index = store.index(indexName);
          if (index.keyPath !== keyPath || index.unique) {
            store.deleteIndex(indexName);
            store.createIndex(indexName, keyPath);
          }
        }
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { try { db.close(); } catch {} return; }
      settled = true;
      if (blockedTimer) clearTimeout(blockedTimer);
      // Let a future release migrate cleanly even if this tab has been open for a long time.
      db.onversionchange = () => { try { db.close(); } finally { dbPromise = null; } };
      resolve(db);
    };
    request.onerror = () => finishReject(request.error || new Error("IndexedDB unavailable"));
    request.onblocked = () => {
      console.warn("Qwen Local IndexedDB upgrade is blocked by another open tab");
      if (!blockedTimer) blockedTimer = setTimeout(() => finishReject(new Error("IndexedDB upgrade blocked by another open Qwen Local tab")), 4500);
    };
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

async function store(name, mode = "readonly") {
  const db = await openLocalDB();
  if (!db.objectStoreNames.contains(name)) throw new Error(`Unknown store: ${name}`);
  return db.transaction(name, mode).objectStore(name);
}

function transactionToPromise(tx, fallback = "IndexedDB transaction failed") {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(fallback));
    tx.onabort = () => reject(tx.error || new Error(`${fallback} (aborted)`));
  });
}

async function runWrite(name, operation) {
  const db = await openLocalDB();
  if (!db.objectStoreNames.contains(name)) throw new Error(`Unknown store: ${name}`);
  const tx = db.transaction(name, "readwrite");
  const s = tx.objectStore(name);
  let request;
  try { request = operation(s); }
  catch (err) { try { tx.abort(); } catch {} throw err; }
  const requestResult = request ? requestToPromise(request) : Promise.resolve(undefined);
  const [result] = await Promise.all([requestResult, transactionToPromise(tx)]);
  return result;
}

export async function getAll(name) {
  const s = await store(name);
  return requestToPromise(s.getAll());
}


export async function getOne(name, id) {
  const s = await store(name);
  return requestToPromise(s.get(id));
}

export async function putOne(name, value) {
  return runWrite(name, (s) => s.put(value));
}

export async function putMany(name, values) {
  if (!values?.length) return;
  const db = await openLocalDB();
  if (!db.objectStoreNames.contains(name)) throw new Error(`Unknown store: ${name}`);
  const tx = db.transaction(name, "readwrite");
  const s = tx.objectStore(name);
  try {
    for (const value of values) s.put(value);
  } catch (err) {
    try { tx.abort(); } catch {}
    throw err;
  }
  return transactionToPromise(tx, "IndexedDB bulk write failed");
}

export async function deleteOne(name, id) {
  return runWrite(name, (s) => s.delete(id));
}


export async function exportDatabase() {
  const result = {};
  for (const name of Object.keys(STORES)) result[name] = await getAll(name);
  return result;
}

export function makeId(prefix = "item") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
