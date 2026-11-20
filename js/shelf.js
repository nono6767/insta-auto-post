// =========================================================
// 瓶の棚
// 棚の背景画像（img/shelf-bg.webp）の上に、満タンになった週の瓶を並べる。
// 4段 × 4つ = 16週で1つの棚。古い順に左上から置いていく。16週をこえたら次の棚へ。
// 瓶は画像を使わず SVG（コード）で描く：ピンクのガラス・コルク・ひも・星のチャーム。
// =========================================================

const SHELF_PER_PAGE = 9; // 大瓶のショーケース：3段 × 3つ（小瓶の棚より少なくして、ゆったり飾る）
const SHELF_COLS = 3;
// 背景画像（896×1200）の中で、棚板の上面のまん中（瓶の底を置く高さ）と、板の前面のまん中（名札の高さ）
const SHELF_BOARD = { w: 896, h: 1200 };
const SHELF_BASE_Y = [375, 625, 874, 1128]; // 板の上面の、少し手前より
const SHELF_PLATE_Y = [409, 658, 907, 1167];
const SHELF_COL_X = [178, 358, 538, 718]; // 左右の側板の内側を4等分したまん中

let shelfPage = null; // 表示中の棚（null＝いちばん新しい棚）

// ---------- 大瓶（チャームなしの瓶のイラスト ＋ 中身 ＋ お花 ＋ チャーム） ----------

const BIG_FILL = 0.8;  // 中身は体の8割まで（上にすき間）
const BIG_BLUR = 2.2; // 層の境目のぼかしの幅（中身の高さの%）
const BIG_H = 178;     // 棚にのせる大瓶の高さ（背景画像1200pxのうち）
const bigBottleById = (id) => BIG_BOTTLES.find((b) => b.id === (BIG_BOTTLE_ALIAS[id] || id)) || BIG_BOTTLES[0];
const charmById = (id) => CHARMS.find((c) => c.id === id) || null;

// （パステルの色は js/app.js の pastel）

const CHARM_MAX = 3; // 1本の瓶につけられるチャームの数

// その大瓶のチャーム（前の版の「1個だけ」の記録もそのまま読む）
const charmsOf = (b) => (Array.isArray(b.charms) ? b.charms : b.charm ? [b.charm] : []).filter((id) => charmById(id)).slice(0, CHARM_MAX);

// チャームをつけ方ごとに描く（位置は瓶の箱の中の%。ひもは SVG、チャームは画像）
// 首の太さ（まんまるの大瓶を1とした大きさ）
const NECK_REF_PX = 31 * 281 / 100;
const NECK_BAND = 1.15; // 首に巻くひもの幅（瓶の口の幅の何倍か）
const neckScale = (bottle) => (bottle.mouth ? (bottle.mouth[1] * bottle.w) / 100 / NECK_REF_PX : 1);

// 小さな輪がつながったチェーン（シャンパンゴールド）。d は SVG の線の道すじ
// 輪を「横向き（ふつうの輪）」と「たて向き（細く見える輪）」で交互にならべて、くさりに見せる
function chainPath(d, behind = false) {
  const o = behind ? ' opacity=".55"' : "";
  return `<g fill="none" stroke-linecap="round"${o}>
    <path d="${d}" stroke="#9c845a" stroke-width="1.5" stroke-dasharray="1.5 1.3"/>
    <path d="${d}" stroke="#ecdcb4" stroke-width=".75" stroke-dasharray="1.5 1.3"/>
    <path d="${d}" stroke="#b9a172" stroke-width=".55" stroke-dasharray="1.2 1.6" stroke-dashoffset="-1.45"/>
  </g>`;
}

