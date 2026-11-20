// =========================================================
// コイン と チャームのガチャ
// ・運動のノルマ・食事の記録・生理の記録・大瓶への進化で、コインがもらえる
// ・コインでガチャをひくと、チャームが出る（毎日1回は無料）
// ・ピックアップ中のシリーズは出やすい。11連はピックアップのチャームが1個以上確定
// ・持っているチャームがかぶったら「かけら」。かけらを集めると、好きなチャームと交換できる
// =========================================================

// ---------- ★ 設定（数を変えたいときは、ここだけ直す） ----------

// コインのもらい方
const COIN_RULES = {
  quota: 1,     // その日の運動がノルマ（35分）に届いた（1日1回）
  meal: 1,      // 食事を記録した（1日1回まで）
  period: 1,    // 生理を記録した（ボーナス。記録1回ごと）
  bigBottle: 3, // 大瓶に進化した（1本ごと）
};

// ガチャ
const GACHA = {
  costOne: 1,          // 1回ひくのに使うコイン
  costMulti: 10,       // 11連に使うコイン
  multiCount: 11,      // 11連で出る数
  freePerDay: 1,       // 1日に無料でひける回数
  pickupRate: 0.5,     // ピックアップ中のシリーズが出る確率（0.5 ＝ 50%）
  endedWeight: 0.15,   // ピックアップが終わったシリーズのチャームの出やすさ（ベーシックを1としたとき）
  shardPerDup: 1,      // かぶったときにもらえる、かけらの数
  shardsForCharm: 10,  // 好きなチャームと交換するのに使う、かけらの数
};

// シリーズ（チャームの series に書いた名前）
const SERIES = {
  basic: { name: "ベーシックライン", color: "#e8a3b8" },
  wanko: { name: "ワンコシリーズ", color: "#c9a07a", catch: "ふわふわのわんこと、キラキラのほね" },
  ballet: { name: "バレエシリーズ", color: "#e79ab6", catch: "トウシューズとチュチュで、くるっと一回転" },
};

// ガチャの一覧（★ シリーズを増やしたら、ここに1行足すだけで新しいガチャのタブができる）
//   id：ガチャの名前（英字） / name：タブに出る名前 / series：ピックアップするシリーズ
//   start・end：開催する期間 / effect：演出（GACHA_EFFECTS の名前。シリーズごとに変えたいときはここを変える）
// 期間が終わったガチャのシリーズは、ほかのガチャの「ふつうの中身」に、ひくい確率で入る
const GACHAS = [
  { id: "wanko", name: "ワンコガチャ", series: "wanko", start: "2026-11-20", end: "2026-12-31", effect: "jewelBox" },
  { id: "ballet", name: "バレエガチャ", series: "ballet", start: "2026-11-20", end: "2026-12-31", effect: "jewelBox" },
];
// 開催中のガチャがひとつもないときの、いつものガチャ（ピックアップなし）
const STANDARD_GACHA = { id: "standard", name: "いつものガチャ", series: null, effect: "jewelBox" };

// ---------- データ ----------
// data.gacha = { coins, shards, owned[ガチャで手に入れたチャーム], freeDay（無料をひいた日）, freeUsed, given{もらったコインの印}, since }

const seriesOf = (c) => c.series || "basic";
const isLimited = (c) => seriesOf(c) !== "basic";

function ensureGacha() {
  if (!data.gacha) {
    data.gacha = { coins: 0, shards: 0, owned: [], freeDay: null, freeUsed: 0, given: {}, since: dateKey() };
    markExistingRewards(); // 前からある記録で、まとめてコインが出ないように（今日のぶんは、もらえる）
    saveData();
  }
  const g = data.gacha;
  if (!Array.isArray(g.owned)) g.owned = [];
  if (!g.given) g.given = {};
  // すでに大瓶につけているチャームは、持っているものとして扱う
  for (const b of data.bigBottles || []) {
    for (const id of b.charms || []) if (!g.owned.includes(id) && charmById(id) && isLimited(charmById(id))) g.owned.push(id);
  }
  return g;
}
const isOwned = (c) => !isLimited(c) || (data.gacha && data.gacha.owned.includes(c.id));

