// 大瓶（チャームなしの瓶のイラスト）とチャームの一覧。画像は big/ と charms/ にあります。
// w,h：画像の大きさ / top,bottom：中身が入る体の範囲（画像の上から何%か。中身はこの8割まで）
// neck：チャームを下げる首の位置（横%, 縦%） / cap：瓶の口の高さ（ふたのチャームをつけたら、これより上のコルクやふたをかくす）
// mouth：[宝石のふたの下のはしを置く高さ（上から%）, 瓶の口の幅（瓶の幅の%）] / cork：コルクの瓶（ふたのチャームをつけたら、首の中のコルクをかくす）
// waist：リボンを巻く位置 [高さ（上から%）, 幅（瓶の幅の%）]（黄色の線で指定してもらった位置）
// wrap：首に巻くチャームを合わせる、首のくびれの高さ（上から%。書いていない瓶は neck の高さのすぐ上）
// flowers：花まるのお花を浮かべる場所
const BIG_BOTTLES = [
  { id: "round", name: "まんまるの大瓶", w: 281, h: 400, cap: 12, waist: [30.6, 27.8], mouth: [22, 31], cork: true, top: 30, bottom: 98.3, neck: [50, 22], flowers: [[49.8,91.8],[24.9,46.8],[85.4,56.8],[16.0,75.5],[49.8,65.5],[78.3,79.2],[60.5,46.8]] },
  { id: "heart", name: "ハートの大瓶", w: 323, h: 400, cap: 16, waist: [24.4, 30.9], mouth: [24, 29], cork: true, top: 24, bottom: 98.1, neck: [50, 21], flowers: [[49.5,92.0],[88.2,42.0],[12.4,42.0],[51.1,58.2],[23.2,63.2],[77.4,62.0],[37.2,42.0]] },
  { id: "star", name: "星の大瓶", w: 288, h: 400, cap: 33, waist: [41.4, 28.9], mouth: [41, 22], cork: true, top: 50, bottom: 98.2, neck: [50, 41], flowers: [[26.0,90.2],[79.9,62.7],[38.2,62.7],[71.2,89.0],[48.6,80.2],[59.0,66.5],[27.8,75.2]] },
  { id: "pear", name: "電球形の大瓶", w: 261, h: 400, cap: 11, waist: [24.4, 35.9], mouth: [23, 36], cork: true, top: 33, bottom: 98.5, neck: [50, 25], flowers: [[49.8,91.8],[28.7,49.2],[80.5,63.0],[13.4,75.5],[46.0,69.2],[78.5,84.2],[59.4,49.2]] },
  { id: "pumpkin", name: "かぼちゃ形の大瓶", w: 294, h: 400, cap: 24, waist: [33.6, 28.6], wrap: 30, mouth: [26, 30], top: 32, bottom: 98.2, neck: [50, 26], flowers: [[51.0,92.2],[23.8,48.5],[83.3,54.8],[18.7,77.2],[51.0,66.0],[79.9,78.5],[59.5,48.5]] },
  { id: "tall", name: "すらっとした大瓶", w: 131, h: 400, cap: 12, waist: [21.2, 49.1], wrap: 20, mouth: [20, 56], cork: true, charmDrop: 55, charmScale: 1.25, top: 18, bottom: 98.4, neck: [50, 15], flowers: [[49.6,92.2],[26.7,37.2],[72.5,63.5],[26.7,74.8],[76.3,44.8],[22.9,56.0],[72.5,78.5]] },
  { id: "diamond", name: "ダイヤの大瓶", w: 245, h: 400, cap: 27, waist: [34.7, 26.0], mouth: [29, 28], top: 38, bottom: 95.3, neck: [50, 35], flowers: [[49.0,89.0],[75.5,52.8],[16.3,57.8],[49.0,66.5],[67.3,77.8],[32.7,77.8],[38.8,52.8]] },
  { id: "dome", name: "ドーム形の大瓶", w: 251, h: 400, cap: 15, waist: [21.7, 32.7], mouth: [21, 36], cork: true, top: 26, bottom: 98.6, neck: [50, 21], flowers: [[49.8,92.5],[17.9,43.8],[85.7,55.0],[12.0,73.8],[87.6,81.2],[47.8,62.5],[57.8,43.8]] },
  { id: "drop", name: "しずくの大瓶", w: 208, h: 400, cap: 15, waist: [33.8, 33.7], mouth: [21, 33], cork: true, top: 40, bottom: 98.3, neck: [50, 28], flowers: [[50.5,92.2],[33.7,54.8],[81.7,68.5],[16.8,76.0],[50.5,74.8],[64.9,54.8],[72.1,82.2]] },
];

// 前の画像の瓶の名前で残っている大瓶は、いちばん近い形で表示する
const BIG_BOTTLE_ALIAS = { heart2: "heart", star2: "star", gem: "diamond" };

