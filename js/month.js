// =========================================================
// 月で見る：運動・ごはん・からだの記録を、1か月のカレンダーで見る
// ・ホームの「最近の記録」、ごはん・からだの週のカレンダーの横の「📅 月で見る」から開く
// ・日付をタップすると、その日の記録が下に出る（そこから、その日の画面へ行ける）
// 生理の予測（ルナルナの基本の考え方）と、基礎体温（やる人だけ）もここにまとめる  ※お試し（11/28）
// =========================================================

// ---------- 排卵日の目安（生理の記録から） ----------
const OVULATION_BEFORE = 14;   // 次の生理の何日前を排卵日の目安にするか
const FERTILE_BEFORE = 5;      // 妊娠しやすい時期の目安：排卵日の5日前から
const FERTILE_AFTER = 1;       //                        排卵日の1日後まで

// いまの周期の排卵日の目安（生理中でも出す）。記録がなければ null
function ovulationGuess() {
  const ps = periods();
  if (!ps.length) return null;
  const base = ps[ps.length - 1].start;            // いちばん新しい生理の開始日
  const nextStart = plusDays(base, usualCycle());  // 次の生理の予定
  return plusDays(nextStart, -OVULATION_BEFORE);
}
// カレンダー用：排卵日の目安の日（すぎた周期も、次の生理の記録があればそこから計算）
function ovulationDays() {
  const ps = periods();
  const out = [];
  for (let i = 1; i < ps.length; i++) out.push(plusDays(ps[i].start, -OVULATION_BEFORE));
  const now = ovulationGuess();
  if (now) out.push(now);
  return out;
}
const isFertileDay = (key) => ovulationDays().some((ov) => key >= plusDays(ov, -FERTILE_BEFORE) && key <= plusDays(ov, FERTILE_AFTER));

// ---------- 基礎体温（やる人だけ） ----------
const TEMP_DEFAULT = 36.5;
const tempOf = (key) => {
  const t = data.body && data.body[key] && data.body[key].temp;
  return typeof t === "number" ? t : null;
};
// 前に記録した体温（なければ 36.50）
function lastTemp(before = dateKey()) {
  const keys = Object.keys(data.body || {}).filter((k) => k <= before && tempOf(k) != null).sort();
  return keys.length ? tempOf(keys[keys.length - 1]) : TEMP_DEFAULT;
}
// 体温が上がった日（その周期の中で、3日続けて前の6日の最高より高くなった最初の日）。なければ null
function tempShiftDay() {
  const ps = periods();
  if (!ps.length) return null;
  const from = ps[ps.length - 1].start;
  const keys = Object.keys(data.body || {}).filter((k) => k >= from && tempOf(k) != null).sort();
  for (let i = 6; i + 2 < keys.length; i++) {
    const low = Math.max(...keys.slice(i - 6, i).map(tempOf));
    if ([0, 1, 2].every((j) => tempOf(keys[i + j]) > low + 0.05)) return keys[i];
  }
  return null;
}

// ---------- 画面 ----------
let monthTab = "all";      // all / exercise / meals / body
let monthOf = null;        // "2026-11"
let monthPick = null;      // 選んだ日

function openMonth(tab = "all", day = dateKey()) {
  monthTab = tab;
  monthOf = day.slice(0, 7);
  monthPick = day;
  drawMonth();
  $("month-screen").hidden = false;
  $("month-screen").scrollTop = 0;
}
$("month-close").addEventListener("click", () => ($("month-screen").hidden = true));
$("month-prev").addEventListener("click", () => moveMonth(-1));
$("month-next").addEventListener("click", () => moveMonth(1));
function moveMonth(d) {
  const [y, m] = monthOf.split("-").map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  monthOf = dateKey(dt).slice(0, 7);
  monthPick = null;
  drawMonth();
}
document.querySelectorAll(".month-tab").forEach((b) =>
  b.addEventListener("click", () => {
    monthTab = b.dataset.tab;
    drawMonth();
  })
);

const dayLogs = (key) => data.logs.filter((l) => l.date === key);
const mealCount = (m) => ["breakfast", "lunch", "dinner"].filter((k) => m[k] && (m[k].hachi || m[k].rice)).length;