// ---------- コイン ----------

// いま「もらえる条件を満たしているもの」の一覧 [{key, amount, label}]
function rewardList() {
  const out = [];
  const byDay = {};
  for (const l of data.logs) byDay[l.date] = (byDay[l.date] || 0) + l.min;
  for (const [day, min] of Object.entries(byDay)) if (min >= DAILY_QUOTA_MIN) out.push({ key: "q:" + day, amount: COIN_RULES.quota, label: "ノルマ達成", day });
  for (const [day, m] of Object.entries(data.meals || {})) {
    if (m && Object.values(m).some((v) => v && (typeof v !== "object" || Object.keys(v).length))) out.push({ key: "m:" + day, amount: COIN_RULES.meal, label: "食事の記録", day });
  }
  for (const p of data.periods || []) out.push({ key: "p:" + p.start, amount: COIN_RULES.period, label: "生理の記録ボーナス" });
  for (const b of data.bigBottles || []) out.push({ key: "b:" + b.id, amount: COIN_RULES.bigBottle, label: "大瓶に進化" });
  return out;
}
function markExistingRewards() {
  const today = dateKey();
  for (const r of rewardList()) if (r.day !== today) data.gacha.given[r.key] = true;
}

// まだもらっていないコインを渡す（画面を描き直すたびに確かめる）
function checkCoinRewards() {
  const g = ensureGacha();
  let got = 0;
  const labels = [];
  for (const r of rewardList()) {
    if (g.given[r.key] || !r.amount) continue;
    g.given[r.key] = true;
    g.coins += r.amount;
    got += r.amount;
    labels.push(r.label);
  }
  if (got) {
    saveData();
    coinPop(got, [...new Set(labels)].join("・"));
  }
  updateCoinBadge();
}

// 右上のコインの数と、無料ガチャのお知らせの点
function updateCoinBadge() {
  const g = data.gacha;
  if (!g) return;
  $("coin-count").textContent = g.coins;
  $("coin-btn").classList.toggle("has-free", freeLeft() > 0);
  $("coin-btn").setAttribute("aria-label", `コイン${g.coins}枚。ガチャをひく${freeLeft() > 0 ? "（今日の無料ガチャがあるよ）" : ""}`);
}
// 「+1」がふわっと出る
function coinPop(n, label) {
  const btn = $("coin-btn");
  btn.classList.remove("bump");
  void btn.offsetWidth;
  btn.classList.add("bump");
  const pop = document.createElement("span");
  pop.className = "coin-pop";
  pop.innerHTML = `<b>+${n}</b><small>${label}</small>`;
  btn.append(pop);
  setTimeout(() => pop.remove(), 2400);
}

// ---------- ガチャのしくみ ----------

