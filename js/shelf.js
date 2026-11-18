// =========================================================
// 瓶の棚
// 棚の背景画像（img/shelf-bg.webp）の上に、満タンになった週の瓶を並べる。
// 4段 × 4つ = 16週で1つの棚。古い順に左上から置いていく。16週をこえたら次の棚へ。
// 瓶は画像を使わず SVG（コード）で描く：ピンクのガラス・コルク・ひも・星のチャーム。
// =========================================================

const SHELF_PER_PAGE = 16;
const SHELF_COLS = 4;
// 背景画像（896×1200）の中で、棚板の上面のまん中（瓶の底を置く高さ）と、板の前面のまん中（名札の高さ）
const SHELF_BOARD = { w: 896, h: 1200 };
const SHELF_BASE_Y = [375, 625, 874, 1128]; // 板の上面の、少し手前より
const SHELF_PLATE_Y = [409, 658, 907, 1167];
const SHELF_COL_X = [178, 358, 538, 718]; // 左右の側板の内側を4等分したまん中

let shelfPage = null; // 表示中の棚（null＝いちばん新しい棚）

// ---------- 瓶の形（viewBox 0 0 100 120、底が y=116 で平ら） ----------
// ずんぐり丸い体・透明なガラスの首・首に半分刺さったコルク・麻ひも＋飾り（星・タグ・羽根）。
// どの週の瓶（9種類）を、どの形で描くか
const SHELF_SHAPE_OF = { round: "round", heart: "heart", heart2: "heart", star: "star", star2: "star", tall: "pot", gem: "gem", diamond: "gem", drop: "drop" };
const SHELF_BOTTOM = 116;
const SHELF_FILL = 0.8; // 満タンの週でも、中身は体の8割まで（上にすき間）
const SHELF_LINE = "#b8957e"; // ふちの線（細い、薄い茶色）
const SHELF_TWINE = "#b58d62"; // 麻ひも

// 角を丸めた星
function roundStarPath(cx, cy, R, r, round = 0.32) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  let d = "";
  pts.forEach((p, i) => {
    const prev = pts[(i + 9) % 10], next = pts[(i + 1) % 10];
    const a = lerp(p, prev, round), b = lerp(p, next, round);
    d += `${i ? "L" : "M"}${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)} `;
  });
  return d + "Z";
}
const starPath = (cx, cy, R, r) => roundStarPath(cx, cy, R, r, 0.18);

// top：体のいちばん上 / bottom：体のいちばん下（中身はここから8割） / foot：下の小さな台（ガラス）
const SHELF_SHAPES = {
  round: {
    body: "M34.4 113 A42 42 0 1 1 65.6 113 L64 116 L36 116 Z",
    top: 32, bottom: 116,
    flowers: [[50, 104], [32, 96], [68, 96], [42, 86], [60, 86], [24, 82], [76, 82]],
  },
  heart: {
    body: "M50 42 C40 26 6 28 6 58 C6 82 34 96 50 108 C66 96 94 82 94 58 C94 28 60 26 50 42 Z",
    foot: "M42 103 L58 103 Q61 110 64 113 Q64 116 61 116 L39 116 Q36 116 36 113 Q39 110 42 103 Z",
    top: 34, bottom: 108,
    flowers: [[50, 96], [36, 84], [64, 84], [22, 68], [78, 68], [50, 76], [42, 64]],
  },
  star: {
    body: roundStarPath(50, 66, 44, 27, 0.3),
    foot: "M42 92 L58 92 Q60 104 64 112 Q65 116 61 116 L39 116 Q35 116 36 112 Q40 104 42 92 Z",
    top: 22, bottom: 101,
    flowers: [[50, 86], [30, 72], [70, 72], [38, 94], [62, 94], [50, 62], [50, 74]],
  },
  pot: {
    body: "M34 32 L66 32 C84 32 90 42 90 58 L90 108 Q90 116 82 116 L18 116 Q10 116 10 108 L10 58 C10 42 16 32 34 32 Z",
    top: 32, bottom: 116,
    flowers: [[50, 106], [28, 100], [72, 100], [36, 86], [64, 86], [22, 76], [78, 76]],
  },
  gem: {
    body: "M30 34 L70 34 Q74 34 77 38 L93 58 Q96 62 93 66 L55 104 Q50 109 45 104 L7 66 Q4 62 7 58 L23 38 Q26 34 30 34 Z",
    foot: "M43 101 L57 101 Q60 109 64 113 Q64 116 61 116 L39 116 Q36 116 36 113 Q40 109 43 101 Z",
    top: 34, bottom: 106,
    flowers: [[50, 92], [34, 78], [66, 78], [50, 80], [22, 62], [78, 62], [50, 66]],
  },
  drop: {
    body: "M37 32 L63 32 C66 48 95 58 95 84 C95 102 84 112 74 116 L26 116 C16 112 5 102 5 84 C5 58 34 48 37 32 Z",
    top: 32, bottom: 116,
    flowers: [[50, 106], [28, 98], [72, 98], [50, 92], [36, 82], [64, 82], [22, 86]],
  },
};

