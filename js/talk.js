// =========================================================
// ホームのキャラの「ガチャの声かけ」
// ・ふだんは運動の応援セリフ（js/app.js の MESSAGES）がメイン
// ・ガチャの声かけは、1日 TALK_DAILY_MAX 回まで。アプリを開いたときに1回だけ選ぶ
// ・はじめて開いたときは、左上のガチャのボタンをゆびさして教える
// ★ セリフを足す・変えるときは、下の GACHA_TALKS だけ直す
//   {series} はシリーズの名前に、{name} はキャラの名前に、{coins} はコインの数に置きかわる
//   pose はキャラのポーズ（point＝左上をゆびさす / surprise＝びっくり / yay＝ばんざい / cheer など）
// =========================================================

const TALK_DAILY_MAX = 2;      // ガチャの声かけは、1日にここまで
const TALK_RANDOM_RATE = 0.3;  // ほかの声かけがない日に「ガチャ引いてみる？」と言う確率

const GACHA_TALKS = {
  first:   { pose: "point", lines: ["ここからガチャが引けるよ！", "左上のボタンから、チャームのガチャが引けるよ！"] },
  free:    { pose: "point", lines: ["今日の無料ガチャ、まだだよ〜！", "無料ガチャ、引き忘れてない？"] },
  multi:   { pose: "surprise", lines: ["コインが{coins}枚！11連引けるよ！", "11連引けちゃうよ〜！"] },
  pickup:  { pose: "yay", lines: ["{series}始まったよ！", "{series}が来てるよ〜！のぞいてみて！"] },
  random:  { pose: "point2", lines: ["ガチャ引いてみる？", "どんなチャームが出るかな〜"] },
};

// ---------- しくみ ----------

let talkThisVisit; // このアプリを開いているあいだの声かけ（undefined＝まだ決めていない / null＝なし）

const pickLine = (lines) => lines[Math.floor(Math.random() * lines.length)];
function fillLine(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));
}

// いま言える声かけ（たいせつな順）
function talkCandidates() {
  const g = ensureGacha();
  const t = data.talk || {};
  const out = [];
  if (!t.guided) out.push({ kind: "first" });
  const newPickup = openGachas().find((it) => it.series && !(t.pickupsSeen || []).includes(it.id));
  if (newPickup && t.guided) out.push({ kind: "pickup", gacha: newPickup });
  if (freeLeft() > 0) out.push({ kind: "free" });
  if (g.coins >= GACHA.costMulti) out.push({ kind: "multi" });
  if (Math.random() < TALK_RANDOM_RATE) out.push({ kind: "random" });
  return out;
}
// その声かけが、いまも本当か（無料を引いたら「まだだよ」は言わない、など）
function talkStillTrue(c) {
  if (!c) return false;
  if (c.kind === "free") return freeLeft() > 0;
  if (c.kind === "multi") return data.gacha.coins >= GACHA.costMulti;
  return true;
}

// ホームのふきだしに出すガチャの声かけ（なければ null）
function homeGachaTalk() {
  if (typeof ensureGacha !== "function") return null;
  if (talkThisVisit === undefined) {
    if (!data.talk) data.talk = {};
    const t = data.talk;
    const today = dateKey();
    if (t.day !== today) (t.day = today), (t.count = 0);
    const c = talkCandidates()[0] || null;
    // はじめての案内は、回数に数えずに必ず出す。ほかは1日 TALK_DAILY_MAX 回まで
    if (c && (c.kind === "first" || t.count < TALK_DAILY_MAX)) {
      if (c.kind !== "first") t.count++;
      if (c.kind === "first") t.guided = true;
      if (c.kind === "pickup") t.pickupsSeen = [...(t.pickupsSeen || []), c.gacha.id];
      const def = GACHA_TALKS[c.kind];
      c.pose = def.pose;
      c.text = fillLine(pickLine(def.lines), {
        series: c.gacha ? SERIES[c.gacha.series]?.name || c.gacha.name : "",
        name: charName(),
        coins: data.gacha.coins,
      });
      talkThisVisit = c;
      saveData();
      if (c.kind === "first" || c.kind === "free") pointAtGachaButton();
    } else talkThisVisit = null;
  }
  return talkStillTrue(talkThisVisit) ? talkThisVisit : null;
}

// 左上のガチャのボタンを、しばらく光らせる
function pointAtGachaButton() {
  const b = $("coin-btn");
  b.classList.remove("attn");
  void b.offsetWidth;
  b.classList.add("attn");
  setTimeout(() => b.classList.remove("attn"), 6000);
}

// アプリに戻ってきたら、その日の声かけをもう一度選びなおす（1日の回数の中で）
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) talkThisVisit = undefined;
});

renderAll();