const freeLeft = () => {
  const g = data.gacha;
  if (!g) return 0;
  return g.freeDay === dateKey() ? Math.max(0, GACHA.freePerDay - (g.freeUsed || 0)) : GACHA.freePerDay;
};
// 開催中のガチャ（なければ、いつものガチャ）
const openGachas = () => {
  const t = dateKey();
  const list = GACHAS.filter((g) => g.start <= t && t <= g.end && CHARMS.some((c) => seriesOf(c) === g.series));
  return list.length ? list : [STANDARD_GACHA];
};
// 開催期間が終わったシリーズ（ふつうの中身に、ひくい確率で入る）
const endedSeries = () => {
  const t = dateKey();
  const running = new Set(GACHAS.filter((g) => g.start <= t && t <= g.end).map((g) => g.series));
  return new Set(GACHAS.filter((g) => g.end < t && !running.has(g.series)).map((g) => g.series));
};
let gachaTab = null; // 選んでいるガチャの id
const currentGacha = () => {
  const list = openGachas();
  return list.find((g) => g.id === gachaTab) || list[0];
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// レア度：ピックアップ（虹）／レア＝まだ持っていない・終わったシリーズのチャーム（紫）／ふつう（ピンク）
function rarityOf(r, gacha) {
  if (gacha && gacha.series && seriesOf(r.charm) === gacha.series) return "pickup";
  if (r.isNew || isLimited(r.charm)) return "rare";
  return "normal";
}

// 選んだガチャから1つ出す
function drawCharm(gacha, forcePickup = false) {
  const pickupPool = gacha.series ? CHARMS.filter((c) => seriesOf(c) === gacha.series) : [];
  if (pickupPool.length && (forcePickup || Math.random() < GACHA.pickupRate)) return { charm: pick(pickupPool), pickup: true };
  // ふつうの中身：ベーシックライン ＋ 期間が終わったシリーズ（ひくい確率）
  const ended = endedSeries();
  const pool = [];
  for (const c of CHARMS) {
    const s = seriesOf(c);
    if (s === "basic") pool.push([c, 1]);
    else if (ended.has(s)) pool.push([c, GACHA.endedWeight]);
  }
  let r = Math.random() * pool.reduce((t, [, w]) => t + w, 0);
  for (const [c, w] of pool) if ((r -= w) <= 0) return { charm: c, pickup: false };
  return { charm: pool[pool.length - 1][0], pickup: false };
}

// kind: "free" / "one" / "multi"
function runGacha(kind) {
  const g = ensureGacha();
  const gacha = currentGacha();
  const n = kind === "multi" ? GACHA.multiCount : 1;
  if (kind === "free") {
    if (freeLeft() <= 0) return;
    if (g.freeDay !== dateKey()) (g.freeDay = dateKey()), (g.freeUsed = 0);
    g.freeUsed = (g.freeUsed || 0) + 1;
  } else {
    const cost = kind === "multi" ? GACHA.costMulti : GACHA.costOne;
    if (g.coins < cost) return showToast(`コインが${cost - g.coins}枚たりないよ`);
    g.coins -= cost;
  }
  const draws = Array.from({ length: n }, () => drawCharm(gacha));
  // 11連：選んだガチャのシリーズが1個もなかったら、最後の1個をそのシリーズに
  if (kind === "multi" && gacha.series && !draws.some((d) => d.pickup)) draws[n - 1] = drawCharm(gacha, true);
  const results = draws.map(({ charm, pickup }) => {
    const r = { charm, pickup, isNew: !isOwned(charm) };
    if (r.isNew) g.owned.push(charm.id);
    else g.shards += GACHA.shardPerDup;
    r.rarity = rarityOf(r, gacha);
    return r;
  });
  saveData();
  updateCoinBadge();
  playGacha(results, kind === "multi", false, gacha);
}

// ---------- ガチャの画面 ----------

function openGacha() {
  ensureGacha();
  if (!gachaTab) gachaTab = data.gacha.lastTab || null;
  drawGachaScreen();
  $("gacha-screen").hidden = false;
  $("gacha-screen").scrollTop = 0;
  document.body.classList.add("gacha-open");
}
function closeGacha() {
  $("gacha-screen").hidden = true;
  document.body.classList.remove("gacha-open");
  renderAll();
}

function drawGachaScreen() {
  const g = ensureGacha();
  const gacha = currentGacha();
  $("g-coins").textContent = g.coins;
  $("g-shards").textContent = g.shards;
  // タブ（開催中のガチャ）
  const tabs = $("g-tabs");
  tabs.replaceChildren();
  const list = openGachas();
  tabs.hidden = list.length < 2;
  for (const it of list) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `g-tab g-tab-${it.series || "basic"}`;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(it.id === gacha.id));
    b.textContent = it.name;
    b.addEventListener("click", () => {
      gachaTab = it.id;
      data.gacha.lastTab = it.id;
      saveData();
      drawGachaScreen();
    });
    tabs.append(b);
  }
  // バナーと、当たるチャームの一覧（選んだガチャのぶんだけ）
  const banner = $("g-banners");
  banner.replaceChildren();
  if (gacha.series) {
    const s = SERIES[gacha.series] || { name: gacha.series };
    const lineup = CHARMS.filter((c) => seriesOf(c) === gacha.series);
    const have = lineup.filter(isOwned).length;
    const el = document.createElement("section");
    el.className = `g-banner g-banner-${gacha.series}`;
    el.innerHTML = `
      <p class="g-banner-tag">${s.name} 開催中</p>
      <h3 class="g-banner-title">${gacha.name}</h3>
      <p class="g-banner-sub">${s.catch || ""}</p>
      <p class="g-banner-date">${shortDate(gacha.end)}まで ・ 集めた ${have} / ${lineup.length}</p>
      <div class="g-lineup">${lineup
        .map((c) => `<figure class="g-item${isOwned(c) ? " owned" : ""}"><img src="charms/${c.id}.webp" alt="" loading="lazy"><figcaption>${c.name}</figcaption></figure>`)
        .join("")}</div>`;
    banner.append(el);
  } else {
    banner.innerHTML = `<section class="g-banner g-banner-basic"><h3 class="g-banner-title">${gacha.name}</h3><p class="g-banner-sub">いまはピックアップはお休み中だよ</p></section>`;
  }
  // ボタン
  const free = freeLeft();
  $("g-free").disabled = free <= 0;
  $("g-free").querySelector("small").textContent = free > 0 ? "1日1回・どのガチャでもOK" : "今日はひいたよ。また明日";
  $("g-one").disabled = g.coins < GACHA.costOne;
  $("g-multi").disabled = g.coins < GACHA.costMulti;
  $("g-one").querySelector("small").textContent = `コイン${GACHA.costOne}枚`;
  $("g-multi").querySelector("small").textContent = `コイン${GACHA.costMulti}枚で${GACHA.multiCount}回`;
  $("g-multi-note").hidden = !gacha.series;
  if (gacha.series) $("g-multi-note").textContent = `${SERIES[gacha.series]?.name || ""}1個確定！`;
  // かけら
  $("g-shard-text").textContent = `${g.shards} / ${GACHA.shardsForCharm}`;
  $("g-shard-bar").style.width = `${Math.min(100, (g.shards / GACHA.shardsForCharm) * 100)}%`;
  $("g-exchange").disabled = !(g.shards >= GACHA.shardsForCharm && CHARMS.some((c) => !isOwned(c)));
  // 確率ともらい方
  const ended = [...endedSeries()].map((s) => SERIES[s]?.name || s);
  $("g-rates").innerHTML = `
    ${gacha.series ? `<li>${SERIES[gacha.series]?.name}：<b>${Math.round(GACHA.pickupRate * 100)}%</b></li>` : ""}
    <li>そのほか：ベーシックライン${ended.length ? `・${ended.join("・")}（ひくい確率）` : ""}</li>
    <li>持っているチャームが出たら、かけら+${GACHA.shardPerDup}</li>
    <li>コインとかけらは、どのガチャでも共通</li>`;
  $("g-earn").innerHTML = `
    <li>運動のノルマ達成 <b>+${COIN_RULES.quota}</b>（1日1回）</li>
    <li>食事の記録 <b>+${COIN_RULES.meal}</b>（1日1回）</li>
    <li>生理の記録 <b>+${COIN_RULES.period}</b>（ボーナス）</li>
    <li>大瓶に進化 <b>+${COIN_RULES.bigBottle}</b></li>`;
}

