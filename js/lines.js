// =========================================================
// キャラのセリフとポーズ（画面ごと・状況ごと）
// ・画面を開くと、その画面と状況にいちばん合うセリフを話す（1文字ずつ表示）
// ・キャラをタップすると、その画面の別のセリフ・ポーズに変わる
// ・朝（4〜10時）・昼（11〜17時）・夜（18〜3時）で、あいさつや雰囲気が変わる
// ・ガチャの声かけ（ホーム）は1日 GACHA_TALK_MAX 回まで。運動の応援がメイン
//
// ★ セリフを足す・変えるときは、下の LINES だけ直す
//   { when: (c) => 条件, pose: "ポーズ", say: (c) => `セリフ` }
//   ・上にあるものほど優先（画面を開いたときは、条件に合ういちばん上のセリフ）
//   ・when を書かないと、いつでも出る（タップで順番に出てくる）
//   ・say は文字だけでもOK。いくつか並べるとランダムで1つ： say: ["A", "B"]
//   ・pose は js/character.js の10こ：pointUp / pointSide / surprise / jump / armsOpen / guts / stretch / rolling / hands / wink
//   ・c（状況）で使えるもの：下の talkContext() を見てね（例：c.todayMin 今日の分数、c.quotaLeft ノルマまで、c.poolLeft 大瓶まで）
// =========================================================

const GACHA_TALK_MAX = 4; // ホームでのガチャの声かけは、1日にここまで

