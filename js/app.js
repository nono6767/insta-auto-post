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
const WEEK_GOAL_MIN = 250;   // 大瓶1本ぶんの分数（小瓶をこれだけ合成すると大瓶になる）
const BIG_BOTTLE_MIN = WEEK_GOAL_MIN;
const SMALL_FULL_MIN = 36;   // 小瓶が満タンに見える分数（1日ぶん）
const DAILY_QUOTA_MIN = 35;  // 毎日のノルマ（画面には出さない）
const KCAL_PER_FAT_G = 7.2;  // 体脂肪1gあたりのカロリー

// 保存名はすべて「n-app-」で始める（同じサイト上のほかのアプリとまざらないように）
const STORAGE_KEY = "n-app-data";
const LEGACY_STORAGE_KEY = "n-undou-bin.v1"; // 前の保存名（自動で引っ越す）
const APP_VERSION = "11/21-4"; // 更新するたびに変える（設定画面に表示）

// ---------- データの読み書き ----------

const emptyData = () => ({
  weight: null, logs: [], weekBottles: {}, meals: {}, body: {}, periods: [], clothes: [],
  savings: { weekly: null, goal: null, deadline: null, deposits: [] },
  usedByLog: {}, bigBottles: [], bottleSystem: 4,
  shakes: {}, closed: {}, colorBook: {},
  createdAt: Date.now(), lastBackupAt: null,
});

function loadData() {
  try {
    // 前の保存名に記録があれば、新しい保存名へ引っ越す
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, legacy);
    }
    if (legacy && localStorage.getItem(STORAGE_KEY)) localStorage.removeItem(LEGACY_STORAGE_KEY);

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.logs)) {
        if (!d.createdAt) d.createdAt = Date.now(); // バックアップのお知らせを数え始める日
        return d;
      }
    }
  } catch (e) {
    console.warn("データを読み込めませんでした", e);
  }
  return emptyData();
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

// パステルの色：運動の色を白とまぜて、やさしくする（mix が大きいほど淡い）
function pastel(hex, mix = 0.3) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * mix));
  return `rgb(${c.join(",")})`;
}

