// =========================================================
// Nのうんどう瓶 — 運動の記録と週の瓶
// データはこのスマホの中（localStorage）だけに保存します。
// =========================================================

// ---------- 設定（あとから変えたいときはここを直す） ----------

// 種目：名前・色・時間ボタン・MET（運動の強さ。カロリー計算に使う）
const SPORTS = [
  { id: "pilates",  name: "ピラティス",         color: "#f2b544",  presets: [10, 50], met: 3.0 },
  { id: "strength", name: "筋トレ",             color: "#f48a8a", presets: [15, 30], met: 3.5 },
  { id: "walking",  name: "ウォーキング",       color: "#8ed8b8",  presets: [20],     met: 3.5 },
  { id: "stepper",  name: "ツイストステッパー", color: "#b9a3e3",  presets: [20],     met: 4.0 },
  { id: "stretch",  name: "ストレッチ",         color: "#9fd3f0",  presets: [5, 10],  met: 2.3 },
];
const WEEK_GOAL_MIN = 250;   // 瓶が満タンになる分数（画面には出さない）
const DAILY_QUOTA_MIN = 35;  // 毎日のノルマ（画面には出さない）
const KCAL_PER_FAT_G = 7.2;  // 体脂肪1gあたりのカロリー

const STORAGE_KEY = "n-undou-bin.v1";
const APP_VERSION = "11/17-8"; // 更新するたびに変える（設定画面に表示）

// ---------- データの読み書き ----------

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.logs)) return d;
    }
  } catch (e) {
    console.warn("データを読み込めませんでした", e);
  }
  return { weight: null, logs: [], weekBottles: {}, meals: {}, body: {}, periods: [] };
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    showToast("保存できませんでした");
  }
}

let data = loadData();

// ---------- 日付まわり ----------

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
// その日が入っている週の月曜日
function weekStartKey(key) {
  const d = parseKey(key);
  const diff = (d.getDay() + 6) % 7; // 月曜=0
  d.setDate(d.getDate() - diff);
  return dateKey(d);
}
function shortDate(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------- 計算 ----------

const sportById = (id) => SPORTS.find((s) => s.id === id);

function kcalOf(log) {
  const sport = sportById(log.type);
  if (!sport || !data.weight) return 0;
  return sport.met * data.weight * (log.min / 60) * 1.05;
}
const fatOf = (kcal) => kcal / KCAL_PER_FAT_G;
const sumMin = (logs) => logs.reduce((t, l) => t + l.min, 0);

const todayLogs = () => data.logs.filter((l) => l.date === dateKey());
const weekLogs = (start = weekStartKey(dateKey())) =>
  data.logs.filter((l) => weekStartKey(l.date) === start).sort((a, b) => a.ts - b.ts);

function burnText(kcal) {
  return `約${Math.round(kcal)}kcal・脂肪 約${fatOf(kcal).toFixed(1)}g`;
}

// ---------- 瓶 ----------

const bottleById = (id) => BOTTLES.find((b) => b.id === id) || BOTTLES[0];

// その週の瓶。まだ決まっていなければランダムに選んで覚えておく（前後の週とそっくりな瓶は選ばない）
function bottleForWeek(start) {
  if (!data.weekBottles) data.weekBottles = {};
  const saved = data.weekBottles[start];
  if (saved && BOTTLES.some((b) => b.id === saved)) return bottleById(saved);

  const neighbor = (days) => {
    const d = parseKey(start);
    d.setDate(d.getDate() + days);
    return data.weekBottles[dateKey(d)];
  };
  const groupOf = (id) => (id ? bottleById(id).group || id : null);
  const avoid = [groupOf(neighbor(-7)), groupOf(neighbor(7))];
  const choices = BOTTLES.filter((b) => !avoid.includes(b.group || b.id));
  const pick = choices[Math.floor(Math.random() * choices.length)];
  data.weekBottles[start] = pick.id;
  saveData();
  if (start === weekStartKey(dateKey())) newBottleThisVisit = pick;
  return pick;
}
let newBottleThisVisit = null;

// 花まるの絵（ごはんタブのカレンダーと、瓶に浮かぶお花で使う）
function hanamaruSvg(cls = "hanamaru") {
  const inBottle = cls === "flower-svg"; // 瓶の中では白いふちどりで目立たせる
  const petals = [0, 72, 144, 216, 288]
    .map((deg) => `<ellipse cx="12" cy="6.2" rx="3.6" ry="4.6" transform="rotate(${deg} 12 12)"/>`)
    .join("");
  const outline = inBottle ? `<g fill="#fff" stroke="#fff" stroke-width="2.4">${petals}</g>` : "";
  return `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${outline}<g fill="${inBottle ? "#ff8fb3" : "#f6a5bd"}">${petals}</g><circle cx="12" cy="12" r="3.2" fill="#f2b544"/></svg>`;
}

// その週の「おやつ・つまみ食いをしなかった日」の数（＝瓶に浮かぶお花の数）
function weekFlowerCount(start) {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseKey(start);
    d.setDate(d.getDate() + i);
    if (data.meals && data.meals[dateKey(d)] && data.meals[dateKey(d)].snack === "none") n++;
  }
  return n;
}