// （天気のセリフは下の WEATHER_LINES。ホームの LINES の中の WEATHER_IMPORTANT／WEATHER_NORMAL の場所に入る）
const WEATHER_IMPORTANT = "weather-important", WEATHER_NORMAL = "weather-normal";
const LINES = {
  home: [
    { when: (c) => c.full, pose: "jump", say: (c) => `小瓶が${c.pool}分たまったよ！瓶の棚で合成できるよ` },
    { when: (c) => c.quotaDone, pose: "jump", say: (c) => [`今日は${c.todayMin}分！ノルマクリア、えらい！`, `${c.todayMin}分も動いたね！今日は満点だよ`] },
    { when: (c) => c.quotaDone && c.pilatesMin, pose: "rolling", say: (c) => `今日はピラティス${c.pilatesMin}分！がんばったね` },
    WEATHER_IMPORTANT,
    { when: (c) => c.quotaDone, pose: "guts", say: (c) => `あと${c.overLeft}分動くと、ボーナスのコイン+1だよ！` },
    { when: (c) => c.quotaDone && c.coins >= 1, pose: "pointUp", say: (c) => `コインが${c.coins}枚になったよ！左上からガチャ引けるよ` },
    { when: (c) => c.bodyNote, pose: "stretch", say: (c) => c.bodyNote },
    { when: (c) => c.clothesNote, pose: "wink", say: (c) => c.clothesNote },
    { when: (c) => c.backupNote, pose: "pointSide", say: (c) => c.backupNote },
    { when: (c) => !c.quotaDone && c.last && c.last.type === "stretch", pose: "stretch", say: (c) => `ストレッチ${c.last.min}分、からだがほぐれたね。あと${c.quotaLeft}分でノルマだよ` },
    { when: (c) => !c.quotaDone && c.last && c.last.type === "pilates", pose: "rolling", say: (c) => `今日はピラティス${c.pilatesMin}分！あと${c.quotaLeft}分で今日のノルマだよ` },
    { when: (c) => c.todayMin > 0 && !c.quotaDone, pose: "guts", say: (c) => [`あと${c.quotaLeft}分で今日のノルマだよ！`, `今日は${c.todayMin}分！あと${c.quotaLeft}分でノルマクリア`] },
    { when: (c) => c.todayMin === 0 && c.tod === "morning", pose: "armsOpen", say: ["おはよう！今日はなにから動く？", "おはよう〜！朝のストレッチ5分からどう？"] },
    { when: (c) => c.todayMin === 0 && c.tod === "day", pose: "pointSide", say: ["こんにちは！下のボタンから運動を記録してね", "お昼休みに5分だけ動いてみる？"] },
    { when: (c) => c.todayMin === 0 && c.tod === "night", pose: "stretch", say: ["おつかれさま。寝る前にストレッチ5分はどう？", "今日もおつかれさま〜。ゆっくりほぐそう"] },
    { when: (c) => c.free > 0, pose: "pointUp", say: "今日の無料ガチャ、まだだよ〜！左上から引けるよ" },
    { when: (c) => c.upcoming, pose: "surprise", say: (c) => `${c.upcoming.date}から、ガチャに「${c.upcoming.name}」が来るよ！` },
    { when: (c) => c.coins >= c.multiCost, pose: "surprise", say: (c) => `コイン${c.coins}枚！11連引けるよ！` },
    { when: (c) => c.coins >= 1 && c.coins < c.multiCost, pose: "pointUp", say: (c) => `コイン${c.coins}枚あるよ。ガチャ引いてみる？` },
    WEATHER_NORMAL,
    { pose: "guts", say: (c) => `大瓶まであと${c.poolLeft}分！いっしょにためよう` },
    { pose: "pointSide", say: "運動したら、下のボタンから記録してね" },
    { when: (c) => c.tod === "morning", pose: "armsOpen", say: (c) => `おはよう、${c.name}だよ！今日もよろしくね` },
    { when: (c) => c.tod === "day", pose: "guts", say: "午後もいっしょにがんばろ〜" },
    { when: (c) => c.tod === "night", pose: "stretch", say: "夜は小瓶のシェイクも忘れずにね" },
    { when: (c) => c.quizLeft > 0, pose: "rolling", say: (c) => `ピラティスクイズで、あと${c.quizLeft}コインもらえるよ` },
  ],
  meals: [
    { when: (c) => c.mealsDone === 3, pose: "hands", say: "今日のごはん、ぜんぶ記録できたね。えらい！" },
    { when: (c) => c.snackNone, pose: "hands", say: "おやつなしで花まる！小瓶に星がひとつ浮かぶよ" },
    { when: (c) => c.mealsDone > 0, pose: "hands", say: (c) => `ごはん記録ありがとう！今日はあと${3 - c.mealsDone}食だよ` },
    { when: (c) => c.tod === "morning" && !c.mealDone.breakfast, pose: "pointSide", say: "おはよう！朝ごはん、なに食べた？下から記録してね" },
    { when: (c) => c.tod === "day" && !c.mealDone.lunch, pose: "pointSide", say: "お昼ごはんの記録、わすれずにね" },
    { when: (c) => c.tod === "night", pose: "hands", say: "夜ごはん、ゆっくり味わって食べてね" },
    { pose: "hands", say: "ごはんを記録すると、コインが1枚もらえるよ" },
  ],
  body: [
    { when: (c) => c.periodOpen, pose: "hands", say: "生理中は無理しないでね。記録してくれてえらい！" },
    { when: (c) => c.periodOpen, pose: "hands", say: "生理中は、からだの記録をすると毎日コインが1枚もらえるよ" },
    { when: (c) => c.bodyNote, pose: "stretch", say: (c) => c.bodyNote },
    { when: (c) => c.tod === "night", pose: "stretch", say: "夜はストレッチで、ゆっくりほぐそう" },
    { pose: "hands", say: "からだの記録、ありがとう。今日の調子はどう？" },
    { pose: "pointSide", say: "下から今日の体調を記録してね" },
  ],
  clothes: [
    { when: (c) => c.clothesNote, pose: "pointSide", say: "今月の服チェック、まだだよ〜。写真を撮ってみよう" },
    { when: (c) => c.clothesCount > 0, pose: "wink", say: (c) => `服が${c.clothesCount}着！今日もかわいいよ` },
    { pose: "wink", say: "お気に入りの服、ぴったりになるといいね" },
  ],
  savings: [
    { when: (c) => !c.savingsReady, pose: "pointSide", say: "まずは下から、貯金瓶の設定をしよう！" },
    { when: (c) => c.savingsLeft === 0, pose: "jump", say: "目標達成！ほんとうにおめでとう！" },
    { when: (c) => c.savedThisWeek, pose: "wink", say: (c) => `今週の分、入れたね！目標まであと${c.savingsLeft}回` },
    { when: (c) => c.savingsReady && !c.savedThisWeek && c.savingsLeft > 0, pose: "pointSide", say: (c) => `今週の分、まだだよ〜。目標まであと${c.savingsLeft}回` },
    { pose: "wink", say: "瓶をタップすると、コインが跳ねるよ" },
  ],
  shelf: [
    { when: (c) => c.full, pose: "jump", say: (c) => `小瓶が${c.pool}分！合成して大瓶にしよう` },
    { when: (c) => c.bigs > 0, pose: "armsOpen", say: (c) => `大瓶${c.bigs}本！ならべるとキラキラだね` },
    { when: (c) => c.smalls > 0, pose: "armsOpen", say: (c) => `小瓶${c.smalls}本、大瓶まであと${c.poolLeft}分！` },
    { when: (c) => c.tod === "night", pose: "stretch", say: "今日の小瓶、シェイクした？" },
    { pose: "armsOpen", say: "運動した日の小瓶が、ここに飾られるよ" },
  ],
  gacha: [
    { when: (c) => c.lastDraw, pose: "surprise", say: (c) => `わっ！${c.lastDraw}が出たよ！` },
    { when: (c) => c.free > 0, pose: "pointUp", say: "今日の無料ガチャ、引いてみよう！" },
    { when: (c) => c.coins >= c.multiCost, pose: "surprise", say: (c) => `コイン${c.coins}枚！11連引けるよ！` },
    { when: (c) => c.upcoming, pose: "surprise", say: (c) => `予告だよ！${c.upcoming.date}から「${c.upcoming.name}」が始まるよ` },
    { when: (c) => c.pickup, pose: "surprise", say: (c) => `${c.pickup}開催中！${c.pickupHave}/${c.pickupTotal}集めたよ` },
    { when: (c) => c.coins < 1, pose: "hands", say: "コインは、運動やクイズでたまるよ" },
    { pose: "wink", say: "どのチャームが出るかな〜" },
  ],
};

