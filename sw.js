// Офлайн-режим: файлы приложения кладутся в кэш телефона.
// Онлайн — берётся свежая версия с GitHub (так обновления приходят сами),
// без сети или при медленной сети (>3 c) — версия из кэша.
// Словарь (Google Таблица) здесь не обрабатывается: его кэширует само приложение.

const CACHE = "espanol-v1";
const FILES = ["./", "./index.html", "./manifest.json", "./icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNet = fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    fromNet.catch(() => {});
    const timeout = new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await Promise.race([fromNet, timeout]);
      if (res) return res;
    } catch (_) { /* нет сети */ }
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === "navigate" ? await cache.match("./index.html") : null);
    return cached || fromNet;
  })());
});
