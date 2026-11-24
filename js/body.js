// =========================================================
// 4. 毎日の体調・気分と生理
// 体調・気分は Good / Bad をワンタップ（ノルマにはしない）。
// 生理は「きた」「終わった」をワンタップ。日付はあとから直せる。
// =========================================================

const GOOD_BAD = [
  { value: "good", label: "Good" },
  { value: "bad", label: "Bad" },
];
const POOP_CHOICES = [
  { value: "yes", label: "出た" },
  { value: "no", label: "出なかった" },
];
const DEFAULT_CYCLE_DAYS = 28; // 記録が少ないうちの目安
const LATE_MARGIN_DAYS = 7;    // いつもの間隔からこれだけ空いたらお知らせ
const LONG_PERIOD_DAYS = 10;   // 終わった日の入れ忘れを疑う日数

let bodyDay = dateKey();

// ---------- データ ----------

function bodyOf(key) {
  if (!data.body) data.body = {};
  return data.body[key] || {};
}
function setBody(key, field, value) {
  if (!data.body) data.body = {};
  const day = data.body[key] || (data.body[key] = {});
  day[field] = value;
  saveData();
  if (typeof checkCoinRewards === "function") checkCoinRewards(); // 生理中の記録のコイン
}

function periods() {
  if (!data.periods) data.periods = [];
  return data.periods.sort((a, b) => (a.start < b.start ? -1 : 1));
}
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

// その日を含む生理（なければ null）
function periodOn(key) {
  // 終わった日がまだのときは、今日までを生理中とみなす（未来の日にはしずくを出さない）
  return periods().find((p) => p.start <= key && key <= (p.end || dateKey())) || null;
}
// 終わった日がまだ入っていない生理
const openPeriod = () => periods().find((p) => !p.end) || null;

// いつもの間隔（開始日から次の開始日まで）の平均
function usualCycle() {
  const ps = periods();
  const gaps = [];
  for (let i = 1; i < ps.length; i++) {
    const g = daysBetween(ps[i - 1].start, ps[i].start);
    if (g >= 15 && g <= 60) gaps.push(g);
  }
  if (!gaps.length) return DEFAULT_CYCLE_DAYS;
  return Math.round(gaps.reduce((t, g) => t + g, 0) / gaps.length);
}

// 前回から間が空いているか（ホームのNの吹き出しでも使う）
function periodLateInfo() {
  const ps = periods();
  if (!ps.length || openPeriod()) return null;
  const last = ps[ps.length - 1];
  const since = daysBetween(last.start, dateKey());
  const cycle = usualCycle();
  return since >= cycle + LATE_MARGIN_DAYS ? { since, cycle } : null;
}

// ホームのNの吹き出しに出す、からだのひとこと（なければ null）
function bodyBubble() {
  const late = periodLateInfo();
  if (late) return `そういえば、前の生理から${late.since}日たったね。からだ冷やさないでね`;
  const open = openPeriod();
  if (open && daysBetween(open.start, dateKey()) <= 7) return "生理中は無理しないでね〜。ストレッチだけでもえらいよ";
  return null;
}

// ---------- 描画 ----------

function dropSvg() {
  return `<svg viewBox="0 0 24 24" class="drop-icon" aria-label="生理"><path d="M12 3c3 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.8 6-11Z" fill="#f48a8a"/><ellipse cx="9.6" cy="14" rx="1.4" ry="2.2" fill="#fff" opacity=".6"/></svg>`;
}

