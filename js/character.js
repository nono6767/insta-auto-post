// キャラクターの表示。設定の「キャラクター」で切りかえられる
// ポーズは10こ（どの場面でどれを使うかは js/lines.js のセリフの一覧で決める）
//   pointUp：上をゆびさす（ガチャの案内） / pointSide：横をゆびさす（運動ボタンやメニューの案内）
//   surprise：びっくり（ピックアップ開始・レアなチャーム） / jump：片足ジャンプでばんざい（ノルマ達成・大瓶）
//   armsOpen：両手を広げる（朝のあいさつ・瓶の棚） / guts：ガッツポーズ（運動の応援・ふだん）
//   stretch：座ってストレッチ（ストレッチのとき・夜） / rolling：ローリングライクアボール（クイズ・ピラティス）
//   hands：手を合わせてにっこり（ごはん・生理の記録のねぎらい） / wink：腰に手でウインク（服チェック・ほめる）
// （キャラを増やすときは CHARACTERS に1人ぶん、10このポーズをそろえて足す）
const CHARACTERS = {
  n: {
    name: "N",
    desc: "おだんごヘアの女の子",
    poses: {
      pointUp:   { src: "img/char/n-pointUp.webp", w: 275, h: 360, alt: "上をゆびさすN" },
      pointSide: { src: "img/char/n-pointSide.webp", w: 294, h: 360, alt: "横をゆびさすN" },
      surprise:  { src: "img/char/n-surprise.webp", w: 283, h: 360, alt: "びっくりするN" },
      jump:      { src: "img/char/n-jump.webp", w: 264, h: 360, alt: "片足ジャンプでばんざいするN" },
      armsOpen:  { src: "img/char/n-armsOpen.webp", w: 236, h: 360, alt: "両手を広げるN" },
      guts:      { src: "img/char/n-guts.webp", w: 217, h: 360, alt: "ガッツポーズのN" },
      stretch:   { src: "img/char/n-stretch.webp", w: 307, h: 360, alt: "座ってストレッチするN" },
      rolling:   { src: "img/char/n-rolling.webp", w: 381, h: 360, alt: "ローリングライクアボールのN" },
      hands:     { src: "img/char/n-hands.webp", w: 199, h: 360, alt: "手を合わせてにっこりするN" },
      wink:      { src: "img/char/n-wink.webp", w: 177, h: 360, alt: "腰に手をあててウインクするN" },
    },
  },
  m: {
    name: "M",
    desc: "ボブの女の子",
    poses: {
      pointUp:   { src: "img/char/m-pointUp.webp", w: 287, h: 360, alt: "上をゆびさすM" },
      pointSide: { src: "img/char/m-pointSide.webp", w: 308, h: 360, alt: "横をゆびさすM" },
      surprise:  { src: "img/char/m-surprise.webp", w: 283, h: 360, alt: "びっくりするM" },
      jump:      { src: "img/char/m-jump.webp", w: 253, h: 360, alt: "片足ジャンプでばんざいするM" },
      armsOpen:  { src: "img/char/m-armsOpen.webp", w: 241, h: 360, alt: "両手を広げるM" },
      guts:      { src: "img/char/m-guts.webp", w: 226, h: 360, alt: "ガッツポーズのM" },
      stretch:   { src: "img/char/m-stretch.webp", w: 282, h: 360, alt: "座ってストレッチするM" },
      rolling:   { src: "img/char/m-rolling.webp", w: 304, h: 360, alt: "ローリングライクアボールのM" },
      hands:     { src: "img/char/m-hands.webp", w: 215, h: 360, alt: "手を合わせてにっこりするM" },
      wink:      { src: "img/char/m-wink.webp", w: 190, h: 360, alt: "腰に手をあててウインクするM" },
    },
  },
};
// 前の名前で呼んでいるところ用（あたらしい10この名前に読みかえる）
const POSE_ALIAS = { wave: "armsOpen", cheer: "guts", workout: "rolling", quota: "jump", full: "jump", relax: "stretch", love: "hands", point: "pointUp", point2: "pointSide", yay: "jump" };
// ぴょんと跳ねるポーズ（お祝い）
const N_HOP = ["jump"];

// いま選んでいるキャラ（はじめは N）
const currentCharacter = () => CHARACTERS[(typeof data !== "undefined" && data && data.character) || "n"] || CHARACTERS.n;
const charName = () => currentCharacter().name;
const poseKey = (pose) => POSE_ALIAS[pose] || pose;
function poseOf(pose) {
  const poses = currentCharacter().poses;
  return poses[poseKey(pose)] || poses.guts;
}

function nCharacterHtml(pose = "guts") {
  const p = poseOf(pose);
  return `<div class="n-char${N_HOP.includes(poseKey(pose)) ? " hop" : ""}">
    <img src="${p.src}" alt="${p.alt}" width="${p.w}" height="${p.h}" decoding="async">
  </div>`;
}

// 選んでいるキャラのポーズだけを、あいている時間に読みこんでおく（オフラインでも出るように）
// ほかのキャラの絵は、選んだときにはじめて読みこむ
function prefetchCharacter() {
  const go = () => Object.values(currentCharacter().poses).forEach((p) => { const i = new Image(); i.decoding = "async"; i.src = p.src; });
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}