function charmsHtml(bottle, ids) {
  const k = bottle.h / bottle.w; // 「瓶の高さの%」を「瓶の幅の%」にするかけ算
  const [nx, ny] = bottle.neck;
  const charms = ids.map(charmById).filter(Boolean);
  const img = (c, cls, left, top, width) =>
    `<img class="charm ${cls}" src="${charmSrc(c)}" alt="" width="${c.w}" height="${c.h}"
      style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;width:${width.toFixed(1)}%;aspect-ratio:${c.w}/${c.h}">`;
  // 幅 widthPct（瓶の幅の%）の絵の、上から a 割のところを y（瓶の高さの%）にそろえたときの、絵の上のはし
  const topAt = (c, widthPct, a, y) => y - (widthPct / k) * (c.h / c.w) * a;

  let back = "", front = "", neckN = 0, hasTop = false;
  const hangs = [];
  for (const c of charms) {
    if (c.place === "top") {
      // ふた：もとのコルクやふたをかくして、瓶の口にのせる（宝石のまん中を瓶のまん中に）
      // 宝石だけのふた（fit）は、瓶の口の幅に合わせた大きさにして、首の中まで差しこむ
      const fit = c.fit && bottle.mouth;
      const w = fit ? bottle.mouth[1] * c.fit : c.pw * k;
      const bottomY = fit ? bottle.mouth[0] - 1 : bottle.cap + 1.5;
      // 首の中に見えるコルクを、ガラスの色でかくす
      if (bottle.cork) {
        const cw = bottle.mouth[1] * 0.92;
        back += `<span class="cork-cover" style="left:${(50 - cw / 2).toFixed(1)}%;width:${cw.toFixed(1)}%;top:${bottle.cap}%;height:${(bottle.mouth[0] - bottle.cap + 0.8).toFixed(1)}%"></span>`;
      }
      front += img(c, "top", 50 + (0.5 - (c.pc ?? 0.5)) * w, topAt(c, w, c.pa, bottomY), w);
      hasTop = true;
    } else if (c.place === "neck") {
      // 首に巻く：大きさは首の太さに合わせる（まんまるの大瓶の首を基準に。細い瓶でも小さくなりすぎない）。2個目からは少し下に
      if (c.band && bottle.mouth) {
        // ひもやくさりの部分を、首の太さ・首の高さにぴったり合わせる
        const [bx, by, bw] = c.band;
        const w = (bottle.mouth[1] * NECK_BAND) / bw;
        front += img(c, "neck", nx + (0.5 - bx) * w, topAt(c, w, by, (bottle.wrap ?? ny - 1) + neckN * 5), w);
      } else {
        const w = Math.min(100, (c.pw * neckScale(bottle) * 281) / bottle.w);
        front += img(c, "neck", nx, topAt(c, w, c.pa, ny + 3 + neckN * 6), w);
      }
      neckN++;
    } else if (c.place === "body") {
      // 体にかぶせる：体の高さの85%
      const hPct = (bottle.bottom - bottle.top) * 0.85;
      const w = (hPct * k * c.w) / c.h;
      front += img(c, "body", 50, (bottle.top + bottle.bottom) / 2 - hPct / 2 + 2, w);
    } else if (c.place === "base") {
      // 瓶の下の台：瓶より少し広く、底のところに
      const w = 118;
      back += img(c, "base", 50, bottle.bottom - (w / k) * (c.h / c.w) * 0.55, w);
    } else {
      hangs.push(c); // 首のチェーンから下げるもの（あとでまとめて並べる）
    }
  }

  // ---------- 首に巻いた細いチェーンと、そこから下がるチャーム ----------
  // 座標は「瓶の幅を100」としたもの（縦も同じ目もりなので、チェーンの輪がつぶれない）
  let svg = "";
  if (hangs.length) {
    const H = 100 * k;                         // 瓶の高さ（幅100の目もりで）
    const Y = (pctH) => (pctH * H) / 100;      // 「瓶の高さの%」→ 目もり
    const nw = (bottle.mouth ? bottle.mouth[1] : 30) * 1.08; // 首の太さ
    const cy = Y((bottle.wrap ?? ny - 1) + 1.5); // チェーンを巻く高さ
    const sag = Math.max(2.2, nw * 0.16);       // 少したるませる
    const L = nx - nw / 2, R = nx + nw / 2;
    // 首のチェーン：うしろ側（細く・うすく）と、前側（たるんだカーブ）
    let paths = chainPath(`M${L} ${cy} Q${nx} ${cy - sag * 0.55} ${R} ${cy}`, true);
    paths += chainPath(`M${L} ${cy} Q${nx} ${cy + sag * 2} ${R} ${cy}`);
    // 下げる場所：1個＝まん中 / 2個＝右と左 / 3個＝右・左・まん中
    const at = (t) => ({ x: L + (R - L) * t, y: cy + sag * 2 * 2 * t * (1 - t) }); // 前側のカーブの上の点
    const spots = hangs.length === 1 ? [0.5] : hangs.length === 2 ? [0.82, 0.18] : [0.84, 0.16, 0.5];
    const box = 28; // チャームは、瓶の高さの28%の枠におさめる
    hangs.forEach((c, i) => {
      const t = spots[i];
      const p = at(t);
      const side = t > 0.6 ? 1 : t < 0.4 ? -1 : 0;
      const width = box * k * (c.w / Math.max(c.w, c.h));
      // 短いチェーンで、少し外がわ・下へ（長く引きのばさない）
      // 2個・3個のときは、左右のチャームを少し外がわへ。まん中は少し下に（重ならないように）
      const many = hangs.length;
      const out = side ? width * (many === 3 ? 0.42 : many === 2 ? 0.3 : 0.15) : 0;
      const drop = side ? 6 : many === 3 ? 9 : 4.5;
      const ex = p.x + side * out, ey = p.y + drop;
      // たるんだカーブ（まん中が少し下にふくらむ）
      paths += chainPath(`M${p.x} ${p.y} Q${(p.x + ex) / 2} ${Math.max(p.y, ey) + 1.6} ${ex} ${ey}`);
      paths += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="1.05" fill="none" stroke="#b39a6a" stroke-width=".7"/>`; // つなぎの輪
      front += img(c, "hang", ex, (ey / H) * 100 - 0.6, width);
    });
    svg = `<svg class="charm-string" viewBox="0 0 100 ${H.toFixed(2)}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
  }
  return { html: back + svg + front, hasTop }; // 台 → チェーン → ほかのチャーム の順に重ねる
}

function bigBottleHtml(b) {
  const bottle = bigBottleById(b.bottle);
  const range = bottle.bottom - bottle.top;
  const total = Math.max(1, b.layers.reduce((t, l) => t + l.min, 0));
  // 小瓶と同じく、淡いパステル・半透明で、層の境目をやわらかくぼかしたグラデーションにする
  // 新しい大瓶は、その日の色の層（l.color）。前の版の大瓶は、種目の色の層
  const colors = b.layers.map((l) => {
    if (l.color) return pastel(l.color, 0.12);
    const sport = sportById(l.type);
    return pastel(sport ? sport.color : "#dddddd", 0.4);
  });
  const stops = [];
  let acc = 0;
  b.layers.forEach((l, i) => {
    const lo = (acc / total) * 100;
    acc += l.min;
    const hi = (acc / total) * 100;
    const t = hi - lo;
    const near = (j) => (b.layers[j] ? (b.layers[j].min / total) * 100 : 0);
    const blurBelow = i === 0 ? 0 : Math.min(BIG_BLUR, 0.3 * Math.min(t, near(i - 1)));
    const blurAbove = i === b.layers.length - 1 ? 0 : Math.min(BIG_BLUR, 0.3 * Math.min(t, near(i + 1)));
    const a = Math.min(hi, lo + blurBelow);
    const z = Math.max(a, hi - blurAbove);
    stops.push(`${colors[i]} ${a.toFixed(2)}%`, `${colors[i]} ${z.toFixed(2)}%`);
  });
  const fillH = range * BIG_FILL;
  const layers = `<span class="layer-stack" style="bottom:${(100 - bottle.bottom).toFixed(2)}%;height:${(fillH + 0.3).toFixed(2)}%;background:linear-gradient(to top, ${stops.join(", ")})"></span>`;
  const size = ((10 * bottle.h) / bottle.w).toFixed(1);
  const flowers = bottle.flowers
    .slice(0, Math.min(b.flowers || 0, 7))
    .map(([x, y], i) => `<span class="flower" style="width:${size}%;left:${x}%;top:${y}%;animation-delay:${(i * -0.7).toFixed(1)}s">${hanamaruSvg("flower-svg")}</span>`)
    .join("");
  const mask = `url(big/${bottle.id}-mask.webp)`;
  const charms = charmsHtml(bottle, charmsOf(b));
  return `<div class="bottle big-bottle" style="aspect-ratio:${bottle.w}/${bottle.h}">
    <div class="liquid" style="-webkit-mask-image:${mask};mask-image:${mask}">${layers}${flowers}</div>
    <img class="glass" src="big/${bottle.id}.webp" alt="" width="${bottle.w}" height="${bottle.h}"${charms.hasTop ? ` style="clip-path:inset(${bottle.cap}% 0 0 0)"` : ""}>
    ${charms.html}
  </div>`;
}

// ---------- 大瓶の棚 ----------

const bigBottlesOldestFirst = () =>
  [...(data.bigBottles || [])].sort((a, b) => (a.date === b.date ? (a.ts || 0) - (b.ts || 0) : a.date < b.date ? -1 : 1));

function drawShelf() {
  const bigs = bigBottlesOldestFirst();
  const pages = Math.max(1, Math.ceil(bigs.length / SHELF_PER_PAGE));
  if (shelfPage === null || shelfPage >= pages) shelfPage = pages - 1; // はじめは、いちばん新しい棚
  const today = dateKey();

  // ショーケース：3つずつ、ガラスの棚に飾る。大瓶のうしろはふんわり光り、ガラスにときどき光が流れる
  const board = $("shelf");
  board.replaceChildren();
  const onPage = bigs.slice(shelfPage * SHELF_PER_PAGE, (shelfPage + 1) * SHELF_PER_PAGE);
  for (let i = 0; i < SHELF_PER_PAGE; i++) {
    const cell = document.createElement("div");
    cell.className = "case-slot";
    const b = onPage[i];
    if (b) {
      const bottle = bigBottleById(b.bottle);
      const names = charmsOf(b).map((id) => charmById(id).name);
      const item = document.createElement("button");
      item.type = "button";
      item.className = "case-bottle" + (b.id === justEvolvedId ? " just-evolved" : "");
      item.style.aspectRatio = `${bottle.w}/${bottle.h}`;
      item.setAttribute("aria-label", `${shortDate(b.date)}に進化した${bottle.name}${names.length ? `（${names.join("・")}）` : ""}。タップでチャームを選ぶ`);
      item.innerHTML = `<span class="case-glow" aria-hidden="true"></span>` + bigBottleHtml(b);
      // ガラスの形にそって、ときどき光がすーっと流れる（瓶ごとに時間をずらす）
      const shine = document.createElement("span");
      shine.className = "big-shimmer occasional";
      shine.style.webkitMaskImage = shine.style.maskImage = `url(big/${bottle.id}-mask.webp)`;
      shine.style.animationDelay = `${(i * 1.7 + Math.random()).toFixed(1)}s`;
      item.querySelector(".bottle").append(shine);
      item.addEventListener("click", () => openCharmPicker(b));
      const plate = document.createElement("span");
      plate.className = "case-plate" + (b.date === today ? " today" : "");
      plate.textContent = b.date === today ? "今日" : shortDate(b.date);
      cell.append(item, plate);
    }
    board.append(cell);
  }

  $("shelf-empty").hidden = bigs.length > 0;
  $("shelf-nav").hidden = pages <= 1;
  $("shelf-page").textContent = `${shelfPage + 1} / ${pages}`;
  $("shelf-prev").disabled = shelfPage === 0;
  $("shelf-next").disabled = shelfPage >= pages - 1;
  drawSmallShelf();
  if (typeof drawColorBook === "function") drawColorBook();
}

$("shelf-prev").addEventListener("click", () => {
  if (shelfPage > 0) shelfPage--;
  drawShelf();
});
$("shelf-next").addEventListener("click", () => {
  shelfPage++;
  drawShelf();
});

// ---------- 小瓶の棚（まだ合成していない小瓶。週でリセットしない） ----------

const SMALL_PER_PAGE = 20;
const SMALL_COLS = 5;
const SMALL_COL_X = [160, 304, 448, 592, 736]; // 側板の内側を5等分したまん中
const SMALL_H = 150;                            // 小瓶の高さ（背景画像1200pxのうち）
let smallPage = null;

function drawSmallShelf() {
  const smalls = smallBottles();
  const total = smalls.reduce((t, b) => t + b.min, 0);
  const ready = total >= BIG_BOTTLE_MIN;
  const pages = Math.max(1, Math.ceil(smalls.length / SMALL_PER_PAGE));
  if (smallPage === null || smallPage >= pages) smallPage = pages - 1;
  const today = dateKey();

  $("pool-count").textContent = smalls.length;
  $("pool-min").textContent = total;
  $("pool-left").innerHTML = ready
    ? `<strong>合成できるよ！</strong> 古い小瓶から250分ぶんが大瓶になるよ`
    : `大瓶まであと <strong>${BIG_BOTTLE_MIN - total}</strong> 分`;
  const btn = $("merge-btn");
  btn.disabled = !ready;
  btn.classList.toggle("ready", ready);

  const board = $("small-shelf");
  board.replaceChildren();
  smalls.slice(smallPage * SMALL_PER_PAGE, (smallPage + 1) * SMALL_PER_PAGE).forEach((sb, i) => {
    const row = Math.floor(i / SMALL_COLS);
    const col = i % SMALL_COLS;
    const shape = smallBottleShape(sb.day);
    const shaken = dayShake(sb.day);
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "small-slot";
    // 幅と高さをはっきり指定する（iPhone の Safari で幅が0にならないように）
    slot.style.left = `${(SMALL_COL_X[col] / SHELF_BOARD.w) * 100}%`;
    slot.style.bottom = `${(1 - SHELF_BASE_Y[row] / SHELF_BOARD.h) * 100}%`;
    slot.style.height = `${(SMALL_H / SHELF_BOARD.h) * 100}%`;
    slot.style.width = `${((SMALL_H * shape.w) / shape.h / SHELF_BOARD.w) * 100}%`;
    slot.innerHTML = bottleHtml(sb.layers, shape, daySnackFree(sb.day) ? 1 : 0, SMALL_FULL_MIN, shaken && shaken.hex);
    slot.setAttribute("aria-label", `${shortDate(sb.day)}の小瓶（${sb.min}分${sb.bonus ? "・おまけ" : ""}${shaken ? "・" + shaken.name : ""}）`);
    slot.addEventListener("click", () => openDayBottle(sb.day));

    const plate = document.createElement("span");
    plate.className = "shelf-plate small" + (sb.bonus ? " bonus" : sb.day === today ? " this-week" : ""); // おまけは金色の札
    plate.style.left = slot.style.left;
    plate.style.top = `${(SHELF_PLATE_Y[row] / SHELF_BOARD.h) * 100}%`;
    plate.textContent = sb.day === today ? "今日" : shortDate(sb.day);
    // シェイクした日は、札がその日の色になって、色の名前も出る
    if (shaken) {
      plate.classList.add("colored");
      plate.style.background = shaken.hex;
      const name = document.createElement("span");
      name.className = "plate-color";
      name.textContent = shaken.name;
      plate.append(name);
    }
    board.append(slot, plate);
  });

  $("small-empty").hidden = smalls.length > 0;
  $("bonus-hint").hidden = !smalls.some((b) => b.bonus);
  $("small-nav").hidden = pages <= 1;
  $("small-page").textContent = `${smallPage + 1} / ${pages}`;
  $("small-prev").disabled = smallPage === 0;
  $("small-next").disabled = smallPage >= pages - 1;
}

$("small-prev").addEventListener("click", () => {
  if (smallPage > 0) smallPage--;
  drawSmallShelf();
});
$("small-next").addEventListener("click", () => {
  smallPage++;
  drawSmallShelf();
});

// 小瓶の棚 / 大瓶の棚 の切りかえ
function showShelfView(view) {
  document.querySelectorAll(".shelf-switch-btn").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.shelf === view)));
  $("small-view").hidden = view !== "small";
  $("big-view").hidden = view !== "big";
  $("color-view").hidden = view !== "color";
}
document.querySelectorAll(".shelf-switch-btn").forEach((b) =>
  b.addEventListener("click", () => {
    shelfPage = null;
    smallPage = null;
    showShelfView(b.dataset.shelf);
    drawShelf();
  })
);

