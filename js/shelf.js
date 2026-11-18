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

// ---------- 瓶の形（viewBox 0 0 100 120、底が y=116） ----------
// ずんぐり丸い体・太く短い首・大きめのコルク。
// どの週の瓶（9種類）を、どの形で描くか
const SHELF_SHAPE_OF = { round: "round", heart: "heart", heart2: "heart", star: "star", star2: "star", tall: "pot", gem: "gem", diamond: "gem", drop: "drop" };
const SHELF_BOTTOM = 116;
const SHELF_FILL = 0.8; // 満タンの週でも、中身は体の8割まで（上にすき間）

// 角を丸めた星（ぷっくりした星の瓶）
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
function starPath(cx, cy, R, r) {
  return roundStarPath(cx, cy, R, r, 0.18);
}

const SHELF_SHAPES = {
  round: { body: "M50 34 A41 41 0 1 1 49.9 34 Z", top: 34, flowers: [[50, 104], [30, 94], [70, 94], [40, 84], [60, 84], [22, 80], [78, 80]] },
  heart: { body: "M50 44 C40 28 4 30 4 62 C4 90 34 104 50 116 C66 104 96 90 96 62 C96 30 60 28 50 44 Z", top: 40, flowers: [[50, 104], [34, 92], [66, 92], [22, 76], [78, 76], [50, 84], [42, 72]] },
  star: { body: roundStarPath(50, 72, 48, 30, 0.3), top: 28, flowers: [[50, 96], [30, 80], [70, 80], [38, 108], [62, 108], [50, 72], [50, 84]] },
  pot: { body: "M34 34 L66 34 C84 34 90 44 90 60 L90 98 C90 110 82 116 70 116 L30 116 C18 116 10 110 10 98 L10 60 C10 44 16 34 34 34 Z", top: 34, flowers: [[50, 106], [28, 100], [72, 100], [36, 86], [64, 86], [22, 76], [78, 76]] },
  gem: { body: "M30 36 L70 36 Q74 36 77 40 L94 64 Q97 69 93 74 L55 112 Q50 117 45 112 L7 74 Q3 69 6 64 L23 40 Q26 36 30 36 Z", top: 36, flowers: [[50, 100], [34, 84], [66, 84], [50, 88], [24, 70], [76, 70], [50, 74]] },
  drop: { body: "M36 34 L64 34 C67 50 95 60 95 86 C95 106 76 116 50 116 C24 116 5 106 5 86 C5 60 33 50 36 34 Z", top: 34, flowers: [[50, 106], [28, 98], [72, 98], [50, 92], [36, 82], [64, 82], [22, 86]] },
};

// パステルの色：運動の色を白とまぜてやさしくする
function pastel(hex, mix = 0.3) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * mix));
  return `rgb(${c.join(",")})`;
}

let shelfSvgSeq = 0;
function shelfBottleSvg(shapeName, logs, flowerCount) {
  const shape = SHELF_SHAPES[shapeName] || SHELF_SHAPES.round;
  const id = "sb" + shelfSvgSeq++;

  // 中身：その週の運動の色を、パステルの層にして体の8割まで
  const fillH = (SHELF_BOTTOM - shape.top) * SHELF_FILL;
  let y = SHELF_BOTTOM, used = 0, layers = "";
  for (const log of logs) {
    if (used >= WEEK_GOAL_MIN) break;
    const min = Math.min(log.min, WEEK_GOAL_MIN - used);
    used += min;
    const h = (min / WEEK_GOAL_MIN) * fillH;
    y -= h;
    const sport = sportById(log.type);
    layers += `<rect x="0" y="${y.toFixed(2)}" width="100" height="${(h + 0.4).toFixed(2)}" fill="${pastel(sport ? sport.color : "#dddddd")}"/>`;
  }
  const surface = (SHELF_BOTTOM - fillH).toFixed(2);
  const flowers = shape.flowers
    .slice(0, Math.min(flowerCount, 7))
    .map(([fx, fy]) => `<g transform="translate(${fx - 4.6} ${fy - 4.6}) scale(0.38)">${hanamaruSvg("flower-svg").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`)
    .join("");

  return `<svg viewBox="0 0 100 120" class="shelf-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="${id}c"><path d="${shape.body}"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f4f0fa" stop-opacity=".7"/>
        <stop offset=".5" stop-color="#d9d2e6" stop-opacity=".42"/>
        <stop offset="1" stop-color="#bdb3cf" stop-opacity=".55"/>
      </linearGradient>
      <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dcb486"/><stop offset="1" stop-color="#b07d4e"/>
      </linearGradient>
      <filter id="${id}s" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
    </defs>

    <!-- 棚に落ちる、うっすらした影 -->
    <ellipse cx="50" cy="${SHELF_BOTTOM + 1}" rx="36" ry="4" fill="#7a4a5c" opacity=".28" filter="url(#${id}s)"/>

    <!-- 太く短い首（ガラス） -->
    <rect x="34" y="18" width="32" height="${shape.top - 14}" rx="5" fill="url(#${id}g)" stroke="#9b8daf" stroke-width="1.8"/>
    <path d="M38 22 L38 ${shape.top - 2}" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>

    <!-- 体：ガラスの中に、パステルの中身とお花 -->
    <g clip-path="url(#${id}c)">
      <rect x="0" y="0" width="100" height="120" fill="url(#${id}g)"/>
      <g opacity=".9">${layers}</g>
      <rect x="0" y="${surface}" width="100" height="1.6" fill="#fff" opacity=".7"/>
      ${flowers}
      <!-- ガラスごしに見える感じ（うっすらラベンダーグレー） -->
      <rect x="0" y="0" width="100" height="120" fill="#e6e0f0" opacity=".12"/>
      <!-- ふちが白っぽく光る -->
      <path d="${shape.body}" fill="none" stroke="#fff" stroke-width="5" opacity=".6"/>
      <!-- 左上の白いツヤ -->
      <path d="M20 58 C18 50 24 42 32 40" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity=".9"/>
      <ellipse cx="22" cy="68" rx="2.6" ry="4" fill="#fff" opacity=".85"/>
      <path d="M80 86 C80 94 76 100 70 104" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>
    </g>
    <path d="${shape.body}" fill="none" stroke="#8f80a4" stroke-width="2" stroke-linejoin="round"/>

    <!-- 口のふち -->
    <rect x="31" y="16" width="38" height="7" rx="3.5" fill="#f3eff9" stroke="#9b8daf" stroke-width="1.6"/>
    <!-- 大きめのコルク -->
    <rect x="32" y="1.5" width="36" height="17" rx="5" fill="url(#${id}k)" stroke="#7a5030" stroke-width="1.5"/>
    <ellipse cx="50" cy="3" rx="17" ry="2.6" fill="#ebc697" stroke="#7a5030" stroke-width="1.1"/>
    <circle cx="39" cy="10" r="1.1" fill="#7a5030" opacity=".55"/><circle cx="58" cy="13" r="1.1" fill="#7a5030" opacity=".55"/><circle cx="49" cy="8" r=".9" fill="#7a5030" opacity=".45"/>

    <!-- 首にリボン（ちょうちょ結び）と、星のチャーム -->
    <path d="M33 27 Q50 31 67 27 L67 31.5 Q50 35.5 33 31.5 Z" fill="#f4a9bf" stroke="#d2728f" stroke-width="1"/>
    <path d="M38 29 L29 24 Q26 29 29 33 Z M38 29 L29 34 Q28 38 32 38 Z" fill="#f7bccd" stroke="#d2728f" stroke-width="1" stroke-linejoin="round"/>
    <circle cx="38" cy="29.5" r="2" fill="#ee94ae" stroke="#d2728f" stroke-width=".8"/>
    <path d="M64 31 Q70 38 70 45" fill="none" stroke="#b88a5c" stroke-width="1.1"/>
    <path d="${starPath(70.5, 50, 6.6, 3.1)}" fill="#f7d67e" stroke="#b5873a" stroke-width="1.1" stroke-linejoin="round"/>
    <circle cx="68.8" cy="48.4" r="1" fill="#fff" opacity=".8"/>
  </svg>`;
}