// ★ 天気のセリフ（ホーム）。c.wx が天気のようす（js/weather.js の weatherFacts）。回数の制限はなし
//   important: true のセリフは「知らせたほうがいい日」用で、運動のセリフより前に出る（雨・寒い・大きな変化）
//   ポーズ：晴れ＝armsOpen ／ 雨や寒い日＝pointSide（天気の表示を指す） ／ 暑い日・大きな変化＝surprise
const WEATHER_LINES = [
  // ---- 今日（21時まで） ----
  { important: true, when: (w) => w.mode === "today" && w.rainNow, pose: "pointSide", say: "今、雨が降ってるみたい。お出かけは傘を持ってね" },
  { important: true, when: (w) => w.mode === "today" && !w.rainNow && w.umbrella === "big", pose: "pointSide", say: (w) => `${w.rainPart}雨が降りそう！傘持っていってね` },
  { important: true, when: (w) => w.mode === "today" && !w.rainNow && w.umbrella === "small", pose: "pointSide", say: (w) => `${w.rainPart}雨かも。折りたたみ傘があると安心だよ` },
  { important: true, when: (w) => w.mode === "today" && w.snow, pose: "pointSide", say: "雪が降るかも！足もとに気をつけてね" },
  { important: true, when: (w) => w.mode === "today" && w.diff >= 5, pose: "surprise", say: (w) => `昨日より${w.diff}℃も暑くなるよ！` },
  { important: true, when: (w) => w.mode === "today" && w.diff <= -5, pose: "surprise", say: (w) => `昨日より${-w.diff}℃も寒くなるよ！あったかくしてね` },
  { important: true, when: (w) => w.mode === "today" && w.cold === "coat", pose: "pointSide", say: "今日は寒いよ〜、コートで出かけてね" },
  { important: true, when: (w) => w.mode === "today" && w.hot, pose: "surprise", say: (w) => `今日は${w.tmax}℃まで上がるよ！水分をしっかりとってね` },
  { important: true, when: (w) => w.mode === "today" && (w.rainNow || w.umbrella), pose: "pointSide", say: "雨の日は、おうちでピラティスやストレッチもいいね" },
  { important: true, when: (w) => w.mode === "today" && w.cold === "coat", pose: "pointSide", say: "寒い日は、ストレッチでからだをあっためてから動こう" },
  { when: (w) => w.mode === "today" && w.sunny, pose: "armsOpen", say: ["今日は1日晴れだよ！", "いいお天気！お散歩ウォーキング日和だね"] },
  { when: (w) => w.mode === "today" && w.cloudy, pose: "pointSide", say: "今日はくもり。雨は降らなさそうだよ" },
  { when: (w) => w.mode === "today" && w.cold === "light", pose: "pointSide", say: (w) => `今日の最高は${w.tmax}℃。うす手の上着があるといいよ` },
  { when: (w) => w.mode === "today" && !w.cold && !w.hot, pose: "armsOpen", say: (w) => `今日の最高は${w.tmax}℃。すごしやすいね` },
  // ---- 明日（21時から） ----
  { important: true, when: (w) => w.mode === "tomorrow" && w.umbrella === "big", pose: "pointSide", say: (w) => `明日は${w.rainPart}雨みたい。傘を用意しておこう` },
  { important: true, when: (w) => w.mode === "tomorrow" && w.umbrella === "small", pose: "pointSide", say: (w) => `明日は${w.rainPart}雨かも。折りたたみ傘を入れておこう` },
  { important: true, when: (w) => w.mode === "tomorrow" && w.snow, pose: "pointSide", say: "明日は雪が降るかも！あったかくしてね" },
  { important: true, when: (w) => w.mode === "tomorrow" && w.diff >= 5, pose: "surprise", say: (w) => `明日は今日より${w.diff}℃も暑くなるよ！` },
  { important: true, when: (w) => w.mode === "tomorrow" && w.diff <= -5, pose: "surprise", say: (w) => `明日は今日より${-w.diff}℃も寒くなるよ！` },
  { important: true, when: (w) => w.mode === "tomorrow" && w.cold === "coat", pose: "pointSide", say: "明日は寒くなるよ。コートを出しておこう" },
  { when: (w) => w.mode === "tomorrow" && w.sunny, pose: "armsOpen", say: "明日は晴れ！お出かけ日和だね" },
  { when: (w) => w.mode === "tomorrow" && w.cloudy, pose: "pointSide", say: "明日はくもり。雨は降らなさそうだよ" },
  { when: (w) => w.mode === "tomorrow", pose: "armsOpen", say: (w) => `明日の最高は${w.tmax}℃だよ` },
];
// 天気のセリフを、LINES と同じ形にして返す（important だけ／それ以外）
function weatherLines(important) {
  return WEATHER_LINES.filter((l) => !!l.important === important).map((l) => ({
    pose: l.pose,
    when: (c) => !!c.wx && l.when(c.wx),
    say: (c) => (typeof l.say === "function" ? l.say(c.wx) : l.say),
  }));
}

