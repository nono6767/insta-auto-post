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

// ピックアップ（開催する期間。終わったシリーズは、ふつうのガチャにひくい確率で入る）
const PICKUPS = [
  { series: "wanko", start: "2026-11-20", end: "2026-12-31" },
  { series: "ballet", start: "2026-11-20", end: "2026-12-31" },
];

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
const activePickups = () => {
  const t = dateKey();
  return PICKUPS.filter((p) => p.start <= t && t <= p.end && CHARMS.some((c) => seriesOf(c) === p.series));
};
const endedSeries = () => {
  const t = dateKey();
  const active = new Set(activePickups().map((p) => p.series));
  return new Set(PICKUPS.filter((p) => p.end < t && !active.has(p.series)).map((p) => p.series));
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function drawCharm(forcePickup = false) {
  const pickupSeries = new Set(activePickups().map((p) => p.series));
  const pickupPool = CHARMS.filter((c) => pickupSeries.has(seriesOf(c)));
  if (pickupPool.length && (forcePickup || Math.random() < GACHA.pickupRate)) return { charm: pick(pickupPool), pickup: true };
  // ふつうの中身：ベーシックライン ＋ ピックアップが終わったシリーズ（ひくい確率）
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

// n回ひく。kind: "free" / "one" / "multi"
function runGacha(kind) {
  const g = ensureGacha();
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
  const draws = Array.from({ length: n }, () => drawCharm());
  // 11連：ピックアップのチャームが1個もなかったら、最後の1個をピックアップに
  if (kind === "multi" && activePickups().length && !draws.some((d) => d.pickup)) draws[n - 1] = drawCharm(true);
  const results = draws.map(({ charm, pickup }) => {
    if (isOwned(charm)) {
      g.shards += GACHA.shardPerDup;
      return { charm, pickup, isNew: false };
    }
    g.owned.push(charm.id);
    return { charm, pickup, isNew: true };
  });
  saveData();
  updateCoinBadge();
  playGacha(results, kind === "multi");
}

// ---------- ガチャの画面 ----------

function openGacha() {
  ensureGacha();
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
  $("g-coins").textContent = g.coins;
  $("g-shards").textContent = g.shards;
  // ピックアップのバナーと、当たるチャームの一覧
  const banners = $("g-banners");
  banners.replaceChildren();
  const pickups = activePickups();
  for (const p of pickups) {
    const s = SERIES[p.series] || { name: p.series };
    const list = CHARMS.filter((c) => seriesOf(c) === p.series);
    const have = list.filter(isOwned).length;
    const el = document.createElement("section");
    el.className = `g-banner g-banner-${p.series}`;
    el.innerHTML = `
      <p class="g-banner-tag">ピックアップ開催中</p>
      <h3 class="g-banner-title">${s.name}</h3>
      <p class="g-banner-sub">${s.catch || ""}</p>
      <p class="g-banner-date">${shortDate(p.end)}まで ・ 集めた ${have} / ${list.length}</p>
      <div class="g-lineup">${list
        .map((c) => `<figure class="g-item${isOwned(c) ? " owned" : ""}"><img src="charms/${c.id}.webp" alt="" loading="lazy"><figcaption>${c.name}</figcaption></figure>`)
        .join("")}</div>`;
    banners.append(el);
  }
  if (!pickups.length) banners.innerHTML = `<p class="hint center">いまはピックアップはお休み中だよ</p>`;
  // ボタン
  const free = freeLeft();
  $("g-free").disabled = free <= 0;
  $("g-free").querySelector("small").textContent = free > 0 ? "今日の1回" : "また明日";
  $("g-one").disabled = g.coins < GACHA.costOne;
  $("g-multi").disabled = g.coins < GACHA.costMulti;
  $("g-one").querySelector("small").textContent = `コイン${GACHA.costOne}枚`;
  $("g-multi").querySelector("small").textContent = `コイン${GACHA.costMulti}枚で${GACHA.multiCount}回`;
  $("g-multi-note").hidden = !pickups.length;
  // かけら
  $("g-shard-text").textContent = `${g.shards} / ${GACHA.shardsForCharm}`;
  $("g-shard-bar").style.width = `${Math.min(100, (g.shards / GACHA.shardsForCharm) * 100)}%`;
  const canTrade = g.shards >= GACHA.shardsForCharm && CHARMS.some((c) => !isOwned(c));
  $("g-exchange").disabled = !canTrade;
  // 確率ともらい方
  const ended = [...endedSeries()].map((s) => SERIES[s]?.name || s);
  $("g-rates").innerHTML = `
    <li>ピックアップ中のシリーズ：<b>${Math.round(GACHA.pickupRate * 100)}%</b>${pickups.length ? "" : "（いまはなし）"}</li>
    <li>そのほか：ベーシックライン${ended.length ? `・${ended.join("・")}（ひくい確率）` : ""}</li>
    <li>持っているチャームが出たら、かけら+${GACHA.shardPerDup}</li>`;
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
  playGacha([{ charm: tradePick, pickup: isLimited(tradePick), isNew: true }], false, true);
});

// ---------- ガチャの演出 ----------

const reduceMotionGacha = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
let gachaTimers = [];

function playGacha(results, multi, traded = false) {
  const ov = $("gacha-anim");
  const stage = $("gacha-stage");
  const out = $("gacha-results");
  gachaTimers.forEach(clearTimeout);
  gachaTimers = [];
  stage.replaceChildren();
  out.replaceChildren();
  out.hidden = true;
  $("gacha-anim-ok").hidden = true;
  ov.classList.toggle("multi", multi);
  ov.hidden = false;
  const rare = results.some((r) => r.pickup);
  const anyNew = results.some((r) => r.isNew);

  // カプセル（ピックアップが入っているときは、虹色に光る）
  const cap = document.createElement("div");
  cap.className = "capsule" + (rare ? " rare" : "") + (multi ? " big" : "");
  cap.innerHTML = `<span class="cap-top"></span><span class="cap-band"></span><span class="cap-bottom"></span><span class="cap-shine"></span>`;
  stage.append(cap);
  const hint = document.createElement("p");
  hint.className = "gacha-hint";
  hint.textContent = traded ? "かけらが、チャームに変わるよ…" : multi ? `${results.length}連ガチャ！` : "なにが出るかな…";
  stage.append(hint);

  const show = () => {
    stage.replaceChildren();
    showGachaResults(results, multi, traded);
  };
  if (reduceMotionGacha()) return show();

  // 1) 落ちてくる → 2) ゆれる（だんだん強く）→ 3) ぱかっと開いて光る
  cap.animate(
    [
      { transform: "translateY(-120vh) rotate(-20deg)" },
      { transform: "translateY(0) rotate(8deg)", offset: 0.7 },
      { transform: "translateY(-6%) rotate(-4deg)", offset: 0.85 },
      { transform: "translateY(0) rotate(0deg)" },
    ],
    { duration: 700, easing: "ease-in" }
  );
  const shakeAt = 750;
  gachaTimers.push(setTimeout(() => cap.classList.add("shaking"), shakeAt));
  gachaTimers.push(setTimeout(() => cap.classList.add("glowing"), shakeAt + 700));
  for (let i = 0; i < 12; i++) gachaTimers.push(setTimeout(() => gachaSpark(stage, rare), shakeAt + 200 + i * 110));
  const openAt = shakeAt + 1500 + (rare ? 400 : 0);
  gachaTimers.push(
    setTimeout(() => {
      cap.classList.remove("shaking");
      cap.classList.add("open");
      const flash = document.createElement("div");
      flash.className = "gacha-flash" + (rare ? " rare" : "");
      stage.append(flash);
      for (let i = 0; i < 22; i++) gachaBurst(stage, i, rare);
    }, openAt)
  );
  gachaTimers.push(setTimeout(show, openAt + 650));
  // 演出中にタップすると、すぐ結果へ
  stage.onclick = () => {
    if (out.hidden) {
      gachaTimers.forEach(clearTimeout);
      show();
    }
  };
  if (anyNew) ov.dataset.new = "1";
}

function gachaSpark(stage, rare) {
  const s = document.createElement("span");
  s.className = "g-spark";
  s.style.left = 30 + Math.random() * 40 + "%";
  s.style.top = 30 + Math.random() * 30 + "%";
  if (rare) s.style.background = ["#fff6c8", "#ffd1e3", "#c9f1ff", "#e2d4ff"][Math.floor(Math.random() * 4)];
  stage.append(s);
  setTimeout(() => s.remove(), 1200);
}
function gachaBurst(stage, i, rare) {
  const s = document.createElement("span");
  s.className = "g-burst";
  const a = (i / 22) * Math.PI * 2;
  const r = 120 + Math.random() * 90;
  s.style.setProperty("--dx", `${Math.cos(a) * r}px`);
  s.style.setProperty("--dy", `${Math.sin(a) * r}px`);
  s.style.background = rare ? ["#ffe08a", "#ffb3cf", "#b8ecff", "#d9c8ff"][i % 4] : i % 2 ? "#fff" : "#ffd6e4";
  stage.append(s);
  setTimeout(() => s.remove(), 1300);
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
    card.className = "g-card" + (r.pickup ? " pickup" : "") + (r.isNew ? " is-new" : "");
    card.style.animationDelay = `${multi ? i * 0.08 : 0}s`;
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
