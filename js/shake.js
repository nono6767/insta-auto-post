// =========================================================
// 小瓶のシェイク と 色図鑑
// ・夜、ホームの「今日はおしまい」を押すと、今日の小瓶をシェイクできる
// ・押し忘れた日は、次の日に開いたとき1回だけ「きのうの小瓶、シェイクしよう」と出る
//   （それより前の日も、小瓶の棚で小瓶をタップすればシェイクできる）
// ・小瓶をタップ（または iPhone を振る）と、シャカシャカ揺れて、その日の色にまざる
// ・はじめて出た色は「新しい色！」になって、色図鑑に入る
// ・シェイクしたあとに運動を足したら、またグラデーションに戻って、もう一度シェイクできる
// （色の計算は js/colors.js）
// =========================================================

const shake = { day: null, done: false, busy: false };
let motionAllowed = false; // このあいだに「振ってシェイク」が許可されたか

// その日の小瓶の中身（まだ大瓶にしていない分。今日は今日の全部の記録）
function dayBottleLayers(day) {
  const sb = smallBottles().find((b) => b.day === day);
  if (sb) return sb.layers;
  return data.logs.filter((l) => l.date === day).sort((a, b) => a.ts - b.ts);
}
const dayName = (day) => (day === dateKey() ? "今日" : dayLabel(day));
const reduceMotionShake = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const colorCount = () => Object.keys(data.colorBook || {}).filter((n) => DAY_COLORS.some((c) => c.name === n)).length;

// ---------- 小瓶をタップしたとき（ホーム・小瓶の棚） ----------

function openDayBottle(day) {
  if (!data.logs.some((l) => l.date === day)) return;
  if (!dayShake(day) && canShakeDay(day)) openShake(day);
  else openDayDetail(day);
}

// ---------- シェイクの画面 ----------

function openShake(day, { prompt = false } = {}) {
  ensureBottleData();
  shake.day = day;
  shake.done = false;
  shake.busy = false;
  $("shake-title").textContent = prompt ? "きのうの小瓶、シェイクしよう！" : `${dayName(day)}の小瓶をシェイク`;
  $("shake-sub").textContent = prompt
    ? "きのうは「今日はおしまい」を押してなかったよ。瓶をタップしてね"
    : "瓶をタップすると、シャカシャカまざるよ";
  drawShakeStage();
  $("shake-result").hidden = true;
  $("shake-later").hidden = false;
  $("shake-later").textContent = "あとで";
  $("shake-ok").hidden = true;
  const canMotion = typeof DeviceMotionEvent !== "undefined";
  $("motion-btn").hidden = !canMotion;
  $("motion-btn").disabled = false;
  $("motion-btn").textContent = "iPhoneを振ってシェイク";
  $("shake-modal").hidden = false;
  if (motionAllowed) startMotion(); // 前に許可してもらっていたら、そのまま振れる
}

function drawShakeStage() {
  const day = shake.day;
  const shape = smallBottleShape(day);
  const stage = $("shake-stage");
  stage.style.aspectRatio = `${shape.w}/${shape.h}`;
  stage.innerHTML = bottleHtml(dayBottleLayers(day), shape, daySnackFree(day) ? 1 : 0, SMALL_FULL_MIN);
  stage.disabled = false;
}

function closeShake() {
  stopMotion();
  $("shake-modal").hidden = true;
  shake.day = null;
  renderAll();
}