// 小瓶の絵：淡いパステルの中身（瓶の形で切り抜き）とお花の上に、瓶の画像を重ねる
// capacity：何分で満タンに見えるか（小瓶は36分）
// ・満タンまでは、運動した分だけたまる
// ・満タンをこえた日は、その日の全部の運動の割合で層を分け直して、瓶のまわりがキラキラする
// ・どんなに短い運動でも、細い層として必ず見える
// ・層の境目はやわらかくぼかす
// ・mix に色を渡すと、シェイクしたあとの「まざった1色」で描く
const SMALL_MIN_LAYER = 7;   // いちばん細い層の厚さ（瓶の中身が入る高さの%）
const SMALL_BLUR = 1.6;      // 境目のぼかしの幅（同じく%）
const SMALL_FULL_LEVEL = 92; // 満タンの高さ（中身が入る高さの%）。首の飾りに、いちばん上の層がかくれないように
function bottleHtml(logs, bottle, flowerCount = 0, capacity = WEEK_GOAL_MIN, mix = null) {
  const range = bottle.bottom - bottle.top; // 中身が入る高さ（瓶の画像の%）
  // 同じ運動が続いたら1つの層にまとめる
  const bands = [];
  for (const log of logs) {
    const sport = sportById(log.type);
    const color = pastel(sport ? sport.color : "#dddddd", 0.4);
    const last = bands[bands.length - 1];
    if (last && last.color === color) last.min += log.min;
    else bands.push({ color, min: log.min });
  }
  const total = bands.reduce((t, b) => t + b.min, 0);
  const overflow = total > capacity;
  if (mix && total > 0) bands.splice(0, bands.length, { color: liquidColor(mix), min: total });

  let layers = "";
  if (total > 0) {
    // 中身の高さ（中身が入る高さに対する%）：満タンまでは分数どおり、こえたら100%
    let fill = Math.min(1, total / capacity) * SMALL_FULL_LEVEL;
    // 層の厚さ：分数の割合。ただし細すぎる層は SMALL_MIN_LAYER まで太くして、ほかで調整する
    fill = Math.max(fill, Math.min(SMALL_FULL_LEVEL, bands.length * SMALL_MIN_LAYER));
    let thick = bands.map((b) => (b.min / total) * fill);
    const thin = thick.map((t) => t < SMALL_MIN_LAYER);
    const need = thin.reduce((t, isThin, i) => t + (isThin ? SMALL_MIN_LAYER - thick[i] : 0), 0);
    const room = thick.reduce((t, v, i) => t + (thin[i] ? 0 : v), 0);
    thick = thick.map((t, i) => (thin[i] ? SMALL_MIN_LAYER : t - (room > 0 ? (need * t) / room : 0)));
    // 下から上へ、境目をぼかしたグラデーションにする（%は中身の高さに対して）
    let stops = [], acc = 0;
    thick.forEach((t, i) => {
      const lo = (acc / fill) * 100;
      acc += t;
      const hi = (acc / fill) * 100;
      // ぼかしは、となりの層のうち細いほうの3割まで（細い層の色がちゃんと残るように）
      const blurBelow = i === 0 ? 0 : (Math.min(SMALL_BLUR, 0.3 * Math.min(t, thick[i - 1])) / fill) * 100;
      const blurAbove = i === thick.length - 1 ? 0 : (Math.min(SMALL_BLUR, 0.3 * Math.min(t, thick[i + 1])) / fill) * 100;
      const a = Math.min(hi, lo + blurBelow);
      const z = Math.max(a, hi - blurAbove);
      stops.push(`${bands[i].color} ${a.toFixed(2)}%`, `${bands[i].color} ${z.toFixed(2)}%`);
    });
    const heightPct = (fill / 100) * range;
    layers = `<span class="layer-stack" style="bottom:${(100 - bottle.bottom).toFixed(2)}%;height:${(heightPct + 0.3).toFixed(2)}%;background:linear-gradient(to top, ${stops.join(", ")})"></span>`;
  }

  const mask = `url(bottles/${bottle.id}-mask.webp)`;
  const spots = (bottle.flowers || []).slice(0, Math.min(flowerCount, 7));
  const size = ((11 * bottle.h) / bottle.w).toFixed(1); // お花の大きさ：瓶の高さの11%
  const flowers = spots
    .map(([x, y], i) => `<span class="flower" style="width:${size}%;left:${x}%;top:${y}%;animation-delay:${(i * -0.7).toFixed(1)}s">${hanamaruSvg("flower-svg")}</span>`)
    .join("");
  // 満タンをこえた日は、瓶のまわりにキラキラ
  const sparks = overflow
    ? [[8, 30], [92, 40], [14, 72], [88, 78], [50, 6], [96, 62]]
        .map(([x, y], i) => `<span class="bottle-spark" style="left:${x}%;top:${y}%;animation-delay:${(i * 0.37).toFixed(2)}s"></span>`)
        .join("")
    : "";
  const label = `${bottle.name}${mix ? "（シェイクずみ）" : ""}${overflow ? "（満タン！）" : ""}${flowerCount > 0 ? `（お花${spots.length}つ）` : ""}`;
  return `<div class="bottle small-bottle${overflow ? " overflow" : ""}${mix ? " mixed" : ""}" style="aspect-ratio:${bottle.w}/${bottle.h}" role="img" aria-label="${label}">
    <div class="liquid" style="-webkit-mask-image:${mask};mask-image:${mask}">${layers}${flowers}</div>
    <img class="glass" src="bottles/${bottle.id}.webp" alt="" width="${bottle.w}" height="${bottle.h}">
    <img class="glass-shine" src="bottles/${bottle.shine || bottle.id + "-shine"}.webp" alt="" width="${bottle.w}" height="${bottle.h}">
    ${sparks}
  </div>`;
}