// パステルの色：運動の色を白とまぜて、やさしく薄くする
function pastel(hex, mix = 0.38) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * mix));
  return `rgb(${c.join(",")})`;
}

// ---------- 飾り（麻ひもにつける）：星のチャーム・小さなタグ・羽根 ----------
const SHELF_ACCESSORIES = ["star", "tag", "feather"];
function accessorySvg(kind) {
  if (kind === "tag") {
    return `<path d="M63 23 Q69 28 70 36" fill="none" stroke="${SHELF_TWINE}" stroke-width="1"/>
      <g transform="rotate(14 72 44)">
        <path d="M66 36 L78 36 L78 52 L66 52 L66 39 Z" fill="#efdcb8" stroke="#a9875e" stroke-width=".9" stroke-linejoin="round"/>
        <circle cx="72" cy="39.2" r="1.1" fill="#fff" stroke="#a9875e" stroke-width=".6"/>
        <path d="M68.5 44 Q71 42.6 73 44 T76 44 M68.5 47.5 Q71 46.2 73.5 47.5" fill="none" stroke="#a9875e" stroke-width=".6" stroke-linecap="round"/>
      </g>`;
  }
  if (kind === "feather") {
    return `<g transform="rotate(-28 33 28)">
        <path d="M33 22 C24 26 21 38 25 46 C28 42 31 36 33 22 Z" fill="#f7f1e8" stroke="#c4ab8f" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M33 22 C38 28 37 39 30 45 C30 38 32 30 33 22 Z" fill="#fbf7f1" stroke="#c4ab8f" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M33 21 L27 49" stroke="#b99a7a" stroke-width=".9" stroke-linecap="round"/>
        <path d="M29 34 L25 32 M30 38 L26 37 M31 30 L35 28 M30 35 L34 34" stroke="#d9c7b2" stroke-width=".5"/>
      </g>`;
  }
  return `<path d="M63 23 Q69 30 69 38" fill="none" stroke="${SHELF_TWINE}" stroke-width="1"/>
    <path d="${starPath(69.5, 43.5, 6.4, 3)}" fill="#f6d57e" stroke="#b5873a" stroke-width=".9" stroke-linejoin="round"/>
    <circle cx="67.8" cy="41.8" r=".9" fill="#fff" opacity=".85"/>`;
}