function renderBody() {
  const today = dateKey();
  if (bodyDay > today) bodyDay = today;
  const day = bodyOf(bodyDay);

  $("body-day-title").textContent = dayLabel(bodyDay);
  $("body-next").disabled = bodyDay >= today;

  // 週のカレンダー：体調・気分の点と、生理のしずく
  const strip = $("body-week");
  strip.replaceChildren();
  const start = parseKey(weekStartKey(bodyDay));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const b = bodyOf(key);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "week-cell" + (key === bodyDay ? " current" : "") + (key === today ? " today" : "");
    cell.disabled = key > today;
    const dots = ["condition", "mood"]
      .map((f) => `<i class="gb-dot ${b[f] || "none"}"></i>`)
      .join("") + (b.poop === "yes" ? `<i class="gb-dot poop" title="お通じ"></i>` : "");
    cell.innerHTML = `<span class="wd">${WEEKDAYS[d.getDay()]}</span><span class="dn">${d.getDate()}</span>
      <span class="mark">${periodOn(key) ? dropSvg() : ""}</span><span class="gb-dots">${dots}</span>`;
    cell.addEventListener("click", () => {
      bodyDay = key;
      renderBody();
    });
    strip.append(cell);
  }

  // 体調・気分
  for (const [field, rowId] of [["condition", "condition-row"], ["mood", "mood-row"]]) {
    const row = choiceRow(GOOD_BAD, day[field], (v) => {
      setBody(bodyDay, field, v);
      renderBody();
    });
    row.id = rowId;
    row.querySelectorAll(".choice-btn").forEach((b, i) => b.style.setProperty("--on", i === 0 ? "#5fc39b" : "#9a8fb5"));
    $(rowId).replaceWith(row);
  }
  // お通じ（出た／出なかった。もう一度押すと取り消し）
  {
    const row = choiceRow(POOP_CHOICES, day.poop, (v) => {
      setBody(bodyDay, "poop", v);
      renderBody();
    });
    row.id = "poop-row";
    row.querySelectorAll(".choice-btn").forEach((b, i) => b.style.setProperty("--on", i === 0 ? "#c79a6b" : "#9a8fb5"));
    $("poop-row").replaceWith(row);
  }

  renderPeriod();
}

function renderPeriod() {
  const today = dateKey();
  const open = openPeriod();
  const onDay = periodOn(bodyDay);
  const btn = $("period-btn");
  const status = $("period-status");
  const note = $("period-note");
  const whenText = bodyDay === today ? "今日" : dayLabel(bodyDay);

  if (open && bodyDay >= open.start) {
    const n = daysBetween(open.start, bodyDay) + 1;
    status.innerHTML = `${dropSvg()}<span>生理中・${n}日目（${shortDate(open.start)}から）</span>`;
    btn.textContent = `${whenText}で終わった`;
    btn.className = "period-btn end";
    btn.onclick = () => {
      open.end = bodyDay;
      saveData();
      renderBody();
      renderAll();
      showToast("おつかれさま。記録したよ", { label: "取り消す", run: () => { open.end = null; saveData(); renderBody(); renderAll(); } });
    };
  } else if (open && bodyDay < open.start) {
    status.innerHTML = `${dropSvg()}<span>生理中（${shortDate(open.start)}から）</span>`;
    btn.textContent = `始まった日を${whenText}に直す`;
    btn.className = "period-btn plain";
    btn.onclick = () => {
      const before = open.start;
      open.start = bodyDay;
      saveData();
      renderBody();
      renderAll();
      showToast("始まった日を直したよ", { label: "取り消す", run: () => { open.start = before; saveData(); renderBody(); renderAll(); } });
    };
  } else if (onDay) {
    status.innerHTML = `${dropSvg()}<span>この日は生理中（${shortDate(onDay.start)}〜${shortDate(onDay.end)}）</span>`;
    btn.textContent = "日付を直す";
    btn.className = "period-btn plain";
    btn.onclick = () => openPeriodModal(onDay);
  } else {
    const ps = periods();
    const last = ps[ps.length - 1];
    status.textContent = last
      ? `前回は${shortDate(last.start)}から（${daysBetween(last.start, today)}日前）`
      : "まだ記録がないよ";
    btn.textContent = `${whenText}、生理がきた`;
    btn.className = "period-btn start";
    btn.onclick = () => {
      const p = { start: bodyDay, end: null };
      data.periods.push(p);
      saveData();
      renderBody();
      renderAll();
      showToast("記録したよ。あたたかくしてね", {
        label: "取り消す",
        run: () => { data.periods = data.periods.filter((x) => x !== p); saveData(); renderBody(); renderAll(); },
      });
    };
  }

  // さりげないお知らせ
  const late = periodLateInfo();
  if (open && daysBetween(open.start, today) + 1 > LONG_PERIOD_DAYS) {
    note.textContent = "終わった日を入れ忘れていたら、終わった日を選んで「終わった」を押してね（「‹」で前の日に戻れるよ）";
    note.hidden = false;
  } else if (late) {
    note.textContent = `前回から${late.since}日たっているよ。疲れやストレスでずれることもあるから、ゆっくりしてね。続くときは婦人科で相談してもいいかも`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }

  // これまでの記録
  const list = $("period-list");
  list.replaceChildren();
  const ps = [...periods()].reverse();
  $("period-history-card").hidden = ps.length === 0;
  ps.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "period-item";
    const len = p.end ? `${daysBetween(p.start, p.end) + 1}日間` : "生理中";
    const prev = ps[i + 1];
    const gap = prev ? `・前回から${daysBetween(prev.start, p.start)}日` : "";
    li.innerHTML = `<span class="period-range"></span><span class="period-meta"></span><button class="fix-btn" type="button">直す</button>`;
    li.querySelector(".period-range").textContent = `${shortDate(p.start)}〜${p.end ? shortDate(p.end) : ""}`;
    li.querySelector(".period-meta").textContent = len + gap;
    li.querySelector(".fix-btn").addEventListener("click", () => openPeriodModal(p));
    list.append(li);
  });
}

