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

// ---------- 大瓶（チャームなしの瓶のイラスト ＋ 中身 ＋ 星 ＋ チャーム） ----------

const BIG_FILL = 0.8;  // 中身は体の8割まで（上にすき間）
const BIG_BLUR = 2.2; // 層の境目のぼかしの幅（中身の高さの%）
const BIG_H = 178;     // 棚にのせる大瓶の高さ（背景画像1200pxのうち）
const bigBottleById = (id) => BIG_BOTTLES.find((b) => b.id === (BIG_BOTTLE_ALIAS[id] || id)) || BIG_BOTTLES[0];
const charmById = (id) => CHARMS.find((c) => c.id === id) || null;

// （パステルの色は js/app.js の pastel）

const CHARM_MAX = 5;   // ★ 1本の瓶につけられるチャームの数（ぜんぶで。あとで変えるときはここ）
const STACK_MAX = 3;   // ★ 1か所に、縦につなげられるチャームの数
// チェーンから下げる場所（t：首のチェーンの左はし0〜右はし1のどこか、side：外がわへ出す向き）
const HANG_SPOTS = [
  { key: "left", label: "左", short: "左", t: 0.16, side: -1 },
  { key: "center", label: "真ん中", short: "中", t: 0.5, side: 0 },
  { key: "right", label: "右", short: "右", t: 0.84, side: 1 },
];
const isHangCharm = (c) => !!c && (c.place || "hang") === "hang";

// その大瓶のチャーム（前の版の「1個だけ」の記録もそのまま読む）
const isRibbon = (c) => !!c && c.kind === "ribbon";
const charmsOf = (b) => (Array.isArray(b.charms) ? b.charms : b.charm ? [b.charm] : []).filter((id) => charmById(id) && !isRibbon(charmById(id))).slice(0, CHARM_MAX);
// 首のリボン（1つだけ。つけないこともできる）
const ribbonOf = (b) => (b.ribbon && isRibbon(charmById(b.ribbon)) ? b.ribbon : null);

// 前の版で「チャーム」としてつけていたリボンは、首のリボンにうつす（1回だけ。データはそのまま引きつぐ）
function migrateRibbons() {
  let changed = false;
  for (const b of data.bigBottles || []) {
    const ids = Array.isArray(b.charms) ? b.charms : b.charm ? [b.charm] : [];
    const ribbons = ids.filter((id) => isRibbon(charmById(id)));
    if (!ribbons.length) continue;
    if (!ribbonOf(b)) b.ribbon = ribbons[0];
    b.charms = ids.filter((id) => !isRibbon(charmById(id)));
    delete b.charm;
    changed = true;
  }
  if (changed) saveData();
}

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

// ★ チャームの大きさとチェーンの長さ（あとで調整するときはここ）
const CHARM_SIZE = 28;   // チェーンで下げるチャーム1個の大きさ（瓶の横幅の%）。絵の形がちがっても同じくらいに見えるように、たて×よこの平均で合わせる
const CHARM_MAX_SIDE = 1.35; // 細長いチャームが長くなりすぎないように（CHARM_SIZE の何倍まで）
const NECK_CHARM_SCALE = 1; // 首にかけるもの（ティアラ・ガラスのくつ・ネックレスなど）は、もとの大きさのまま
const CHAIN_LENGTHS = { short: { label: "短い", drop: 5 }, normal: { label: "ふつう", drop: 11 }, long: { label: "長い", drop: 18 } }; // 下げるチェーンの長さ（瓶の横幅の%）

// 下げる場所ごとのチャーム {left:[上から順], center:[…], right:[…]}
// 前の版の記録（場所がない）は、前と同じ並べ方で左・真ん中・右にふりわける（データはそのまま）
function hangsOf(b) {
  const ids = charmsOf(b).filter((id) => isHangCharm(charmById(id)));
  const out = { left: [], center: [], right: [] };
  if (b.hang) {
    for (const k in out) out[k] = (b.hang[k] || []).filter((id) => ids.includes(id));
    const placed = new Set(Object.values(out).flat());
    for (const id of ids) if (!placed.has(id)) out.center.push(id);
  } else {
    const order = ids.length === 1 ? ["center"] : ids.length === 2 ? ["right", "left"] : ["right", "left", "center"];
    ids.forEach((id, i) => out[order[i] || "center"].push(id));
  }
  return out;
}
// 場所ごとのチェーンの長さ {left:"short", …}（前の版の「チャームごと」の記録は、その場所のいちばん上のチャームのものを使う）
function chainAtOf(b) {
  if (b.chainAt) return { ...b.chainAt };
  const out = {};
  const h = hangsOf(b);
  for (const k in h) {
    const v = h[k][0] && b.chains && b.chains[h[k][0]];
    if (CHAIN_LENGTHS[v]) out[k] = v;
  }
  return out;
}

const CHARM_REF_W = 281;     // ★ チャームの大きさの基準の瓶の幅（まんまるの大瓶）
const CHARM_TALL_MAX = 1.7;  // ★ 細い瓶で、基準より大きくする上限（倍）
const RIBBON_BIG_MAX = 150;  // たっぷりリボンの、瓶の幅に対するいちばん大きい幅（%）
const STACK_SCALE = { 2: 0.9, 3: 0.8 }; // ★ 縦につなげたときの大きさ（1個のときを1として）
const STACK_DROP = { 2: 0.7, 3: 0.45 }; // ★ 縦につなげたときの、いちばん上のチェーンの長さ（1個のときを1として）
const MIN_DROP = 2.5; // いちばん上のチェーンの、いちばん短い長さ
const LINK_GAP = 3.2;
const RIBBON_KNOT = 0.3; // リボンの結び目の下のはし（帯の位置から、リボンの絵の高さの何割下か） // 縦につなげるときの、チャームとチャームのあいだの短いチェーン（瓶の横幅の%）