// 瓶の絵：色の層（瓶の形で切り抜き）とお花の上に、瓶の画像を重ねる
function bottleHtml(logs, bottle, flowerCount = 0) {
  const range = bottle.bottom - bottle.top;
  let used = 0;
  let layers = "";
  for (const log of logs) {
    if (used >= WEEK_GOAL_MIN) break;
    const min = Math.min(log.min, WEEK_GOAL_MIN - used);
    const from = 100 - bottle.bottom + (used / WEEK_GOAL_MIN) * range;
    const h = (min / WEEK_GOAL_MIN) * range;
    used += min;
    const sport = sportById(log.type);
    layers += `<span class="layer" style="bottom:${from.toFixed(2)}%;height:${(h + 0.3).toFixed(2)}%;background:${sport ? sport.color : "#ddd"}"></span>`;
  }
  const mask = `url(bottles/${bottle.id}-mask.png)`;
  const spots = (bottle.flowers || []).slice(0, Math.min(flowerCount, 7));
  const size = ((11 * bottle.h) / bottle.w).toFixed(1); // お花の大きさ：瓶の高さの11%
  const flowers = spots
    .map(([x, y], i) => `<span class="flower" style="width:${size}%;left:${x}%;top:${y}%;animation-delay:${(i * -0.7).toFixed(1)}s">${hanamaruSvg("flower-svg")}</span>`)
    .join("");
  const label = flowerCount > 0 ? `${bottle.name}（お花${spots.length}つ）` : bottle.name;
  return `<div class="bottle" style="aspect-ratio:${bottle.w}/${bottle.h}" role="img" aria-label="${label}">
    <div class="liquid" style="-webkit-mask-image:${mask};mask-image:${mask}">${layers}${flowers}</div>
    <img class="glass" src="bottles/${bottle.id}.png" alt="" width="${bottle.w}" height="${bottle.h}">
  </div>`;
}

// ---------- 画面の描画 ----------

const $ = (id) => document.getElementById(id);

const MESSAGES = {
  zero: ["今日もいっしょにがんばろ〜", "まずは5分だけでもどう？", "背すじ、すっと伸ばしていこ！"],
  some: ["いいね！その調子〜", "ちゃんと瓶にたまってるよ", "からだ、あったまってきたね"],
  quota: ["今日のノルマクリア！えらい！", "やったね！今日は満点だよ", "今日もよくがんばりました〜"],
  full: ["瓶がいっぱい！最高の1週間だね", "今週は大成功！棚に飾ったよ"],
};
function pickMessage(kind) {
  const list = MESSAGES[kind];
  const dayIndex = Math.floor(parseKey(dateKey()).getTime() / 86400000);
  return list[dayIndex % list.length];
}

