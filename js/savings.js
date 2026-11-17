// =========================================================
// 貯金瓶
// 毎週の分は「今週の分を入れた」を週1回だけ。追加の分は何回でも。
// 入れるたびにコインが1枚、まんまるの瓶にたまっていく。
// 表示するのは「目標まであと○回」だけ（未入金・遅れなどは出さない）。
// 金額・目標・期限は設定画面で入力（記録と同じ n-app-data に保存＝バックアップにも入る）
// =========================================================

const SAVINGS_BOTTLE_ID = "round"; // 貯金瓶に使う瓶

function savings() {
  if (!data.savings) data.savings = { weekly: null, goal: null, deadline: null, deposits: [] };
  if (!Array.isArray(data.savings.deposits)) data.savings.deposits = [];
  return data.savings;
}
const savingsReady = () => savings().weekly > 0 && savings().goal > 0;
const savedTotal = () => savings().deposits.reduce((t, d) => t + d.amount, 0);
const thisWeeksDeposit = () =>
  savings().deposits.find((d) => d.type === "weekly" && d.week === weekStartKey(dateKey())) || null;

// 目標まであと何回（残りの金額 ÷ 毎週の金額、切り上げ）
function timesLeft() {
  const s = savings();
  const rest = Math.max(0, s.goal - savedTotal());
  return Math.ceil(rest / s.weekly);
}

const yen = (n) => `${Number(n).toLocaleString("ja-JP")}円`;

// ---------- コインの置き場所（瓶の形の中に、下から順に） ----------

let maskGrid = null; // { w, h, inside(x, y) }
function loadMaskGrid() {
  if (maskGrid) return Promise.resolve(maskGrid);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      const inside = (x, y) => {
        const xi = Math.round(x), yi = Math.round(y);
        if (xi < 0 || yi < 0 || xi >= c.width || yi >= c.height) return false;
        return px[(yi * c.width + xi) * 4 + 3] > 140;
      };
      maskGrid = { w: c.width, h: c.height, inside };
      resolve(maskGrid);
    };
    img.onerror = () => resolve(null);
    img.src = `bottles/${SAVINGS_BOTTLE_ID}-mask.webp`;
  });
}

const slotCache = {};
function coinSlots(r) {
  if (slotCache[r]) return slotCache[r];
  const g = maskGrid;
  const fits = (x, y) => {
    if (!g.inside(x, y)) return false;
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      if (!g.inside(x + Math.cos(t) * r * 1.05, y + Math.sin(t) * r * 1.05)) return false;
    }
    return true;
  };
  const slots = [];
  const rowH = r * 1.75;
  let row = 0;
  for (let y = g.h - r - 2; y > r; y -= rowH, row++) {
    const rowSlots = [];
    for (let x = r + (row % 2 ? r : 0); x < g.w - r; x += r * 2.02) {
      // 少しだけずらして、自然に積もった感じにする
      const jx = Math.sin((row + 1) * 12.9898 + x * 78.233) * r * 0.12;
      const jy = Math.cos((row + 1) * 4.1414 + x * 3.7) * r * 0.1;
      if (fits(x + jx, y + jy)) rowSlots.push([x + jx, y + jy]);
    }
    // まん中から外へ向かって積む
    rowSlots.sort((a, b) => Math.abs(a[0] - g.w / 2) - Math.abs(b[0] - g.w / 2));
    slots.push(...rowSlots);
  }
  slotCache[r] = slots;
  return slots;
}

// 目標の回数ぶんのコインがちょうど瓶に入るくらいの大きさを選ぶ
function pickCoinRadius(needed) {
  for (let r = 22; r >= 6; r--) {
    if (coinSlots(r).length >= needed) return r;
  }
  return 6;
}

function coinHtml(dep, slot, r, g, isNew) {
  const left = (slot[0] / g.w) * 100;
  const top = (slot[1] / g.h) * 100;
  const size = ((r * 2) / g.w) * 100;
  const tilt = Math.round(Math.sin(slot[0] * 1.7 + slot[1]) * 25);
  return `<span class="coin${dep.type === "extra" ? " special" : ""}${isNew ? " drop" : ""}"
    style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;width:${size.toFixed(2)}%;--tilt:${tilt}deg"></span>`;
}

let lastCoinCount = null;
async function renderSavingsJar() {
  const s = savings();
  const bottle = bottleById(SAVINGS_BOTTLE_ID);
  const g = await loadMaskGrid();
  const deps = [...s.deposits].sort((a, b) => a.ts - b.ts);
  let coins = "";
  if (g) {
    const planned = deps.length + (savingsReady() ? timesLeft() : 0);
    const r = pickCoinRadius(Math.max(planned, deps.length, 8));
    const slots = coinSlots(r);
    deps.forEach((d, i) => {
      if (i < slots.length) coins += coinHtml(d, slots[i], r, g, lastCoinCount !== null && i >= lastCoinCount);
    });
  }
  lastCoinCount = deps.length;
  const mask = `url(bottles/${bottle.id}-mask.webp)`;
  $("savings-jar").innerHTML = `<div class="bottle" style="aspect-ratio:${bottle.w}/${bottle.h}" role="img" aria-label="貯金瓶（コイン${deps.length}枚）">
    <div class="liquid" style="-webkit-mask-image:${mask};mask-image:${mask}">${coins}</div>
    <img class="glass" src="bottles/${bottle.id}.webp" alt="" width="${bottle.w}" height="${bottle.h}">
  </div>`;
}

// ---------- 画面 ----------