let shelfSvgSeq = 0;
function shelfBottleSvg(shapeName, logs, flowerCount, accessory = "star") {
  const shape = SHELF_SHAPES[shapeName] || SHELF_SHAPES.round;
  const id = "sb" + shelfSvgSeq++;

  // 中身：その週の運動を、下から順に。太さは運動した分数のまま（そろえない）、境目はやわらかくぼかす
  const fillH = (shape.bottom - shape.top) * SHELF_FILL;
  const surface = shape.bottom - fillH;
  const bands = [];
  let used = 0;
  for (const log of logs) {
    if (used >= WEEK_GOAL_MIN) break;
    const min = Math.min(log.min, WEEK_GOAL_MIN - used);
    used += min;
    const sport = sportById(log.type);
    const color = pastel(sport ? sport.color : "#dddddd");
    const last = bands[bands.length - 1];
    if (last && last.color === color) last.min += min; // 同じ運動が続いたら1つの層に
    else bands.push({ color, min });
  }
  // 下（offset 1）から上（offset 0）へ、境目の前後をぼかしてつなぐグラデーション
  const blur = 0.045;
  let stops = "", acc = 0;
  const total = used || 1;
  bands.forEach((b, i) => {
    const lo = 1 - acc / total;                 // この層の下のはし
    acc += b.min;
    const hi = 1 - acc / total;                 // この層の上のはし
    const a = Math.min(lo, Math.max(hi, lo - (i > 0 ? blur : 0)));
    const z = Math.max(hi, Math.min(lo, hi + (i < bands.length - 1 ? blur : 0)));
    stops = `<stop offset="${z.toFixed(3)}" stop-color="${b.color}"/><stop offset="${a.toFixed(3)}" stop-color="${b.color}"/>` + stops;
  });
  const flowers = shape.flowers
    .slice(0, Math.min(flowerCount, 7))
    .map(([fx, fy]) => `<g transform="translate(${fx - 4.4} ${fy - 4.4}) scale(0.36)">${hanamaruSvg("flower-svg").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`)
    .join("");
  const glassFill = `url(#${id}g)`;
  const foot = shape.foot
    ? `<path d="${shape.foot}" fill="${glassFill}" stroke="${SHELF_LINE}" stroke-width="1.1" stroke-linejoin="round"/>
       <path d="M44 107 L42 113" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`
    : "";

  return `<svg viewBox="0 0 100 120" class="shelf-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="${id}c"><path d="${shape.body}"/></clipPath>
      <!-- ガラス：うっすらラベンダーグレー。後ろの棚のピンクがほんのり透ける -->
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/>
        <stop offset=".5" stop-color="#e7e2ef" stop-opacity=".22"/>
        <stop offset="1" stop-color="#d3cbe0" stop-opacity=".38"/>
      </linearGradient>
      <linearGradient id="${id}l" gradientUnits="userSpaceOnUse" x1="0" y1="${surface.toFixed(2)}" x2="0" y2="${shape.bottom}">${stops}</linearGradient>
      <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dcb689"/><stop offset="1" stop-color="#b9875a"/>
      </linearGradient>
      <filter id="${id}s" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
    </defs>

    <!-- 棚に落ちる、うっすらした影 -->
    <ellipse cx="50" cy="${SHELF_BOTTOM + 0.5}" rx="34" ry="3.2" fill="#7a4a5c" opacity=".26" filter="url(#${id}s)"/>

    <!-- コルク（首の中に半分刺さっている。下半分はガラスごしに見える） -->
    <rect x="38.5" y="1.5" width="23" height="24" rx="3" fill="url(#${id}k)" stroke="#8a6040" stroke-width="1"/>
    <ellipse cx="50" cy="2.6" rx="11.5" ry="2.2" fill="#ecc99c" stroke="#8a6040" stroke-width=".8"/>
    <circle cx="44" cy="8" r=".9" fill="#8a6040" opacity=".5"/><circle cx="55" cy="10.5" r=".9" fill="#8a6040" opacity=".5"/><circle cx="49" cy="6.5" r=".7" fill="#8a6040" opacity=".4"/>

    <!-- 透明なガラスの首（コルクの下半分にかぶさる） -->
    <rect x="36" y="13" width="28" height="${shape.top - 9}" rx="3" fill="#ffffff" fill-opacity=".28" stroke="${SHELF_LINE}" stroke-width="1.1"/>
    <rect x="35" y="11.5" width="30" height="4.5" rx="2.2" fill="#ffffff" fill-opacity=".45" stroke="${SHELF_LINE}" stroke-width="1"/>
    <path d="M39.5 17 L39.5 ${shape.top - 1}" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>

    ${foot}

    <!-- 体：ガラスの中に、うすい中身とお花 -->
    <g clip-path="url(#${id}c)">
      <rect x="0" y="0" width="100" height="120" fill="${glassFill}"/>
      <rect x="0" y="${surface.toFixed(2)}" width="100" height="${(120 - surface).toFixed(2)}" fill="url(#${id}l)" opacity=".62"/>
      <rect x="0" y="${(surface - 0.6).toFixed(2)}" width="100" height="1.4" fill="#fff" opacity=".55"/>
      ${flowers}
      <!-- ふちが白っぽく光る -->
      <path d="${shape.body}" fill="none" stroke="#fff" stroke-width="4.5" opacity=".6"/>
      <!-- 左上の白いツヤ -->
      <path d="M19 60 C17 51 23 43 31 41" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".92"/>
      <ellipse cx="21" cy="69" rx="2.3" ry="3.6" fill="#fff" opacity=".85"/>
      <path d="M81 84 C81 92 77 98 71 102" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>
    </g>
    <path d="${shape.body}" fill="none" stroke="${SHELF_LINE}" stroke-width="1.2" stroke-linejoin="round"/>

    <!-- 麻ひもを首に巻く -->
    <path d="M36 19.5 Q50 22.5 64 19.5 M36 22.5 Q50 25.5 64 22.5 M36 25.5 Q50 28.5 64 25.5" fill="none" stroke="${SHELF_TWINE}" stroke-width="1.15" stroke-linecap="round"/>
    <path d="M36 19.5 Q50 22.5 64 19.5" fill="none" stroke="#d9bb93" stroke-width=".45" stroke-dasharray="1.2 1.4"/>
    <path d="M63.5 22.5 q3 1 4.5 4 M63.5 22.5 q1 3 -.5 6" fill="none" stroke="${SHELF_TWINE}" stroke-width=".9" stroke-linecap="round"/>
    ${accessorySvg(accessory)}
  </svg>`;
}

