// キャラクターの表示。場面ごとにポーズが変わります。設定の「キャラクター」で切りかえられる
// （キャラを増やすときは CHARACTERS に1人ぶん足す。ポーズの名前は11こそろえる。ないポーズは wave になる）
//   wave：ふだん / cheer：まだ運動していない日 / workout：運動したけど、ノルマ前 / quota：ノルマクリア
//   full：瓶がいっぱい / relax：からだを気づかうとき / love：服チェック・貯金の目標達成
//   point：左上をゆびさす（ガチャの声かけ） / point2：ゆびさしポーズ / surprise：びっくり / yay：ばんざい
const CHARACTERS = {
  n: {
    name: "N",
    desc: "おだんごヘアの女の子",
    poses: {
      wave:    { src: "img/n.webp",         w: 410, h: 707, alt: "手をふるN" },
      cheer:   { src: "img/n-cheer.webp",   w: 325, h: 662, alt: "ウインクして応援するN" },
      workout: { src: "img/n-workout.webp", w: 410, h: 387, alt: "腹筋をがんばるN" },
      quota:   { src: "img/n-quota.webp",   w: 362, h: 600, alt: "ガッツポーズのN" },
      full:    { src: "img/n-full.webp",    w: 403, h: 616, alt: "とびはねてよろこぶN" },
      relax:   { src: "img/n-relax.webp",   w: 410, h: 481, alt: "ゆったりストレッチするN" },
      love:    { src: "img/n-love.webp",    w: 348, h: 628, alt: "ハートでうれしそうなN" },
      point:   { src: "img/n-point.webp", w: 458, h: 600, alt: "ゆびさして教えるN" },
      point2:  { src: "img/n-point2.webp", w: 484, h: 592, alt: "ゆびさしてポーズN" },
      surprise:{ src: "img/n-surprise.webp", w: 471, h: 600, alt: "びっくりするN" },
      yay:     { src: "img/n-yay.webp", w: 440, h: 600, alt: "ばんざいでよろこぶN" },
    },
  },
  m: {
    name: "M",
    desc: "ボブの女の子",
    poses: {
      wave:    { src: "img/m2-cheer.webp",   w: 313, h: 499, alt: "ウインクして応援するM" },
      cheer:   { src: "img/m2-cheer.webp",   w: 313, h: 499, alt: "ウインクして応援するM" },
      workout: { src: "img/m2-workout.webp",   w: 347, h: 411, alt: "ひざをかかえて腹筋するM" },
      quota:   { src: "img/m2-quota.webp",   w: 283, h: 535, alt: "ガッツポーズのM" },
      full:    { src: "img/m2-full.webp",   w: 342, h: 510, alt: "とびはねてよろこぶM" },
      relax:   { src: "img/m2-relax.webp",   w: 363, h: 464, alt: "マットでストレッチするM" },
      love:    { src: "img/m2-love.webp",   w: 312, h: 522, alt: "ハートでうれしそうなM" },
      point:   { src: "img/m2-point.webp", w: 478, h: 600, alt: "ゆびさして教えるM" },
      point2:  { src: "img/m2-point2.webp", w: 507, h: 592, alt: "ゆびさしてポーズM" },
      surprise:{ src: "img/m2-surprise.webp", w: 472, h: 600, alt: "びっくりするM" },
      yay:     { src: "img/m2-yay.webp", w: 421, h: 600, alt: "ばんざいでよろこぶM" },
    },
  },
};
// ぴょんと跳ねるポーズ（お祝い）
const N_HOP = ["quota", "full", "love"];

// いま選んでいるキャラ（はじめは N）
const currentCharacter = () => CHARACTERS[(typeof data !== "undefined" && data && data.character) || "n"] || CHARACTERS.n;
const charName = () => currentCharacter().name;

function nCharacterHtml(pose = "wave") {
  const poses = currentCharacter().poses;
  const p = poses[pose] || poses.wave;
  return `<div class="n-char${N_HOP.includes(pose) ? " hop" : ""}">
    <img src="${p.src}" alt="${p.alt}" width="${p.w}" height="${p.h}">
  </div>`;
}
