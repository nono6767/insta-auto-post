// キャラクターの表示。場面ごとにポーズが変わります。設定の「キャラクター」で切りかえられる
// （キャラを増やすときは CHARACTERS に1人ぶん足す。ポーズの名前は7つそろえる）
//   wave：ふだん / cheer：まだ運動していない日 / workout：運動したけど、ノルマ前 / quota：ノルマクリア
//   full：瓶がいっぱい / relax：からだを気づかうとき / love：服チェック・貯金の目標達成
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
    },
  },
  m: {
    name: "M",
    desc: "ボブの女の子",
    poses: {
      wave:    { src: "img/m-cheer.webp",   w: 383, h: 609, alt: "ウインクして応援するM" },
      cheer:   { src: "img/m-cheer.webp",   w: 383, h: 609, alt: "ウインクして応援するM" },
      workout: { src: "img/m-workout.webp", w: 424, h: 502, alt: "ひざをかかえて腹筋するM" },
      quota:   { src: "img/m-quota.webp",   w: 339, h: 640, alt: "ガッツポーズのM" },
      full:    { src: "img/m-full.webp",    w: 419, h: 623, alt: "とびはねてよろこぶM" },
      relax:   { src: "img/m-relax.webp",   w: 443, h: 566, alt: "マットでストレッチするM" },
      love:    { src: "img/m-love.webp",    w: 380, h: 639, alt: "ハートでうれしそうなM" },
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