// ---------- 合成して大瓶に進化 ----------

let justEvolvedId = null;

// 古い小瓶から順に250分ぶんをまとめて大瓶にする。あまった分は、おまけの小瓶として残る
function mergeSmallBottles() {
  ensureBottleData();
  const used = [];
  const layers = [];
  const uses = []; // どの記録を何分使ったか（あとで大瓶を小瓶に戻すときに使う）
  let need = BIG_BOTTLE_MIN;
  for (const sb of smallBottles()) {
    if (need <= 0) break;
    let tookFromDay = 0;
    for (const l of sb.layers) {
      if (need <= 0) break;
      const take = Math.min(l.min, need);
      data.usedByLog[l.id] = (data.usedByLog[l.id] || 0) + take; // その記録のうち、大瓶にした分
      uses.push({ logId: l.id, min: take });
      need -= take;
      tookFromDay += take;
    }
    // 大瓶の中身は、その日の色の層（シェイクしていない日も、その日の色を計算して使う）
    if (tookFromDay > 0) {
      const c = dayShake(sb.day) || dayColorOf(sb.day);
      layers.push({ day: sb.day, min: tookFromDay, color: c.hex, name: c.name });
    }
    used.push({ ...sb, took: tookFromDay });
  }
  // 大瓶の形：前の大瓶とそっくりにならないように選ぶ
  const prev = bigBottlesOldestFirst().slice(-1)[0];
  const groupOf = (b) => b.group || b.id;
  const prevGroup = prev ? groupOf(bigBottleById(prev.bottle)) : null;
  const choices = BIG_BOTTLES.filter((b) => groupOf(b) !== prevGroup);
  const pick = choices[Math.floor(Math.random() * choices.length)];
  const big = {
    id: "big-" + Date.now().toString(36),
    date: dateKey(),
    layers,
    bottle: pick.id,
    flowers: Math.min(7, new Set(used.filter((u) => daySnackFree(u.day)).map((u) => u.day)).size),
    days: used.map((u) => u.day),
    charms: [], // 進化したあとに、好きなチャームを3個まで選んでつける
    uses,
    ts: Date.now(),
  };
  data.bigBottles.push(big);
  saveData();
  return { big, used };
}