// チャーム。place＝つけ方
//   hang：首からひもで下げる / neck：首に巻く（リボン・ネックレス） / top：ふた（コルクのかわりに瓶の口に）
//   base：瓶の下の台（body：体にかぶせる も使えるけど、今はなし）
//   band：（首に巻く）絵の中の「首に巻くひも・くさり」の [まん中の横の位置, まん中の高さ, 幅]（絵の大きさに対する割合）。ひもの幅を首の太さに合わせて、首にそろえる
//   fit：（宝石だけのふた）瓶の口の幅の何倍の大きさにするか
//   kind: "ribbon"：首のリボン（チャームとは別に1つだけ選ぶ。いつもチャームより手前に出る）
//   scale：（下げるチャーム）ほかより大きく見えるときに小さくする（0.7 ＝ 7割の大きさ）
//   pc：（ふた）絵の中で宝石のまん中が左から何割か / pw：置く幅（top は瓶の高さの%、neck は瓶の幅の%） / pa：チャームの絵の上から何割のところを、瓶の口（top）や首（neck）にそろえるか
// ここにあるのは「ベーシックライン」（最初から持っている）。ガチャのシリーズのチャームは js/series.js
// 1本の瓶に3個までつけられる
const CHARMS = [
  { id: "a00", name: "ピンクの宝石", w: 76, h: 96, place: "top", pw: 13, pa: 1, pc: 0.5, fit: 1.25 },
  { id: "a01", name: "パールリボン", w: 160, h: 154, place: "neck", pw: 66, pa: 0.22, kind: "ribbon" },
  { id: "a02", name: "ティアラとハート", w: 131, h: 114, place: "neck", band: [0.36, 0.06, 0.72] },
  { id: "a03", name: "パールのネックレス", w: 110, h: 68, place: "neck", pw: 56, pa: 0.15 },
  { id: "a04", name: "バラとかぎ", w: 151, h: 165, place: "neck", pw: 64, pa: 0.15 },
  { id: "a07", name: "馬車の車輪", w: 160, h: 54, place: "base" },
  { id: "a09", name: "リボンとガラスのくつ", w: 160, h: 150, place: "neck", band: [0.66, 0.21, 0.37] },
  { id: "a10a", name: "羽根とリボン", w: 181, h: 151, place: "neck", band: [0.55, 0.07, 0.41] },
  { id: "a10b", name: "月のネックレス", w: 183, h: 109, place: "neck", pw: 70, pa: 0.15 },
  { id: "b01", name: "銀の星", w: 62, h: 91, place: "hang", scale: 0.62 },
  { id: "b02", name: "月と星", w: 106, h: 149, place: "hang", scale: 0.72 },
  { id: "b03", name: "しずくの宝石", w: 68, h: 145, place: "hang" },
  { id: "b04", name: "羽根のチャーム", w: 37, h: 160, place: "hang" },
  { id: "b05", name: "金のかぎ", w: 46, h: 142, place: "hang", scale: 0.72 },
  { id: "b06", name: "ハートのかぎ", w: 56, h: 141, place: "hang", scale: 0.72 },
  { id: "b07", name: "タグ", w: 105, h: 170, place: "hang", scale: 0.68 },
  { id: "b08", name: "銀の月", w: 71, h: 117, place: "hang", scale: 0.66 },
  { id: "b10", name: "麻ひもリボン", w: 160, h: 138, place: "neck", pw: 58, pa: 0.15, kind: "ribbon" },
  { id: "c00", name: "ハートリボン", w: 160, h: 135, place: "neck", pw: 54, pa: 0.3, kind: "ribbon" },
  { id: "c01", name: "ふたつのハート", w: 160, h: 118, place: "hang" },
  { id: "c03", name: "クリスタル", w: 98, h: 160, place: "hang" },
  { id: "c04", name: "きらめく星", w: 143, h: 160, place: "hang" },
  { id: "c05", name: "オーロラのしずく", w: 87, h: 160, place: "hang" },
  { id: "c06", name: "魔法の本", w: 139, h: 160, place: "hang" },
  { id: "c07", name: "魔法の小瓶", w: 95, h: 160, place: "hang" },
  { id: "c09", name: "月と黒ねこ", w: 135, h: 160, place: "hang" },
  { id: "c10", name: "肉球", w: 150, h: 160, place: "hang", scale: 0.78 }, // 小ぶりに
  { id: "c11", name: "黒ねことハート", w: 104, h: 160, place: "hang" },
  // バラ・バレエのチャーム（追加）
  { id: "d00", name: "バラのメダル", w: 115, h: 160, place: "hang" },
  { id: "d01", name: "しずくのバラ", w: 77, h: 160, place: "hang" },
  { id: "d02", name: "赤いバラ", w: 92, h: 160, place: "hang" },
  { id: "d03", name: "金のハート", w: 113, h: 160, place: "hang" },
  { id: "d04", name: "バラのつる", w: 62, h: 160, place: "hang" },
  { id: "d05", name: "バラのロケット", w: 118, h: 160, place: "hang" },
  { id: "d06", name: "バラの門", w: 96, h: 160, place: "hang" },
  { id: "d07", name: "じょうろ", w: 106, h: 160, place: "hang" },
  { id: "d08", name: "うさぎとバラ", w: 91, h: 160, place: "hang" },
  { id: "e08", name: "バラのリボン", w: 90, h: 160, place: "hang" },
  { id: "e09", name: "アンティークのかぎ", w: 64, h: 160, place: "hang" },
  { id: "e10", name: "ハートのアンティークかぎ", w: 79, h: 200, place: "hang" },
  { id: "e11", name: "レースリボン", w: 160, h: 139, place: "neck", pw: 58, pa: 0.21, kind: "ribbon" },
  // スペインのチャーム（追加）
  { id: "f00", name: "赤い扇", w: 143, h: 160, place: "hang" },
  { id: "f01", name: "タンバリン", w: 115, h: 160, place: "hang" },
  { id: "f02", name: "カスタネット", w: 114, h: 160, place: "hang" },
  { id: "f03", name: "バラの髪かざり", w: 160, h: 154, place: "hang" },
  { id: "f04", name: "剣", w: 46, h: 160, place: "hang" },
  { id: "f05", name: "赤い宝石のハート", w: 84, h: 146, place: "hang" },
  { id: "f06", name: "騎士のかぶと", w: 97, h: 160, place: "hang" },
  { id: "f07", name: "ショール", w: 127, h: 160, place: "hang" },
  { id: "f08", name: "風車", w: 90, h: 160, place: "hang" },
  { id: "f09", name: "ギター", w: 77, h: 160, place: "hang" },
  { id: "f10", name: "黒レースの赤リボン", w: 154, h: 160, place: "neck", pw: 60, pa: 0.2, kind: "ribbon" },
  { id: "f11", name: "金もようの赤リボン", w: 107, h: 160, place: "neck", pw: 54, pa: 0.16, kind: "ribbon" },
  // パステルのリボン（ベーシック・最初から持っている）
  { id: "j00", name: "そらいろリボン", w: 160, h: 126, place: "neck", pw: 56, pa: 0.25, kind: "ribbon" },
  { id: "j01", name: "さくらリボン", w: 160, h: 128, place: "neck", pw: 56, pa: 0.25, kind: "ribbon" },
  { id: "j02", name: "ラベンダーリボン", w: 160, h: 143, place: "neck", pw: 56, pa: 0.25, kind: "ribbon" },
  { id: "j03", name: "ミントリボン", w: 160, h: 142, place: "neck", pw: 56, pa: 0.25, kind: "ribbon" },
  { id: "j04", name: "レモンリボン", w: 160, h: 128, place: "neck", pw: 56, pa: 0.25, kind: "ribbon" },
  // ななめに結んだリボン（ベーシック・最初から持っている）。band：首に巻く帯の部分（黄色の線で指定してもらった所） [まん中の横, まん中の高さ, 幅]（絵の大きさに対する割合）。瓶の waist に重ねる
  { id: "k00", name: "そらいろの横むすび", w: 150, h: 160, place: "neck", band: [0.7, 0.32, 0.52], scale: 0.92, kind: "ribbon" },
  { id: "k03", name: "さくらの横むすび", w: 147, h: 160, place: "neck", band: [0.68, 0.31, 0.52], kind: "ribbon" },
  { id: "k04", name: "ミントの横むすび", w: 134, h: 160, place: "neck", band: [0.31, 0.31, 0.54], kind: "ribbon" },
  { id: "k06", name: "ラベンダーの横むすび", w: 155, h: 157, place: "neck", band: [0.71, 0.23, 0.44], kind: "ribbon" },
  // 金のレースのふちどりリボン
  { id: "l00", name: "そらいろレースリボン", w: 170, h: 155, place: "neck", band: [0.717, 0.3, 0.402], kind: "ribbon" },
  { id: "l01", name: "さくらレースリボン", w: 163, h: 147, place: "neck", band: [0.73, 0.21, 0.47], kind: "ribbon" },
  { id: "l02", name: "ミルクレースリボン", w: 155, h: 143, place: "neck", band: [0.713, 0.252, 0.438], kind: "ribbon" },
  { id: "l03", name: "花がらレースリボン", w: 170, h: 152, place: "neck", band: [0.666, 0.244, 0.482], kind: "ribbon" },
  { id: "l04", name: "バラがらレースリボン", w: 170, h: 151, place: "neck", band: [0.708, 0.291, 0.405], kind: "ribbon" },
  { id: "l05", name: "ローズレースリボン", w: 170, h: 152, place: "neck", band: [0.659, 0.198, 0.435], kind: "ribbon" },
];

// チャームの画像の場所（シリーズのチャームは charms/シリーズ名/ の中）
const charmSrc = (c) => c.src || `charms/${c.id}.webp`;