function renderHome() {
  const today = todayLogs();
  const todayMin = sumMin(today);
  const todayKcal = today.reduce((t, l) => t + kcalOf(l), 0);
  const week = weekLogs();
  const weekMin = sumMin(week);
  const quotaDone = todayMin >= DAILY_QUOTA_MIN;
  const full = weekMin >= WEEK_GOAL_MIN;

  $("n-figure").innerHTML = nCharacterHtml(quotaDone || full ? "happy" : "normal");
  // からだのひとこと（生理中・前回から間が空いたとき）は、お祝いがないときにさりげなく
  const bodyNote = typeof bodyBubble === "function" ? bodyBubble() : null;
  $("n-bubble").textContent =
    full ? pickMessage("full") : quotaDone ? pickMessage("quota") : bodyNote || pickMessage(todayMin > 0 ? "some" : "zero");
  const bottle = bottleForWeek(weekStartKey(dateKey()));
  $("jar").innerHTML = bottleHtml(week, bottle, weekFlowerCount(weekStartKey(dateKey())));
  $("jar-caption").textContent = full ? `${bottle.name}（いっぱい！）` : `今週は${bottle.name}`;

  $("today-min").textContent = todayMin;
  $("today-kcal").textContent = Math.round(todayKcal);
  $("today-fat").textContent = fatOf(todayKcal).toFixed(1);
  $("quota-stamp").hidden = !quotaDone;

  renderLogList(week);
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
function dayLabel(key) {
  if (key === dateKey()) return "今日";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === dateKey(y)) return "きのう";
  return `${shortDate(key)}（${WEEKDAYS[parseKey(key).getDay()]}）`;
}

function renderLogList(week) {
  const box = $("log-list");
  box.replaceChildren();
  $("log-empty").hidden = week.length > 0;

  const byDay = new Map();
  for (const log of [...week].sort((a, b) => b.ts - a.ts)) {
    if (!byDay.has(log.date)) byDay.set(log.date, []);
    byDay.get(log.date).push(log);
  }
  const days = [...byDay.keys()].sort().reverse();

  for (const day of days) {
    const group = document.createElement("section");
    const label = document.createElement("h3");
    label.className = "day-label";
    label.textContent = dayLabel(day);
    const ul = document.createElement("ul");
    ul.className = "log-list";
    for (const log of byDay.get(day)) {
      const sport = sportById(log.type);
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `
        <span class="dot" style="--c:${sport.color}"></span>
        <div class="log-main">
          <div class="log-name"></div>
          <div class="log-burn"></div>
        </div>
        <span class="log-min"></span>
        <button class="fix-btn" type="button">直す</button>`;
      li.querySelector(".log-name").textContent = sport.name;
      li.querySelector(".log-burn").textContent = burnText(kcalOf(log));
      li.querySelector(".log-min").textContent = `${log.min}分`;
      li.addEventListener("click", () => openEditSheet(log));
      ul.append(li);
    }
    group.append(label, ul);
    box.append(group);
  }
}

function renderShelf() {
  const thisWeek = weekStartKey(dateKey());
  const byWeek = new Map();
  for (const log of data.logs) {
    const w = weekStartKey(log.date);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(log);
  }
  const fullWeeks = [...byWeek.entries()]
    .filter(([, logs]) => sumMin(logs) >= WEEK_GOAL_MIN)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const shelf = $("shelf");
  shelf.replaceChildren();
  $("shelf-empty").hidden = fullWeeks.length > 0;
  shelf.hidden = fullWeeks.length === 0;

  for (const [start, logs] of fullWeeks) {
    const end = parseKey(start);
    end.setDate(end.getDate() + 6);
    const fig = document.createElement("figure");
    fig.className = "shelf-item" + (start === thisWeek ? " this-week" : "");
    fig.innerHTML = bottleHtml([...logs].sort((a, b) => a.ts - b.ts), bottleForWeek(start), weekFlowerCount(start));
    const cap = document.createElement("figcaption");
    cap.textContent = start === thisWeek ? "今週" : `${shortDate(start)}〜${shortDate(dateKey(end))}`;
    fig.append(cap);
    shelf.append(fig);
  }
}

function renderAll() {
  renderHome();
  renderShelf();
}

// ---------- ページ切り替え ----------

document.querySelectorAll(".tabbar-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    document.querySelectorAll(".tabbar-btn").forEach((b) => {
      if (b === btn) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.querySelectorAll(".page").forEach((sec) => {
      sec.hidden = sec.id !== "page-" + page;
    });
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("pagechange", { detail: page }));
    if (page === "home" || page === "shelf") renderAll(); // ごはんの花まるなどを反映
  });
});

// ---------- 種目ボタンと記録シート ----------

