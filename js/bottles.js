// 瓶の種類。毎週この中から1つ、ランダムに選ばれます。
// w,h：画像の大きさ / top,bottom：液体がたまる範囲（画像の上から何%か）
// group：形がそっくりな瓶どうし（となりの週で続かないようにする）
const BOTTLES = [
  { id: "round", name: "まんまるの瓶", w: 209, h: 300, top: 32.5, bottom: 99.1 },
  { id: "heart", group: "heart", name: "ハートの瓶", w: 241, h: 300, top: 24.7, bottom: 98.7 },
  { id: "star", group: "star", name: "星の瓶", w: 215, h: 300, top: 36.4, bottom: 98.8 },
  { id: "heart2", group: "heart", name: "ハートの小瓶", w: 242, h: 300, top: 24.1, bottom: 98.4 },
  { id: "star2", group: "star", name: "大きな星の瓶", w: 253, h: 300, top: 26.1, bottom: 98.8 },
  { id: "tall", name: "すらっとした瓶", w: 96, h: 300, top: 9.9, bottom: 98.9 },
  { id: "gem", name: "宝石の瓶", w: 183, h: 300, top: 35.1, bottom: 95.8 },
  { id: "diamond", name: "ダイヤの瓶", w: 255, h: 300, top: 26.5, bottom: 98.5 },
  { id: "drop", name: "しずくの瓶", w: 169, h: 300, top: 30.9, bottom: 99.1 },
];