// ---------- 日付を直す ----------

let editingPeriod = null;

function openPeriodModal(p) {
  editingPeriod = p;
  $("period-start").value = p.start;
  $("period-end").value = p.end || "";
  $("period-start").max = $("period-end").max = dateKey();
  $("period-error").hidden = true;
  const del = $("period-delete");
  del.classList.remove("armed");
  del.textContent = "この記録を消す";
  $("period-modal").hidden = false;
}
function closePeriodModal() {
  $("period-modal").hidden = true;
  editingPeriod = null;
}

$("period-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const start = $("period-start").value;
  const end = $("period-end").value || null;
  const err = $("period-error");
  if (!start) return;
  if (end && end < start) {
    err.textContent = "終わった日は、始まった日より後にしてね";
    err.hidden = false;
    return;
  }
  editingPeriod.start = start;
  editingPeriod.end = end;
  saveData();
  closePeriodModal();
  renderBody();
  renderAll();
  showToast("日付を直したよ");
});

$("period-delete").addEventListener("click", () => {
  const del = $("period-delete");
  if (!del.classList.contains("armed")) {
    del.classList.add("armed");
    del.textContent = "本当に消す";
    return;
  }
  const removed = editingPeriod;
  data.periods = data.periods.filter((x) => x !== removed);
  saveData();
  closePeriodModal();
  renderBody();
  renderAll();
  showToast("記録を消したよ", { label: "もとに戻す", run: () => { data.periods.push(removed); saveData(); renderBody(); renderAll(); } });
});
$("period-cancel").addEventListener("click", closePeriodModal);

// ---------- 日付の移動 ----------

$("body-prev").addEventListener("click", () => {
  const d = parseKey(bodyDay);
  d.setDate(d.getDate() - 1);
  bodyDay = dateKey(d);
  renderBody();
});
$("body-next").addEventListener("click", () => {
  const d = parseKey(bodyDay);
  d.setDate(d.getDate() + 1);
  bodyDay = dateKey(d);
  renderBody();
});

document.addEventListener("pagechange", (e) => {
  if (e.detail === "body") {
    bodyDay = dateKey();
    renderBody();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderBody();
});
renderBody();
renderAll(); // ホームのNの吹き出しにからだのひとことを反映
