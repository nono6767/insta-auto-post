// オフラインでも開けるようにするしくみ（サービスワーカー）
// ネットにつながっているときは最新版を取りに行き、つながらないときは保存しておいた版を使います。
importScripts("js/bottles.js");
const CACHE = "n-undou-bin-v4";
const FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/character.js",
  "js/app.js",
  "img/n.png",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/bottles.js",
  ...BOTTLES.flatMap((b) => [`bottles/${b.id}.png`, `bottles/${b.id}-mask.png`]),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