function renderSavings() {
  const s = savings();
  const ready = savingsReady();
  $("savings-setup").hidden = ready;
  $("savings-actions").hidden = !ready;
  if (!ready) $("savings-setup-n").innerHTML = nCharacterHtml("normal");

  const left = ready ? timesLeft() : null;
  $("savings-left").innerHTML = !ready
    ? ""
    : left === 0
      ? `<strong>目標達成！</strong> おめでとう〜`
      : `目標まであと <strong>${left}</strong> 回`;

  const done = thisWeeksDeposit();
  const btn = $("savings-weekly");
  btn.disabled = !!done;
  btn.textContent = done ? "今週の分は入れたよ" : "今週の分を入れた";
  $("savings-weekly-undo").hidden = !done;

  // 入れた記録（新しい順・最近の20件）
  const list = $("savings-history");
  list.replaceChildren();
  const deps = [...s.deposits].sort((a, b) => b.ts - a.ts).slice(0, 20);
  $("savings-history-card").hidden = deps.length === 0;
  for (const d of deps) {
    const li = document.createElement("li");
    li.className = "period-item";
    li.innerHTML = `<span class="coin mini${d.type === "extra" ? " special" : ""}"></span><span class="period-range"></span><span class="period-meta"></span><button class="fix-btn" type="button">取り消す</button>`;
    li.querySelector(".period-range").textContent = shortDate(d.date);
    li.querySelector(".period-meta").textContent = `${d.type === "extra" ? "追加" : "毎週の分"}　${yen(d.amount)}`;
    const del = li.querySelector(".fix-btn");
    del.addEventListener("click", () => {
      if (!del.classList.contains("armed")) {
        del.classList.add("armed");
        del.textContent = "本当に？";
        setTimeout(() => {
          del.classList.remove("armed");
          del.textContent = "取り消す";
        }, 3000);
        return;
      }
      removeDeposit(d);
    });
    list.append(li);
  }

  renderSavingsJar();
}

function addDeposit(type, amount) {
  const wasLeft = timesLeft();
  const dep = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    amount,
    date: dateKey(),
    week: weekStartKey(dateKey()),
    ts: Date.now(),
  };
  savings().deposits.push(dep);
  saveData();
  renderSavings();
  const msg =
    wasLeft > 0 && timesLeft() === 0
      ? "目標達成！ほんとうにおめでとう！"
      : type === "extra"
        ? "キラッとコインが入ったよ！"
        : "チャリン！今週の分が入ったよ";
  showToast(msg, { label: "取り消す", run: () => removeDeposit(dep, true) });
}

function removeDeposit(dep, quiet) {
  savings().deposits = savings().deposits.filter((d) => d.id !== dep.id);
  saveData();
  lastCoinCount = null;
  renderSavings();
  if (!quiet) showToast("取り消したよ", { label: "もとに戻す", run: () => { savings().deposits.push(dep); saveData(); renderSavings(); } });
  else showToast("取り消したよ");
}

$("savings-weekly").addEventListener("click", () => {
  if (!savingsReady() || thisWeeksDeposit()) return; // 1週間に1回まで
  addDeposit("weekly", savings().weekly);
});
$("savings-weekly-undo").addEventListener("click", () => {
  const d = thisWeeksDeposit();
  if (d) removeDeposit(d);
});

// ---------- 追加で入れる ----------

$("savings-extra").addEventListener("click", () => {
  $("extra-amount").value = "";
  $("extra-error").hidden = true;
  $("extra-modal").hidden = false;
  setTimeout(() => $("extra-amount").focus(), 50);
});
$("extra-cancel").addEventListener("click", () => {
  $("extra-modal").hidden = true;
});
$("extra-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const n = Math.round(Number($("extra-amount").value));
  if (!(n >= 1)) {
    $("extra-error").textContent = "1円以上の金額を入れてね";
    $("extra-error").hidden = false;
    return;
  }
  $("extra-modal").hidden = true;
  addDeposit("extra", n);
});

// ---------- 設定 ----------

function openSavingsSettings() {
  const s = savings();
  $("savings-weekly-amount").value = s.weekly || "";
  $("savings-goal").value = s.goal || "";
  $("savings-deadline").value = s.deadline || "";
  $("savings-deadline").min = dateKey();
  $("savings-error").hidden = true;
  $("settings-modal").hidden = true;
  $("savings-modal").hidden = false;
}
$("settings-savings").addEventListener("click", openSavingsSettings);
$("savings-setup-btn").addEventListener("click", openSavingsSettings);
$("savings-cancel").addEventListener("click", () => {
  $("savings-modal").hidden = true;
});
$("savings-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const weekly = Math.round(Number($("savings-weekly-amount").value));
  const goal = Math.round(Number($("savings-goal").value));
  const err = $("savings-error");
  if (!(weekly >= 1) || !(goal >= 1)) {
    err.textContent = "金額は1円以上で入れてね";
    err.hidden = false;
    return;
  }
  const s = savings();
  s.weekly = weekly;
  s.goal = goal;
  s.deadline = $("savings-deadline").value || null;
  saveData();
  $("savings-modal").hidden = true;
  lastCoinCount = null;
  renderSavings();
  showToast("貯金瓶の設定を保存したよ");
});

// 設定画面に今の設定を表示
$("settings-btn").addEventListener("click", () => {
  const s = savings();
  $("settings-savings-sub").textContent = savingsReady()
    ? `毎週 ${yen(s.weekly)}・目標 ${yen(s.goal)}${s.deadline ? `・期限 ${shortDateLong(s.deadline)}` : ""}`
    : "毎週の金額・目標金額・期限";
});

document.addEventListener("pagechange", (e) => {
  if (e.detail === "savings") {
    lastCoinCount = null;
    renderSavings();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderSavings();
});
renderSavings();
