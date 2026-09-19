const SHELL = "qwen-local-shell-v28-poco";
const APP_ASSETS = [
  "./", "./index.html",
  "./app-compat.js?v=3.10.0", "./native-bridge.js?v=android2",
  "./styles.css?v=3.10.0", "./features.css?v=3.10.0", "./mobile-shell.css?v=3.10.0",
  "./worker.js?v=3.10.0", "./py-worker.js?v=3.10.0",
  "./manifest.webmanifest?v=3.10.0",
  "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", (event) => event.waitUntil(
  caches.open(SHELL).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting())
));

self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("qwen-local-shell-") && key !== SHELL).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      caches.open(SHELL).then((cache) => cache.put(request, response.clone())).catch(() => {});
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstVersioned(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    caches.open(SHELL).then((cache) => cache.put(request, response.clone())).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fresh = fetch(request).then((response) => {
    if (response.ok || response.type === "opaque") caches.open(SHELL).then((cache) => cache.put(request, response.clone())).catch(() => {});
    return response;
  }).catch(() => null);
  if (cached) return cached;
  const response = await fresh;
  if (response) return response;
  throw new Error("offline");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const webllmModule = url.hostname === "esm.run" && ["script", "worker"].includes(event.request.destination);
  // Multi-GB model weights, Pyodide packages and OCR language data are deliberately not duplicated into the app-shell cache.
  if (!sameOrigin && !webllmModule) return;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request).catch(() => caches.match("./index.html")));
    return;
  }
  // Versioned runtime assets are immutable per release: never serve an old body under a new URL.
  if (sameOrigin && url.searchParams.has("v")) {
    event.respondWith(cacheFirstVersioned(event.request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event.request));
});