// ---------- 小瓶と大瓶 ----------
// 運動した日ごとに小瓶が1つ。小瓶の合計が250分をこえたら「合成」で大瓶に進化。
// data.usedByLog[記録のid]：その記録の分数のうち、もう大瓶にした分
//   （記録1件ごとに覚えるので、大瓶にした記録を消して入れ直しても、新しい記録はちゃんと数える）
// data.bigBottles：大瓶 { id, date（進化した日）, layers[{type,min}], bottle（瓶の種類）, flowers }

function ensureBottleData() {
  if (!data.usedByLog) data.usedByLog = {};
  if (!Array.isArray(data.bigBottles)) data.bigBottles = [];
  if (!data.shakes) data.shakes = {};   // シェイクした日の色 { 日付: {name, hex, sig} }
  if (!data.closed) data.closed = {};   // 「今日はおしまい」を押した日 { 日付: true }
  if (!data.colorBook) data.colorBook = {}; // 色図鑑 { 色の名前: はじめて出た日 }
}

// その日の、まだ大瓶にしていない分（種目ごとの層）
const usedOf = (log) => Math.min(log.min, (data.usedByLog && data.usedByLog[log.id]) || 0);
function dayRemainingLayers(day) {
  const out = [];
  for (const l of data.logs.filter((x) => x.date === day).sort((a, b) => a.ts - b.ts)) {
    const rest = l.min - usedOf(l);
    if (rest > 0) out.push({ id: l.id, type: l.type, min: rest, ts: l.ts });
  }
  return out;
}

// まだ合成していない小瓶（古い順）。一部だけ大瓶にした日は「おまけの小瓶」
function smallBottles() {
  const days = [...new Set(data.logs.map((l) => l.date))].sort();
  return days
    .map((day) => {
      const layers = dayRemainingLayers(day);
      const bonus = data.logs.some((l) => l.date === day && usedOf(l) > 0); // 一部だけ大瓶にした日
      return { day, layers, min: sumMin(layers), bonus };
    })
    .filter((b) => b.min > 0);
}
const poolMinutes = () => smallBottles().reduce((t, b) => t + b.min, 0);
const mergeReady = () => poolMinutes() >= BIG_BOTTLE_MIN;

// 小瓶の形：日付ごとに9種類の瓶をくり返す
function smallBottleShape(day) {
  const [y, m, d] = day.split("-").map(Number);
  const n = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  return BOTTLES[((n % BOTTLES.length) + BOTTLES.length) % BOTTLES.length];
}
const daySnackFree = (day) => !!(data.meals && data.meals[day] && data.meals[day].snack === "none");