// シャカシャカ → まざる → 色の発表
function doShake() {
  if (shake.busy || shake.done || !shake.day) return;
  shake.busy = true;
  stopMotion();
  const day = shake.day;
  const color = dayColorOf(day);
  if (!color) return closeShake();
  const stage = $("shake-stage");
  stage.disabled = true;
  $("motion-btn").hidden = true;
  $("shake-later").hidden = true;
  const bottle = stage.querySelector(".bottle");
  const stack = stage.querySelector(".layer-stack");
  const quick = reduceMotionShake();
  const SHAKE_MS = quick ? 0 : 1500;

  if (!quick && bottle) {
    // 瓶がシャカシャカ揺れる
    bottle.animate(
      [
        { transform: "translate(0,0) rotate(0deg)" },
        { transform: "translate(-7%,-3%) rotate(-14deg)" },
        { transform: "translate(7%,-5%) rotate(13deg)" },
        { transform: "translate(-6%,-2%) rotate(-12deg)" },
        { transform: "translate(6%,-4%) rotate(11deg)" },
        { transform: "translate(-4%,-2%) rotate(-8deg)" },
        { transform: "translate(3%,-1%) rotate(5deg)" },
        { transform: "translate(0,0) rotate(0deg)" },
      ],
      { duration: SHAKE_MS, easing: "ease-in-out" }
    );
    // 中身の層がぼやけて、その日の色にまざっていく
    if (stack) {
      stack.animate([{ filter: "blur(0px)" }, { filter: "blur(5px)", offset: 0.6 }, { filter: "blur(2px)" }], { duration: SHAKE_MS, fill: "forwards" });
      const mixed = stack.cloneNode();
      mixed.style.background = liquidColor(color.hex);
      mixed.style.opacity = "0";
      stack.after(mixed);
      mixed.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 0.78 }], { duration: SHAKE_MS, fill: "forwards" });
      // あわがぷくぷく
      const liquid = stage.querySelector(".liquid");
      for (let i = 0; i < 9; i++) {
        const b = document.createElement("span");
        b.className = "shake-bubble";
        b.style.left = 25 + Math.random() * 50 + "%";
        b.style.top = 55 + Math.random() * 30 + "%";
        b.style.width = 4 + Math.random() * 6 + "%";
        liquid.append(b);
        b.animate([{ transform: "translateY(0) scale(.4)", opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: "translateY(-260%) scale(1)", opacity: 0 }], {
          duration: 700 + Math.random() * 500,
          delay: 200 + Math.random() * 900,
          fill: "both",
        });
      }
    }
  }

  setTimeout(() => {
    // 色をきめて、色図鑑に入れる
    ensureBottleData();
    const isNew = !data.colorBook[color.name];
    if (isNew) data.colorBook[color.name] = day;
    data.shakes[day] = { name: color.name, hex: color.hex, sig: daySig(day) };
    saveData();
    shake.done = true;
    shake.busy = false;
    // まざったあとの瓶に描き直す
    const shape = smallBottleShape(day);
    stage.innerHTML = bottleHtml(dayBottleLayers(day), shape, daySnackFree(day) ? 1 : 0, SMALL_FULL_MIN, color.hex);
    stage.querySelector(".bottle").classList.add("just-mixed");
    $("shake-swatch").style.background = color.hex;
    $("shake-name").textContent = color.name;
    $("shake-new").hidden = !isNew;
    $("shake-count").textContent = isNew
      ? `色図鑑に入ったよ（${colorCount()}色 / ${DAY_COLORS.length}色）`
      : `色図鑑 ${colorCount()}色 / ${DAY_COLORS.length}色`;
    $("shake-title").textContent = `${dayName(day)}の色は…`;
    $("shake-sub").textContent = "";
    $("shake-result").hidden = false;
    $("shake-ok").hidden = false;
    $("shake-ok").textContent = isNew ? "やったね！" : "とじる";
    if (isNew) newColorSparkles(stage);
    renderAll();
  }, SHAKE_MS + 50);
}

// 「新しい色！」のキラキラ
function newColorSparkles(stage) {
  if (reduceMotionShake()) return;
  for (let i = 0; i < 12; i++) {
    const s = document.createElement("span");
    s.className = "shake-spark";
    const a = (i / 12) * Math.PI * 2;
    s.style.left = "50%";
    s.style.top = "50%";
    stage.append(s);
    const r = 60 + Math.random() * 30;
    s.animate(
      [
        { transform: "translate(-50%,-50%) scale(0)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r * 1.2}px), calc(-50% + ${Math.sin(a) * r * 1.2}px)) scale(0)`, opacity: 0 },
      ],
      { duration: 1100, delay: i * 30, easing: "ease-out", fill: "both" }
    );
    setTimeout(() => s.remove(), 1600);
  }
}

$("shake-stage").addEventListener("click", doShake);
$("shake-later").addEventListener("click", closeShake);
$("shake-ok").addEventListener("click", closeShake);

// ---------- iPhone を振ってシェイク（動きのセンサー） ----------

let motionHits = [];
function onMotion(e) {
  const a = e.acceleration;
  let power = 0;
  if (a && a.x != null) power = Math.hypot(a.x, a.y, a.z);
  else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
    const g = e.accelerationIncludingGravity;
    power = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.8);
  }
  if (power < 13) return;
  const now = Date.now();
  motionHits = motionHits.filter((t) => now - t < 1200);
  motionHits.push(now);
  if (motionHits.length >= 3) doShake(); // 1秒ちょっとのあいだに3回ふったら
}
function startMotion() {
  motionHits = [];
  window.addEventListener("devicemotion", onMotion);
  $("motion-btn").disabled = true;
  $("motion-btn").textContent = "iPhoneを振ってね！（タップでもOK）";
}
function stopMotion() {
  window.removeEventListener("devicemotion", onMotion);
}
$("motion-btn").addEventListener("click", async () => {
  try {
    // iPhone は、動きを使ってよいか聞く必要がある
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      const answer = await DeviceMotionEvent.requestPermission();
      if (answer !== "granted") {
        $("motion-btn").textContent = "許可がないので、タップでシェイクしてね";
        $("motion-btn").disabled = true;
        return;
      }
    }
    motionAllowed = true;
    startMotion();
  } catch (e) {
    $("motion-btn").textContent = "振るのは使えないみたい。タップでシェイクしてね";
    $("motion-btn").disabled = true;
  }
});

