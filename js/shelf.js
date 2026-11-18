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
const SHELF_BASE_Y = [370, 620, 869, 1123];
const SHELF_PLATE_Y = [409, 658, 907, 1167];
const SHELF_COL_X = [178, 358, 538, 718]; // 左右の側板の内側を4等分したまん中

let shelfPage = null; // 表示中の棚（null＝いちばん新しい棚）

// ---------- 瓶の形（viewBox 0 0 100 140、底が y=136） ----------
// どの週の瓶（9種類）を、どの形で描くか
const SHELF_SHAPE_OF = { round: "round", heart: "heart", heart2: "heart", star: "star", star2: "star", tall: "tall", gem: "diamond", diamond: "diamond", drop: "drop" };

function starPath(cx, cy, R, r) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += (i ? "L" : "M") + (cx + rad * Math.cos(a)).toFixed(1) + " " + (cy + rad * Math.sin(a)).toFixed(1) + " ";
  }
  return d + "Z";
}

const SHELF_SHAPES = {
  round: {
    body: "M50 48 A44 44 0 1 1 49.9 48 Z",
    top: 50, neck: [41, 59],
    flowers: [[50, 120], [30, 98], [70, 100], [42, 78], [62, 80], [22, 78], [78, 76]],
  },
  heart: {
    body: "M50 62 C40 44 8 46 8 76 C8 102 36 118 50 136 C64 118 92 102 92 76 C92 46 60 44 50 62 Z",
    top: 64, neck: [43, 57],
    flowers: [[50, 118], [34, 96], [66, 96], [26, 74], [74, 74], [50, 86], [50, 104]],
  },
  star: {
    body: starPath(50, 96, 47, 22),
    top: 52, neck: [44, 56],
    flowers: [[50, 104], [24, 86], [76, 86], [36, 124], [64, 124], [50, 80], [50, 64]],
  },
  tall: {
    body: "M36 44 L64 44 C70 44 72 48 72 54 L72 126 C72 132 68 136 62 136 L38 136 C32 136 28 132 28 126 L28 54 C28 48 30 44 36 44 Z",
    top: 46, neck: [42, 58],
    flowers: [[50, 124], [40, 104], [60, 88], [40, 72], [60, 58], [60, 114], [40, 92]],
  },
  diamond: {
    body: "M36 46 L64 46 L92 80 L50 136 L8 80 Z",
    top: 48, neck: [42, 58],
    flowers: [[50, 116], [30, 80], [70, 80], [50, 64], [50, 92], [40, 102], [60, 102]],
  },
  drop: {
    body: "M43 46 L57 46 C60 68 90 82 90 104 C90 124 72 136 50 136 C28 136 10 124 10 104 C10 82 40 68 43 46 Z",
    top: 48, neck: [43, 57],
    flowers: [[50, 122], [28, 106], [72, 106], [50, 100], [38, 84], [62, 84], [50, 68]],
  },
};

let shelfSvgSeq = 0;
function shelfBottleSvg(shapeName, logs, flowerCount) {
  const shape = SHELF_SHAPES[shapeName] || SHELF_SHAPES.round;
  const id = "sb" + shelfSvgSeq++;
  const [nl, nr] = shape.neck;

  // 中身：その週の運動の色の層（満タンの週なので、体のいちばん上まで）
  const bodyTop = shape.top - 4;
  const bodyH = 136 - bodyTop;
  let y = 136, used = 0, layers = "";
  for (const log of logs) {
    if (used >= WEEK_GOAL_MIN) break;
    const min = Math.min(log.min, WEEK_GOAL_MIN - used);
    used += min;
    const h = (min / WEEK_GOAL_MIN) * bodyH;
    y -= h;
    const sport = sportById(log.type);
    layers += `<rect x="0" y="${y.toFixed(2)}" width="100" height="${(h + 0.5).toFixed(2)}" fill="${sport ? sport.color : "#ddd"}"/>`;
  }
  // 花まるの日のお花
  const flowers = shape.flowers
    .slice(0, Math.min(flowerCount, 7))
    .map(([fx, fy]) => `<g transform="translate(${fx - 5} ${fy - 5}) scale(0.42)">${hanamaruSvg("flower-svg").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`)
    .join("");

  return `<svg viewBox="0 0 100 140" class="shelf-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="${id}c"><path d="${shape.body}"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff4f7" stop-opacity=".75"/>
        <stop offset=".55" stop-color="#ffc9d8" stop-opacity=".45"/>
        <stop offset="1" stop-color="#f3a7bd" stop-opacity=".6"/>
      </linearGradient>
      <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d9a774"/><stop offset="1" stop-color="#a8703f"/>
      </linearGradient>
    </defs>
    <!-- 棚に落ちる影 -->
    <ellipse cx="50" cy="137" rx="30" ry="3" fill="#8a4b56" opacity=".18"/>
    <!-- 首（ガラス） -->
    <rect x="${nl}" y="22" width="${nr - nl}" height="${shape.top - 18}" rx="3" fill="url(#${id}g)" stroke="#b8707f" stroke-width="2"/>
    <!-- 体：中身とお花を形で切り抜く -->
    <g clip-path="url(#${id}c)">
      <rect x="0" y="0" width="100" height="140" fill="url(#${id}g)"/>
      <g opacity=".55">${layers}</g>
      ${flowers}
      <!-- ピンクのガラスごしに見える感じ -->
      <rect x="0" y="0" width="100" height="140" fill="#ffc4d4" opacity=".35"/>
      <path d="M22 70 C18 84 18 100 24 114" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75"/>
      <path d="M78 96 C80 104 78 112 74 118" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <circle cx="30" cy="62" r="3.2" fill="#fff" opacity=".85"/>
    </g>
    <path d="${shape.body}" fill="none" stroke="#b8707f" stroke-width="2.4" stroke-linejoin="round"/>
    <!-- 口のふち -->
    <rect x="${nl - 3}" y="20" width="${nr - nl + 6}" height="6" rx="3" fill="#ffe3ea" stroke="#b8707f" stroke-width="1.8"/>
    <!-- コルク -->
    <rect x="${nl}" y="4" width="${nr - nl}" height="18" rx="3" fill="url(#${id}k)" stroke="#7d4f2c" stroke-width="1.6"/>
    <ellipse cx="50" cy="5" rx="${(nr - nl) / 2}" ry="2.4" fill="#e3b989" stroke="#7d4f2c" stroke-width="1.2"/>
    <circle cx="${nl + 5}" cy="12" r="1" fill="#7d4f2c" opacity=".6"/><circle cx="${nr - 6}" cy="16" r="1" fill="#7d4f2c" opacity=".6"/>
    <!-- ひもと星のチャーム -->
    <path d="M${nl - 1} 30 Q50 34 ${nr + 1} 30 M${nl - 1} 34 Q50 38 ${nr + 1} 34" fill="none" stroke="#a87a52" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M${nr + 1} 33 Q${nr + 6} 40 ${nr + 8} 46" fill="none" stroke="#a87a52" stroke-width="1.2"/>
    <path d="${starPath(nr + 9, 52, 7, 3.2)}" fill="#f5d27a" stroke="#b5873a" stroke-width="1.2" stroke-linejoin="round"/>
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
