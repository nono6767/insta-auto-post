// =========================================================
// シェイクしたときの「その日の色」
// ・種目ごとの色を、その日の分数の割合で混ぜる（OKLab という、目で見た感じに近い色の計算で）
// ・色の「方向（色あい）」と「あざやかさ」を分けて混ぜるので、組み合わせや割合でちゃんと違う色になる
//   （近い色どうしはあいだの色に、反対の色どうしは落ち着いたグレージュ系に）
// ・たくさん運動した日ほど色がこく、短い日は淡くなる
// ・混ざった色にいちばん近い色を、下の74色から選んで名前をつける
// =========================================================

// JIS慣用色名（日本の伝統色・慣用色のカタカナ名）などを参考にした、パステル寄りの74色
const DAY_COLORS = [
  // ピンク
  { name: "ベビーピンク", hex: "#f8d3d6" },
  { name: "サクラピンク", hex: "#f6c4cf" },
  { name: "ローズピンク", hex: "#f0a9b8" },
  { name: "コーラルピンク", hex: "#f5b0a2" },
  { name: "ストロベリーソーダ", hex: "#f4a2a6", added: true }, // 筋トレ（赤）の日の色
  { name: "チェリー", hex: "#ef8a90", added: true },          // 筋トレ（赤）の日の色
  { name: "サーモンピンク", hex: "#f8bea4" },
  { name: "オールドローズ", hex: "#dfa9b0" },
  { name: "ナデシコ", hex: "#eeb7cc" },
  // オレンジ・ピーチ
  { name: "ピーチ", hex: "#fbcfb2" },
  { name: "アプリコット", hex: "#f8c08f" },
  { name: "パパイヤ", hex: "#f9d2a0" },
  // イエロー
  { name: "バニラ", hex: "#f7ebcb" },
  { name: "クリーム", hex: "#f2e3a6" },
  { name: "カスタード", hex: "#f6d98a" },
  { name: "レモンシフォン", hex: "#f5f2c8" },
  { name: "カナリヤ", hex: "#ece497" },
  { name: "マリーゴールド", hex: "#f4cc72" },
  { name: "ハニー", hex: "#ead19a" },
  // 黄緑
  { name: "ピスタチオ", hex: "#d4e2a6" },
  { name: "メロン", hex: "#c5e2a8" },
  { name: "ライム", hex: "#e2edb8" },
  // グリーン
  { name: "ミントグリーン", hex: "#b3e2c6" },
  { name: "ペールグリーン", hex: "#cbe8c6" },
  { name: "セラドン", hex: "#bcd6c3" },
  { name: "シーグリーン", hex: "#a6dac8" },
  // 水色
  { name: "アクアミント", hex: "#aee2d9" },
  { name: "ターコイズ", hex: "#a3dce2" },
  { name: "オパール", hex: "#c8e6e6" },
  // ブルー
  { name: "アイスブルー", hex: "#d2e9f2" },
  { name: "ベビーブルー", hex: "#c0dbf2" },
  { name: "スカイブルー", hex: "#a9d3ee" },
  { name: "ホリゾンブルー", hex: "#b2d6e0" },
  { name: "ワスレナグサ", hex: "#a7c3ea" },
  // 青紫
  { name: "ペリウィンクル", hex: "#b8bfea" },
  { name: "アジサイ", hex: "#b9c4e0" },
  // パープル
  { name: "ラベンダー", hex: "#cdc0e8" },
  { name: "ライラック", hex: "#d9c3e3" },
  { name: "フジ", hex: "#bba8e4" },
  { name: "オーキッド", hex: "#e2c1e1" },
  { name: "モーブピンク", hex: "#e6bcd4" },
  // ニュートラル
  { name: "アイボリー", hex: "#f2eedf" },
  { name: "ミルクティー", hex: "#e3cfbb" },
  { name: "ローズグレー", hex: "#ddc8ce" },
  // 家事（アプリコット）が仲間入りして、ふえた10色
  { name: "テラコッタピンク", hex: "#eeb39f", added: true },
  { name: "マンゴーシャーベット", hex: "#f7c89c", added: true },
  { name: "ストロベリーミルク", hex: "#f3bdbf", added: true },
  { name: "ローズティー", hex: "#e2b2aa", added: true },
  { name: "キャラメルラテ", hex: "#dfbe9f", added: true },
  { name: "シアーモーブ", hex: "#d9b6c1", added: true },
  // ダンス（ピンク）の日にふえた色
  { name: "コットンキャンディ", hex: "#f6c9dc", added: true },
  { name: "フラミンゴ", hex: "#f2aac4", added: true },
  { name: "ピーチローズ", hex: "#f4bcb3", added: true },
  { name: "ラベンダーグレー", hex: "#d6ccd8", added: true },
  // 大瓶をまぜられるようになって、ふえた色
  { name: "シャーベットオレンジ", hex: "#f8c4a0", added: true },
  { name: "シャンパンピンク", hex: "#f1d0c8", added: true },
  { name: "ミントラベンダー", hex: "#c9d4e6", added: true },
  { name: "ラムネ", hex: "#b9e0e6", added: true },
  { name: "フローズンミント", hex: "#c8ead9", added: true },
  { name: "ブルーベリーミルク", hex: "#c9cdef", added: true },
  { name: "グレープソーダ", hex: "#d8b4dc", added: true },
  { name: "ピーチミント", hex: "#d9eed6", added: true },
  // がっつり濃い色（たくさん運動した日だけの、とくべつな色）
  { name: "サファイア", hex: "#6b8fe0", added: true, bold: true },
  { name: "パンプキン", hex: "#f28c3c", added: true, bold: true },
  { name: "エメラルド", hex: "#4fc495", added: true, bold: true },
  { name: "ベリーピンク", hex: "#e46a9a", added: true, bold: true },
  { name: "ラズベリー", hex: "#dd5f86", added: true, bold: true },
  { name: "ルビー", hex: "#e0607a", added: true, bold: true },
  { name: "レッド", hex: "#e86a6a", added: true, bold: true },
  { name: "アメジスト", hex: "#b465c0", added: true, bold: true }, // 赤っぽい紫
  { name: "バイオレット", hex: "#7c7ae3", added: true, bold: true }, // 青っぽい紫
  { name: "レモンイエロー", hex: "#f2d43c", added: true, bold: true },
  { name: "グリーンアップル", hex: "#8fd36a", added: true, bold: true },
  { name: "クローバー", hex: "#6cc77f", added: true, bold: true },
];

