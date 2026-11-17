// オフラインでも開けるようにするしくみ（サービスワーカー）
// ネットにつながっているときは最新版を取りに行き、つながらないときは保存しておいた版を使います。
importScripts("js/bottles.js");
const CACHE = "n-app-cache-v12";
const FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/character.js",
  "js/app.js",
  "js/meals.js",
  "js/body.js",
  "js/clothes.js",
  "js/savings.js",
  "js/backup.js",
  "img/n.webp",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/bottles.js",
  ...BOTTLES.flatMap((b) => [`bottles/${b.id}.webp`, `bottles/${b.id}-mask.webp`]),
];

self.addEventListener("install", (event) => {
  // ブラウザに残っている古いファイルを使わず、必ず最新をダウンロードして保存する
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // 同じサイトのほかのアプリのキャッシュは消さない（このアプリの古い版だけ消す）
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && (k.startsWith("n-app-cache-") || k.startsWith("n-undou-bin-")))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // 「no-cache」：毎回サーバーに最新か確認する（新旧のファイルが混ざらないように）
  const fresh = new Request(req.url, { cache: "no-cache", credentials: "same-origin" });
  event.respondWith(
    fetch(fresh)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