function drawMonth() {
  const today = dateKey();
  const [y, m] = monthOf.split("-").map(Number);
  $("month-title").textContent = `${y}年${m}月`;
  $("month-next").disabled = monthOf >= plusDays(today, 62).slice(0, 7); // 先は2か月まで（生理の予定を見る用）
  document.querySelectorAll(".month-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === monthTab)));

  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const grid = $("month-grid");
  grid.replaceChildren();
  for (let i = 0; i < first.getDay(); i++) grid.append(document.createElement("span"));
  const ovs = new Set(ovulationDays());
  const shift = tempShiftDay();
  for (let d = 1; d <= days; d++) {
    const key = `${monthOf}-${String(d).padStart(2, "0")}`;
    const future = key > today;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "month-cell" + (key === today ? " today" : "") + (key === monthPick ? " picked" : "") + (future ? " future" : "");
    const show = (t) => monthTab === "all" || monthTab === t;
    let top = "", marks = "";
    // 運動：その日の小瓶の色（シェイクした日はその色、まだの日は運動の色をまぜた色）
    if (show("exercise") && !future) {
      const logs = dayLogs(key);
      if (logs.length) {
        const c = dayShake(key) || dayColorOf(key);
        const min = sumMin(logs);
        top = `<span class="mc-jar${min >= DAILY_QUOTA_MIN ? " full" : ""}" style="--c:${c.hex}"></span>`;
        if (monthTab === "exercise") marks += `<span class="mc-min">${min}</span>`;
      }
    }
    // ごはん：おやつをがまんした日の花まる
    if (show("meals") && !future) {
      const ml = dayMeals(key);
      if (ml.snack === "none") marks += `<span class="mc-hana">✿</span>`;
      else if (monthTab === "meals" && mealCount(ml)) marks += `<span class="mc-dot"></span>`;
    }
    // からだ：生理・生理の予定・排卵日の目安・妊娠しやすい時期・体調
    if (show("body")) {
      if (periodOn(key)) marks += dropSvg();
      else if (predictedOn(key)) marks += predictedDropSvg();
      if (monthTab === "body") {
        if (ovs.has(key)) marks += `<span class="mc-ov" title="排卵日の目安">◎</span>`;
        if (isFertileDay(key)) cell.classList.add("fertile");
        if (key === shift) marks += `<span class="mc-shift" title="体温が上がった日">🌡</span>`;
        const b = bodyOf(key);
        if (!future && (b.condition || b.mood)) marks += `<span class="mc-gb ${b.condition === "bad" || b.mood === "bad" ? "bad" : "good"}"></span>`;
      }
    }
    cell.innerHTML = `<span class="mc-d">${d}</span>${top || `<span class="mc-jar none"></span>`}<span class="mc-marks">${marks}</span>`;
    cell.addEventListener("click", () => {
      monthPick = key;
      drawMonth();
    });
    grid.append(cell);
  }
  drawMonthLegend();
  drawMonthDay();
  drawMonthSummary();
  drawTempGraph();
}

function drawMonthLegend() {
  const L = {
    exercise: `<span><i class="mc-jar" style="--c:#f6c1cf"></i>その日の小瓶の色</span><span><i class="mc-jar full" style="--c:#f6c1cf"></i>満タン</span>`,
    meals: `<span class="mc-hana">✿</span>おやつがまん<span><i class="mc-dot"></i>ごはんを記録</span>`,
    body: `<span>${dropSvg()}生理</span><span>${predictedDropSvg()}予定</span><span class="mc-ov">◎</span>排卵日の目安<span><i class="mc-fertile"></i>妊娠しやすい時期の目安</span>`,
  };
  const keys = monthTab === "all" ? ["exercise", "meals"] : [monthTab];
  $("month-legend").innerHTML = keys.map((k) => L[k]).join("") + (monthTab === "all" ? `<span>${dropSvg()}生理</span>` : "");
}

// 選んだ日の記録
function drawMonthDay() {
  const box = $("month-day");
  if (!monthPick || monthPick.slice(0, 7) !== monthOf) return void (box.hidden = true);
  box.hidden = false;
  const key = monthPick;
  const future = key > dateKey();
  const logs = dayLogs(key);
  const ml = dayMeals(key);
  const b = bodyOf(key);
  const rows = [];
  if (!future) {
    const c = logs.length ? dayShake(key) : null;
    rows.push(["exercise", "運動", logs.length ? `${sumMin(logs)}分（${[...new Set(logs.map((l) => (sportById(l.type) || {}).name))].join("・")}）${c ? `・${c.name}` : ""}` : "記録なし"]);
    const n = mealCount(ml);
    rows.push(["meals", "ごはん", `${n ? `${n}食` : "記録なし"}${ml.snack === "none" ? "・おやつがまん✿" : ml.snack === "ate" ? "・おやつ食べた" : ""}`]);
    const gb = (v) => (v === "good" ? "Good" : v === "bad" ? "Bad" : "—");
    rows.push(["body", "からだ", `体調 ${gb(b.condition)}・気分 ${gb(b.mood)}${b.poop === "yes" ? "・お通じ" : ""}${periodOn(key) ? "・生理" : ""}${tempOf(key) != null ? `・${tempOf(key).toFixed(2)}℃` : ""}`]);
  } else {
    rows.push(["body", "予定", predictedOn(key) ? "生理の予定（目安）" : ovulationDays().includes(key) ? "排卵日の目安" : "まだ先の日だよ"]);
  }
  box.innerHTML = `<h3>${dayLabel(key)}</h3>` + rows.map(([t, label, text]) =>
    `<div class="md-row"><b>${label}</b><span></span>${future ? "" : `<button type="button" class="text-btn small" data-go="${t}">見る ›</button>`}</div>`).join("");
  box.querySelectorAll(".md-row span").forEach((s, i) => (s.textContent = rows[i][2]));
  box.querySelectorAll("[data-go]").forEach((btn) => btn.addEventListener("click", () => goDay(btn.dataset.go, key)));
}
// その日の画面へ
function goDay(kind, key) {
  $("month-screen").hidden = true;
  if (kind === "exercise") {
    if (dayLogs(key).length) openDayDetail(key);
    else document.querySelector('.tabbar-btn[data-page="home"]').click();
  } else if (kind === "meals") {
    mealDay = key;
    document.querySelector('.tabbar-btn[data-page="meals"]').click();
    renderMeals();
  } else {
    bodyDay = key;
    document.querySelector('.tabbar-btn[data-page="body"]').click();
    renderBody();
  }
}

// 月のまとめ
function drawMonthSummary() {
  const keys = [];
  const [y, m] = monthOf.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  for (let d = 1; d <= n; d++) keys.push(`${monthOf}-${String(d).padStart(2, "0")}`);
  const past = keys.filter((k) => k <= dateKey());
  const exDays = past.filter((k) => dayLogs(k).length);
  const total = exDays.reduce((t, k) => t + sumMin(dayLogs(k)), 0);
  const full = exDays.filter((k) => sumMin(dayLogs(k)) >= DAILY_QUOTA_MIN).length;
  const snack = past.filter((k) => dayMeals(k).snack === "none").length;
  const mealDays = past.filter((k) => mealCount(dayMeals(k))).length;
  const hachi = past.reduce((t, k) => { const ml = dayMeals(k); return t + ["breakfast", "lunch", "dinner"].filter((x) => ml[x] && ml[x].hachi === "yes").length; }, 0);
  const good = past.filter((k) => bodyOf(k).condition === "good").length;
  const poop = past.filter((k) => bodyOf(k).poop === "yes").length;
  const tile = (icon, label, big, unit) => `<div class="ms-tile"><span>${icon} ${label}</span><b>${big}</b><small>${unit}</small></div>`;
  const T = {
    exercise: [tile("🏃", "運動", total, "分"), tile("📅", "運動した日", exDays.length, "日"), tile("🫙", "満タン", full, "日")],
    meals: [tile("🍚", "ごはんを記録", mealDays, "日"), tile("✿", "おやつがまん", snack, "日"), tile("🙆", "腹八分目", hachi, "回")],
    body: [tile("😊", "体調Good", good, "日"), tile("🫧", "お通じ", poop, "日"), tile("💧", "次の生理", (nextPeriod() ? shortDate(nextPeriod().start) : "—"), nextPeriod() ? "ごろ" : "")],
  };
  const tiles = monthTab === "all" ? [T.exercise[0], T.exercise[2], T.meals[1], T.body[0]] : T[monthTab];
  $("month-summary").innerHTML = `<h3>${m}月のまとめ</h3><div class="ms-grid">${tiles.join("")}</div>`;
}

// 基礎体温のグラフ（からだのタブで、その月に体温の記録があるとき）
function drawTempGraph() {
  const box = $("month-temp");
  const [y, m] = monthOf.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const pts = [];
  for (let d = 1; d <= n; d++) { const k = `${monthOf}-${String(d).padStart(2, "0")}`; const t = tempOf(k); if (t != null) pts.push([d, t, k]); }
  if (monthTab !== "body" || pts.length < 2) return void (box.hidden = true);
  box.hidden = false;
  const W = 320, H = 150, x0 = 30, top = 8, gw = W - x0 - 8, gh = H - 30;
  const lo = Math.min(36.0, ...pts.map((p) => p[1]) ) - 0.05, hi = Math.max(37.0, ...pts.map((p) => p[1])) + 0.05;
  const X = (d) => x0 + ((d - 1) / (n - 1)) * gw;
  const Y = (t) => top + gh - ((t - lo) / (hi - lo)) * gh;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="temp-svg">`;
  // 生理の日
  for (let d = 1; d <= n; d++) { const k = `${monthOf}-${String(d).padStart(2, "0")}`; if (periodOn(k)) svg += `<rect x="${X(d) - gw / (n - 1) / 2}" y="${top}" width="${gw / (n - 1)}" height="${gh}" fill="#fde3e8"/>`; }
  for (let t = Math.ceil(lo * 10) / 10; t <= hi; t += 0.2) svg += `<line x1="${x0}" x2="${W - 8}" y1="${Y(t)}" y2="${Y(t)}" stroke="#f1dbe3"/><text x="0" y="${Y(t) + 3}" font-size="9" fill="#b893a3">${t.toFixed(1)}</text>`;
  svg += `<polyline points="${pts.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="#e8668f" stroke-width="2"/>`;
  const shift = tempShiftDay();
  for (const [d, t, k] of pts) svg += `<circle cx="${X(d)}" cy="${Y(t)}" r="${k === shift ? 4.5 : 2.6}" fill="${k === shift ? "#fff" : "#e8668f"}" stroke="#e8668f" stroke-width="${k === shift ? 2 : 1}"/>`;
  for (const d of [1, 8, 15, 22, n]) svg += `<text x="${X(d)}" y="${H - 4}" font-size="9" fill="#9a7584" text-anchor="${d === 1 ? "start" : d === n ? "end" : "middle"}">${m}/${d}</text>`;
  svg += `</svg>`;
  box.innerHTML = `<h3>基礎体温</h3>${svg}<p class="mt-note">${shift ? `🌡 <b>${shortDate(shift)}</b>から体温が上がったよ。排卵はそのころだったかも（目安）` : "ピンクの帯は生理の日。体温が上がったところが分かると、ここに出るよ"}</p>`;
}

// ---------- 「📅 月で見る」ボタン ----------
document.querySelectorAll("[data-month-tab]").forEach((b) =>
  b.addEventListener("click", () => {
    const tab = b.dataset.monthTab;
    const day = tab === "meals" ? mealDay : tab === "body" ? bodyDay : dateKey();
    openMonth(tab, day);
  })
);

// ---------- からだの画面：排卵日の目安と、基礎体温のカード ----------
function renderFertility() {
  const ov = ovulationGuess();
  const line = $("period-ov");
  if (ov && !openPeriod()) {
    const shift = tempShiftDay();
    line.hidden = false;
    line.innerHTML = shift
      ? `<span>🌡 <b>${shortDate(shift)}</b>から体温が上がったよ。排卵はそのころだったかも</span>`
      : `<span class="ov-mark">◎</span><span>排卵日の目安：<b>${shortDate(ov)}ごろ</b></span>`;
  } else line.hidden = true;

  // 基礎体温：はじめる前は小さなボタンだけ
  const on = !!data.tempOn;
  $("temp-start").hidden = on;
  $("temp-card").hidden = !on;
  if (!on) return;
  const t = tempOf(bodyDay);
  tempDraft = t != null ? t : tempDraft != null && tempDraftDay === bodyDay ? tempDraft : lastTemp(bodyDay);
  tempDraftDay = bodyDay;
  $("temp-value").innerHTML = `${Math.floor(tempDraft)}.<span>${String(Math.round((tempDraft % 1) * 100)).padStart(2, "0")}</span><small>℃</small>`;
  $("temp-save").textContent = t != null ? `${dayLabel(bodyDay)}の体温を直す` : `${dayLabel(bodyDay)}の体温を記録`;
  $("temp-saved").textContent = t != null ? `記録ずみ：${t.toFixed(2)}℃` : "";
}
let tempDraft = null, tempDraftDay = null;
const stepTemp = (d) => {
  tempDraft = Math.round((tempDraft + d) * 100) / 100;
  tempDraft = Math.min(38.5, Math.max(35.0, tempDraft));
  $("temp-value").innerHTML = `${Math.floor(tempDraft)}.<span>${String(Math.round((tempDraft % 1) * 100)).padStart(2, "0")}</span><small>℃</small>`;
};
document.querySelectorAll("[data-temp-step]").forEach((b) => b.addEventListener("click", () => stepTemp(Number(b.dataset.tempStep))));
$("temp-save").addEventListener("click", () => {
  setBody(bodyDay, "temp", tempDraft);
  renderBody();
  showToast(`${tempDraft.toFixed(2)}℃ を記録したよ`);
});
$("temp-start-btn").addEventListener("click", () => {
  data.tempOn = true;
  saveData();
  renderBody();
});
$("temp-stop").addEventListener("click", () => {
  data.tempOn = false; // 記録はそのまま残る（もう一度はじめると、また見える）
  saveData();
  renderBody();
});
$("temp-graph").addEventListener("click", () => openMonth("body", bodyDay));
