// =========================================================
// ★ ガチャのシリーズの設定（新しいシリーズは、ここに1つ足すだけ）
//
// 新しいシリーズを足すとき
//   1) チャームの画像（WebP・背景は透明）を charms/シリーズのid/ フォルダに入れる
//      例：charms/neko/h00.webp, charms/neko/h01.webp …
//   2) 下の SERIES_LIST に、シリーズを1つ書き足す（いちばん下の「ひな形」をコピーすると楽）
//   3) sw.js の CODE_VERSION を1つ上げる（スマホに新しい版が届く）
//
// ピックアップ（確率アップ）の期間
//   pickups: [{ start: "開始日", end: "終了日" }]  … end を書かないと、開始日から1週間（7日間）
//   ・同時に開催されるピックアップは、最大 GACHA.maxPickups（2つ）まで（重なったときは、開始日が新しいものを優先）
//   ・期間が終わったシリーズは、自動で「いろいろガチャ」に入る（いつでも引ける）
//   ・終わったシリーズをもう一度ピックアップしたいときは、pickups にもう1つ期間を足す
//     （2つ目からは自動で「復刻」になる。revival: true / false で決めることもできる）
//
// チャーム1つの書き方
//   { id: "h00", name: "チャームの名前" }
//   ・画像は charms/シリーズのid/ の「id.webp」（ちがう名前なら file: "xxx.webp"）
//   ・つけ方（place）を書かないと「首のチェーンから下げる」。リボンは place: "neck", pw: 58, pa: 0.2
//   ・w・h（画像の大きさ）は書かなくてもOK（アプリが読みこんだときに測る）
//   ・id は、ほかのチャームとかぶらない英数字にする（持っているチャームの記録に使う）
// =========================================================

const SERIES_LIST = [
  {
    id: "wanko",
    name: "ワンコシリーズ",
    gachaName: "ワンコガチャ",
    catch: "ふわふわのわんこと、キラキラのほね",
    color: "#c9a07a",
    pickups: [{ start: "2026-11-20", end: "2026-11-26" }],
    charms: [
      { id: "g00", name: "わんこのハート", w: 160, h: 152 },
      { id: "g01", name: "宝石の肉球", w: 147, h: 160 },
      { id: "g02", name: "クリスタルとほね", w: 103, h: 160 },
      { id: "g03", name: "星のほね", w: 156, h: 160 },
      { id: "g04", name: "しずくの羽根", w: 86, h: 160 },
      { id: "g05", name: "わんこの本", w: 134, h: 160 },
      { id: "g06", name: "ほねの小瓶", w: 94, h: 160 },
    ],
  },
  {
    id: "ballet",
    name: "バレエシリーズ",
    gachaName: "バレエガチャ",
    catch: "トウシューズとチュチュで、くるっと一回転",
    color: "#e79ab6",
    pickups: [{ start: "2026-11-20", end: "2026-11-26" }],
    charms: [
      { id: "e00", name: "トウシューズ", w: 105, h: 160 },
      { id: "e01", name: "ピンクのチュチュ", w: 152, h: 160 },
      { id: "e02", name: "ティアラ", w: 133, h: 125 },
      { id: "e03", name: "白鳥", w: 122, h: 156 },
      { id: "e04", name: "ラベンダーのチュチュ", w: 160, h: 151 },
      { id: "e05", name: "バレリーナ", w: 131, h: 192 },
      { id: "e06", name: "星と月のトウシューズ", w: 45, h: 160 },
      { id: "e07", name: "トウシューズと星", w: 126, h: 160 },
    ],
  },
  {
    id: "versailles",
    name: "ベルサイユの王妃シリーズ",
    gachaName: "ベルサイユガチャ",
    catch: "マリー・アントワネットのティータイムと、きらめくロココ",
    color: "#8fb3e0",
    pickups: [{ start: "2026-11-23" }], // 1週間（11/23〜11/29）
    charms: [
      { id: "i00", name: "王妃のティーカップ", w: 160, h: 132 },
      { id: "i01", name: "黄金のハープ", w: 61, h: 160 },
      { id: "i02", name: "ロココの扇", w: 160, h: 120 },
      { id: "i03", name: "空色のドレス", w: 160, h: 148 },
      { id: "i04", name: "セーヴルの宝石箱", w: 96, h: 160 },
      { id: "i07", name: "ロココの椅子", w: 95, h: 160 },
    ],
  },

  // ---- ひな形（コピーして、// を消して使う） ----
  // {
  //   id: "neko",                       // 英字（画像のフォルダ名）
  //   name: "ネコシリーズ",              // シリーズの名前
  //   gachaName: "ネコガチャ",           // ガチャのタブの名前（書かないと「◯◯ガチャ」）
  //   catch: "ねこと毛糸のチャーム",      // バナーのひとこと
  //   color: "#b8a0d8",                 // バナーの色
  //   pickups: [{ start: "2027-01-05" }], // 開始日（終了日を書かないと1週間）
  //   charms: [
  //     { id: "h00", name: "ねこの顔" },
  //     { id: "h01", name: "毛糸玉" },
  //   ],
  // },
];

// ---------- ここから下は、しくみ（ふだんは直さなくてOK） ----------

const PICKUP_DAYS = 7; // end を書かないときの期間
function addDaysKey(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// ピックアップの一覧（開始日の順）。2つ目からの期間は「復刻」
const SERIES_PICKUPS = SERIES_LIST.flatMap((s) =>
  (s.pickups || []).map((p, i) => ({
    series: s.id,
    start: p.start,
    end: p.end || addDaysKey(p.start, PICKUP_DAYS - 1),
    revival: p.revival ?? i > 0,
  }))
).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

// シリーズのチャームを、チャームの一覧（js/bigbottles.js の CHARMS）に足す
for (const s of SERIES_LIST) {
  for (const c of s.charms || []) {
    if (CHARMS.some((x) => x.id === c.id)) continue; // id がかぶったら、あとのほうは使わない
    CHARMS.push({
      place: "hang",
      ...c,
      w: c.w || 160,
      h: c.h || 160,
      measure: !(c.w && c.h),
      series: s.id,
      src: `charms/${s.id}/${c.file || c.id + ".webp"}`,
    });
  }
}

// w・h を書かなかったチャームは、画像を読みこんで大きさを測る（アプリの画面でだけ）
if (typeof window !== "undefined") {
  const todo = CHARMS.filter((c) => c.measure);
  let left = todo.length;
  for (const c of todo) {
    const img = new Image();
    img.onload = img.onerror = () => {
      if (img.naturalWidth) (c.w = img.naturalWidth), (c.h = img.naturalHeight);
      c.measure = false;
      if (--left === 0 && typeof renderAll === "function") renderAll();
    };
    img.src = c.src;
  }
}