// ホームのガチャの声かけ（1日 GACHA_TALK_MAX 回まで。はじめて開いた日は必ず案内）
const GACHA_CALLS = [
  { kind: "first", when: (c, t) => !t.guided, pose: "pointUp", say: "ここからガチャが引けるよ！" },
  { kind: "pickup", when: (c, t) => c.newPickup, pose: "surprise", say: (c) => `${c.newPickup.label}始まったよ！` },
  { kind: "free", when: (c) => c.free > 0, pose: "pointUp", say: "今日の無料ガチャ、まだだよ〜！" },
  { kind: "multi", when: (c) => c.coins >= c.multiCost, pose: "surprise", say: "11連引けるよ！" },
];

// ---------- 状況（セリフの中で使える） ----------

function talkContext() {
  const h = new Date().getHours();
  const today = dateKey();
  const logs = data.logs.filter((l) => l.date === today).sort((a, b) => a.ts - b.ts);
  const todayMin = sumMin(logs);
  const minOf = (type) => sumMin(logs.filter((l) => l.type === type));
  const pool = poolMinutes();
  const meals = dayMeals(today);
  const g = typeof ensureGacha === "function" ? ensureGacha() : null;
  const gacha = g ? currentGacha() : null;
  const t = data.talk || {};
  const newPickup = g ? openGachas().find((it) => it.series && !(t.pickupsSeen || []).includes(it.id)) : null;
  const lineup = gacha && gacha.series ? CHARMS.filter((c) => seriesOf(c) === gacha.series) : [];
  return {
    name: charName(),
    tod: h >= 4 && h < 11 ? "morning" : h >= 11 && h < 18 ? "day" : "night",
    todayMin,
    quotaDone: todayMin >= DAILY_QUOTA_MIN,
    quotaLeft: Math.max(0, DAILY_QUOTA_MIN - todayMin),
    overLeft: todayMin >= DAILY_QUOTA_MIN ? COIN_RULES.overMin - ((todayMin - DAILY_QUOTA_MIN) % COIN_RULES.overMin) : 0,
    last: logs[logs.length - 1] || null,
    pilatesMin: minOf("pilates"),
    pool,
    poolLeft: Math.max(0, BIG_BOTTLE_MIN - pool),
    full: pool >= BIG_BOTTLE_MIN,
    smalls: smallBottles().length,
    bigs: (data.bigBottles || []).length,
    bodyNote: typeof bodyBubble === "function" ? bodyBubble() : null,
    clothesNote: typeof clothesBubble === "function" ? clothesBubble() : null,
    backupNote: typeof backupBubble === "function" ? backupBubble() : null,
    periodOpen: typeof openPeriod === "function" && !!openPeriod(),
    mealDone: Object.fromEntries(MEALS.map((m) => [m.id, !!(meals[m.id] && Object.keys(meals[m.id]).length)])),
    mealsDone: MEALS.filter((m) => meals[m.id] && Object.keys(meals[m.id]).length).length,
    snackNone: meals.snack === "none",
    clothesCount: typeof clothes === "function" ? clothes().length : 0,
    savingsReady: typeof savingsReady === "function" && savingsReady(),
    savingsLeft: typeof savingsReady === "function" && savingsReady() ? timesLeft() : null,
    savedThisWeek: typeof thisWeeksDeposit === "function" && !!thisWeeksDeposit(),
    coins: g ? g.coins : 0,
    free: g ? freeLeft() + (typeof ribbonFreeLeft === "function" ? ribbonFreeLeft() : 0) : 0,
    multiCost: typeof GACHA !== "undefined" ? GACHA.costMulti : 10,
    quizLeft: typeof quizCoinsToday === "function" ? COIN_RULES.quizDailyMax - quizCoinsToday() : 0,
    pickup: gacha && gacha.series ? SERIES[gacha.series]?.name : null,
    pickupHave: lineup.filter((c) => isOwned(c)).length,
    pickupTotal: lineup.length,
    newPickup: newPickup ? { id: newPickup.id, label: SERIES[newPickup.series]?.name || newPickup.name } : null,
    lastDraw: talkState.lastDraw,
    upcoming: (() => { const u = typeof upcomingPickups === "function" ? upcomingPickups()[0] : null; return u ? { name: SERIES[u.series].name, date: shortDate(u.start) } : null; })(),
    wx: typeof weatherFacts === "function" ? weatherFacts() : null,
  };
}