// ---------- 色の計算（sRGB ⇄ OKLab） ----------
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toLin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
function rgbToOklab([r, g, b]) {
  [r, g, b] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
const rgbToHex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
const DAY_COLORS_LAB = DAY_COLORS.map((c) => rgbToOklab(hexToRgb(c.hex)));

// 図鑑から外した色 → 代わりの色（似ている色にまとめた／くすんでいたので外した）
const RETIRED_COLORS = {
  "ヌードベージュ": "ミルクティー",   // 見た目がほぼ同じ（シナモンミルク → ミルクティー）
  "パールグレー": "ラベンダーグレー", // 見た目がほぼ同じ
  "セージベージュ": "ミルクティー",   // くすんでいたので外した（いちばん近い色へ）
  "グレージュ": "ミルクティー",       // くすんでいたので外した（いちばん近い色へ）
  // ほぼ同じに見えたので、1つにまとめた
  "ピンクグレープフルーツ": "コーラルピンク",
  "ピンクラベンダー": "オーキッド",
  "ベリーミルク": "ナデシコ",
  "ミルキーピーチ": "ピーチ",
  "シェルピンク": "シャンパンピンク",
  "ピンクベージュ": "シャンパンピンク",
  "ミストグリーン": "フローズンミント", // 外した（いちばん近い色へ）
  "シナモンミルク": "ミルクティー",
  "ベージュ": "ミルクティー",
  "ローズクォーツ": "サクラピンク",
  "ペールアプリコット": "ピーチ",
  "ハニーミルク": "ハニー",
  "ヒヤシンス": "ペリウィンクル",
  "ペールブルー": "アジサイ",
};

// 前の記録の色を、いまの図鑑にそろえる（毎回開いたときに確かめる。記録は消さない）
// ・外した色 → 代わりの色に。色図鑑の「はじめて出た日」は、早いほうを残す
// ・色の中身（hex）を直した色（ピーチミントなど）→ シェイクした瓶・大瓶の層も新しい色に
function syncDayColors() {
  const byName = (n) => DAY_COLORS.find((c) => c.name === n);
  const fix = (n) => byName(RETIRED_COLORS[n] || n);
  let changed = false;
  const book = data.colorBook || {};
  for (const [old, to] of Object.entries(RETIRED_COLORS)) {
    if (!book[old]) continue;
    if (!book[to] || book[old] < book[to]) book[to] = book[old];
    delete book[old];
    changed = true;
  }
  const syncRec = (r) => {
    if (!r || !r.name) return;
    const c = fix(r.name);
    if (!c) return;
    const hexKey = "hex" in r ? "hex" : "color";
    if (r.name !== c.name || r[hexKey] !== c.hex) { r.name = c.name; r[hexKey] = c.hex; changed = true; }
  };
  for (const s of Object.values(data.shakes || {})) syncRec(s);
  for (const b of data.bigBottles || []) {
    for (const l of b.layers || []) if (l && l.name && "color" in l) syncRec(l);
    if (b.look && b.look.mode === "color" && RETIRED_COLORS[b.look.name]) { b.look.name = RETIRED_COLORS[b.look.name]; changed = true; }
  }
  return changed;
}

// 種目ごとの分数 { pilates: 50, walking: 20, ... } から、その日の色を決める
// sportColor：種目の色（"#rrggbb"）を返す関数
// sportDeep：種目ごとの「色の濃くなりやすさ」（ふつうは1。筋トレ・ストレッチなど、1回が短い種目は大きく）
function mixDayColor(minutesByType, sportColor, sportDeep = () => 1) {
  let total = 0, depth = 0, va = 0, vb = 0, chroma = 0, light = 0;
  for (const [type, min] of Object.entries(minutesByType)) {
    if (!(min > 0)) continue;
    const [L, a, b] = rgbToOklab(hexToRgb(sportColor(type)));
    total += min;
    depth += min * (sportDeep(type) || 1);
    va += a * min;
    vb += b * min;
    chroma += Math.hypot(a, b) * min;
    light += L * min;
  }
  if (!total) return null;
  // そろい具合（1＝同じ向きの色だけ、0＝反対の色どうしで打ち消しあう）と、色あいの向き
  const together = chroma > 0 ? Math.hypot(va, vb) / chroma : 0;
  const hue = Math.atan2(vb, va);
  // たくさん運動した日ほど、こく（あざやかで少し深く）。短い日は、淡いパステルに
  const k = Math.min(1, Math.max(0, (depth - 10) / 80));
  // さらにたくさん運動した日（濃さ90をこえた日）は、がっつり濃い色のほうへ（濃さ130でいちばん濃く）
  const kb = Math.min(1, Math.max(0, (depth - 90) / 40));
  const C = 0.01 + together * (0.03 + 0.085 * k + 0.045 * kb);
  const L = 0.945 - 0.11 * k - 0.1 * kb + (light / total - 0.8) * 0.6;
  const lab = [Math.min(0.95, Math.max(0.66, L)), C * Math.cos(hue), C * Math.sin(hue)];
  // いちばん近い色（色あいの差を少し重く見る）
  // どちらも色みがある色どうしは、色あい（黄色・オレンジ…）のちがいをさらに重く見る（明るさのちがいで、別の色あいの色にならないように）
  let best = 0, bestD = Infinity;
  DAY_COLORS_LAB.forEach(([L2, a2, b2], i) => {
    let d = (lab[0] - L2) ** 2 * 0.5 + ((lab[1] - a2) ** 2 + (lab[2] - b2) ** 2) * 1.6;
    const c2 = Math.hypot(a2, b2);
    if (C > 0.05 && c2 > 0.05) {
      let dh = Math.abs(hue - Math.atan2(b2, a2));
      if (dh > Math.PI) dh = 2 * Math.PI - dh;
      d += 1.5 * dh * dh * C * c2;
    }
    if (d < bestD) (bestD = d), (best = i);
  });
  return { name: DAY_COLORS[best].name, hex: DAY_COLORS[best].hex, mixed: rgbToHex(oklabToRgb(lab)) };
}

// 瓶の中身として描くときの色：ガラス越しだと淡く見えるので、少しだけ深く・あざやかにする
// （色見本・札・色図鑑は、もとの色のまま）
// がっつり濃い色は、もとから濃いので、ほんの少しだけ（そのままだと蛍光色みたいになるため）
const BOLD_HEX = new Set(DAY_COLORS.filter((c) => c.bold).map((c) => c.hex));
function liquidColor(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  if (BOLD_HEX.has(hex)) return rgbToHex(oklabToRgb([L - 0.03, a * 1.1, b * 1.1]));
  const k = 1.45;
  return rgbToHex(oklabToRgb([L - 0.07, a * k, b * k]));
}

// ---------- その日の色（アプリの中で使う） ----------

// その日の種目ごとの分数
function dayMinutesByType(day) {
  const m = {};
  for (const l of data.logs) if (l.date === day) m[l.type] = (m[l.type] || 0) + l.min;
  return m;
}
// その日の記録のしるし（記録を足したり直したりすると変わる → シェイクし直せる）
const daySig = (day) => data.logs.filter((l) => l.date === day).map((l) => `${l.id}:${l.min}`).sort().join(",");
// その日の運動をまぜた色（シェイクしていない日も、計算はできる）
const dayColorOf = (day) => mixDayColor(dayMinutesByType(day), (t) => (sportById(t) || { color: "#dddddd" }).color, (t) => (sportById(t) || {}).deep || 1);
// シェイクして、そのあと記録が変わっていなければ、その色
function dayShake(day) {
  const s = data.shakes && data.shakes[day];
  return s && s.sig === daySig(day) ? s : null;
}
// シェイクできる日：きのうより前の日、または「今日はおしまい」を押した今日
const canShakeDay = (day) => day < dateKey() || !!(data.closed && data.closed[day]);

if (typeof module !== "undefined") module.exports = { DAY_COLORS, DAY_COLORS_LAB, mixDayColor, rgbToOklab, hexToRgb };
