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
// リボンのシリーズ：type: "ribbon" を書くと、ガチャ画面の「リボン」のほうに出る（ピックアップ・予告・復刻・いろいろリボンも同じしくみ）
//   チャームは、リボンなら kind: "ribbon"・place: "neck"・band（首に巻く帯の位置）を書く
// 予告：開始の2週間前から、ガチャの画面に「ピックアップ予告」が出る（チャームはシルエット）。出したくないシリーズは preview: false
//
// チャーム1つの書き方
//   { id: "h00", name: "チャームの名前" }
//   ・レア度（grade）：書かないと「ノーマル」。grade: "super"（スーパーレア・いちばんレア）／ grade: "rare"（レア）
//     レアほどガチャで出にくい（出やすさは下の GRADES の weight）。ガチャの画面では「SR」「R」「N」、付け替え画面では背景の色でわかる
//   ・画像は charms/シリーズのid/ の「id.webp」（ちがう名前なら file: "xxx.webp"）
//   ・つけ方（place）を書かないと「首のチェーンから下げる」。リボンは place: "neck", pw: 58, pa: 0.2
//   ・w・h（画像の大きさ）は書かなくてもOK（アプリが読みこんだときに測る）
//   ・id は、ほかのチャームとかぶらない英数字にする（持っているチャームの記録に使う）
// =========================================================