// ---------- しくみ ----------

const talkState = { lastDraw: null };
const talkSlots = {}; // 画面ごと：{ list: 出せるセリフ, i: いまの番号, gachaCall }

const pickOne = (v) => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);
const sayText = (line, c) => pickOne(typeof line.say === "function" ? line.say(c) : line.say);

// その画面で、いま出せるセリフ（条件に合うもの、上から順）
function linesFor(screen, c) {
  const all = (LINES[screen] || []).flatMap((l) => (l === WEATHER_IMPORTANT ? weatherLines(true) : l === WEATHER_NORMAL ? weatherLines(false) : [l]));
  return all.filter((l) => {
    try {
      return !l.when || l.when(c);
    } catch (e) {
      return false;
    }
  });
}

// ホームのガチャの声かけを、1日の回数の中で1つ選ぶ（アプリを開くたびに1回だけ）
function pickGachaCall(c) {
  if (typeof ensureGacha !== "function") return null;
  if (!data.talk) data.talk = {};
  const t = data.talk;
  const today = dateKey();
  if (t.day !== today) (t.day = today), (t.count = 0);
  const call = GACHA_CALLS.find((g) => g.when(c, t));
  if (!call || (call.kind !== "first" && t.count >= GACHA_TALK_MAX)) return null;
  if (call.kind === "first") t.guided = true;
  else t.count++;
  if (call.kind === "pickup") t.pickupsSeen = [...(t.pickupsSeen || []), c.newPickup.id];
  saveData();
  if (call.kind === "first" || call.kind === "free") setTimeout(pointAtGachaButton, 300);
  return { pose: call.pose, text: sayText(call, c), kind: call.kind };
}
function pointAtGachaButton() {
  const b = $("coin-btn");
  if (!b) return;
  b.classList.remove("attn");
  void b.offsetWidth;
  b.classList.add("attn");
  setTimeout(() => b.classList.remove("attn"), 6000);
}