// 前のしくみ（週の瓶）で満タンになった週は、そのまま大瓶として残す（1回だけ）
function migrateToSmallBottles() {
  if (data.bottleSystem >= 2) return;
  ensureBottleData();
  const byWeek = new Map();
  for (const l of data.logs) {
    const w = weekStartKey(l.date);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(l);
  }
  for (const [start, logs] of [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (sumMin(logs) < BIG_BOTTLE_MIN) continue;
    const sorted = [...logs].sort((a, b) => (a.date === b.date ? a.ts - b.ts : a.date < b.date ? -1 : 1));
    let acc = 0, evolved = sorted[sorted.length - 1].date;
    for (const l of sorted) {
      acc += l.min;
      if (acc >= BIG_BOTTLE_MIN) { evolved = l.date; break; } // 250分に届いた日＝大瓶に進化した日
    }
    for (const l of sorted) data.usedByLog[l.id] = l.min; // その週の分は全部、大瓶に
    data.bigBottles.push({
      id: "week-" + start,
      date: evolved,
      layers: sorted.map((l) => ({ type: l.type, min: l.min })),
      bottle: bottleForWeek(start).id,
      flowers: weekFlowerCount(start),
      ts: parseKey(evolved).getTime(),
    });
  }
  data.bottleSystem = 3;
  saveData();
}

// 今までの大瓶にも「どの記録を何分使ったか」(uses) をつける（1回だけ）。
// 合成と同じく、作った順に、その大瓶の日付の記録の「使った分」から割りふる
function migrateBigUses() {
  if (data.bottleSystem >= 4) return;
  ensureBottleData();
  const left = {}; // 記録ごとに、まだどの大瓶にも割りふっていない「使った分」
  for (const l of data.logs) left[l.id] = usedOf(l);
  const logsOn = (day) => data.logs.filter((l) => l.date === day).sort((a, b) => a.ts - b.ts);
  for (const b of [...data.bigBottles].sort((x, y) => (x.ts || 0) - (y.ts || 0))) {
    if (Array.isArray(b.uses)) continue;
    const days = String(b.id).startsWith("week-")
      ? [...new Set(data.logs.filter((l) => weekStartKey(l.date) === b.id.slice(5)).map((l) => l.date))].sort()
      : [...(b.days || [])].sort();
    let need = b.layers.reduce((t, l) => t + l.min, 0);
    b.uses = [];
    for (const day of days) {
      for (const l of logsOn(day)) {
        if (need <= 0) break;
        const take = Math.min(left[l.id] || 0, need);
        if (take > 0) {
          b.uses.push({ logId: l.id, min: take });
          left[l.id] -= take;
          need -= take;
        }
      }
    }
  }
  data.bottleSystem = 4;
  saveData();
}

// ---------- 大瓶に入っている記録を消す・減らすとき ----------

const bigsUsingLog = (logId) => (data.bigBottles || []).filter((b) => (b.uses || []).some((u) => u.logId === logId));

// 「使った分」を、今ある大瓶の中身（uses）から計算し直す。
// どの大瓶にも入っていない記録は、必ず「まだ使っていない」に戻る（印だけ取り残されて小瓶が消えるのを防ぐ）
function syncUsedFromBigs() {
  ensureBottleData();
  const exists = new Map(data.logs.map((l) => [l.id, l]));
  const used = {};
  for (const b of data.bigBottles) {
    for (const u of b.uses || []) {
      if (exists.has(u.logId)) used[u.logId] = (used[u.logId] || 0) + u.min;
    }
  }
  for (const [id, m] of Object.entries(used)) used[id] = Math.min(m, exists.get(id).min);
  data.usedByLog = used;
}

// 大瓶を小瓶に戻す：大瓶をなくして、「使った分」を計算し直す
function dissolveBig(big) {
  data.bigBottles = data.bigBottles.filter((b) => b.id !== big.id);
  syncUsedFromBigs();
}

// 大瓶に入っている記録なら、どうするか聞く。"dissolve"（戻す）/ "keep"（そのまま）/ "cancel"（やめる）
function askAboutBig(log, action) {
  const bigs = bigsUsingLog(log.id);
  if (!bigs.length) return Promise.resolve("keep");
  return new Promise((resolve) => {
    const names = bigs.map((b) => {
      const n = typeof charmsOf === "function" ? charmsOf(b).length : 0;
      const shape = typeof bigBottleById === "function" ? bigBottleById(b.bottle).name : "大瓶";
      return `${shortDate(b.date)}にできた${shape}${n ? `（チャーム${n}個）` : ""}`;
    });
    $("bigtouch-text").textContent =
      `この記録は、${names.join("と")}に入っているよ。${action}と、大瓶をどうする？`;
    $("bigtouch-note").textContent =
      `「小瓶に戻す」にすると、大瓶はなくなって、中の運動は小瓶の棚に戻るよ${bigs.some((b) => (typeof charmsOf === "function" ? charmsOf(b).length : 0)) ? "（つけていたチャームもはずれるよ）" : ""}。`;
    $("bigtouch-n").innerHTML = nCharacterHtml("wave");
    // ボタンの名前に「記録をどうするか」も入れて、押したら何が起きるかはっきりさせる
    const what = action === "記録を消す" ? "記録を消す" : "分数を減らす";
    $("bigtouch-dissolve").textContent = `大瓶を小瓶に戻して、${what}`;
    $("bigtouch-keep").textContent = `大瓶はそのままで、${what}`;
    $("bigtouch-cancel").textContent = action === "記録を消す" ? "やめる（記録も消さない）" : "やめる";
    $("bigtouch-modal").hidden = false;
    const done = (answer) => {
      $("bigtouch-modal").hidden = true;
      ["bigtouch-dissolve", "bigtouch-keep", "bigtouch-cancel"].forEach((id) => ($(id).onclick = null));
      if (answer === "dissolve") bigs.forEach(dissolveBig);
      resolve(answer);
    };
    $("bigtouch-dissolve").onclick = () => done("dissolve");
    $("bigtouch-keep").onclick = () => done("keep");
    $("bigtouch-cancel").onclick = () => done("cancel");
  });
}

// 日付ごとに覚えていた版（data.consumed）から、記録1件ごとの形にうつす（1回だけ）。
// 大瓶ができたあとに入れた記録は「まだ使っていない分」にする（記録を消して入れ直したときに数えられなかった不具合の修正）
function migrateToUsedByLog() {
  if (data.bottleSystem >= 3) return;
  ensureBottleData();
  const consumed = data.consumed || {};
  for (const [day, total] of Object.entries(consumed)) {
    // その日の分を使った大瓶のうち、いちばんあとにできた時刻
    const bigs = data.bigBottles.filter((b) => (b.days || []).includes(day) || (String(b.id).startsWith("week-") && weekStartKey(day) === b.id.slice(5)));
    // 前の「週の瓶」から来た大瓶（その週の記録は全部使った）。どの大瓶に使ったか分からない日も、前と同じく使ったことにする
    const weekMade = bigs.length === 0 || bigs.some((b) => String(b.id).startsWith("week-"));
    const madeAt = Math.max(0, ...bigs.filter((b) => !String(b.id).startsWith("week-")).map((b) => b.ts || 0));
    let left = total;
    for (const l of data.logs.filter((x) => x.date === day).sort((a, b) => a.ts - b.ts)) {
      if (left <= 0) break;
      if (!weekMade && !(l.ts <= madeAt)) continue; // 大瓶ができたあとに入れた記録は使っていない
      const take = Math.min(l.min, left);
      data.usedByLog[l.id] = (data.usedByLog[l.id] || 0) + take;
      left -= take;
    }
  }
  delete data.consumed;
  data.bottleSystem = 3;
  saveData();
}

// ---------- 画面の描画 ----------

const $ = (id) => document.getElementById(id);

const MESSAGES = {
  zero: ["今日もいっしょにがんばろ〜", "まずは5分だけでもどう？", "背すじ、すっと伸ばしていこ！"],
  some: ["いいね！その調子〜", "ちゃんと瓶にたまってるよ", "からだ、あったまってきたね"],
  quota: ["今日のノルマクリア！えらい！", "やったね！今日は満点だよ", "今日もよくがんばりました〜"],
  full: ["小瓶が250分たまったよ！瓶の棚で合成しよう", "合成できるよ！大瓶に進化させよう"],
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
  const quotaDone = todayMin >= DAILY_QUOTA_MIN;
  const pool = poolMinutes();
  const full = pool >= BIG_BOTTLE_MIN; // 小瓶が250分たまって、合成できる

  // 場面に合わせて N のポーズを変える
  const bodyCare = typeof bodyBubble === "function" && !!bodyBubble();
  const pose = full ? "full" : quotaDone ? "quota" : bodyCare ? "relax" : todayMin > 0 ? "workout" : "cheer";
  $("n-figure").innerHTML = nCharacterHtml(pose);
  // からだのひとこと（生理中・前回から間が空いたとき）は、お祝いがないときにさりげなく
  const bodyNote = typeof bodyBubble === "function" ? bodyBubble() : null;
  const clothesNote = typeof clothesBubble === "function" ? clothesBubble() : null;
  const backupNote = typeof backupBubble === "function" ? backupBubble() : null;
  $("settings-btn").classList.toggle("has-dot", !!backupNote);
  $("n-bubble").textContent = full
    ? pickMessage("full")
    : quotaDone
      ? pickMessage("quota")
      : bodyNote || clothesNote || backupNote || pickMessage(todayMin > 0 ? "some" : "zero");
  // 今日の小瓶（36分くらいで満タン）
  const todayKey = dateKey();
  const bottle = smallBottleShape(todayKey);
  const shaken = dayShake(todayKey);
  $("jar").innerHTML = bottleHtml([...today].sort((a, b) => a.ts - b.ts), bottle, daySnackFree(todayKey) ? 1 : 0, SMALL_FULL_MIN, shaken && shaken.hex);
  $("jar").classList.toggle("tappable", today.length > 0);
  const colorLine = shaken ? `<span class="jar-color"><span class="mini-swatch" style="background:${shaken.hex}"></span>${shaken.name}</span>` : "";
  $("jar-caption").innerHTML = full
    ? `今日の小瓶${colorLine}<br><strong>合成できるよ！</strong>`
    : `今日の小瓶${colorLine}<br>大瓶まであと <strong>${BIG_BOTTLE_MIN - pool}</strong>分`;
  // 「今日はおしまい」→ シェイク。シェイクしたあとに運動を足したら、もう一度シェイクできる
  const endBtn = $("day-end-btn");
  endBtn.hidden = today.length === 0 || !!shaken;
  const closed = !!data.closed[todayKey];
  endBtn.textContent = closed ? "小瓶をシェイクする" : "今日はおしまい";
  endBtn.classList.toggle("ready", closed);

  $("today-min").textContent = todayMin;
  $("today-kcal").textContent = Math.round(todayKcal);
  $("today-fat").textContent = fatOf(todayKcal).toFixed(1);
  $("quota-stamp").hidden = !quotaDone;

  renderLogList(recentLogs());
}

// あとから記録・直せるのは、7日前まで
const BACKFILL_DAYS = 7;
function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}
const recentLogs = () => data.logs.filter((l) => l.date >= daysAgoKey(BACKFILL_DAYS) && l.date <= dateKey());

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
  if (typeof drawShelf === "function") drawShelf(); // 棚の描画は js/shelf.js
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
  sheet.before = { today: sumMin(todayLogs()), pool: poolMinutes() };
  setRecordDay(dateKey()); // 記録する日：はじめは今日

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
  sheet.before = { today: sumMin(todayLogs()), pool: poolMinutes() };
  $("sheet-pick").hidden = true;
  $("sheet-done").hidden = false;
  updateDone();
  showSheet();
}

