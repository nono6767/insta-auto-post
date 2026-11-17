// キャラクター「N」の表示。場面ごとにポーズが変わります。
// （絵を差し替えたいときは img/ の画像を入れ替えるか、ここの一覧を直す）
const N_POSES = {
  wave:    { src: "img/n.webp",         w: 410, h: 707, alt: "手をふるN" },              // ふだん
  cheer:   { src: "img/n-cheer.webp",   w: 325, h: 662, alt: "ウインクして応援するN" },  // まだ運動していない日
  workout: { src: "img/n-workout.webp", w: 410, h: 387, alt: "腹筋をがんばるN" },        // 運動したけど、ノルマ前
  quota:   { src: "img/n-quota.webp",   w: 362, h: 600, alt: "ガッツポーズのN" },        // ノルマクリア
  full:    { src: "img/n-full.webp",    w: 403, h: 616, alt: "とびはねてよろこぶN" },    // 瓶がいっぱい
  relax:   { src: "img/n-relax.webp",   w: 410, h: 481, alt: "ゆったりストレッチするN" }, // からだを気づかうとき
  love:    { src: "img/n-love.webp",    w: 348, h: 628, alt: "ハートでうれしそうなN" },  // 服チェック・貯金の目標達成
};
// ぴょんと跳ねるポーズ（お祝い）
const N_HOP = ["quota", "full", "love"];

function nCharacterHtml(pose = "wave") {
  const p = N_POSES[pose] || N_POSES.wave;
  return `<div class="n-char${N_HOP.includes(pose) ? " hop" : ""}">
    <img src="${p.src}" alt="${p.alt}" width="${p.w}" height="${p.h}">
  </div>`;
}