// mode: "new"（いま記録した）/ "edit"（あとから直す）
const sheet = { sport: null, entryId: null, before: null, mode: "new" };

function buildSportButtons() {
  const box = $("sports");
  for (const sport of SPORTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sport-btn";
    btn.innerHTML = `<span class="dot" style="--c:${sport.color}"></span><span></span>`;
    btn.lastElementChild.textContent = sport.name;
    btn.addEventListener("click", () => openSheet(sport));
    box.append(btn);
  }
}

function showSheet() {
  $("sheet").hidden = false;
  $("sheet-backdrop").hidden = false;
}

function openSheet(sport) {
  sheet.sport = sport;
  sheet.entryId = null;
  sheet.mode = "new";
  sheet.before = { today: sumMin(todayLogs()), week: sumMin(weekLogs()) };

  $("sheet-title").innerHTML = `<span class="dot" style="--c:${sport.color}"></span><span></span>`;
  $("sheet-title").lastElementChild.textContent = sport.name;

  const row = $("preset-row");
  row.replaceChildren();
  for (const min of sport.presets) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "preset-btn";
    b.style.setProperty("--c", sport.color);
    b.innerHTML = `${min}<small>分</small>`;
    b.addEventListener("click", () => record(min));
    row.append(b);
  }

  $("sheet-pick").hidden = false;
  $("sheet-done").hidden = true;
  showSheet();
}

function openEditSheet(log) {
  sheet.sport = sportById(log.type);
  sheet.entryId = log.id;
  sheet.mode = "edit";
  sheet.before = { today: sumMin(todayLogs()), week: sumMin(weekLogs()) };
  $("sheet-pick").hidden = true;
  $("sheet-done").hidden = false;
  updateDone();
  showSheet();
}

function record(min) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: dateKey(),
    type: sheet.sport.id,
    min,
    ts: Date.now(),
  };
  data.logs.push(entry);
  saveData();
  sheet.entryId = entry.id;
  $("sheet-pick").hidden = true;
  $("sheet-done").hidden = false;
  updateDone();
  renderAll();
}

function currentEntry() {
  return data.logs.find((l) => l.id === sheet.entryId);
}

function resetDeleteButton() {
  const del = $("undo-btn");
  del.classList.remove("armed");
  del.textContent = sheet.mode === "new" ? "取り消す" : "この記録を消す";
}

function updateDone() {
  const e = currentEntry();
  if (!e) return;
  $("done-title").textContent =
    sheet.mode === "new"
      ? `${sheet.sport.name} ${e.min}分 記録したよ！`
      : `${dayLabel(e.date)}の${sheet.sport.name} ${e.min}分`;
  $("done-burn").textContent = burnText(kcalOf(e));
  document.querySelector('.adjust-btn[data-add="-5"]').disabled = e.min <= 5;
  resetDeleteButton();
}

document.querySelectorAll(".adjust-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const e = currentEntry();
    if (!e) return;
    e.min = Math.max(5, e.min + Number(btn.dataset.add));
    saveData();
    updateDone();
    renderAll();
  });
});

// 記録を消す（あとから直すときは、うっかり防止に2回タップ）
$("undo-btn").addEventListener("click", () => {
  const del = $("undo-btn");
  if (sheet.mode === "edit" && !del.classList.contains("armed")) {
    del.classList.add("armed");
    del.textContent = "本当に消す";
    clearTimeout(resetDeleteButton.timer);
    resetDeleteButton.timer = setTimeout(resetDeleteButton, 3000);
    return;
  }
  const removed = currentEntry();
  data.logs = data.logs.filter((l) => l.id !== sheet.entryId);
  saveData();
  sheet.entryId = null;
  sheet.before = null;
  closeSheet();
  if (removed) showToast(sheet.mode === "new" ? "取り消したよ" : "記録を消したよ", { label: "もとに戻す", run: () => restore(removed) });
});

function restore(log) {
  data.logs.push(log);
  saveData();
  renderAll();
  showToast("もとに戻したよ");
}