function sparkle(stage, x, y, delay, size = 14, color = "#fff6c8") {
  const s = document.createElement("span");
  s.className = "spark";
  s.style.left = x + "px";
  s.style.top = y + "px";
  s.style.width = s.style.height = size + "px";
  s.style.background = color;
  stage.append(s);
  s.animate(
    [
      { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(1) rotate(90deg)", opacity: 1, offset: 0.4 },
      { transform: "translate(-50%,-50%) scale(0) rotate(180deg)", opacity: 0 },
    ],
    { duration: 900, delay, easing: "ease-out", fill: "both" }
  );
}

function playEvolution(big, used) {
  const overlay = $("merge-overlay");
  const stage = $("merge-stage");
  const result = $("merge-result");
  stage.replaceChildren();
  result.hidden = true;
  overlay.hidden = false;
  const bonus = used.filter((u) => u.took < u.min).length;
  $("merge-note").textContent =
    `小瓶${used.length}本ぶん（${BIG_BOTTLE_MIN}分）が、大瓶になったよ` + (bonus ? `。あまった分は、おまけの小瓶として残してあるよ` : "") + "。好きなチャームをつけてあげよう";

  const W = stage.clientWidth || window.innerWidth;
  const H = stage.clientHeight || window.innerHeight;
  const cx = W / 2, cy = H * 0.42;

  // 大瓶（あとで出てくる）
  const bigEl = document.createElement("div");
  bigEl.className = "merge-big";
  const bb = bigBottleById(big.bottle);
  bigEl.style.width = `${(Math.min(H * 0.42, 260) * bb.w) / bb.h}px`; // 幅をはっきり指定
  bigEl.innerHTML = bigBottleHtml(big);
  bigEl.style.left = cx + "px";
  bigEl.style.top = cy + "px";
  stage.append(bigEl);

  const showResult = () => {
    result.hidden = false;
    result.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 400, fill: "both" });
  };

  if (reduceMotionShelf()) {
    bigEl.style.opacity = 1;
    showResult();
    return;
  }

  // 1) 使った小瓶が、まわりにぽんぽん現れる（多いときは10本まで）
  const shown = used.slice(-10);
  const R = Math.min(W, H) * 0.34;
  const smalls = shown.map((u, i) => {
    const a = -Math.PI / 2 + (i / shown.length) * Math.PI * 2;
    const el = document.createElement("div");
    el.className = "merge-small";
    const shape = smallBottleShape(u.day);
    el.style.width = `${(56 * shape.w) / shape.h}px`;
    el.style.left = cx + Math.cos(a) * R + "px";
    el.style.top = cy + Math.sin(a) * R + "px";
    const shaken = dayShake(u.day);
    el.innerHTML = bottleHtml(u.layers, shape, 0, SMALL_FULL_MIN, shaken && shaken.hex);
    stage.append(el);
    el.animate(
      [{ transform: "translate(-50%,-50%) scale(0)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1.15)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }],
      { duration: 380, delay: i * 70, easing: "ease-out", fill: "both" }
    );
    return { el, dx: cx - (cx + Math.cos(a) * R), dy: cy - (cy + Math.sin(a) * R) };
  });
  const gatherAt = 380 + shown.length * 70 + 250;

  // 2) くるくる回りながら、まん中に集まって光になる
  smalls.forEach(({ el, dx, dy }, i) => {
    el.animate(
      [
        { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1, filter: "brightness(1)" },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.25) rotate(540deg)`, opacity: 0.2, filter: "brightness(2.2)" },
      ],
      { duration: 750, delay: gatherAt + i * 40, easing: "cubic-bezier(.6,0,.4,1)", fill: "both" }
    );
    for (let k = 0; k < 3; k++) sparkle(stage, cx - dx * (0.3 + k * 0.25), cy - dy * (0.3 + k * 0.25), gatherAt + i * 40 + k * 120, 10);
  });
  const flashAt = gatherAt + 750 + shown.length * 40;

  // 3) ぱあっと光る
  const flash = document.createElement("div");
  flash.className = "merge-flash";
  flash.style.left = cx + "px";
  flash.style.top = cy + "px";
  stage.append(flash);
  flash.animate(
    [{ transform: "translate(-50%,-50%) scale(0)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: 0.35 }, { transform: "translate(-50%,-50%) scale(2.4)", opacity: 0 }],
    { duration: 900, delay: flashAt, easing: "ease-out", fill: "both" }
  );
  // 光の輪のまわりにキラキラ
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 70 + (i % 3) * 30;
    sparkle(stage, cx + Math.cos(a) * r, cy + Math.sin(a) * r, flashAt + 150 + (i % 5) * 60, 12 + (i % 3) * 5, i % 2 ? "#ffffff" : "#ffe08a");
  }

  // 4) 大瓶がぽんっと登場
  bigEl.animate(
    [
      { transform: "translate(-50%,-50%) scale(.2) rotate(-12deg)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(1.15) rotate(4deg)", opacity: 1, offset: 0.6 },
      { transform: "translate(-50%,-50%) scale(.96) rotate(-2deg)", opacity: 1, offset: 0.8 },
      { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
    ],
    { duration: 800, delay: flashAt + 250, easing: "ease-out", fill: "both" }
  );
  // そのあとも、まわりでキラキラ
  for (let i = 0; i < 10; i++) {
    sparkle(stage, cx + (Math.random() - 0.5) * 220, cy + (Math.random() - 0.5) * 240, flashAt + 1000 + i * 180, 10 + Math.random() * 10);
  }
  // 5) 大瓶の特別なかがやき（閉じるまでずっと）
  setTimeout(() => bigGlory(stage, bigEl, big, cx, cy), flashAt + 500);
  setTimeout(showResult, flashAt + 1100);
}
// 大瓶のまわりの、うしろでまわる光の筋・ふんわり光る輪・ガラスをすべる光・ずっとまたたく星・ふってくる光のつぶ
function bigGlory(stage, bigEl, big, cx, cy) {
  const size = Math.max(bigEl.offsetWidth, bigEl.offsetHeight) * 2.3;
  const back = (cls) => {
    const el = document.createElement("div");
    el.className = cls;
    el.style.left = cx + "px";
    el.style.top = cy + "px";
    el.style.width = el.style.height = size + "px";
    stage.insertBefore(el, bigEl);
    return el;
  };
  back("merge-rays");
  back("merge-halo");
  bigEl.classList.add("glory");
  // ガラスの形にそって、光がすーっとすべる
  const bottle = bigBottleById(big.bottle);
  const shine = document.createElement("span");
  shine.className = "big-shimmer";
  const mask = `url(big/${bottle.id}-mask.webp)`;
  shine.style.webkitMaskImage = shine.style.maskImage = mask;
  bigEl.querySelector(".bottle").append(shine);
  // 瓶の中にも、ラメのようなきらめき
  const range = bottle.bottom - bottle.top;
  for (let i = 0; i < 12; i++) {
    const t = document.createElement("span");
    t.className = "merge-twinkle inside";
    t.style.left = 22 + Math.random() * 56 + "%";
    t.style.top = bottle.top + range * (0.25 + Math.random() * 0.68) + "%";
    t.style.animationDelay = (Math.random() * 2).toFixed(2) + "s";
    t.style.animationDuration = (1.1 + Math.random() * 1.1).toFixed(2) + "s";
    bigEl.querySelector(".bottle").append(t);
  }
  // まわりで、ずっとまたたく星
  const w = bigEl.offsetWidth, h = bigEl.offsetHeight;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const rx = w * (0.62 + Math.random() * 0.35), ry = h * (0.5 + Math.random() * 0.22);
    const t = document.createElement("span");
    t.className = "merge-twinkle" + (i % 3 === 0 ? " big" : "");
    t.style.left = cx + Math.cos(a) * rx + "px";
    t.style.top = cy + Math.sin(a) * ry + "px";
    t.style.animationDelay = (Math.random() * 1.8).toFixed(2) + "s";
    t.style.animationDuration = (1.4 + Math.random() * 1.2).toFixed(2) + "s";
    stage.append(t);
  }
  // 上から光のつぶがふってくる
  for (let i = 0; i < 26; i++) {
    const g = document.createElement("span");
    g.className = "merge-glitter";
    g.style.left = Math.random() * 100 + "%";
    g.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
    g.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + "s";
    g.style.background = ["#fff6c8", "#ffffff", "#ffd1e3", "#ffe08a"][i % 4];
    stage.append(g);
  }
}

const reduceMotionShelf = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

$("merge-btn").addEventListener("click", () => {
  if (!mergeReady()) return;
  const { big, used } = mergeSmallBottles();
  justEvolvedId = big.id;
  lastEvolved = big;
  renderAll();
  playEvolution(big, used);
});
let lastEvolved = null;
$("merge-ok").addEventListener("click", () => {
  $("merge-overlay").hidden = true;
  showShelfView("big");
  shelfPage = null;
  drawShelf();
  window.scrollTo(0, 0);
  setTimeout(() => (justEvolvedId = null), 3000);
  // 進化した大瓶に、チャームを選んでつける
  if (lastEvolved) openCharmPicker(lastEvolved, true);
});

// ---------- チャームを選ぶ・付け替える ----------

let charmTarget = null;
let charmChoice = []; // 選んだ順（3個まで）
function openCharmPicker(b, justEvolved = false) {
  charmTarget = b;
  charmChoice = [...charmsOf(b)];
  $("charm-title").textContent = justEvolved ? "チャームを選んでつけよう" : "チャームを付け替える";
  $("charm-sub").textContent = `${shortDate(b.date)}に進化した大瓶・${CHARM_MAX}個まで選べるよ`;
  const grid = $("charm-grid");
  grid.replaceChildren();
  const none = document.createElement("button");
  none.type = "button";
  none.className = "charm-option none";
  none.dataset.id = "";
  none.innerHTML = `<span>ぜんぶ<br>はずす</span>`;
  grid.append(none);
  // 持っているチャームだけ（ガチャ限定のシリーズは、ガチャで手に入れると出てくる）
  for (const c of CHARMS) {
    if (typeof isOwned === "function" && !isOwned(c) && !charmChoice.includes(c.id)) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "charm-option";
    btn.dataset.id = c.id;
    btn.setAttribute("aria-label", c.name);
    btn.innerHTML = `<img src="${charmSrc(c)}" alt="" width="${c.w}" height="${c.h}" loading="lazy"><span class="charm-num"></span>`;
    grid.append(btn);
  }
  grid.querySelectorAll(".charm-option").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (!id) charmChoice = [];                                             // ぜんぶはずす
      else if (charmChoice.includes(id)) charmChoice = charmChoice.filter((x) => x !== id); // もう一度押すとはずす
      else if (charmChoice.length >= CHARM_MAX) {
        showToast(`チャームは${CHARM_MAX}個までだよ。どれかをはずしてね`);
        return;
      } else charmChoice = [...charmChoice, id];
      updateCharmPreview();
    })
  );
  updateCharmPreview();
  $("charm-modal").hidden = false;
}
function updateCharmPreview() {
  $("charm-preview").innerHTML = bigBottleHtml({ ...charmTarget, charm: null, charms: charmChoice });
  const bottle = bigBottleById(charmTarget.bottle);
  $("charm-preview").style.width = `${(150 * bottle.w) / bottle.h}px`;
  $("charm-name").textContent = charmChoice.length
    ? charmChoice.map((id) => charmById(id).name).join("・") + `（${charmChoice.length}/${CHARM_MAX}）`
    : "チャームなし";
  $("charm-grid").querySelectorAll(".charm-option").forEach((btn) => {
    const n = charmChoice.indexOf(btn.dataset.id);
    btn.setAttribute("aria-pressed", String(btn.dataset.id ? n >= 0 : charmChoice.length === 0));
    const num = btn.querySelector(".charm-num");
    if (num) num.textContent = n >= 0 ? "①②③"[n] : "";
  });
}
$("charm-save").addEventListener("click", () => {
  const b = (data.bigBottles || []).find((x) => x.id === charmTarget.id);
  if (b) {
    b.charms = [...charmChoice];
    delete b.charm; // 前の版の「1個だけ」の記録は、新しい形にうつしたので消す
  }
  saveData();
  $("charm-modal").hidden = true;
  drawShelf();
  showToast(charmChoice.length ? `チャームを${charmChoice.length}個つけたよ` : "チャームをはずしたよ");
});
$("charm-cancel").addEventListener("click", () => {
  $("charm-modal").hidden = true;
});

document.addEventListener("pagechange", (e) => {
  if (e.detail === "shelf") {
    shelfPage = null; // 開くたびに、いちばん新しい棚から
    smallPage = null;
    drawShelf();
  }
});
drawShelf();