// ---------- 大瓶の棚 ----------

const bigBottlesOldestFirst = () =>
  [...(data.bigBottles || [])].sort((a, b) => (a.date === b.date ? (a.ts || 0) - (b.ts || 0) : a.date < b.date ? -1 : 1));

function bigBottleSvg(b) {
  const shape = SHELF_SHAPE_OF[b.bottle] || "round";
  // 飾り（星・タグ・羽根）は、その大瓶ごとに決まる（開くたびに変わらないように）
  const seed = (b.id + b.date).split("").reduce((t, c) => (t * 31 + c.charCodeAt(0)) % 100003, 7);
  return shelfBottleSvg(shape, b.layers, b.flowers || 0, SHELF_ACCESSORIES[seed % SHELF_ACCESSORIES.length]);
}

function drawShelf() {
  const bigs = bigBottlesOldestFirst();
  const pages = Math.max(1, Math.ceil(bigs.length / SHELF_PER_PAGE));
  if (shelfPage === null || shelfPage >= pages) shelfPage = pages - 1; // はじめは、いちばん新しい棚
  const today = dateKey();

  const board = $("shelf");
  board.replaceChildren();
  bigs.slice(shelfPage * SHELF_PER_PAGE, (shelfPage + 1) * SHELF_PER_PAGE).forEach((b, i) => {
    const row = Math.floor(i / SHELF_COLS);
    const col = i % SHELF_COLS;
    const item = document.createElement("div");
    item.className = "shelf-bottle" + (b.id === justEvolvedId ? " just-evolved" : "");
    item.style.left = `${(SHELF_COL_X[col] / SHELF_BOARD.w) * 100}%`;
    item.style.bottom = `${(1 - SHELF_BASE_Y[row] / SHELF_BOARD.h) * 100}%`;
    item.setAttribute("role", "img");
    item.setAttribute("aria-label", `${shortDate(b.date)}に進化した大瓶`);
    item.innerHTML = bigBottleSvg(b);

    // 札：大瓶に進化した日
    const plate = document.createElement("span");
    plate.className = "shelf-plate" + (b.date === today ? " this-week" : "");
    plate.style.left = item.style.left;
    plate.style.top = `${(SHELF_PLATE_Y[row] / SHELF_BOARD.h) * 100}%`;
    plate.textContent = b.date === today ? "今日" : shortDate(b.date);
    board.append(item, plate);
  });

  $("shelf-empty").hidden = bigs.length > 0;
  $("shelf-nav").hidden = pages <= 1;
  $("shelf-page").textContent = `${shelfPage + 1} / ${pages}`;
  $("shelf-prev").disabled = shelfPage === 0;
  $("shelf-next").disabled = shelfPage >= pages - 1;
  drawSmallShelf();
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
    const slot = document.createElement("div");
    slot.className = "small-slot";
    // 幅と高さをはっきり指定する（iPhone の Safari で幅が0にならないように）
    slot.style.left = `${(SMALL_COL_X[col] / SHELF_BOARD.w) * 100}%`;
    slot.style.bottom = `${(1 - SHELF_BASE_Y[row] / SHELF_BOARD.h) * 100}%`;
    slot.style.height = `${(SMALL_H / SHELF_BOARD.h) * 100}%`;
    slot.style.width = `${((SMALL_H * shape.w) / shape.h / SHELF_BOARD.w) * 100}%`;
    slot.innerHTML = bottleHtml(sb.layers, shape, daySnackFree(sb.day) ? 1 : 0, SMALL_FULL_MIN);
    slot.firstElementChild.setAttribute("aria-label", `${shortDate(sb.day)}の小瓶（${sb.min}分${sb.bonus ? "・おまけ" : ""}）`);

    const plate = document.createElement("span");
    plate.className = "shelf-plate small" + (sb.bonus ? " bonus" : sb.day === today ? " this-week" : ""); // おまけは金色の札
    plate.style.left = slot.style.left;
    plate.style.top = `${(SHELF_PLATE_Y[row] / SHELF_BOARD.h) * 100}%`;
    plate.textContent = sb.day === today ? "今日" : shortDate(sb.day);
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
  let need = BIG_BOTTLE_MIN;
  for (const sb of smallBottles()) {
    if (need <= 0) break;
    let tookFromDay = 0;
    for (const l of sb.layers) {
      if (need <= 0) break;
      const take = Math.min(l.min, need);
      layers.push({ type: l.type, min: take });
      need -= take;
      tookFromDay += take;
    }
    data.consumed[sb.day] = (data.consumed[sb.day] || 0) + tookFromDay;
    used.push({ ...sb, took: tookFromDay });
  }
  // 大瓶の形：前の大瓶とそっくりにならないように選ぶ
  const prev = bigBottlesOldestFirst().slice(-1)[0];
  const prevShape = prev ? SHELF_SHAPE_OF[prev.bottle] : null;
  const choices = BOTTLES.filter((b) => SHELF_SHAPE_OF[b.id] !== prevShape);
  const pick = choices[Math.floor(Math.random() * choices.length)];
  const big = {
    id: "big-" + Date.now().toString(36),
    date: dateKey(),
    layers,
    bottle: pick.id,
    flowers: Math.min(7, new Set(used.filter((u) => daySnackFree(u.day)).map((u) => u.day)).size),
    days: used.map((u) => u.day),
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
    `小瓶${used.length}本ぶん（${BIG_BOTTLE_MIN}分）が、大瓶になったよ` + (bonus ? `。あまった分は、おまけの小瓶として残してあるよ` : "");

  const W = stage.clientWidth || window.innerWidth;
  const H = stage.clientHeight || window.innerHeight;
  const cx = W / 2, cy = H * 0.42;

  // 大瓶（あとで出てくる）
  const bigEl = document.createElement("div");
  bigEl.className = "merge-big";
  bigEl.innerHTML = bigBottleSvg(big);
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
    el.innerHTML = bottleHtml(u.layers, shape, 0, SMALL_FULL_MIN);
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
  setTimeout(showResult, flashAt + 1100);
}
const reduceMotionShelf = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

$("merge-btn").addEventListener("click", () => {
  if (!mergeReady()) return;
  const { big, used } = mergeSmallBottles();
  justEvolvedId = big.id;
  renderAll();
  playEvolution(big, used);
});
$("merge-ok").addEventListener("click", () => {
  $("merge-overlay").hidden = true;
  showShelfView("big");
  shelfPage = null;
  drawShelf();
  window.scrollTo(0, 0);
  setTimeout(() => (justEvolvedId = null), 3000);
});

document.addEventListener("pagechange", (e) => {
  if (e.detail === "shelf") {
    shelfPage = null; // 開くたびに、いちばん新しい棚から
    smallPage = null;
    drawShelf();
  }
});
drawShelf();