function closeSheet() {
  const justRecorded = sheet.mode === "new" ? currentEntry() : null;
  $("sheet").hidden = true;
  $("sheet-backdrop").hidden = true;
  renderAll();
  const cheer = sheet.before ? celebrate(sheet.before) : null;
  sheet.before = null;
  // 記録した直後は、しばらく「取り消す」を出しておく
  if (justRecorded) {
    showToast(cheer || `${sheet.sport.name} ${justRecorded.min}分 記録したよ`, {
      label: "取り消す",
      run: () => {
        data.logs = data.logs.filter((l) => l.id !== justRecorded.id);
        saveData();
        renderAll();
        showToast("取り消したよ");
      },
    });
  }
  sheet.entryId = null;
}
$("done-btn").addEventListener("click", closeSheet);
$("sheet-backdrop").addEventListener("click", closeSheet);

// ノルマクリア・瓶いっぱいになった瞬間にお祝い（トーストに出す言葉を返す）
function celebrate(before) {
  const todayMin = sumMin(todayLogs());
  const weekMin = sumMin(weekLogs());
  if (before.week < WEEK_GOAL_MIN && weekMin >= WEEK_GOAL_MIN) {
    $("full-n").innerHTML = nCharacterHtml("happy");
    $("full-modal").hidden = false;
  } else if (before.today < DAILY_QUOTA_MIN && todayMin >= DAILY_QUOTA_MIN) {
    const n = $("n-figure");
    n.classList.remove("bounce");
    void n.offsetWidth;
    n.classList.add("bounce");
    return "ノルマクリア！Nがよろこんでるよ";
  }
  return null;
}
$("full-ok").addEventListener("click", () => {
  $("full-modal").hidden = true;
});

// ---------- 体重の設定 ----------

function openWeightModal(first) {
  $("weight-title").textContent = first ? "はじめまして！" : "体重を変える";
  $("weight-text").textContent = first
    ? "消費カロリーを計算するために、体重を1回だけ教えてね。画面には表示しないよ。"
    : "新しい体重を入れてね。画面には表示しないよ。";
  $("weight-cancel").hidden = first;
  $("weight-form").querySelector(".primary-btn").textContent = first ? "はじめる" : "変更する";
  $("weight-input").value = "";
  $("weight-error").hidden = true;
  $("weight-n").innerHTML = nCharacterHtml("normal");
  $("app-version").textContent = `アプリの版：${APP_VERSION}`;
  $("weight-modal").hidden = false;
}

$("weight-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const w = Number($("weight-input").value);
  if (!(w >= 25 && w <= 200)) {
    $("weight-error").hidden = false;
    return;
  }
  const first = !data.weight;
  data.weight = w;
  saveData();
  $("weight-modal").hidden = true;
  renderAll();
  showToast(first ? "準備できたよ！" : "体重を変更したよ");
  if (first) setTimeout(announceBottle, 2200);
});
$("weight-cancel").addEventListener("click", () => {
  $("weight-modal").hidden = true;
});
$("settings-btn").addEventListener("click", () => openWeightModal(false));

// ---------- トースト ----------

// action を渡すと、トーストにボタン（「取り消す」など）がつく
function showToast(msg, action) {
  const t = $("toast");
  const btn = $("toast-action");
  $("toast-text").textContent = msg;
  btn.hidden = !action;
  btn.onclick = action
    ? () => {
        t.hidden = true;
        action.run();
      }
    : null;
  if (action) btn.textContent = action.label;
  t.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (t.hidden = true), action ? 6000 : 2000);
}

// ---------- 起動 ----------

// 新しい週の瓶が決まったらお知らせ
function announceBottle() {
  if (!newBottleThisVisit || !data.weight) return;
  showToast(`今週の瓶は「${newBottleThisVisit.name}」だよ！`);
  newBottleThisVisit = null;
}

buildSportButtons();
renderAll();
if (!data.weight) openWeightModal(true);
else announceBottle();

// 日付が変わってから開き直したときに表示を更新
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    renderAll();
    announceBottle();
  }
});

// データが勝手に消されにくくするお願い（対応しているブラウザのみ）
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// オフラインでも開けるようにする（PWA）
// 新しい版が届いたら、自動で1回だけ読み込み直して最新の版に切りかえる
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded) {
      reloaded = true;
      location.reload();
    }
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // アプリに戻ってきたときにも新しい版がないか確認する
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}