// 1文字ずつ表示する（話している感じ）
const typing = new WeakMap();
function speak(el, text) {
  clearInterval(typing.get(el));
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = text;
    return;
  }
  const chars = [...text];
  let n = 0;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  const id = setInterval(() => {
    n++;
    el.textContent = chars.slice(0, n).join("");
    if (n >= chars.length) clearInterval(id);
  }, 38);
  typing.set(el, id);
}

// 文字の飾り（太字など）があるふきだしも、1文字ずつ
function speakHtml(el, html) {
  clearInterval(typing.get(el));
  el.innerHTML = html;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const nodes = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push([walk.currentNode, [...walk.currentNode.nodeValue]]);
  nodes.forEach(([n]) => (n.nodeValue = ""));
  let k = 0, n = 0;
  const id = setInterval(() => {
    while (k < nodes.length && n >= nodes[k][1].length) (k++), (n = 0);
    if (k >= nodes.length) return clearInterval(id);
    n++;
    nodes[k][0].nodeValue = nodes[k][1].slice(0, n).join("");
  }, 30);
  typing.set(el, id);
}

// 画面のキャラとふきだしを描く。fresh＝画面を開いたとき（いちばん合うセリフから）
// figEl：キャラの入れもの / bubbleEl：ふきだし
function talk(screen, figEl, bubbleEl, { fresh = false, next = false } = {}) {
  if (!figEl || !bubbleEl) return;
  const c = talkContext();
  const slot = talkSlots[screen] || (talkSlots[screen] = { list: [], i: 0, key: "" });
  const list = linesFor(screen, c);
  // ほかの画面（体重の入力など）が出ているあいだは、ガチャの案内は待つ
  const covered = document.querySelector(".modal-backdrop:not([hidden])") || !$("sheet").hidden;
  if (screen === "home" && slot.gachaCall === undefined && !covered) {
    slot.gachaCall = pickGachaCall(c);
    slot.gachaAt = c.todayMin;
  }
  // 運動を記録したら、ガチャの声かけより運動のセリフ（声かけは、その場かぎり）
  if (slot.gachaCall && c.todayMin !== slot.gachaAt) slot.gachaCall = null;
  // ガチャの声かけは、無料を引いたあとなど、もう本当でなくなったら出さない
  if (slot.gachaCall && slot.gachaCall.kind === "free" && c.free <= 0) slot.gachaCall = null;
  if (slot.gachaCall && slot.gachaCall.kind === "multi" && c.coins < c.multiCost) slot.gachaCall = null;
  const all = slot.gachaCall && !c.full && !c.quotaDone ? [slot.gachaCall, ...list] : list;
  if (!all.length) return;
  let line;
  if (next) {
    slot.i = (slot.i + 1) % all.length;
    line = all[slot.i];
  } else {
    // 状況が変わったら、いちばん合うセリフに戻す
    const key = all.map((l) => l.say && l.say.toString().slice(0, 30)).join("|") + (all[0].text || "");
    if (fresh || key !== slot.key) slot.i = 0;
    slot.key = key;
    line = all[Math.min(slot.i, all.length - 1)];
  }
  const text = line.text || sayText(line, c);
  const pose = line.pose;
  const who = data.character || "n";
  const same = slot.lastText === text && slot.lastPose === pose && slot.lastWho === who;
  slot.lastText = text;
  slot.lastPose = pose;
  slot.lastWho = who;
  if (same && !fresh && !next) return; // 同じなら描き直さない（1文字ずつを、くり返さない）
  figEl.innerHTML = nCharacterHtml(pose);
  const img = figEl.querySelector(".n-char");
  if (img && (fresh || next)) img.classList.add("talk-pop");
  bubbleEl.classList.toggle("gacha-talk", !!line.kind);
  speak(bubbleEl, text);
}