// ---------- 記録する日（入れ忘れた日もあとから記録できる） ----------

function setRecordDay(key) {
  const today = dateKey();
  if (!key || key > today) key = today;
  if (key < daysAgoKey(BACKFILL_DAYS)) key = daysAgoKey(BACKFILL_DAYS);
  sheet.day = key;
  const quick = [0, 1, 2].map(daysAgoKey);
  document.querySelectorAll("#day-chips .day-chip[data-back]").forEach((b) =>
    b.setAttribute("aria-pressed", String(daysAgoKey(Number(b.dataset.back)) === key))
  );
  const other = !quick.includes(key);
  $("day-other").classList.toggle("on", other);
  $("day-other-label").textContent = other ? dayLabel(key) : "ほかの日";
  const input = $("day-input");
  input.max = today;
  input.min = daysAgoKey(BACKFILL_DAYS);
  input.value = key;
  $("sheet-sub").textContent = key === today ? "時間をタップすると記録されるよ" : `${dayLabel(key)}の分として記録するよ`;
}
document.querySelectorAll("#day-chips .day-chip[data-back]").forEach((b) =>
  b.addEventListener("click", () => setRecordDay(daysAgoKey(Number(b.dataset.back))))
);
$("day-input").addEventListener("change", (e) => setRecordDay(e.target.value));