const SERIES_LIST = [
  {
    id: "rosegarden",
    name: "うさぎのひみつのバラ園シリーズ",
    gachaName: "バラ園ガチャ",
    catch: "白うさぎがまもる、ひみつの花園のバラたち",
    color: "#e8a0b4",
    pickups: [{ start: "2026-11-06", end: "2026-11-12" }], // 公開ずみ（いろいろガチャで引ける）
    charms: [
      { id: "d00", name: "バラ園のレースメダル", w: 115, h: 160 },
      { id: "d01", name: "朝つゆのバラ", w: 77, h: 160 },
      { id: "d02", name: "まっ赤な約束のバラ", w: 92, h: 160 },
      { id: "d03", name: "バラ園の金のハート", w: 113, h: 160 },
      { id: "d04", name: "のびやかなバラのつる", w: 62, h: 160 },
      { id: "d05", name: "思い出のバラのロケット", w: 118, h: 160 },
      { id: "d06", name: "ひみつの花園の門", w: 96, h: 160, grade: "rare" },
      { id: "d07", name: "うさぎのじょうろ", w: 106, h: 160, grade: "rare" },
      { id: "d08", name: "バラ園の白うさぎ", w: 91, h: 160, grade: "super" },
      { id: "e08", name: "バラとリボンのしずく", w: 90, h: 160 },
    ],
  },
  {
    id: "quixote",
    name: "情熱のドン・キホーテシリーズ",
    gachaName: "ドン・キホーテガチャ",
    catch: "バレエ『ドン・キホーテ』。スペインの広場に、恋と情熱のリズム",
    color: "#c9575a",
    pickups: [{ start: "2026-11-13", end: "2026-11-19" }], // 公開ずみ（いろいろガチャで引ける）
    charms: [
      { id: "f00", name: "キトリの情熱の扇", w: 143, h: 160, grade: "super" },
      { id: "f01", name: "広場のタンバリン", w: 115, h: 160 },
      { id: "f02", name: "恋のカスタネット", w: 114, h: 160 },
      { id: "f03", name: "キトリのバラの髪かざり", w: 160, h: 154 },
      { id: "f04", name: "騎士の誓いの剣", w: 46, h: 160 },
      { id: "f05", name: "ドゥルシネアの赤いハート", w: 84, h: 146, grade: "rare" },
      { id: "f06", name: "ドン・キホーテのかぶと", w: 97, h: 160 },
      { id: "f07", name: "バルセロナのショール", w: 127, h: 160 },
      { id: "f08", name: "ラ・マンチャの風車", w: 90, h: 160, grade: "rare" },
      { id: "f09", name: "セレナーデのギター", w: 77, h: 160 },
    ],
  },
  {
    id: "wanko",
    name: "ワンコシリーズ",
    gachaName: "ワンコガチャ",
    catch: "ふわふわのわんこと、キラキラのほね",
    color: "#c9a07a",
    pickups: [{ start: "2026-11-20", end: "2026-11-26" }],
    charms: [
      { id: "g00", name: "わんこのハートロケット", w: 160, h: 152, grade: "super", scale: 1.12 }, // 目玉なので少し大きめ
      { id: "g01", name: "きらめく宝石の肉球", w: 147, h: 160, grade: "rare", scale: 0.78 }, // 小ぶりに
      { id: "g02", name: "星空クリスタルのほね", w: 103, h: 160 },
      { id: "g03", name: "流れ星のほね", w: 156, h: 160, grade: "rare" },
      { id: "g04", name: "天使のしずく羽根", w: 86, h: 160 },
      { id: "g05", name: "わんこの思い出アルバム", w: 134, h: 160 },
      { id: "g06", name: "ないしょのほね小瓶", w: 94, h: 160 },
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
      { id: "e00", name: "はじめてのトウシューズ", w: 105, h: 160, grade: "super" },
      { id: "e01", name: "さくら色のチュチュ", w: 152, h: 160, grade: "rare" },
      { id: "e02", name: "プリマのティアラ", w: 133, h: 125, grade: "rare" },
      { id: "e03", name: "白鳥の湖", w: 122, h: 156 },
      { id: "e04", name: "ラベンダーの夢チュチュ", w: 160, h: 151 },
      { id: "e05", name: "くるくるプリマ", w: 131, h: 192 },
      { id: "e06", name: "月夜のトウシューズ", w: 45, h: 160 },
      { id: "e07", name: "星に願うトウシューズ", w: 126, h: 160 },
    ],
  },
  {
    id: "versailles",
    trial: true, // ★ 試しに使える：付け替え画面で選べる（動きの確認用）。確認が終わったら、この行を消す
    name: "ベルサイユの王妃シリーズ",
    gachaName: "ベルサイユガチャ",
    catch: "マリー・アントワネットのティータイムと、きらめくロココ",
    color: "#8fb3e0",
    pickups: [{ start: "2026-11-23" }], // 1週間（11/23〜11/29）
    charms: [
      { id: "i00", name: "王妃のティータイム", w: 160, h: 132 },
      { id: "i01", name: "宮殿の黄金ハープ", w: 61, h: 160 },
      { id: "i02", name: "舞踏会のロココ扇", w: 160, h: 120 },
      { id: "i03", name: "王妃の空色ドレス", w: 160, h: 148 },
      { id: "i04", name: "セーヴル焼きの宝石箱", w: 96, h: 160, grade: "rare" },
      { id: "i05", name: "王妃のパールネックレス", w: 127, h: 160, grade: "super" },
      { id: "i06", name: "王妃のカメオ", w: 93, h: 160, grade: "rare" },
      { id: "i07", name: "ヴェルサイユの椅子", w: 95, h: 160 },
    ],
  },

  {
    // リボンのシリーズ（type: "ribbon"）：ガチャ画面の「リボン」のほうに出る。チャームのガチャには入らない
    id: "vribbon",
    type: "ribbon",
    name: "ベルサイユの王妃のリボン",
    gachaName: "ベルサイユリボン",
    catch: "金のレースでふちどった、王妃のためのリボン",
    color: "#e9b8c8",
    pickups: [{ start: "2026-11-23" }], // 1週間（11/23〜11/29）。終わったら「いろいろリボン」へ
    charms: [
      { id: "l00", name: "トリアノンの空色リボン", w: 170, h: 155, place: "neck", band: [0.717, 0.3, 0.402], kind: "ribbon" },
      { id: "l01", name: "王妃のさくらリボン", w: 163, h: 147, place: "neck", band: [0.73, 0.21, 0.47], kind: "ribbon" },
      { id: "l02", name: "ミルクティーのレースリボン", w: 155, h: 143, place: "neck", band: [0.713, 0.252, 0.438], kind: "ribbon" },
      { id: "l03", name: "ロココの花がらリボン", w: 170, h: 152, place: "neck", band: [0.666, 0.244, 0.482], kind: "ribbon", grade: "rare" },
      { id: "l04", name: "プチ・トリアノンのバラリボン", w: 170, h: 151, place: "neck", band: [0.708, 0.291, 0.405], kind: "ribbon", grade: "super" },
      { id: "l05", name: "ベルサイユのローズリボン", w: 170, h: 152, place: "neck", band: [0.659, 0.198, 0.435], kind: "ribbon", grade: "rare" },
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

// ★ レア度（出やすさ weight は、ノーマルを1としたとき）
const GRADES = {
  super: { label: "スーパーレア", short: "SR", weight: 0.35 },
  rare: { label: "レア", short: "R", weight: 0.65 },
};
const gradeOf = (c) => (c && GRADES[c.grade] ? c.grade : null);
const gradeWeight = (c) => (gradeOf(c) ? GRADES[c.grade].weight : 1);
// ガチャの画面で出す「SR」「R」「N」（付け替え画面では出さず、背景の色だけ）
const gradeBadge = (c) => {
  const g = gradeOf(c);
  return g ? `<span class="grade-badge grade-${g}" aria-label="${GRADES[g].label}">${GRADES[g].short}</span>` : `<span class="grade-badge grade-normal" aria-label="ノーマル">N</span>`;
};

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
// レア順（スーパーレア → レア → ノーマル）に並べる。一覧の左はしから、レアなものが来るように
const GRADE_ORDER = { super: 0, rare: 1 };
for (const s of SERIES_LIST) {
  const sorted = (s.charms || []).map((c, i) => [c, i]).sort((a, b) => (GRADE_ORDER[a[0].grade] ?? 2) - (GRADE_ORDER[b[0].grade] ?? 2) || a[1] - b[1]).map(([c]) => c);
  for (const c of sorted) {
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
