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
  quota: 3,     // その日の運動がノルマ（35分）に届いた（1日1回）
  quizPlay: 1,     // ピラティスクイズを最後（5問）までやった
  quizPerfect: 3,  // ピラティスクイズで全問正解（このときは参加の1コインのかわりに3コイン）
  quizDailyMax: 3, // クイズでもらえるコインは、1日にここまで
  overMin: 30,  // ノルマ達成のあと、さらにこの分数を運動するごとに…
  over: 1,      // …このコインがもらえる（例：35分でノルマ → 65分で+1、95分で+1 …）
  meal: 1,      // 食事を記録した（1日1回まで）
  period: 1,    // 生理を記録した（ボーナス。始まりを記録したとき）
  periodDay: 1, // 生理中に、その日のからだの記録をした（毎日）
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
  maxPickups: 2,       // 同時に開催するピックアップガチャの数
  noticeDays: 14,      // ピックアップの予告を出すのは、開始の何日前から
};

// シリーズ（ベーシックライン ＋ js/series.js の SERIES_LIST）
const SERIES = {
  basic: { name: "ベーシックライン", color: "#e8a3b8" },
  ...Object.fromEntries(SERIES_LIST.map((x) => [x.id, x])),
};
// ガチャは2種類：ピックアップガチャ（js/series.js の期間で、同時に2つまで）と、常設の「いろいろガチャ」
// いろいろガチャ：ピックアップが一度終わったシリーズ（ベーシックライン以外）が、ぜんぶ同じ確率で出る
const MIX_GACHA = { id: "mix", name: "いろいろガチャ", series: null, mix: true, effect: "jewelBox" };

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
  // 「ノルマのあと30分ごと」を始める前の日のぶんは、まとめて出さない（今日のぶんは、もらえる）
  // 「生理中は毎日」を始める前の日のぶんは、まとめて出さない（今日のぶんは、もらえる）
  if (!g.periodDayStart) {
    const today = dateKey();
    for (const r of rewardList()) if (r.key.startsWith("pd:") && r.day !== today) g.given[r.key] = true;
    g.periodDayStart = today;
  }
  if (!g.overStart) {
    const today = dateKey();
    for (const r of rewardList()) if (r.key.startsWith("qx:") && r.day !== today) g.given[r.key] = true;
    g.overStart = today;
  }
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
  for (const [day, min] of Object.entries(byDay)) {
    if (min < DAILY_QUOTA_MIN) continue;
    out.push({ key: "q:" + day, amount: COIN_RULES.quota, label: "ノルマ達成", day });
    // ノルマのあとも、30分ごとに+1
    const extra = Math.floor((min - DAILY_QUOTA_MIN) / COIN_RULES.overMin);
    for (let k = 1; k <= extra; k++) out.push({ key: `qx:${day}:${k}`, amount: COIN_RULES.over, label: `ノルマのあと+${k * COIN_RULES.overMin}分`, day });
  }
  for (const [day, m] of Object.entries(data.meals || {})) {
    if (m && Object.values(m).some((v) => v && (typeof v !== "object" || Object.keys(v).length))) out.push({ key: "m:" + day, amount: COIN_RULES.meal, label: "食事の記録", day });
  }
  for (const p of data.periods || []) out.push({ key: "p:" + p.start, amount: COIN_RULES.period, label: "生理の記録ボーナス" });
  // 生理中は、その日のからだの記録をすると毎日+1
  if (typeof periodOn === "function") {
    for (const [day, rec] of Object.entries(data.body || {})) {
      if (rec && Object.values(rec).some((v) => v !== null && v !== undefined && v !== "") && periodOn(day))
        out.push({ key: "pd:" + day, amount: COIN_RULES.periodDay, label: "生理中の記録", day });
    }
  }
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
  $("coin-btn").setAttribute("aria-label", `ガチャ。コイン${g.coins}枚${freeLeft() > 0 ? "。今日の無料ガチャがあるよ" : ""}`);
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
// 開催中のガチャ：ピックアップ（開始日が早い順に、最大2つ）＋ いろいろガチャ
const openGachas = () => {
  const t = dateKey();
  // 3つ以上重なったときは、新しく始まったものを優先して2つまで
  const pickups = SERIES_PICKUPS.filter((p) => p.start <= t && t <= p.end && SERIES[p.series])
    .slice()
    .reverse()
    .slice(0, GACHA.maxPickups)
    .map((p) => {
      const sr = SERIES[p.series];
      return { id: `${p.series}-${p.start}`, name: sr.gachaName || sr.name.replace(/シリーズ$/, "") + "ガチャ", series: p.series, start: p.start, end: p.end, revival: p.revival, effect: sr.effect || "jewelBox" };
    });
  return [...pickups, MIX_GACHA];
};
// ピックアップが一度終わったシリーズ（いろいろガチャに入る）
const releasedSeries = () => {
  const t = dateKey();
  return new Set(SERIES_PICKUPS.filter((p) => p.end < t).map((p) => p.series));
};
// ピックアップが終わっていて、いまピックアップ中ではないシリーズ（ピックアップガチャのふつうの中身に、ひくい確率で入る）
const endedSeries = () => {
  const running = new Set(openGachas().map((g) => g.series).filter(Boolean));
  return new Set([...releasedSeries()].filter((x) => !running.has(x)));
};
// いろいろガチャの中身
const mixPool = () => {
  const rel = releasedSeries();
  return CHARMS.filter((c) => rel.has(seriesOf(c)));
};
// 一度でも始まったシリーズ（かけらで交換できる。まだ始まっていないシリーズは、ないしょ）
const startedSeries = () => {
  const t = dateKey();
  return new Set(SERIES_PICKUPS.filter((p) => p.start <= t).map((p) => p.series));
};
// もうすぐ始まるピックアップ（予告）。js/series.js で preview: false にしたシリーズは出さない
const upcomingPickups = () => {
  const t = dateKey(), until = addDaysKey(t, GACHA.noticeDays);
  return SERIES_PICKUPS.filter((p) => p.start > t && p.start <= until && SERIES[p.series] && SERIES[p.series].preview !== false);
};
const daysUntil = (start) => Math.round((Date.parse(start) - Date.parse(dateKey())) / 86400000);
const daysLeft = (end) => Math.round((Date.parse(end) - Date.parse(dateKey())) / 86400000) + 1; // 今日をふくめて、あと何日
let gachaTab = null; // 選んでいるガチャの id
const currentGacha = () => {
  const list = openGachas();
  return list.find((g) => g.id === gachaTab) || list[0];
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// レア度の見かた（バナーの下に出す）
const GRADE_LEGEND = `<p class="g-grade-legend"><span class="grade-badge grade-super">★★★</span>スーパーレア <span class="grade-badge grade-rare">★★</span>レア <small>（レアほど出にくい）</small></p>`;
// レア度で重みをつけて1つ選ぶ（スーパーレア・レアは出にくい。js/series.js の GRADES）
function pickByGrade(arr) {
  let r = Math.random() * arr.reduce((t, c) => t + gradeWeight(c), 0);
  for (const c of arr) if ((r -= gradeWeight(c)) <= 0) return c;
  return arr[arr.length - 1];
}

// レア度：ピックアップ（虹）／レア＝まだ持っていない・終わったシリーズのチャーム（紫）／ふつう（ピンク）
function rarityOf(r, gacha) {
  if (gacha && gacha.series && seriesOf(r.charm) === gacha.series) return "pickup";
  if (r.isNew || isLimited(r.charm)) return "rare";
  return "normal";
}

// 選んだガチャから1つ出す
function drawCharm(gacha, forcePickup = false) {
  if (gacha.mix) return { charm: pickByGrade(mixPool()), pickup: false };
  const pickupPool = gacha.series ? CHARMS.filter((c) => seriesOf(c) === gacha.series) : [];
  if (pickupPool.length && (forcePickup || Math.random() < GACHA.pickupRate)) return { charm: pickByGrade(pickupPool), pickup: true };
  // ふつうの中身：ベーシックライン ＋ 期間が終わったシリーズ（ひくい確率）
  const ended = endedSeries();
  const pool = [];
  for (const c of CHARMS) {
    const s = seriesOf(c);
    if (s === "basic") pool.push([c, 1]);
    else if (ended.has(s)) pool.push([c, GACHA.endedWeight * gradeWeight(c)]);
  }
  let r = Math.random() * pool.reduce((t, [, w]) => t + w, 0);
  for (const [c, w] of pool) if ((r -= w) <= 0) return { charm: c, pickup: false };
  return { charm: pool[pool.length - 1][0], pickup: false };
}

// kind: "free" / "one" / "multi"
function runGacha(kind) {
  const g = ensureGacha();
  const gacha = currentGacha();
  if (gacha.mix && !mixPool().length) return;
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
  // キャラがびっくりする（ピックアップやレアの新しいチャームが出たとき）
  const wow = results.find((r) => r.isNew && r.rarity === "pickup") || results.find((r) => r.isNew && r.rarity === "rare");
  if (typeof talkState !== "undefined") talkState.lastDraw = wow ? wow.charm.name : null;
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
    b.className = `g-tab g-tab-${it.mix ? "mix" : it.series || "basic"}`;
    if (it.series) b.style.setProperty("--c", SERIES[it.series]?.color || "#f28db0");
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
  const item = (c) => `<figure class="g-item${isOwned(c) ? " owned" : ""}${gradeOf(c) ? " grade-" + c.grade : ""}">${gradeBadge(c)}<img src="${charmSrc(c)}" alt="" loading="lazy"><figcaption>${c.name}</figcaption></figure>`;
  if (gacha.series) {
    const sr = SERIES[gacha.series] || { name: gacha.series };
    const lineup = CHARMS.filter((c) => seriesOf(c) === gacha.series);
    const have = lineup.filter(isOwned).length;
    const left = daysLeft(gacha.end);
    const el = document.createElement("section");
    el.className = `g-banner g-banner-${gacha.series}`;
    el.style.setProperty("--c", sr.color || "#e8a3b8");
    el.innerHTML = `
      <p class="g-banner-tag">${gacha.revival ? "復刻ピックアップ" : "ピックアップ開催中"}</p>${gacha.revival ? `<span class="g-revival">復刻</span>` : ""}
      <h3 class="g-banner-title">${gacha.name}</h3>
      <p class="g-banner-sub">${sr.catch || ""}</p>
      <p class="g-banner-date"><b class="g-days">${left <= 1 ? "今日まで！" : `あと${left}日`}</b>（${shortDate(gacha.end)}まで） ・ 集めた ${have} / ${lineup.length}</p>
      <div class="g-lineup">${lineup.map(item).join("")}</div>${GRADE_LEGEND}`;
    banner.append(el);
  } else {
    const pool = mixPool();
    const groups = [...releasedSeries()].map((id) => {
      const list = pool.filter((c) => seriesOf(c) === id);
      return `<p class="g-mix-name">${SERIES[id]?.name || id} <small>${list.filter(isOwned).length} / ${list.length}</small></p><div class="g-lineup">${list.map(item).join("")}</div>`;
    });
    banner.innerHTML = `<section class="g-banner g-banner-mix">
      <p class="g-banner-tag">いつでも引ける</p>
      <h3 class="g-banner-title">${gacha.name}</h3>
      <p class="g-banner-sub">${pool.length ? "ピックアップが終わったシリーズが、ぜんぶ入っているよ" : "ピックアップが終わったシリーズが、ここに入るよ。お楽しみに！"}</p>
      ${groups.join("")}${pool.length ? GRADE_LEGEND : ""}</section>`;
  }
  // 予告：もうすぐ始まるピックアップ（チャームはシルエットで、ちらっと見せる）
  const notice = $("g-notice");
  notice.replaceChildren();
  for (const p of upcomingPickups()) {
    const sr = SERIES[p.series];
    const lineup = CHARMS.filter((c) => seriesOf(c) === p.series);
    const n = daysUntil(p.start);
    const el = document.createElement("section");
    el.className = "g-notice";
    el.style.setProperty("--c", sr.color || "#e8a3b8");
    el.innerHTML = `
      <p class="g-notice-tag">${p.revival ? "復刻予告" : "ピックアップ予告"}</p>
      <h3 class="g-notice-title">${sr.name}</h3>
      <p class="g-notice-date"><b>${n === 1 ? "明日から！" : `あと${n}日`}</b>（${shortDate(p.start)}〜${shortDate(p.end)}）</p>
      ${sr.catch ? `<p class="g-notice-sub">${sr.catch}</p>` : ""}
      <div class="g-notice-lineup">${lineup.map((c) => (p.revival ? `<img src="${charmSrc(c)}" alt="${c.name}" loading="lazy">` : `<img class="silhouette" src="${charmSrc(c)}" alt="" loading="lazy">`)).join("")}</div>`;
    notice.append(el);
  }
  // ボタン
  const free = freeLeft();
  $("g-free").disabled = free <= 0;
  $("g-free").querySelector("small").textContent = free > 0 ? "1日1回・どのガチャでもOK" : "今日はひいたよ。また明日";
  const empty = gacha.mix && !mixPool().length;
  if (empty) $("g-free").disabled = true;
  $("g-one").disabled = empty || g.coins < GACHA.costOne;
  $("g-multi").disabled = empty || g.coins < GACHA.costMulti;
  $("g-one").querySelector("small").textContent = `コイン${GACHA.costOne}枚`;
  $("g-multi").querySelector("small").textContent = `コイン${GACHA.costMulti}枚で${GACHA.multiCount}回`;
  $("g-multi-note").hidden = !gacha.series;
  if (gacha.series) $("g-multi-note").textContent = `${SERIES[gacha.series]?.name || ""}1個確定！`;
  // かけら
  $("g-shard-text").textContent = `${g.shards} / ${GACHA.shardsForCharm}`;
  $("g-shard-bar").style.width = `${Math.min(100, (g.shards / GACHA.shardsForCharm) * 100)}%`;
  $("g-exchange").disabled = !(g.shards >= GACHA.shardsForCharm && CHARMS.some((c) => !isOwned(c) && (!isLimited(c) || startedSeries().has(seriesOf(c)))));
  // 確率ともらい方
  const ended = [...endedSeries()].map((s) => SERIES[s]?.name || s);
  $("g-rates").innerHTML = `
    ${gacha.mix
      ? `<li>これまでのシリーズ${releasedSeries().size ? `（${[...releasedSeries()].map((x) => SERIES[x]?.name || x).join("・")}）` : ""}のチャームが、どれも同じ確率で出るよ</li>`
      : `<li>${SERIES[gacha.series]?.name}：<b>${Math.round(GACHA.pickupRate * 100)}%</b>（11連は1個以上確定）</li>
    <li>そのほか：ベーシックライン${ended.length ? `・${ended.join("・")}（ひくい確率）` : ""}</li>`}
    <li>持っているチャームが出たら、かけら+${GACHA.shardPerDup}</li>
    <li>コインとかけらは、どのガチャでも共通</li>`;
  $("g-earn").innerHTML = `
    <li>運動のノルマ達成 <b>+${COIN_RULES.quota}</b>（1日1回）</li>
    <li>食事の記録 <b>+${COIN_RULES.meal}</b>（1日1回）</li>
    <li>生理の記録 <b>+${COIN_RULES.period}</b>（ボーナス）・生理中のからだの記録 <b>+${COIN_RULES.periodDay}</b>（毎日）</li>
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
  // どのシリーズでも交換できる（開催期間は関係なし。まだ始まっていないシリーズだけは、ないしょ）
  const started = startedSeries();
  const list = CHARMS.filter((c) => !isOwned(c) && (!isLimited(c) || started.has(seriesOf(c))));
  for (const c of list) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "charm-option" + (gradeOf(c) ? ` grade-${c.grade}` : "");
    b.innerHTML = `${gradeBadge(c)}<img src="${charmSrc(c)}" alt="" loading="lazy">`;
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
    box.innerHTML = jewelBoxHtml(`<img class="jb-charm" src="${charmSrc(r.charm)}" alt="">`);
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

  // 箱が少しゆれる → リボンがほどける → ふたがゆっくり開く → 光があふれて、チャームがふわっと浮かぶ
  const openBox = (box, single) => {
    box.classList.add("wobble");
    later(single ? 700 : 300, () => box.classList.add("untie"));
    later(single ? 1200 : 560, () => box.classList.add("open"));
    if (single) later(1700, () => { for (let k = 0; k < 8; k++) gachaSpark(stage, box); });
  };
  stage.onclick = () => {
    if (opened) return finish(); // 開けている途中のタップは、スキップ
    opened = true;
    hint.remove();
    if (multi) {
      boxes.forEach((b, i) => later(i * 130, () => openBox(b, false)));
      later(boxes.length * 130 + 1700, finish);
    } else {
      openBox(boxes[0], true);
      later(4400, finish);
    }
  };
}

// ---------- 宝石箱の絵 ----------
// ★ あとでイラストに差しかえるときは、ここに画像のファイル名を書くだけ（箱の下の部分とふたを、別々の画像にする）
//   例：{ base: "img/box-base.webp", lid: "img/box-lid.webp", lidInside: "img/box-lid-inside.webp" }
//   画像は「200×200 の正方形」の中に、下の絵と同じ位置で描く（ふたのつなぎ目＝上から47%の高さ）
const JEWEL_BOX_ART = { base: null, lid: null, lidInside: null }; // lidInside：開いたふたの内側

// 箱の下の部分（アイボリー・金のふち・角の飾り・正面のピンクの宝石・中のベルベット）
const JB_BASE_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="jbIvory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset=".55" stop-color="#f6ead3"/><stop offset="1" stop-color="#dcc6a2"/></linearGradient>
    <linearGradient id="jbRound" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8865a" stop-opacity=".25"/><stop offset=".22" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#8a6a40" stop-opacity=".3"/></linearGradient>
    <linearGradient id="jbGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2bf"/><stop offset=".45" stop-color="#e2b75c"/><stop offset="1" stop-color="#a87a2c"/></linearGradient>
    <radialGradient id="jbVelvet" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#f4a6c4"/><stop offset=".6" stop-color="#d4648f"/><stop offset="1" stop-color="#9c3a63"/></radialGradient>
    <linearGradient id="jbGem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffb6d0"/><stop offset="1" stop-color="#d9457f"/></linearGradient>
  </defs>
  <ellipse cx="100" cy="186" rx="84" ry="8" fill="#2a1020" opacity=".35"/>
  <path d="M22 96 H178 V170 Q178 184 164 184 H36 Q22 184 22 170 Z" fill="url(#jbIvory)" stroke="#b8904f" stroke-width="2"/>
  <path d="M22 96 H178 V170 Q178 184 164 184 H36 Q22 184 22 170 Z" fill="url(#jbRound)"/>
  <ellipse cx="100" cy="97" rx="76" ry="9" fill="url(#jbVelvet)" stroke="url(#jbGold)" stroke-width="3"/>
  <ellipse cx="100" cy="99" rx="64" ry="5" fill="#8a2d55" opacity=".35"/>
  <rect x="22" y="100" width="156" height="7" fill="url(#jbGold)"/>
  <path d="M22 170 Q22 184 36 184 H164 Q178 184 178 170 V166 H22 Z" fill="url(#jbGold)"/>
  <g fill="none" stroke="url(#jbGold)" stroke-width="3" stroke-linecap="round">
    <path d="M28 112 q10 2 12 12 M28 160 q10 -2 12 -12"/><path d="M172 112 q-10 2 -12 12 M172 160 q-10 -2 -12 -12"/>
  </g>
  <g fill="url(#jbGold)"><circle cx="30" cy="136" r="4"/><circle cx="170" cy="136" r="4"/></g>
  <ellipse cx="100" cy="138" rx="17" ry="20" fill="url(#jbGold)" stroke="#a87a2c" stroke-width="1"/>
  <path d="M100 124 L111 136 L100 152 L89 136 Z" fill="url(#jbGem)" stroke="#b03a6a" stroke-width="1.2"/>
  <path d="M100 124 L104 134 L100 136 L94 133 Z" fill="#fff" opacity=".85"/>
</svg>`;
// ふた（ふくらんだドーム型・金のふちと飾り・上のつまみ）
const JB_LID_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="jbLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffefa"/><stop offset=".6" stop-color="#f5e8cf"/><stop offset="1" stop-color="#e0cba6"/></linearGradient>
    <linearGradient id="jbGold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2bf"/><stop offset=".45" stop-color="#e2b75c"/><stop offset="1" stop-color="#a87a2c"/></linearGradient>
  </defs>
  <path d="M18 96 V84 C18 34 182 34 182 84 V96 Z" fill="url(#jbLid)" stroke="#b8904f" stroke-width="2"/>
  <ellipse cx="68" cy="58" rx="30" ry="10" fill="#fff" opacity=".75" transform="rotate(-14 68 58)"/>
  <path d="M30 80 C40 52 160 52 170 80" fill="none" stroke="url(#jbGold2)" stroke-width="2.5"/>
  <g fill="url(#jbGold2)"><circle cx="54" cy="64" r="3"/><circle cx="146" cy="64" r="3"/><circle cx="100" cy="54" r="3.5"/></g>
  <rect x="16" y="86" width="168" height="12" rx="5" fill="url(#jbGold2)" stroke="#a87a2c" stroke-width="1"/>
  <g fill="#fff6d6" opacity=".9"><circle cx="40" cy="92" r="1.6"/><circle cx="70" cy="92" r="1.6"/><circle cx="130" cy="92" r="1.6"/><circle cx="160" cy="92" r="1.6"/></g>
</svg>`;
// 開いたふたの内側（箱のうしろに立って、ピンクのベルベットの内張りが見える）
const JB_LID_INSIDE_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <radialGradient id="jbVelvet2" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="#f6b2cb"/><stop offset=".6" stop-color="#d86b95"/><stop offset="1" stop-color="#a3416a"/></radialGradient>
    <linearGradient id="jbGold3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2bf"/><stop offset=".45" stop-color="#e2b75c"/><stop offset="1" stop-color="#a87a2c"/></linearGradient>
  </defs>
  <path d="M18 98 V62 C18 14 182 14 182 62 V98 Z" fill="#f3e6cf" stroke="#b8904f" stroke-width="2"/>
  <path d="M28 96 V64 C28 26 172 26 172 64 V96 Z" fill="url(#jbVelvet2)" stroke="url(#jbGold3)" stroke-width="3"/>
  <path d="M40 90 V66 C40 38 160 38 160 66 V90" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2" stroke-dasharray="2 4"/>
  <ellipse cx="78" cy="52" rx="26" ry="8" fill="#fff" opacity=".22" transform="rotate(-12 78 52)"/>
</svg>`;

// 布のリボン（細くて平たい。うっすらツヤと影）と、ちょうちょ結び（小さめの輪2つと、垂れる端2本）
const JB_RIBBON_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="rbV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c95683"/><stop offset=".18" stop-color="#ec8fb2"/><stop offset=".45" stop-color="#fbc6da"/><stop offset=".62" stop-color="#ef9dbc"/><stop offset="1" stop-color="#c95683"/></linearGradient>
    <linearGradient id="rbH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c95683"/><stop offset=".2" stop-color="#ec8fb2"/><stop offset=".45" stop-color="#fbc6da"/><stop offset=".65" stop-color="#ef9dbc"/><stop offset="1" stop-color="#c95683"/></linearGradient>
    <linearGradient id="rbLoop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbcade"/><stop offset=".55" stop-color="#ec8fb2"/><stop offset="1" stop-color="#c24f7c"/></linearGradient>
  </defs>
  <g class="rb-strips">
    <path class="rb-v" d="M94 46 C94 70 94 90 94 184 H106 C106 90 106 70 106 46 Z" fill="url(#rbV)"/>
    <path class="rb-h" d="M22 110 H178 V120 H22 Z" fill="url(#rbH)"/>
    <path d="M94.6 50 V184 M105.4 50 V184 M22 110.6 H178 M22 119.4 H178" stroke="#fff" stroke-opacity=".35" stroke-width=".6" stroke-dasharray="1.5 2"/>
  </g>
  <g class="rb-bow">
    <g class="rb-tail-l"><path d="M97 50 C94 60 88 70 82 80 L88 79 L90 85 C95 74 99 62 100 51 Z" fill="url(#rbLoop)" stroke="#b5426e" stroke-width=".8"/></g>
    <g class="rb-tail-r"><path d="M103 50 C106 60 112 70 118 80 L112 79 L110 85 C105 74 101 62 100 51 Z" fill="url(#rbLoop)" stroke="#b5426e" stroke-width=".8"/></g>
    <g class="rb-loop-l"><path d="M99 46 C88 34 72 32 72 42 C72 51 86 52 99 48 Z" fill="url(#rbLoop)" stroke="#b5426e" stroke-width=".8"/><path d="M96 45 C88 39 79 38 78 42" fill="none" stroke="#a83c66" stroke-opacity=".5" stroke-width="1.2"/></g>
    <g class="rb-loop-r"><path d="M101 46 C112 34 128 32 128 42 C128 51 114 52 101 48 Z" fill="url(#rbLoop)" stroke="#b5426e" stroke-width=".8"/><path d="M104 45 C112 39 121 38 122 42" fill="none" stroke="#a83c66" stroke-opacity=".5" stroke-width="1.2"/></g>
    <rect class="rb-knot" x="95.5" y="42" width="9" height="9" rx="3" fill="url(#rbLoop)" stroke="#b5426e" stroke-width=".8"/>
  </g>
</svg>`;
const jbArt = (part, svg) => (JEWEL_BOX_ART[part] ? `<img src="${JEWEL_BOX_ART[part]}" alt="">` : svg);

// 宝石箱1つぶんの部品（inner：中から浮かぶもの）
function jewelBoxHtml(inner = "") {
  // 重なる順：光 → 開いたふたの内側 → 光の筋 → チャーム → 箱 → すき間の光 → ふた → リボン
  // （チャームは箱のうしろにいるので、箱の中から出てくるように見える。ふたとは重ならない）
  return `
    <span class="jb-glow"></span>
    <span class="jb-lid-in">${jbArt("lidInside", JB_LID_INSIDE_SVG)}</span>
    <span class="jb-rays"></span>
    ${inner}
    <span class="jb-base">${jbArt("base", JB_BASE_SVG)}</span>
    <span class="jb-seam"></span>
    <span class="jb-lid">${jbArt("lid", JB_LID_SVG)}</span>
    <span class="jb-ribbons">${JB_RIBBON_SVG}</span>`;
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
    card.className = `g-card r-${r.rarity}` + (r.isNew ? " is-new" : "") + (gradeOf(r.charm) ? ` grade-${r.charm.grade}` : "");
    card.style.animationDelay = `${multi ? i * 0.05 : 0}s`;
    const sName = SERIES[seriesOf(r.charm)]?.name || "";
    card.innerHTML = `
      ${r.isNew ? `<span class="g-new">NEW</span>` : ""}
      ${gradeBadge(r.charm)}<img src="${charmSrc(r.charm)}" alt="">
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

$("coin-btn").addEventListener("click", () => openGacha());
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

document.querySelector(".gacha-showcase .jbox").innerHTML = jewelBoxHtml(); // ガチャ画面の飾りの宝石箱
ensureGacha();
saveData();
checkCoinRewards();