function record(min) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: sheet.day || dateKey(),
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
      ? `${e.date === dateKey() ? "" : dayLabel(e.date) + "の"}${sheet.sport.name} ${e.min}分 記録したよ！`
      : `${dayLabel(e.date)}の${sheet.sport.name} ${e.min}分`;
  $("done-burn").textContent = burnText(kcalOf(e));
  document.querySelector('.adjust-btn[data-add="-5"]').disabled = e.min <= 5;
  resetDeleteButton();
}

document.querySelectorAll(".adjust-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const e = currentEntry();
    if (!e) return;
    const next = Math.max(5, e.min + Number(btn.dataset.add));
    if (next < usedOf(e)) {
      const answer = await askAboutBig(e, "分数を減らす");
      if (answer === "cancel") return;
    }
    e.min = next;
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
  const remove = async () => {
    const answer = removed ? await askAboutBig(removed, "記録を消す") : "keep";
    if (answer === "cancel") {
      resetDeleteButton();
      return;
    }
    const usedBefore = removed && answer === "keep" ? (data.usedByLog[removed.id] || 0) : 0;
    data.logs = data.logs.filter((l) => l.id !== sheet.entryId);
    if (removed) delete data.usedByLog[removed.id];
    saveData();
    sheet.entryId = null;
    sheet.before = null;
    closeSheet();
    const msg = answer === "dissolve" ? "大瓶を小瓶に戻して、記録を消したよ" : sheet.mode === "new" ? "取り消したよ" : "記録を消したよ";
    if (removed) showToast(msg, { label: "もとに戻す", run: () => restore(removed, usedBefore) });
  };
  remove();
});