function charmsHtml(bottle, ids, ribbonId = null, hang = null, chainAt = {}) {
  const k = bottle.h / bottle.w; // 「瓶の高さの%」を「瓶の幅の%」にするかけ算
  const [nx, ny] = bottle.neck;
  const charms = ids.map(charmById).filter(Boolean);
  const img = (c, cls, left, top, width, ring = null) =>
    `<img class="charm ${cls}" src="${charmSrc(c)}" alt="" width="${c.w}" height="${c.h}"
      style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;width:${width.toFixed(1)}%;aspect-ratio:${c.w}/${c.h}${ring != null && ring !== 0.5 ? `;transform-origin:${(ring * 100).toFixed(0)}% 0` : ""}">`;
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
        const w = Math.min(100, (c.pw * neckScale(bottle) * 281) / bottle.w) * NECK_CHARM_SCALE;
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
    } else if (!hang) {
      hangs.push(c); // 場所の指定がないとき（見本など）は、前と同じ並べ方
    }
  }
  if (!hang) {
    const order = hangs.length === 1 ? ["center"] : hangs.length === 2 ? ["right", "left"] : ["right", "left", "center"];
    hang = { left: [], center: [], right: [] };
    hangs.forEach((c, i) => hang[order[i] || "center"].push(c.id));
  }
  const cols = HANG_SPOTS.map((s) => ({ ...s, list: (hang[s.key] || []).map(charmById).filter(isHangCharm) })).filter((s) => s.list.length);

  // ---------- 首に巻いた細いチェーンと、そこから下がるチャーム ----------
  // 座標は「瓶の幅を100」としたもの（縦も同じ目もりなので、チェーンの輪がつぶれない）
  // リボンの結び目の下のはし（目もり）。チャームはここより下に下げる
  let ribbonClear = 0;
  {
    const rc = ribbonId && charmById(ribbonId);
    if (rc && rc.band && bottle.waist) {
      const [, by, bw] = rc.band;
      const w = bottle.waist[1] / bw;
      const hPct = (w / k) * (rc.h / rc.w); // リボンの絵の高さ（瓶の高さの%）
      ribbonClear = ((topAt(rc, w, by, bottle.waist[0]) + hPct * Math.min(1, by + RIBBON_KNOT)) * 100 * k) / 100;
    }
  }
  let svg = "";
  if (cols.length) {
    const H = 100 * k;                         // 瓶の高さ（幅100の目もりで）
    const Y = (pctH) => (pctH * H) / 100;      // 「瓶の高さの%」→ 目もり
    const nw = (bottle.mouth ? bottle.mouth[1] : 30) * 1.08; // 首の太さ
    const cy = Y((bottle.wrap ?? ny - 1) + 1.5); // チェーンを巻く高さ
    const sag = Math.max(2.2, nw * 0.16);       // 少したるませる
    const L = nx - nw / 2, R = nx + nw / 2;
    // 首のチェーン：うしろ側（細く・うすく）と、前側（たるんだカーブ）
    let paths = chainPath(`M${L} ${cy} Q${nx} ${cy - sag * 0.55} ${R} ${cy}`, true);
    paths += chainPath(`M${L} ${cy} Q${nx} ${cy + sag * 2} ${R} ${cy}`);
    const at = (t) => ({ x: L + (R - L) * t, y: cy + sag * 2 * 2 * t * (1 - t) }); // 前側のカーブの上の点
    // 大きさ：たて×よこの平均が CHARM_SIZE になるように（細長いものは CHARM_MAX_SIDE 倍まで）
    const sizeOf = (c) => {
      let width = CHARM_SIZE * Math.sqrt(c.w / c.h);
      const tall = width * (c.h / c.w);
      if (Math.max(width, tall) > CHARM_SIZE * CHARM_MAX_SIDE) width *= (CHARM_SIZE * CHARM_MAX_SIDE) / Math.max(width, tall);
      // 瓶の幅ではなく高さに合わせる（どの瓶でも、チャームの見た目の大きさがそろうように）。細い瓶は大きくしすぎない
      return width * (c.scale || 1) * (bottle.charmScale ?? Math.min(CHARM_TALL_MAX, CHARM_REF_W / bottle.w));
    };
    const ring = (x, y) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.05" fill="none" stroke="#b39a6a" stroke-width=".7"/>`; // つなぎの輪
    for (const s of cols) {
      const p = at(s.t);
      // 縦につなげるときは、少し小さく（2個＝STACK_SCALE[2]、3個＝STACK_SCALE[3]）
      let widths = s.list.map((c) => sizeOf(c) * (STACK_SCALE[s.list.length] || 1));
      // 左右は少し外がわへ（3か所ぜんぶのときは広めに）。真ん中は、左右があるとき少し下に
      const out = s.side ? Math.max(...widths) * (cols.length === 3 ? 0.42 : cols.length === 2 ? 0.3 : 0.15) : 0;
      const len = CHAIN_LENGTHS[chainAt[s.key]] || CHAIN_LENGTHS.normal; // チェーンの長さ（場所ごとに選べる）
      // チェーンの長さ：縦につなげるときは、いちばん上のチェーンを短めに（STACK_DROP）
      let base = len.drop * (STACK_DROP[s.list.length] || 1) + (!s.side && cols.length === 3 ? 3 : 0);
      let extra = ribbonId ? bottle.charmDrop || 0 : 0; // 細長い瓶は、リボンをつけたときだけ、リボンにかくれないように下げる
      // 「長い」のときは、リボンの結び目より下まで、ちゃんと長くする（瓶の底に入らないときは、チェーンではなくチャームを小さくする）
      const isLong = len === CHAIN_LENGTHS.long;
      let minDrop = isLong && ribbonId ? Math.max(0, ribbonClear - p.y - extra) : 0;
      if (isLong) base = Math.max(base, len.drop * (s.list.length > 1 ? 0.6 : 1), minDrop);
      // 瓶ごとに、リボンをつけたときの長さを決めているとき（js/bigbottles.js の ribbonDrops）：リボンの下のはしから数える
      if (ribbonId && bottle.ribbonDrops) {
        // 数えはじめは、首に巻いたリボンの帯の下のふち（bottle.ribbonLine：瓶の高さの%）
        const line = bottle.ribbonLine != null ? Y(bottle.ribbonLine) : ribbonClear;
        extra = 0; // ribbonDrops があるときは、charmDrop は使わない
        base = Math.max(0, line - p.y) + (bottle.ribbonDrops[chainAt[s.key]] ?? bottle.ribbonDrops.normal);
        minDrop = base; // チェーンは短くしない（瓶に入らないときは、チャームを小さくする）
      }
      // 瓶の底からはみ出しそうなら、まずいちばん上のチェーンを短くして、それでもだめなら小さくする
      const height = () => s.list.reduce((t, c, i) => t + widths[i] * (c.h / c.w), 0) + LINK_GAP * (s.list.length - 1);
      const bottomLimit = Y(bottle.bottom) - 3;
      let over = p.y + base + extra + height() - bottomLimit;
      if (over > 0) base -= Math.min(over, Math.max(0, base - Math.max(MIN_DROP, minDrop)));
      over = p.y + base + extra + height() - bottomLimit;
      if (over > 0) {
        const gaps = LINK_GAP * (s.list.length - 1);
        const f = Math.max(0.5, (height() - over - gaps) / (height() - gaps));
        widths = widths.map((w) => w * f);
      }
      const drop = base + extra;
      // 左右のチャームが瓶の外にはみ出さないように、内がわへ寄せる
      const half = Math.max(...widths) / 2;
      const x = Math.min(100 - half - 3, Math.max(half + 3, p.x + s.side * out));
      let y = p.y + drop;
      // たるんだカーブ（まん中が少し下にふくらむ）
      paths += chainPath(`M${p.x} ${p.y} Q${(p.x + x) / 2} ${Math.max(p.y, y) + 1.6} ${x} ${y}`);
      paths += ring(p.x, p.y);
      s.list.forEach((c, i) => {
        const top = y - 0.006 * H; // 絵の上のはし（目もり）
        // マルカン（上の輪）がチェーンの先に来るように、ずらす（js/series.js の ring）
        const r = c.ring ?? 0.5;
        front += img(c, "hang", x + (0.5 - r) * widths[i], (y / H) * 100 - 0.6, widths[i], r);
        if (i < s.list.length - 1) {
          // 下のはしから、短いチェーンで次のチャームへ
          const bottom = top + widths[i] * (c.h / c.w);
          if (c.tail) {
            // 下のチェーンが出る場所が決まっているチャーム（js/series.js の tail）：そこからチェーンをのばす
            const tx = x + (0.5 - r) * widths[i] - widths[i] / 2 + c.tail[0] * widths[i];
            const ty = top + c.tail[1] * widths[i] * (c.h / c.w);
            const ey = bottom + LINK_GAP + 0.8;
            paths += chainPath(`M${tx} ${ty} Q${tx} ${(ty + ey) / 2} ${x} ${ey}`);
          } else paths += chainPath(`M${x} ${bottom - 1.4} L${x} ${bottom + LINK_GAP + 0.8}`);
          y = bottom + LINK_GAP;
        }
      });
    }
    svg = `<svg class="charm-string" viewBox="0 0 100 ${H.toFixed(2)}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
  }
  // 首のリボン：チェーンもチャームも消さずに、いちばん手前に重ねる
  let ribbon = "";
  const rc = ribbonId && charmById(ribbonId);
  if (rc && rc.band && bottle.waist) {
    // 帯の部分（band）を、首のくびれ（waist）の太さ・高さにぴったり合わせる（首に巻きついているように）
    const [bx, by, bw] = rc.band;
    const [wy, ww] = bottle.waist;
    const w = (ww / bw) * (rc.scale || 1); // リボンの黄色の線の幅 ＝ 瓶の黄色の線の幅（scale で全体の大きさを調整）
    ribbon = img(rc, "neck ribbon", nx + (0.5 - bx) * w, topAt(rc, w, by, wy) - (rc.lift || 0), w); // lift：少し上げる（瓶の高さの%）
  } else if (rc) {
    // big：瓶の首ではなく瓶の高さに合わせた大きさ（たっぷりリボン。細い瓶でも小さくならない）
    const w = rc.big ? Math.min(RIBBON_BIG_MAX, (rc.big * CHARM_REF_W) / bottle.w) : Math.min(100, ((rc.pw || 58) * neckScale(bottle) * 281) / bottle.w);
    // bigRibbonUp：たっぷりリボンを少し上げる瓶（瓶の高さの%）。結び目が首のチェーンの高さに来るように
    ribbon = img(rc, "neck ribbon", nx + (0.5 - (rc.pc ?? 0.5)) * w, topAt(rc, w, rc.pa ?? 0.2, (bottle.wrap ?? ny) + 2.5) - (rc.big ? bottle.bigRibbonUp || 0 : 0), w);
  }
  return { html: back + svg + front + ribbon, hasTop }; // 台 → チェーン → チャーム → 首のリボン の順に重ねる
}

// 大瓶の中のラメ：液体の中で、小さな光がちらちらまたたく（場所と時間は瓶ごとに決まっている）
function glitterHtml(top, bottom, seed) {
  let r = seed || 1;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 20 }, () => {
    const x = 24 + rand() * 52, y = top + 3 + rand() * Math.max(1, bottom - top - 6);
    const sz = 2.5 + rand() * 2.5, d = (rand() * 3).toFixed(2), t = (1.6 + rand() * 1.6).toFixed(2);
    return `<span class="glitter${rand() < 0.35 ? " star" : ""}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${(rand() < 0.35 ? 6 + rand() * 4 : sz).toFixed(1)}px;animation-delay:-${d}s;animation-duration:${t}s"></span>`;
  }).join("");
}
// ショーケースの大瓶のまわりで、キラッとまたたく星（[左%, 上%, 大きさpx, 色]。瓶の大きさにかかわらず同じ大きさ）
const CASE_TWINKLES = [
  [-4, 30, 13, "gold"], [102, 22, 9, "pink"], [98, 62, 11, "white"], [-2, 74, 8, "pink"], [14, 8, 7, "white"], [86, 4, 10, "gold"], [50, -4, 6, "pink"],
];
function caseTwinklesHtml(seed) {
  return CASE_TWINKLES.map(([x, y, w, c], i) => `<span class="case-twinkle ${c}" style="left:${x}%;top:${y}%;width:${w}px;animation-delay:-${((seed % 7) * 0.37 + i * 0.83).toFixed(2)}s"></span>`).join("");
}

// 大瓶の中身を「まぜた1色」にするときの色：層の色を分数の割合でまぜて、いちばん近い色図鑑の色にする（{ name, hex }）
// 反対の色どうしで打ち消しあってグレーにならないよう、あざやかさは層の平均くらいに保つ
function bigMixColor(b) {
  let total = 0, va = 0, vb = 0, chroma = 0, light = 0;
  for (const l of b.layers) {
    const hex = l.color || (sportById(l.type) || { color: "#dddddd" }).color;
    const [L, a, bb] = rgbToOklab(hexToRgb(hex));
    total += l.min; va += a * l.min; vb += bb * l.min; chroma += Math.hypot(a, bb) * l.min; light += L * l.min;
  }
  if (!total) return DAY_COLORS[0];
  const hue = Math.atan2(vb, va);
  const together = chroma ? Math.hypot(va, vb) / chroma : 0;
  // まぜると淡くぼやけやすいので、層のときより少しあざやかに（色がしっかり見えるように）
  const C = (chroma / total) * (1.25 + 0.35 * together);
  const lab = [light / total - 0.02, C * Math.cos(hue), C * Math.sin(hue)];
  // グレーっぽい色にならないよう、いちばん近い「色図鑑の色」に寄せる（小瓶のシェイクと同じ選び方）
  let best = 0, bestD = Infinity;
  DAY_COLORS_LAB.forEach(([L2, a2, b2], i) => {
    const d = (lab[0] - L2) ** 2 * 0.5 + ((lab[1] - a2) ** 2 + (lab[2] - b2) ** 2) * 1.6;
    if (d < bestD) (bestD = d), (best = i);
  });
  return DAY_COLORS[best];
}
// 大瓶の中身の見た目：b.look = { mode: "mix" }（まぜた1色）／{ mode: "color", name }（色図鑑の色）／なし（層）
function bigLookColor(b) {
  const look = b.look;
  if (!look) return null;
  if (look.mode === "mix") return bigMixColor(b).hex;
  if (look.mode === "color") { const c = DAY_COLORS.find((x) => x.name === look.name); return c ? c.hex : null; }
  return null;
}

function bigBottleHtml(b) {
  const bottle = bigBottleById(b.bottle);
  const range = bottle.bottom - bottle.top;
  const total = Math.max(1, b.layers.reduce((t, l) => t + l.min, 0));
  // 小瓶と同じく、淡いパステル・半透明で、層の境目をやわらかくぼかしたグラデーションにする
  // 新しい大瓶は、その日の色の層（l.color）。前の版の大瓶は、種目の色の層
  const one = bigLookColor(b);
  const colors = b.layers.map((l) => {
    if (one) return pastel(one, 0.12);
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
  const fillH = range * (bottle.fill || BIG_FILL); // 瓶によって、中身の高さを変える（星は上の腕が広いので、多めに）
  // 中身：パステルの層 ＋ 虹色にゆらめくツヤ ＋ 中でまたたくラメ（大瓶だけのスペシャル感）
  const layers = `<span class="layer-stack${one ? " solid" : ""}" style="bottom:${(100 - bottle.bottom).toFixed(2)}%;height:${(fillH + 0.3).toFixed(2)}%;background:linear-gradient(to top, ${stops.join(", ")})"><span class="big-iris"></span></span>`;
  const glitter = glitterHtml(bottle.bottom - fillH, bottle.bottom, seedOf((b.id || b.bottle) + "g"));
  // おやつを食べなかった日の星（合成した小瓶の合計。液体の中に浮かぶ。星の大きさ：瓶の高さの8.5%）
  const poopDays = (b.days || []).filter((d) => typeof dayPoop === "function" && dayPoop(d)).length; // お通じが出た日の数ぶん、泡
  const flowers = starsHtml(bottle, b.flowers || 0, bottle.bottom - fillH, 8.5, seedOf(b.id || b.bottle)) + (poopDays ? bubblesHtml(bottle, Math.ceil(poopDays / 2), bottle.bottom - fillH, 4.8, seedOf((b.id || "") + "b")) : "");
  const mask = `url(big/${bottle.id}-mask.webp)`;
  const charms = charmsHtml(bottle, charmsOf(b), ribbonOf(b), hangsOf(b), chainAtOf(b));
  return `<div class="bottle big-bottle" style="aspect-ratio:${bottle.w}/${bottle.h}">
    <div class="liquid" style="-webkit-mask-image:${mask};mask-image:${mask}">${layers}${flowers}</div>
    <img class="glass" src="big/${bottle.id}.webp" alt="" width="${bottle.w}" height="${bottle.h}"${charms.hasTop ? ` style="clip-path:inset(${bottle.cap}% 0 0 0)"` : ""}>
    <div class="liquid glitter-box" aria-hidden="true" style="-webkit-mask-image:${mask};mask-image:${mask}">${glitter}</div>
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
      item.innerHTML = `<span class="case-glow" aria-hidden="true"></span>` + bigBottleHtml(b) + `<span class="case-twinkles" aria-hidden="true">${caseTwinklesHtml(seedOf(b.id || b.bottle))}</span>`;
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

// 棚に並べる小瓶：運動した日ぜんぶ（大瓶に合成した日も、記録として残して並べる）
function shelfSmallBottles() {
  const pool = new Map(smallBottles().map((b) => [b.day, b]));
  return [...new Set(data.logs.map((l) => l.date))].sort().map((day) => {
    const layers = data.logs.filter((l) => l.date === day).sort((a, b) => a.ts - b.ts);
    const p = pool.get(day);
    return { day, layers, min: sumMin(layers), merged: !p, bonus: !!(p && p.bonus) };
  });
}
function drawSmallShelf() {
  const remain = smallBottles(); // まだ合成していない分（合成の計算はこちら）
  const smalls = shelfSmallBottles();
  const total = remain.reduce((t, b) => t + b.min, 0);
  const ready = total >= BIG_BOTTLE_MIN;
  const pages = Math.max(1, Math.ceil(smalls.length / SMALL_PER_PAGE));
  if (smallPage === null || smallPage >= pages) smallPage = pages - 1;
  const today = dateKey();

  $("pool-count").textContent = remain.length;
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
    slot.innerHTML = bottleHtml(sb.layers, shape, daySnackFree(sb.day) ? 1 : 0, SMALL_FULL_MIN, shaken && shaken.hex, dayPoop(sb.day));
    slot.setAttribute("aria-label", `${shortDate(sb.day)}の小瓶（${sb.min}分${sb.merged ? "・大瓶に合成ずみ" : sb.bonus ? "・一部を大瓶に合成ずみ" : ""}${shaken ? "・" + shaken.name : ""}）`);
    if (sb.merged) slot.classList.add("merged");
    slot.addEventListener("click", () => openDayBottle(sb.day));

    const plate = document.createElement("span");
    plate.className = "shelf-plate small" + (sb.merged ? " merged" : sb.bonus ? " bonus" : sb.day === today ? " this-week" : ""); // 合成ずみは✦つき、一部だけ合成した日は金色の札
    plate.style.left = slot.style.left;
    plate.style.top = `${(SHELF_PLATE_Y[row] / SHELF_BOARD.h) * 100}%`;
    plate.textContent = (sb.merged ? "✦" : "") + (sb.day === today ? "今日" : shortDate(sb.day));
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
  $("bonus-hint").hidden = !smalls.some((b) => b.bonus || b.merged);
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
    flowers: new Set(used.filter((u) => daySnackFree(u.day)).map((u) => u.day)).size, // おやつを食べなかった日の合計（星の数）
    days: used.map((u) => u.day),
    charms: [], // 進化したあとに、好きなチャームを CHARM_MAX 個まで選んでつける
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
  $("merge-note").textContent =
    `小瓶${used.length}本ぶん（${BIG_BOTTLE_MIN}分）が、大瓶になったよ。小瓶も、がんばった記録として棚に残してあるよ。シェイクすると、中身がまざって1色になるよ`;
  $("merge-h").textContent = "大瓶に進化したよ！";
  $("merge-mix").hidden = true;
  $("merge-tip").hidden = true;
  $("merge-choices").hidden = false;
  $("merge-ok").hidden = true;

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
  mergeView = { big, bigEl, stage };

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
let mergeView = null; // 進化の画面の大瓶（シェイクするとき使う）

// 進化したあと：大瓶をシェイクして、中身を1色にまぜる
function shakeBigBottle() {
  if (!mergeView || mergeView.busy) return;
  mergeView.busy = true;
  const { big, bigEl, stage } = mergeView;
  const mix = bigMixColor(big);
  $("merge-choices").hidden = true;
  $("merge-h").textContent = "シャカシャカ…";
  $("merge-note").textContent = "中身がまざっていくよ";
  const quick = reduceMotionShelf();
  const MS = quick ? 0 : 1700;
  const bottle = bigEl.querySelector(".bottle");
  const stack = bigEl.querySelector(".layer-stack");
  if (!quick && bottle) {
    bottle.animate(
      [
        { transform: "translate(0,0) rotate(0deg)" },
        { transform: "translate(-6%,-3%) rotate(-12deg)" },
        { transform: "translate(6%,-5%) rotate(11deg)" },
        { transform: "translate(-5%,-2%) rotate(-10deg)" },
        { transform: "translate(5%,-4%) rotate(9deg)" },
        { transform: "translate(-3%,-2%) rotate(-6deg)" },
        { transform: "translate(2%,-1%) rotate(4deg)" },
        { transform: "translate(0,0) rotate(0deg)" },
      ],
      { duration: MS, easing: "ease-in-out" }
    );
  }
  if (stack) {
    // 層がぼやけて、まざった色がふわっと広がる
    const mixed = stack.cloneNode();
    mixed.classList.add("solid");
    mixed.style.background = pastel(mix.hex, 0.12);
    mixed.style.opacity = quick ? "1" : "0";
    stack.after(mixed);
    if (!quick) {
      stack.animate([{ filter: "blur(0px)" }, { filter: "blur(6px)", offset: 0.6 }, { filter: "blur(3px)" }], { duration: MS, fill: "forwards" });
      mixed.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: MS, fill: "forwards" });
      const liquid = bigEl.querySelector(".liquid");
      const bottleDef = bigBottleById(big.bottle);
      for (let i = 0; i < 14; i++) {
        const b = document.createElement("span");
        b.className = "shake-bubble";
        b.style.left = 22 + Math.random() * 56 + "%";
        b.style.top = bottleDef.bottom - 6 - Math.random() * 30 + "%";
        b.style.width = 3 + Math.random() * 4 + "%";
        liquid.append(b);
        b.animate([{ transform: "translateY(0) scale(.4)", opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: "translateY(-300%) scale(1)", opacity: 0 }], {
          duration: 700 + Math.random() * 600, delay: 150 + Math.random() * 1100, fill: "both",
        });
      }
    }
  }
  setTimeout(() => {
    // 記録：この大瓶は「まぜる」。はじめて出た色は、色図鑑にも入る
    const saved = (data.bigBottles || []).find((x) => x.id === big.id);
    if (saved) saved.look = { mode: "mix" };
    big.look = { mode: "mix" };
    ensureBottleData();
    const isNew = !data.colorBook[mix.name];
    if (isNew) data.colorBook[mix.name] = dateKey();
    saveData();
    if (lastEvolved && lastEvolved.id === big.id) lastEvolved.look = { mode: "mix" };
    if (!quick) {
      const r = bigEl.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height / 2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        sparkle(stage, cx + Math.cos(a) * r.width * 0.6, cy + Math.sin(a) * r.height * 0.45, i * 40, 10 + (i % 3) * 4, i % 2 ? "#ffffff" : "#ffd1e3");
      }
    }
    $("merge-h").textContent = "まざったよ！";
    $("merge-note").textContent = "運動した割合で、中身がまざってこの色になったよ";
    $("merge-swatch").style.background = mix.hex;
    $("merge-mix-name").textContent = mix.name;
    $("merge-new").hidden = !isNew;
    $("merge-mix").hidden = false;
    showMergeTip();
    renderAll();
  }, MS + 50);
}
function showMergeTip() {
  $("merge-tip").innerHTML = "大瓶をタップして「中身」を開くと、<b>層にもどしたり</b>、<b>色図鑑の色に変えたり</b>できるよ";
  $("merge-tip").hidden = false;
  $("merge-choices").hidden = true;
  $("merge-ok").hidden = false;
}
$("merge-shake").addEventListener("click", shakeBigBottle);
$("merge-keep").addEventListener("click", () => {
  $("merge-note").textContent = "運動した順に、色が層になってるよ";
  showMergeTip();
});
$("merge-stage").addEventListener("click", () => {
  if (!$("merge-choices").hidden && !$("merge-result").hidden) shakeBigBottle();
});
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
let hangChoice = { left: [], center: [], right: [] }; // 下げる場所ごとのチャーム（上から順）
let otherChoice = [];  // 首・ふた・台など、下げないチャーム
let chainAtChoice = {}; // 場所ごとのチェーンの長さ
let placeSel = "center"; // いま選んでいる場所
let ribbonChoice = null; // 首のリボン（1つ・なしもOK）
let charmTab = "charm";  // いま選んでいるタブ（"charm" / "ribbon" / "look"）
let lookChoice = null;   // 中身の見た目（null：層／{ mode: "mix" }／{ mode: "color", name }）
let pickNote = ""; // さっき押したチャームの名前（「〜をつけたよ」）
const allChoice = () => [...hangChoice.left, ...hangChoice.center, ...hangChoice.right, ...otherChoice];
const placeOfChoice = (id) => HANG_SPOTS.find((s) => hangChoice[s.key].includes(id));