// ---------- かけらで交換 ----------

let tradePick = null;
function openTrade() {
  const g = ensureGacha();
  if (g.shards < GACHA.shardsForCharm) return;
  tradePick = null;
  const grid = $("trade-grid");
  grid.replaceChildren();
  const list = CHARMS.filter((c) => !isOwned(c));
  for (const c of list) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "charm-option";
    b.innerHTML = `<img src="charms/${c.id}.webp" alt="" loading="lazy">`;
    b.setAttribute("aria-label", c.name);
    b.addEventListener("click", () => {
      tradePick = c;
      grid.querySelectorAll(".charm-option").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("trade-name").textContent = `${c.name}（${SERIES[seriesOf(c)]?.name || ""}）`;
      $("trade-ok").disabled = false;
    });
    grid.append(b);
  }
  $("trade-sub").textContent = `かけら${GACHA.shardsForCharm}個で、まだ持っていないチャームを1つもらえるよ`;
  $("trade-name").textContent = "チャームを選んでね";
  $("trade-ok").disabled = true;
  $("trade-modal").hidden = false;
}
$("trade-cancel").addEventListener("click", () => ($("trade-modal").hidden = true));
$("trade-ok").addEventListener("click", () => {
  const g = ensureGacha();
  if (!tradePick || g.shards < GACHA.shardsForCharm || isOwned(tradePick)) return;
  g.shards -= GACHA.shardsForCharm;
  g.owned.push(tradePick.id);
  saveData();
  $("trade-modal").hidden = true;
  playGacha([{ charm: tradePick, pickup: false, isNew: true, rarity: "rare" }], false, true, null);
});