// ---------- シェイクした小瓶の中身（もとの層と、種目ごとの分数） ----------

let detailDay = null;
function openDayDetail(day) {
  detailDay = day;
  const shaken = dayShake(day);
  const shape = smallBottleShape(day);
  const layers = dayBottleLayers(day);
  const flowers = daySnackFree(day) ? 1 : 0;
  $("day-title").textContent = `${dayName(day)}の小瓶`;
  $("day-color").hidden = !shaken;
  if (shaken) {
    $("day-swatch").style.background = shaken.hex;
    $("day-color-name").textContent = shaken.name;
  }
  const box = (html, cap) =>
    `<figure class="day-bottle"><div class="day-bottle-img" style="aspect-ratio:${shape.w}/${shape.h}">${html}</div><figcaption>${cap}</figcaption></figure>`;
  $("day-bottles").innerHTML = shaken
    ? box(bottleHtml(layers, shape, flowers, SMALL_FULL_MIN), "もとの層") +
      `<span class="day-arrow" aria-hidden="true">→</span>` +
      box(bottleHtml(layers, shape, flowers, SMALL_FULL_MIN, shaken.hex), "シェイク")
    : box(bottleHtml(layers, shape, flowers, SMALL_FULL_MIN), "");
  // その日の運動（種目ごとの分数）
  const mins = dayMinutesByType(day);
  const total = Object.values(mins).reduce((t, m) => t + m, 0);
  $("day-mins").innerHTML = SPORTS.filter((s) => mins[s.id] > 0)
    .map((s) => `<li><span class="dot" style="--c:${s.color}"></span><span class="day-sport">${s.name}</span><span class="day-min">${mins[s.id]}分</span></li>`)
    .join("") + `<li class="day-total"><span class="day-sport">合計</span><span class="day-min">${total}分</span></li>`;
  // まだシェイクしていない日
  const today = day === dateKey();
  const btn = $("day-shake");
  btn.hidden = !!shaken;
  btn.textContent = today && !canShakeDay(day) ? "今日はおしまいにしてシェイク" : "シェイクする";
  $("day-note").hidden = !!shaken;
  $("day-note").textContent = today && !canShakeDay(day)
    ? "夜になったら「今日はおしまい」でシェイクしよう。シェイクしたあとに運動を足しても、もう一度シェイクできるよ"
    : "まだシェイクしていない小瓶だよ";
  $("day-modal").hidden = false;
}
$("day-close").addEventListener("click", () => ($("day-modal").hidden = true));
$("day-shake").addEventListener("click", () => {
  const day = detailDay;
  $("day-modal").hidden = true;
  if (!day) return;
  if (day === dateKey()) data.closed[day] = true;
  saveData();
  openShake(day);
});

// ---------- ホームの「今日はおしまい」と、今日の小瓶 ----------

$("day-end-btn").addEventListener("click", () => {
  const day = dateKey();
  ensureBottleData();
  data.closed[day] = true;
  saveData();
  renderAll();
  openShake(day);
});
$("jar").addEventListener("click", () => openDayBottle(dateKey()));

// ---------- 次の日に開いたとき：きのうの小瓶をシェイクしよう（1回だけ） ----------

function askShakeYesterday() {
  ensureBottleData();
  const y = daysAgoKey(1);
  if (data.shakePromptShown === y) return;
  if (!smallBottles().some((b) => b.day === y) || dayShake(y)) return;
  // ほかの画面（体重の入力・記録のシートなど）が出ているときは、次の機会に
  if (document.querySelector(".modal-backdrop:not([hidden])") || !$("sheet").hidden) return;
  data.shakePromptShown = y;
  saveData();
  openShake(y, { prompt: true });
}

// ---------- 色図鑑 ----------

function drawColorBook() {
  ensureBottleData();
  const n = colorCount();
  $("book-count").textContent = n;
  $("book-total").textContent = DAY_COLORS.length;
  const grid = $("color-book");
  grid.replaceChildren();
  // 出た色だけを、色見本の順に並べる（まだ出ていない色は見せない）
  for (const c of DAY_COLORS) {
    const first = data.colorBook[c.name];
    if (!first) continue;
    const item = document.createElement("div");
    item.className = "book-item";
    item.innerHTML = `<span class="book-swatch" style="background:${c.hex}"></span><span class="book-name"></span><span class="book-date"></span>`;
    item.querySelector(".book-name").textContent = c.name;
    item.querySelector(".book-date").textContent = `${shortDate(first)}に発見`;
    grid.append(item);
  }
  $("book-empty").hidden = n > 0;
}

// ---------- 起動 ----------

ensureBottleData();
renderAll();
setTimeout(askShakeYesterday, 600);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setTimeout(askShakeYesterday, 600);
});
