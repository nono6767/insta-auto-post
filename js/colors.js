// =========================================================
// シェイクしたときの「その日の色」
// ・種目ごとの色を、その日の分数の割合で混ぜる（OKLab という、目で見た感じに近い色の計算で）
// ・色の「方向（色あい）」と「あざやかさ」を分けて混ぜるので、組み合わせや割合でちゃんと違う色になる
//   （近い色どうしはあいだの色に、反対の色どうしは落ち着いたグレージュ系に）
// ・たくさん運動した日ほど色がこく、短い日は淡くなる
// ・混ざった色にいちばん近い色を、下の50色から選んで名前をつける
// =========================================================

// JIS慣用色名（日本の伝統色・慣用色のカタカナ名）などを参考にした、パステル寄りの50色
const DAY_COLORS = [
  // ピンク
  { name: "ベビーピンク", hex: "#f8d3d6" },
  { name: "シェルピンク", hex: "#fbd8cb" },
  { name: "サクラピンク", hex: "#f6c4cf" },
  { name: "ローズピンク", hex: "#f0a9b8" },
  { name: "コーラルピンク", hex: "#f5b0a2" },
  { name: "サーモンピンク", hex: "#f8bea4" },
  { name: "オールドローズ", hex: "#dfa9b0" },
  { name: "ナデシコ", hex: "#eeb7cc" },
  { name: "ピンクベージュ", hex: "#e9cbbd" },
  // オレンジ・ピーチ
  { name: "ピーチ", hex: "#fbcfb2" },
  { name: "アプリコット", hex: "#f8c08f" },
  { name: "パパイヤ", hex: "#f9d2a0" },
  { name: "ベージュ", hex: "#ecdcbc" },
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
  { name: "ミストグリーン", hex: "#d4e6dc" },
  // 水色
  { name: "アクアミント", hex: "#aee2d9" },
  { name: "ターコイズ", hex: "#a3dce2" },
  { name: "オパール", hex: "#c8e6e6" },
  // ブルー
  { name: "アイスブルー", hex: "#d2e9f2" },
  { name: "ベビーブルー", hex: "#c0dbf2" },
  { name: "スカイブルー", hex: "#a9d3ee" },
  { name: "ホリゾンブルー", hex: "#b2d6e0" },
  { name: "ペールブルー", hex: "#c0cfeb" },
  { name: "ワスレナグサ", hex: "#a7c3ea" },
  // 青紫
  { name: "ペリウィンクル", hex: "#b8bfea" },
  { name: "ヒヤシンス", hex: "#c6c6ee" },
  { name: "アジサイ", hex: "#b9c4e0" },
  // パープル
  { name: "ラベンダー", hex: "#cdc0e8" },
  { name: "ライラック", hex: "#d9c3e3" },
  { name: "フジ", hex: "#bba8e4" },
  { name: "オーキッド", hex: "#e2c1e1" },
  { name: "モーブピンク", hex: "#e6bcd4" },
  // ニュートラル
  { name: "アイボリー", hex: "#f2eedf" },
  { name: "パールグレー", hex: "#dcd8df" },
  { name: "ミルクティー", hex: "#e3cfbb" },
  { name: "グレージュ", hex: "#d8cfc6" },
  { name: "ローズグレー", hex: "#ddc8ce" },
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

// 種目ごとの分数 { pilates: 50, walking: 20, ... } から、その日の色を決める
// sportColor：種目の色（"#rrggbb"）を返す関数
function mixDayColor(minutesByType, sportColor) {
  let total = 0, va = 0, vb = 0, chroma = 0, light = 0;
  for (const [type, min] of Object.entries(minutesByType)) {
    if (!(min > 0)) continue;
    const [L, a, b] = rgbToOklab(hexToRgb(sportColor(type)));
    total += min;
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
  const k = Math.min(1, Math.max(0, (total - 10) / 80));
  const C = 0.01 + together * (0.03 + 0.085 * k);
  const L = 0.945 - 0.11 * k + (light / total - 0.8) * 0.6;
  const lab = [Math.min(0.95, Math.max(0.78, L)), C * Math.cos(hue), C * Math.sin(hue)];
  // いちばん近い色（色あいの差を少し重く見る）
  let best = 0, bestD = Infinity;
  DAY_COLORS_LAB.forEach(([L2, a2, b2], i) => {
    const d = (lab[0] - L2) ** 2 * 0.5 + ((lab[1] - a2) ** 2 + (lab[2] - b2) ** 2) * 1.6;
    if (d < bestD) (bestD = d), (best = i);
  });
  return { name: DAY_COLORS[best].name, hex: DAY_COLORS[best].hex, mixed: rgbToHex(oklabToRgb(lab)) };
}

// 瓶の中身として描くときの色：ガラス越しだと淡く見えるので、少しだけ深く・あざやかにする
// （色見本・札・色図鑑は、もとの色のまま）
function liquidColor(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
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
const dayColorOf = (day) => mixDayColor(dayMinutesByType(day), (t) => (sportById(t) || { color: "#dddddd" }).color);
// シェイクして、そのあと記録が変わっていなければ、その色
function dayShake(day) {
  const s = data.shakes && data.shakes[day];
  return s && s.sig === daySig(day) ? s : null;
}
// シェイクできる日：きのうより前の日、または「今日はおしまい」を押した今日
const canShakeDay = (day) => day < dateKey() || !!(data.closed && data.closed[day]);

if (typeof module !== "undefined") module.exports = { DAY_COLORS, DAY_COLORS_LAB, mixDayColor, rgbToOklab, hexToRgb };