// ---------- 棚を描く ----------

function fullWeeksOldestFirst() {
  const byWeek = new Map();
  for (const log of data.logs) {
    const w = weekStartKey(log.date);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(log);
  }
  return [...byWeek.entries()]
    .filter(([, logs]) => sumMin(logs) >= WEEK_GOAL_MIN)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

function drawShelf() {
  const weeks = fullWeeksOldestFirst();
  const pages = Math.max(1, Math.ceil(weeks.length / SHELF_PER_PAGE));
  if (shelfPage === null || shelfPage >= pages) shelfPage = pages - 1; // はじめは、いちばん新しい棚
  const thisWeek = weekStartKey(dateKey());

  const board = $("shelf");
  board.replaceChildren();
  weeks.slice(shelfPage * SHELF_PER_PAGE, (shelfPage + 1) * SHELF_PER_PAGE).forEach(([start, logs], i) => {
    const row = Math.floor(i / SHELF_COLS);
    const col = i % SHELF_COLS;
    const bottle = bottleForWeek(start);
    const shape = SHELF_SHAPE_OF[bottle.id] || "round";
    const end = parseKey(start);
    end.setDate(end.getDate() + 6);

    const item = document.createElement("div");
    item.className = "shelf-bottle";
    item.style.left = `${(SHELF_COL_X[col] / SHELF_BOARD.w) * 100}%`;
    item.style.bottom = `${(1 - SHELF_BASE_Y[row] / SHELF_BOARD.h) * 100}%`;
    item.setAttribute("role", "img");
    item.setAttribute("aria-label", `${shortDate(start)}〜${shortDate(dateKey(end))}の${bottle.name}`);
    item.innerHTML = shelfBottleSvg(shape, [...logs].sort((a, b) => a.ts - b.ts), weekFlowerCount(start));

    const plate = document.createElement("span");
    plate.className = "shelf-plate" + (start === thisWeek ? " this-week" : "");
    plate.style.left = item.style.left;
    plate.style.top = `${(SHELF_PLATE_Y[row] / SHELF_BOARD.h) * 100}%`;
    plate.textContent = start === thisWeek ? "今週" : `${shortDate(start)}〜`;

    board.append(item, plate);
  });

  $("shelf-empty").hidden = weeks.length > 0;
  $("shelf-nav").hidden = pages <= 1;
  $("shelf-page").textContent = `${shelfPage + 1} / ${pages}`;
  $("shelf-prev").disabled = shelfPage === 0;
  $("shelf-next").disabled = shelfPage >= pages - 1;
}

$("shelf-prev").addEventListener("click", () => {
  if (shelfPage > 0) shelfPage--;
  drawShelf();
});
$("shelf-next").addEventListener("click", () => {
  shelfPage++;
  drawShelf();
});
document.addEventListener("pagechange", (e) => {
  if (e.detail === "shelf") {
    shelfPage = null; // 開くたびに、いちばん新しい棚から
    drawShelf();
  }
});
drawShelf();