function openCharmPicker(b, justEvolved = false) {
  charmTarget = b;
  const h = hangsOf(b);
  hangChoice = { left: [...h.left], center: [...h.center], right: [...h.right] };
  otherChoice = charmsOf(b).filter((id) => !isHangCharm(charmById(id)));
  chainAtChoice = chainAtOf(b);
  placeSel = HANG_SPOTS.find((s) => hangChoice[s.key].length)?.key || "center";
  ribbonChoice = ribbonOf(b);
  lookChoice = b.look ? { ...b.look } : null;
  $("charm-tab-look").hidden = !!b.savings; // 中身の見た目は大瓶だけ
  charmTab = "charm";
  pickNote = "";
  $("charm-title").textContent = b.savings ? "貯金瓶の着せ替え" : justEvolved ? "チャームとリボンを選んでつけよう" : "チャームとリボンを付け替える";
  $("charm-sub").textContent = b.savings ? "貯金瓶" : `${shortDate(b.date)}に進化した大瓶`;
  drawCharmGrid();
  updateCharmPreview();
  $("charm-modal").hidden = false;
}
// タブ：チャーム（場所を選んで、縦につなげる）／リボン（1個）
function drawCharmGrid() {
  document.querySelectorAll(".charm-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === charmTab)));
  const ribbonMode = charmTab === "ribbon";
  const grid = $("charm-grid");
  grid.replaceChildren();
  grid.classList.toggle("look-mode", charmTab === "look");
  if (charmTab === "look") return drawLookPanel(grid);
  const none = document.createElement("button");
  none.type = "button";
  none.className = "charm-option none";
  none.dataset.id = "";
  none.innerHTML = ribbonMode ? `<span>リボン<br>なし</span>` : `<span>ぜんぶ<br>はずす</span>`;
  grid.append(none);
  // 持っているものだけ（ガチャ限定のシリーズは、ガチャで手に入れると出てくる）
  const chosenNow = allChoice();
  for (const c of CHARMS) {
    if (isRibbon(c) !== ribbonMode) continue;
    const chosen = ribbonMode ? ribbonChoice === c.id : chosenNow.includes(c.id);
    if (typeof canUse === "function" && !canUse(c) && !chosen) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "charm-option" + (gradeOf(c) ? ` grade-${c.grade}` : "");
    btn.dataset.id = c.id;
    btn.setAttribute("aria-label", c.name + (gradeOf(c) ? `（${GRADES[c.grade].label}）` : ""));
    btn.innerHTML = `<img src="${charmSrc(c)}" alt="" width="${c.w}" height="${c.h}" loading="lazy"><span class="charm-num"></span>`;
    grid.append(btn);
  }
  grid.querySelectorAll(".charm-option").forEach((btn) => btn.addEventListener("click", () => pickCharm(btn.dataset.id)));
}
// チャームのマスを押したとき
const q = (c) => `「${c.name}」`;
function pickCharm(id) {
  pickNote = "";
  if (charmTab === "ribbon") {
    ribbonChoice = !id || ribbonChoice === id ? null : id; // もう一度押すとはずす
    if (id) pickNote = ribbonChoice ? `${q(charmById(id))}を結んだよ` : `${q(charmById(id))}をほどいたよ`;
    updateCharmPreview();
    return;
  }
  if (!id) {
    // ぜんぶはずす
    hangChoice = { left: [], center: [], right: [] };
    otherChoice = [];
    updateCharmPreview();
    return;
  }
  const c = charmById(id);
  const label = HANG_SPOTS.find((s) => s.key === placeSel).label;
  if (!isHangCharm(c)) {
    // 首・ふた・台につけるものは、場所はえらばない（もう一度押すとはずす）
    if (otherChoice.includes(id)) (otherChoice = otherChoice.filter((x) => x !== id)), (pickNote = `${q(c)}をはずしたよ`);
    else if (allChoice().length >= CHARM_MAX) return showToast(`チャームはぜんぶで${CHARM_MAX}個までだよ。どれかをはずしてね`);
    else (otherChoice = [...otherChoice, id]), (pickNote = `${q(c)}をつけたよ`);
    updateCharmPreview();
    return;
  }
  const from = placeOfChoice(id);
  if (from && from.key === placeSel) {
    hangChoice[placeSel] = hangChoice[placeSel].filter((x) => x !== id); // 同じ場所でもう一度押すとはずす
    pickNote = `${q(c)}をはずしたよ`;
  } else {
    if (hangChoice[placeSel].length >= STACK_MAX) return showToast(`${label}には${STACK_MAX}個までつなげられるよ`);
    if (!from && allChoice().length >= CHARM_MAX) return showToast(`チャームはぜんぶで${CHARM_MAX}個までだよ。どれかをはずしてね`);
    if (from) hangChoice[from.key] = hangChoice[from.key].filter((x) => x !== id); // ほかの場所から、ここへうつす
    hangChoice[placeSel] = [...hangChoice[placeSel], id]; // いちばん下につなげる
    pickNote = `${q(c)}を${label}の${hangChoice[placeSel].length}番目につけたよ`;
  }
  updateCharmPreview();
}
document.querySelectorAll(".charm-tab").forEach((t) =>
  t.addEventListener("click", () => {
    charmTab = t.dataset.tab;
    drawCharmGrid();
    updateCharmPreview();
  })
);
// 中身タブ：層／まぜる／色図鑑の色（見つけた色だけ）
const lookLabel = (look, b) => !look ? "層" : look.mode === "mix" ? `まぜる（${bigMixColor(b).name}）` : look.name;
function drawLookPanel(grid) {
  const mode = lookChoice ? lookChoice.mode : "layers";
  const found = DAY_COLORS.filter((c) => data.colorBook && data.colorBook[c.name]);
  const mix = bigMixColor(charmTarget);
  grid.innerHTML = `<div class="look-seg" role="radiogroup">
      <button type="button" data-mode="layers" aria-pressed="${mode === "layers"}">層</button>
      <button type="button" data-mode="mix" aria-pressed="${mode === "mix"}">まぜる</button>
      <button type="button" data-mode="color" aria-pressed="${mode === "color"}">色図鑑の色</button>
    </div>
    <p class="look-note">${mode === "layers" ? "運動した順に、色が層になってるよ" : mode === "mix" ? `運動の割合でまぜたら「${mix.name}」になったよ` : found.length ? "色図鑑で見つけた色から選んでね" : "色図鑑の色がまだないよ。小瓶をシェイクすると見つかるよ"}</p>
    ${mode === "color" ? `<div class="look-swatches">${found.map((c) => `<button type="button" class="look-sw" data-name="${c.name}" aria-label="${c.name}" aria-pressed="${lookChoice && lookChoice.name === c.name}" style="background:${c.hex}"></button>`).join("")}</div>` : ""}
    <p class="look-foot">いつでも「層」にもどせるよ（運動の記録は消えないよ）</p>`;
  grid.querySelectorAll(".look-seg button").forEach((btn) =>
    btn.addEventListener("click", () => {
      const m = btn.dataset.mode;
      if (m === "layers") lookChoice = null;
      else if (m === "mix") lookChoice = { mode: "mix" };
      else {
        const keep = lookChoice && lookChoice.mode === "color" ? lookChoice.name : null;
        const first = keep || (found[0] && found[0].name);
        lookChoice = first ? { mode: "color", name: first } : { mode: "color", name: null };
      }
      pickNote = "";
      drawLookPanel(grid);
      updateCharmPreview();
    })
  );
  grid.querySelectorAll(".look-sw").forEach((btn) =>
    btn.addEventListener("click", () => {
      lookChoice = { mode: "color", name: btn.dataset.name };
      pickNote = `「${btn.dataset.name}」にしたよ`;
      drawLookPanel(grid);
      updateCharmPreview();
    })
  );
}

function updateCharmPreview() {
  // プレビュー：チャームとリボンを、両方つけた形で
  const all = allChoice();
  $("charm-preview").innerHTML = bigBottleHtml({ ...charmTarget, charm: null, charms: all, hang: hangChoice, chainAt: chainAtChoice, chains: null, ribbon: ribbonChoice, look: lookChoice });
  drawPlacePanel();
  const bottle = bigBottleById(charmTarget.bottle);
  $("charm-preview").style.width = `${(150 * bottle.w) / bottle.h}px`;
  const cText = all.length ? `チャーム ${all.length}/${CHARM_MAX}個` : "チャームなし";
  const rText = ribbonChoice ? charmById(ribbonChoice).name : "リボンなし";
  $("charm-name").textContent = pickNote || (charmTab === "look" ? `中身：${lookLabel(lookChoice && (lookChoice.mode !== "color" || lookChoice.name) ? lookChoice : null, charmTarget)}` : `${cText} ／ ${rText}`);
  $("charm-tab-charm").textContent = `チャーム（${all.length}/${CHARM_MAX}）`;
  $("charm-tab-ribbon").textContent = `リボン（${ribbonChoice ? 1 : 0}/1）`;
  $("charm-grid").querySelectorAll(".charm-option").forEach((btn) => {
    const id = btn.dataset.id;
    const num = btn.querySelector(".charm-num");
    if (charmTab === "ribbon") {
      btn.setAttribute("aria-pressed", String(id ? ribbonChoice === id : !ribbonChoice));
      if (num) num.textContent = id && ribbonChoice === id ? "✓" : "";
    } else {
      const spot = id && placeOfChoice(id);
      const on = id ? !!spot || otherChoice.includes(id) : all.length === 0;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("here", !!spot && spot.key === placeSel);
      if (num) num.textContent = spot ? spot.short + (hangChoice[spot.key].indexOf(id) + 1) : otherChoice.includes(id) ? "✓" : "";
    }
  });
}
// 場所（左・真ん中・右）を選んで、つなげる順番とチェーンの長さを決める
function drawPlacePanel() {
  const box = $("chain-rows");
  box.hidden = charmTab !== "charm";
  box.replaceChildren();
  if (box.hidden) return;
  const tabs = document.createElement("div");
  tabs.className = "place-tabs";
  for (const s of HANG_SPOTS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "place-btn";
    b.setAttribute("aria-pressed", String(s.key === placeSel));
    b.innerHTML = `<b></b><span>${hangChoice[s.key].length}/${STACK_MAX}</span>`;
    b.firstChild.textContent = s.label;
    b.addEventListener("click", () => {
      placeSel = s.key;
      updateCharmPreview();
    });
    tabs.append(b);
  }
  box.append(tabs);
  const label = HANG_SPOTS.find((s) => s.key === placeSel).label;
  const list = hangChoice[placeSel];
  const hint = document.createElement("p");
  hint.className = "chain-title";
  hint.textContent = list.length ? `${label}（上から順）` : `下から選ぶと${label}に下がるよ`;
  box.append(hint);
  list.forEach((id, i) => {
    const c = charmById(id);
    const row = document.createElement("div");
    row.className = "chain-row stack-row";
    row.innerHTML = `<span class="stack-no">${i + 1}</span><img src="${charmSrc(c)}" alt=""><span class="stack-name"></span>`;
    row.querySelector(".stack-name").textContent = c.name;
    const btn = (text, aria, disabled, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chain-btn order-btn";
      b.textContent = text;
      b.setAttribute("aria-label", `${c.name}を${aria}`);
      b.disabled = disabled;
      b.addEventListener("click", fn);
      row.append(b);
    };
    const move = (d) => () => {
      const a = [...list];
      [a[i], a[i + d]] = [a[i + d], a[i]];
      hangChoice[placeSel] = a;
      updateCharmPreview();
    };
    btn("↑", "上へ", i === 0, move(-1));
    btn("↓", "下へ", i === list.length - 1, move(1));
    btn("✕", "はずす", false, () => {
      hangChoice[placeSel] = list.filter((x) => x !== id);
      pickNote = `「${c.name}」をはずしたよ`;
      updateCharmPreview();
    });
    box.append(row);
  });
  if (list.length) {
    const row = document.createElement("div");
    row.className = "chain-row len-row";
    row.setAttribute("aria-label", "チェーンの長さ");
    const now = chainAtChoice[placeSel] || "normal";
    for (const [key, v] of Object.entries(CHAIN_LENGTHS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chain-btn";
      b.textContent = v.label;
      b.setAttribute("aria-pressed", String(key === now));
      b.addEventListener("click", () => {
        chainAtChoice[placeSel] = key;
        updateCharmPreview();
      });
      row.append(b);
    }
    box.append(row);
  }
  // 首・ふたにつけるもの（場所はえらばない）
  if (otherChoice.length) {
    const row = document.createElement("div");
    row.className = "chain-row other-row";
    row.innerHTML = `<span class="chain-name">首・ふた</span>`;
    for (const id of otherChoice) {
      const c = charmById(id);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "other-chip";
      b.setAttribute("aria-label", `${c.name}をはずす`);
      b.innerHTML = `<img src="${charmSrc(c)}" alt=""><span class="other-name"></span>✕`;
      b.querySelector(".other-name").textContent = c.name;
      b.addEventListener("click", () => {
        otherChoice = otherChoice.filter((x) => x !== id);
        updateCharmPreview();
      });
      row.append(b);
    }
    box.append(row);
  }
}
$("charm-save").addEventListener("click", () => {
  // 貯金瓶のときは data.savings.deco に、大瓶のときはその大瓶に記録する
  const b = charmTarget.savings ? savingsDeco() : (data.bigBottles || []).find((x) => x.id === charmTarget.id);
  const all = allChoice();
  if (b) {
    b.charms = all;
    b.hang = { left: [...hangChoice.left], center: [...hangChoice.center], right: [...hangChoice.right] };
    b.chainAt = Object.fromEntries(HANG_SPOTS.map((s) => s.key).filter((k) => hangChoice[k].length && chainAtChoice[k] && chainAtChoice[k] !== "normal").map((k) => [k, chainAtChoice[k]]));
    if (!Object.keys(b.chainAt).length) delete b.chainAt;
    delete b.chains; // 前の版の「チャームごと」の長さは、場所ごとの長さにうつした
    if (ribbonChoice) b.ribbon = ribbonChoice;
    else delete b.ribbon;
    if (!charmTarget.savings) {
      if (lookChoice && (lookChoice.mode !== "color" || lookChoice.name)) b.look = { ...lookChoice };
      else delete b.look;
    }
    delete b.charm; // 前の版の「1個だけ」の記録は、新しい形にうつしたので消す
  }
  saveData();
  $("charm-modal").hidden = true;
  if (charmTarget.savings) renderSavingsJar();
  else drawShelf();
  const parts = [all.length ? `チャームを${all.length}個` : "", ribbonChoice ? "リボン" : ""].filter(Boolean);
  showToast(parts.length ? `${parts.join("と")}をつけたよ` : "飾りをはずしたよ");
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
// 確認用に試しで使えたシリーズ（trial）を戻したとき：まだガチャで手に入れていないチャームは、大瓶からはずす
const TRIAL_ENDED = ["versailles", "nutcracker", "kitten", "organza"];
function removeTrialCharms() {
  const owned = (data.gacha && data.gacha.owned) || [];
  let changed = false;
  for (const b of [...(data.bigBottles || []), ...(data.savings && data.savings.deco ? [data.savings.deco] : [])]) { // 大瓶と貯金瓶
    const keep = (id) => !(charmById(id) && TRIAL_ENDED.includes(charmById(id).series)) || owned.includes(id);
    const ids = Array.isArray(b.charms) ? b.charms : [];
    if (b.ribbon && !keep(b.ribbon)) (delete b.ribbon), (changed = true); // 試しで結んでいたリボンも
    if (ids.every(keep)) continue;
    b.charms = ids.filter(keep);
    if (b.hang) for (const k in b.hang) b.hang[k] = (b.hang[k] || []).filter(keep);
    changed = true;
  }
  if (changed) saveData();
}
removeTrialCharms();
migrateRibbons();
drawShelf();
