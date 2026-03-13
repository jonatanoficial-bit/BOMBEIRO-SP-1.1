/* sw.js - Bombeiro SP (PWA Offline Completo) */
const CACHE_V301_FIX_NAME = "bombeiro-cache-2026-03-12-2105";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./db.js",
  "./rules_engine.js",
  "./rules_sp_base.js",
  "./rules_sp_oficial.js",
  "./rules_rj_base.js",
  "./rules_rj_oficial.js",
  "./sp_tables.js",
  "./rj_tables.js",
  "./manifest.json",
  "./icon.svg",
  "./cover.svg",
  "./assets/intro.mp4",
  "./src/main.js",
  "./src/config/build.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_V301_FIX_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_V301_FIX_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const req = event.request;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_V301_FIX_NAME).then((cache) => cache.put(req, clone));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