// ---------- 画面ごとにつなぐ ----------

const STRIP_SCREENS = ["meals", "body", "clothes", "savings", "shelf"];
const stripOf = (screen) => document.querySelector(`.talk-strip[data-screen="${screen}"]`);
function talkStrip(screen, opts) {
  const s = stripOf(screen);
  if (s) talk(screen, s.querySelector(".talk-char"), s.querySelector(".talk-bubble"), opts);
}

// ホーム：キャラをタップすると、別のセリフ・ポーズ
$("n-figure").setAttribute("role", "button");
$("n-figure").setAttribute("tabindex", "0");
$("n-figure").setAttribute("aria-label", "キャラをタップすると、別のセリフになるよ");
$("n-figure").addEventListener("click", () => talk("home", $("n-figure"), $("n-bubble"), { next: true }));
for (const screen of STRIP_SCREENS) {
  const s = stripOf(screen);
  if (s) s.querySelector(".talk-char").addEventListener("click", () => talkStrip(screen, { next: true }));
}
$("gacha-talk-char").addEventListener("click", () => talk("gacha", $("gacha-talk-char"), $("gacha-talk-bubble"), { next: true }));

// ページを開いたら、その画面のセリフ
document.addEventListener("pagechange", (e) => {
  const page = e.detail;
  if (page === "home") talk("home", $("n-figure"), $("n-bubble"), { fresh: true });
  else if (STRIP_SCREENS.includes(page)) talkStrip(page, { fresh: true });
});
// アプリに戻ってきたら、時間帯やガチャの声かけを選びなおす
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (talkSlots.home) talkSlots.home.gachaCall = undefined;
  talk("home", $("n-figure"), $("n-bubble"), { fresh: true });
});
// ガチャ画面
{
  const baseOpen = openGacha;
  openGacha = function () {
    baseOpen();
    talkState.lastDraw = null;
    talk("gacha", $("gacha-talk-char"), $("gacha-talk-bubble"), { fresh: true });
  };
  const baseDraw = drawGachaScreen;
  drawGachaScreen = function () {
    baseDraw();
    if (!$("gacha-screen").hidden) talk("gacha", $("gacha-talk-char"), $("gacha-talk-bubble"), { fresh: !!talkState.lastDraw });
  };
}
// 記録などで画面が描き直されたら、いまの画面のセリフも状況に合わせる
{
  const base = renderAll;
  renderAll = function () {
    base();
    const page = document.querySelector(".tabbar-btn[aria-current='page']")?.dataset.page || "home";
    if (page === "home") talk("home", $("n-figure"), $("n-bubble"));
    else if (STRIP_SCREENS.includes(page)) talkStrip(page);
  };
}

talk("home", $("n-figure"), $("n-bubble"), { fresh: true });
prefetchCharacter();