// used：消す前に大瓶に使っていた分（「大瓶はそのまま」で消したときだけ。大瓶と小瓶で二重に数えないように）
function restore(log, used = 0) {
  data.logs.push(log);
  if (used > 0) data.usedByLog[log.id] = used;
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
    const dayText = justRecorded.date === dateKey() ? "" : `${dayLabel(justRecorded.date)}の`;
    showToast(cheer || `${dayText}${sheet.sport.name} ${justRecorded.min}分 記録したよ`, {
      label: "取り消す",
      run: async () => {
        const answer = await askAboutBig(justRecorded, "記録を消す");
        if (answer === "cancel") return;
        data.logs = data.logs.filter((l) => l.id !== justRecorded.id);
        delete data.usedByLog[justRecorded.id];
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

// ノルマクリア・小瓶が250分たまった瞬間にお祝い（トーストに出す言葉を返す）
function celebrate(before) {
  const todayMin = sumMin(todayLogs());
  if (before.pool < BIG_BOTTLE_MIN && poolMinutes() >= BIG_BOTTLE_MIN) {
    $("full-n").innerHTML = nCharacterHtml("full");
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
  // 小瓶の棚を開いて、合成ボタンを見せる
  if (typeof showShelfView === "function") showShelfView("small");
  document.querySelector('.tabbar-btn[data-page="shelf"]').click();
});
$("full-later").addEventListener("click", () => {
  $("full-modal").hidden = true;
});

// ---------- 体重の設定 ----------

function openWeightModal(first) {
  $("weight-title").textContent = first ? "はじめまして！" : "体重を変える";
  $("weight-text").textContent = first
    ? "消費カロリーを計算するために、体重を1回だけ教えてね。画面には表示しないよ。"
    : "新しい体重を入れてね。画面には表示しないよ。";
  $("weight-cancel").hidden = first;
  $("weight-restore").hidden = !first; // 機種変更のときは、最初の画面からバックアップを戻せる
  $("weight-form").querySelector(".primary-btn").textContent = first ? "はじめる" : "変更する";
  $("weight-input").value = "";
  $("weight-error").hidden = true;
  $("weight-n").innerHTML = nCharacterHtml("wave");
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

ensureBottleData();
migrateToSmallBottles();
migrateToUsedByLog();
migrateBigUses();
// 開くたびに「使った分」を大瓶の中身から計算し直す（前の版で取り残された印もここで直る）
{
  const before = JSON.stringify(data.usedByLog || {});
  syncUsedFromBigs();
  if (JSON.stringify(data.usedByLog) !== before) saveData();
}
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