// ---------- ガチャの演出 ----------
// 演出は名前で選べる（GACHAS の effect）。シリーズごとに変えたいときは、ここに演出を足して名前を書く
const GACHA_EFFECTS = {
  jewelBox: playJewelBox, // リボンのかかった宝石箱
};
function playGacha(results, multi, traded, gacha) {
  results.forEach((r) => (r.rarity = r.rarity || rarityOf(r, gacha)));
  const fx = GACHA_EFFECTS[(gacha && gacha.effect) || "jewelBox"] || playJewelBox;
  fx(results, { multi, traded, gacha });
}

const reduceMotionGacha = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
let gachaTimers = [];
const later = (ms, fn) => gachaTimers.push(setTimeout(fn, ms));

// 宝石箱：出てくる → タップでリボンがほどけて、フタがゆっくり開く → 光があふれて、チャームがふわっと浮かぶ
// フタが開く前の光の色で、レア度がわかる（ふつう＝ピンク・レア＝むらさき・ピックアップ＝虹色）
function playJewelBox(results, { multi, traded }) {
  const ov = $("gacha-anim");
  const stage = $("gacha-stage");
  const out = $("gacha-results");
  gachaTimers.forEach(clearTimeout);
  gachaTimers = [];
  stage.replaceChildren();
  stage.onclick = null;
  out.replaceChildren();
  out.hidden = true;
  $("gacha-anim-ok").hidden = true;
  $("gacha-skip").hidden = false;
  ov.hidden = false;

  const wrap = document.createElement("div");
  wrap.className = "jb-wrap" + (multi ? " multi" : "");
  const boxes = results.map((r, i) => {
    const box = document.createElement("div");
    box.className = `jbox r-${r.rarity}`;
    box.style.setProperty("--d", `${(multi ? i * 0.06 : 0).toFixed(2)}s`);
    box.innerHTML = `
      <span class="jb-glow"></span><span class="jb-rays"></span>
      <img class="jb-charm" src="charms/${r.charm.id}.webp" alt="">
      <span class="jb-base"><i class="jb-gem"></i></span>
      <span class="jb-seam"></span>
      <span class="jb-lid"></span>
      <span class="jb-ribbon-v"></span><span class="jb-ribbon-h"></span>
      <span class="jb-bow"><i></i><i></i><b></b></span>`;
    wrap.append(box);
    return box;
  });
  stage.append(wrap);
  const hint = document.createElement("p");
  hint.className = "gacha-hint";
  hint.textContent = traded ? "タップして開けてね" : multi ? "タップして、まとめて開けよう" : "タップして開けてね";
  stage.append(hint);

  let opened = false;
  const finish = () => {
    gachaTimers.forEach(clearTimeout);
    gachaTimers = [];
    stage.onclick = null;
    $("gacha-skip").hidden = true;
    stage.replaceChildren();
    showGachaResults(results, multi, traded);
  };
  $("gacha-skip").onclick = finish;
  if (reduceMotionGacha()) return finish();

  const openBox = (box, rise) => {
    box.classList.add("untie");                    // リボンがほどける
    later(rise ? 450 : 260, () => box.classList.add("open")); // フタが開いて、光とチャーム
    if (rise) later(900, () => { for (let k = 0; k < 8; k++) gachaSpark(stage, box); });
  };
  stage.onclick = () => {
    if (opened) return finish(); // 開けている途中のタップは、スキップ
    opened = true;
    hint.remove();
    if (multi) {
      boxes.forEach((b, i) => later(i * 130, () => openBox(b, false)));
      later(boxes.length * 130 + 1300, finish);
    } else {
      openBox(boxes[0], true);
      later(2500, finish);
    }
  };
}

