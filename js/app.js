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
  return { weight: null, logs: [] };
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

// ---------- 瓶の絵 ----------

let jarSeq = 0;
function jarSvg(logs) {
  const id = "jar-clip-" + jarSeq++;
  const bottom = 242;
  const fillTop = 48;
  const fullH = bottom - fillTop;

  let y = bottom;
  let layers = "";
  let used = 0;
  for (const log of logs) {
    if (used >= WEEK_GOAL_MIN) break;
    const min = Math.min(log.min, WEEK_GOAL_MIN - used);
    used += min;
    const h = (min / WEEK_GOAL_MIN) * fullH;
    y -= h;
    const sport = sportById(log.type);
    layers += `<rect x="30" y="${y.toFixed(2)}" width="140" height="${(h + 0.6).toFixed(2)}" fill="${sport ? sport.color : "#ddd"}"/>`;
    layers += `<rect x="30" y="${y.toFixed(2)}" width="140" height="1.4" fill="#fff" opacity=".45"/>`;
  }

  const body = "M68 46 C68 58 36 62 36 92 L36 214 C36 232 50 242 68 242 L132 242 C150 242 164 232 164 214 L164 92 C164 62 132 58 132 46 Z";
  return `<svg viewBox="0 0 200 250" role="img" aria-label="運動の瓶" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="#ffffff" opacity=".7"/>
    <g clip-path="url(#${id})">${layers}</g>
    <path d="${body}" fill="none" stroke="#efd3dc" stroke-width="4" stroke-linejoin="round"/>
    <path d="M50 100 C50 84 58 76 66 72 M48 116 L48 196" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75"/>
    <rect x="66" y="30" width="68" height="18" rx="5" fill="#fbe9ef" stroke="#efd3dc" stroke-width="3"/>
    <rect x="58" y="8" width="84" height="24" rx="8" fill="#f6b6c8"/>
    <rect x="58" y="22" width="84" height="10" rx="4" fill="#ee9fb5"/>
  </svg>`;
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
  $("n-bubble").textContent = pickMessage(full ? "full" : quotaDone ? "quota" : todayMin > 0 ? "some" : "zero");
  $("jar").innerHTML = jarSvg(week);
  $("jar-caption").textContent = full ? "今週の瓶（いっぱい！）" : "今週の瓶";

  $("today-min").textContent = todayMin;
  $("today-kcal").textContent = Math.round(todayKcal);
  $("today-fat").textContent = fatOf(todayKcal).toFixed(1);
  $("quota-stamp").hidden = !quotaDone;

  const list = $("log-list");
  list.replaceChildren();
  $("log-empty").hidden = today.length > 0;
  for (const log of [...today].sort((a, b) => b.ts - a.ts)) {
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
      <button class="del-btn" type="button">消す</button>`;
    li.querySelector(".log-name").textContent = sport.name;
    li.querySelector(".log-burn").textContent = burnText(kcalOf(log));
    li.querySelector(".log-min").textContent = `${log.min}分`;
    const del = li.querySelector(".del-btn");
    del.addEventListener("click", () => {
      if (!del.classList.contains("armed")) {
        del.classList.add("armed");
        del.textContent = "本当に？";
        setTimeout(() => {
          del.classList.remove("armed");
          del.textContent = "消す";
        }, 3000);
        return;
      }
      data.logs = data.logs.filter((l) => l.id !== log.id);
      saveData();
      renderAll();
      showToast("記録を消したよ");
    });
    list.append(li);
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
    fig.innerHTML = jarSvg([...logs].sort((a, b) => a.ts - b.ts));
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
    $("page-home").hidden = page !== "home";
    $("page-shelf").hidden = page !== "shelf";
    window.scrollTo(0, 0);
  });
});

// ---------- 種目ボタンと記録シート ----------

const sheet = { sport: null, entryId: null, before: null };

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

function openSheet(sport) {
  sheet.sport = sport;
  sheet.entryId = null;
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
  $("sheet").hidden = false;
  $("sheet-backdrop").hidden = false;
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

function updateDone() {
  const e = currentEntry();
  if (!e) return;
  $("done-title").textContent = `${sheet.sport.name} ${e.min}分 記録したよ！`;
  $("done-burn").textContent = burnText(kcalOf(e));
}

document.querySelectorAll(".adjust-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const e = currentEntry();
    if (!e) return;
    e.min += Number(btn.dataset.add);
    saveData();
    updateDone();
    renderAll();
  });
});

$("undo-btn").addEventListener("click", () => {
  data.logs = data.logs.filter((l) => l.id !== sheet.entryId);
  saveData();
  sheet.entryId = null;
  closeSheet();
  showToast("取り消したよ");
});

function closeSheet() {
  $("sheet").hidden = true;
  $("sheet-backdrop").hidden = true;
  renderAll();
  if (sheet.before) celebrate(sheet.before);
  sheet.before = null;
}
$("done-btn").addEventListener("click", closeSheet);
$("sheet-backdrop").addEventListener("click", closeSheet);

// ノルマクリア・瓶いっぱいになった瞬間にお祝い
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
    showToast("ノルマクリア！Nがよろこんでるよ");
  }
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
});
$("weight-cancel").addEventListener("click", () => {
  $("weight-modal").hidden = true;
});
$("settings-btn").addEventListener("click", () => openWeightModal(false));

// ---------- トースト ----------

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (t.hidden = true), 2000);
}

// ---------- 起動 ----------

buildSportButtons();
renderAll();
if (!data.weight) openWeightModal(true);

// 日付が変わってから開き直したときに表示を更新
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderAll();
});

// データが勝手に消されにくくするお願い（対応しているブラウザのみ）
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// オフラインでも開けるようにする（PWA）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
