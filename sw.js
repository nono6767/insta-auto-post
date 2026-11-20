// オフラインでも開けて、通信量も少なくするしくみ（サービスワーカー）
//
// ・画像（N・瓶・棚の背景・アイコン）は、一度読み込んだらスマホに保存して、ずっとそれを使う。
//   アプリが新しい版になっても画像はダウンロードし直さない（画像を変えたときだけ IMAGE_VERSION を上げる）。
// ・プログラム（画面と動き）は、版ごとにまとめて保存して、そこから表示する。
//   新しい版が出たら（CODE_VERSION が変わったら）、プログラムの分だけダウンロードし直す。
// ・アプリを開くたびの通信は、新しい版があるかの確認（このファイル）だけ。
//
// ★ プログラムを直したら CODE_VERSION を、今ある画像を描き直したら IMAGE_VERSION を、必ず1つ上げる。
//   （新しい画像を足しただけなら IMAGE_VERSION はそのまま。足した分だけダウンロードされる）
importScripts("js/bottles.js", "js/bigbottles.js");
const CODE_VERSION = 52;
const IMAGE_VERSION = 5;
const CODE_CACHE = `n-app-cache-v${CODE_VERSION}`;
const IMAGE_CACHE = `n-app-images-v${IMAGE_VERSION}`;

const CODE_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/character.js",
  "js/app.js",
  "js/meals.js",
  "js/body.js",
  "js/clothes.js",
  "js/savings.js",
  "js/bigbottles.js",
  "js/shelf.js",
  "js/colors.js",
  "js/shake.js",
  "js/gacha.js",
  "js/quiz.js",
  "js/talk.js",
  "data/quiz-questions.json",
  "js/backup.js",
  "js/bottles.js",
  "manifest.webmanifest",
];
const IMAGE_FILES = [
  "img/n.webp",
  "img/n-cheer.webp",
  "img/n-workout.webp",
  "img/n-quota.webp",
  "img/n-full.webp",
  "img/n-relax.webp",
  "img/n-love.webp",
  "img/n-point.webp",
  "img/n-point2.webp",
  "img/n-surprise.webp",
  "img/n-yay.webp",
  "img/m2-point.webp",
  "img/m2-point2.webp",
  "img/m2-surprise.webp",
  "img/m2-yay.webp",
  "img/m2-cheer.webp",
  "img/m2-workout.webp",
  "img/m2-quota.webp",
  "img/m2-full.webp",
  "img/m2-relax.webp",
  "img/m2-love.webp",
  "img/shelf-bg.webp",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  ...BOTTLES.flatMap((b) => [`bottles/${b.id}.webp`, `bottles/${b.id}-mask.webp`, `bottles/${b.shine || b.id + "-shine"}.webp`]),
  ...BIG_BOTTLES.flatMap((b) => [`big/${b.id}.webp`, `big/${b.id}-mask.webp`]),
  ...CHARMS.map((c) => `charms/${c.id}.webp`),
];
const isImage = (path) => /\.(webp|png|jpe?g|gif|svg)$/i.test(path);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // プログラム：この版のものを、必ず最新でダウンロードして保存
      const code = await caches.open(CODE_CACHE);
      await code.addAll(CODE_FILES.map((f) => new Request(f, { cache: "reload" })));
      // 画像：まだ保存していないものだけダウンロード（前の版で保存した画像はそのまま使う）
      const images = await caches.open(IMAGE_CACHE);
      for (const f of IMAGE_FILES) {
        if (!(await images.match(f))) {
          try {
            await images.add(new Request(f, { cache: "reload" }));
          } catch (e) {
            // 1枚失敗しても、使うときにもう一度取りに行く
          }
        }
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // このアプリの古い版の保存分だけ消す（同じサイトのほかのアプリのものは消さない）
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              (k.startsWith("n-app-cache-") && k !== CODE_CACHE) ||
              (k.startsWith("n-app-images-") && k !== IMAGE_CACHE) ||
              k.startsWith("n-undou-bin-")
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  if (isImage(url.pathname)) {
    // 画像：スマホに保存してあればそれを使う。なければ取りに行って保存
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // プログラム：この版で保存したものを使う。なければ取りに行って保存
  event.respondWith(
    caches.open(CODE_CACHE).then(async (c) => {
      const key = req.mode === "navigate" ? "./" : req;
      const hit = await c.match(key, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (e) {
        return (await c.match("./")) || Response.error();
      }
    })
  );
});