// 小さな星のキラキラ（宝石箱のまわり）
function gachaSpark(stage, box) {
  const r = box.getBoundingClientRect(), s0 = stage.getBoundingClientRect();
  const s = document.createElement("span");
  s.className = "g-spark";
  s.style.left = r.left - s0.left + r.width * (0.1 + Math.random() * 0.8) + "px";
  s.style.top = r.top - s0.top - r.height * (0.6 + Math.random() * 0.6) + "px";
  stage.append(s);
  setTimeout(() => s.remove(), 1200);
}

function showGachaResults(results, multi, traded) {
  const out = $("gacha-results");
  out.replaceChildren();
  const head = document.createElement("h3");
  head.className = "g-result-title";
  const newCount = results.filter((r) => r.isNew).length;
  const shards = results.filter((r) => !r.isNew).length * GACHA.shardPerDup;
  head.textContent = traded ? "交換したよ！" : newCount ? `新しいチャーム ${newCount}個！` : "ぜんぶ持ってたよ";
  out.append(head);
  const grid = document.createElement("div");
  grid.className = "g-result-grid" + (multi ? " multi" : "");
  results.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = `g-card r-${r.rarity}` + (r.isNew ? " is-new" : "");
    card.style.animationDelay = `${multi ? i * 0.05 : 0}s`;
    const sName = SERIES[seriesOf(r.charm)]?.name || "";
    card.innerHTML = `
      ${r.isNew ? `<span class="g-new">NEW</span>` : ""}
      <img src="charms/${r.charm.id}.webp" alt="">
      <span class="g-card-name">${r.charm.name}</span>
      <span class="g-card-sub">${r.isNew ? sName : `かけら+${GACHA.shardPerDup}`}</span>`;
    grid.append(card);
  });
  out.append(grid);
  if (shards && !traded) {
    const p = document.createElement("p");
    p.className = "g-result-note";
    p.textContent = `かぶったチャームは、かけら${shards}個になったよ（いま${data.gacha.shards}個）`;
    out.append(p);
  }
  if (newCount) {
    const p = document.createElement("p");
    p.className = "g-result-note";
    p.textContent = "大瓶の棚で、大瓶をタップするとつけられるよ";
    out.append(p);
  }
  out.hidden = false;
  $("gacha-anim-ok").hidden = false;
}

$("gacha-anim-ok").addEventListener("click", () => {
  $("gacha-anim").hidden = true;
  drawGachaScreen();
});

// ---------- ボタン ----------

$("coin-btn").addEventListener("click", openGacha);
$("gacha-close").addEventListener("click", closeGacha);
$("g-free").addEventListener("click", () => runGacha("free"));
$("g-one").addEventListener("click", () => runGacha("one"));
$("g-multi").addEventListener("click", () => runGacha("multi"));
$("g-exchange").addEventListener("click", openTrade);

// 画面を描き直すたびに、コインを確かめる
{
  const baseRenderAll = renderAll;
  renderAll = function () {
    baseRenderAll();
    checkCoinRewards();
  };
}

ensureGacha();
saveData();
checkCoinRewards();
