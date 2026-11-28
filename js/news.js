// =========================================================
// お知らせ（新しくなったこと）：はじめて開いたときに1回だけ出す
// ・NEWS に1つ足すと、まだ見ていない人にだけ出る（見たかどうかは data.newsSeen）
// ・auto: false のあいだは自動では出さない（設定の「お知らせを見る」からだけ。お試し用）
// =========================================================

const NEWS = [
  {
    id: "2026-11-chores-poop-2", // お試しで見たときに「見た」になってしまったので、名前を変えてもう一度出す
    auto: false, // 告知は終わり（11/28）。また新しいお知らせを出すときは、新しい id で auto: true にする
    title: "新しくなったよ！",
    items: [
      {
        icon: `<span class="news-dot" style="--c:#f4a26a">🧹</span>`,
        head: "運動に「家事」が仲間入り",
        text: "掃除機・床ふき・布団干し…汗をかくくらい動いた日は、家事も小瓶に入れられるよ",
      },
      {
        icon: `<span class="news-dot" style="--c:#8ec5ea">🫧</span>`,
        head: "からだに「お通じ」の記録",
        text: "「出た」を記録すると、その日の小瓶に“すっきりの泡”がのぼるよ。からだの記録で毎日コインも+1",
      },
      {
        icon: `<span class="news-dot" style="--c:#c9b8ef">🎀</span>`,
        head: "リボンガチャに「たっぷりオーガンジーリボン」",
        text: "ふんわり透ける9色のリボンが、リボンガチャに入ったよ",
      },
    ],
  },
];

const newsSeen = () => (data.newsSeen = data.newsSeen || []);

function showNews(n, auto = false) {
  const box = $("news-modal");
  box.dataset.auto = auto ? "1" : "";
  $("news-title").textContent = n.title;
  // 見本の小瓶：家事の色の層と、すっきりの泡
  const shape = BOTTLES[1];
  $("news-hero-jar").innerHTML = bottleHtml(
    [{ type: "chores", min: 30, ts: 1 }],
    shape, 0, SMALL_FULL_MIN, null, true
  );
  $("news-hero-char").innerHTML = typeof nCharacterHtml === "function" ? nCharacterHtml("jump") : "";
  $("news-items").innerHTML = n.items
    .map((it) => `<li class="news-item">${it.icon}<div><b>${it.head}</b><p>${it.text}</p></div></li>`)
    .join("");
  box.dataset.id = n.id;
  box.hidden = false;
}
function closeNews() {
  const box = $("news-modal");
  const id = box.dataset.auto ? box.dataset.id : ""; // 設定から見ただけのときは「見た」にしない
  if (id && !newsSeen().includes(id)) newsSeen().push(id), saveData();
  box.hidden = true;
}
// 起動したとき：まだ見ていない自動のお知らせがあれば出す
function checkNews() {
  const n = NEWS.find((x) => x.auto && !newsSeen().includes(x.id));
  if (n) setTimeout(() => showNews(n, true), 800);
}
$("news-ok").addEventListener("click", closeNews);
checkNews();

// =========================================================
// 使い方ガイド：はじめて使う人に、ページをめくって説明する
// ・最初の設定（体重）が終わったら1回だけ出る（見たかどうかは data.guideSeen）
// ・もう記録がある人には自動では出さない。設定の「使い方を見る」からいつでも見られる
// =========================================================

const GUIDE_STEPS = [
  {
    pose: "wave",
    art: () => bottleHtml([], BOTTLES[0], 0, SMALL_FULL_MIN),
    title: "ようこそ！",
    text: "運動した分だけ\n小瓶にきれいな色がたまっていくアプリだよ。\n毎日の運動を、|瓶に集めていこう！",
  },
  {
    pose: "pointSide",
    art: () => bottleHtml([{ type: "pilates", min: 15, ts: 1 }, { type: "walking", min: 10, ts: 2 }, { type: "stretch", min: 10, ts: 3 }], BOTTLES[1], 0, SMALL_FULL_MIN),
    title: "運動を記録しよう",
    text: "ホームの「どの運動をした？」から、\n運動と時間を|選んでね。\n運動ごとの色が、|今日の小瓶に|たまるよ。|**35分で満タン！**",
    note: "WHO（世界保健機関）は、|「大人は1週間で|150〜300分の運動を」と|すすめているよ。|35分×7日＝245分で、|ちょうどその中なんだ。",
  },
  {
    pose: "jump",
    art: () => bottleHtml([{ type: "pilates", min: 35, ts: 1 }], BOTTLES[2], 0, SMALL_FULL_MIN, guideMixHex()),
    title: "一日の終わりにシェイク",
    text: "運動が終わったら|「今日はおしまい」を押して、|小瓶をふってね。\n色がまざって、|その日だけの|1色になるよ。\n出た色は|「色図鑑」に|集まるよ。",
  },
  {
    pose: "guts",
    noChar: true, // 小瓶がいくつも集まって大きな瓶になる様子を、横いっぱいに見せる
    art: guideMergeArt,
    title: "小瓶を集めて、大瓶にしよう！",
    text: "小瓶が合計|**245分**たまったら、|「瓶の棚」で|合成してね。\nごほうびの大瓶に|進化して、|ショーケースに|飾られるよ。",
    note: "245分は、|35分を7日続けた|ちょうど1週間分。|毎日ノルマを達成したら、|7日目に大瓶になるよ。",
  },
  {
    pose: "wink",
    photo: "img/guide/gacha-wide.webp", // 宝箱からチャームとリボンが出てくる絵（この絵だけで1枚）
    art: () => "",
    title: "コインでガチャ",
    text: "運動・ごはん・|からだの記録や、|ピラティスクイズで|コインがもらえるよ。\n左上の「ガチャ」で|チャームやリボンを|集めて、|大瓶をかざろう。",
  },
  {
    pose: "hands",
    noChar: true, // 女の子を主役にして、まわりにアイコンをうかべる
    art: guideOtherArt,
    title: "ほかにもあるよ",
    text: "下のボタンで、|ごはん・|からだ（体調・生理）・|服・貯金も|記録できるよ。\n記録は|このスマホの中だけに|保存されるよ。\nときどき設定から|「バックアップを保存」|してね。",
  },
];

// 「大瓶にしよう」の絵：まわりの小瓶たちが光の中へすいこまれて、特別な大瓶に生まれ変わる瞬間
function guideMergeArt() {
  const hex = (name, fb) => ((typeof DAY_COLORS !== "undefined" && DAY_COLORS.find((x) => x.name === name)) || { hex: fb }).hex;
  const cols = [["サクラピンク", "#f6c1cf"], ["フローズンミント", "#c8eedd"], ["ラベンダー", "#d9c8f0"], ["レモンイエロー", "#f2d43c"], ["アジサイ", "#b8c8f0"], ["ピーチ", "#ffd0b5"]];
  // 小瓶の場所（枠の中の%）と、大瓶のまん中までの距離（px）
  const spots = [[13, 22, 105, 40], [6, 62, 125, -5], [18, 86, 95, -30], [87, 22, -105, 40], [94, 62, -125, -5], [82, 86, -95, -30]];
  const smalls = cols.map(([n, fb], i) => {
    const [x, y, dx, dy] = spots[i];
    return `<span class="gm-small" style="left:${x}%;top:${y}%;--dx:${dx}px;--dy:${dy}px;--d:${(i * 0.45).toFixed(2)}s">${bottleHtml([{ type: "pilates", min: 35, ts: 1 }], BOTTLES[i % BOTTLES.length], 0, SMALL_FULL_MIN, hex(n, fb))}</span>`;
  }).join("");
  const big = typeof bigBottleHtml === "function"
    ? bigBottleHtml({ id: "guide", bottle: "heart", charms: ["c04"], ribbon: "j01", flowers: 0, layers: [["フローズンミント", "#c8eedd"], ["ラベンダー", "#d9c8f0"], ["サクラピンク", "#f6c1cf"]].map(([n, fb]) => ({ min: 80, color: hex(n, fb) })) }) // 中身は3色だけ（多いとごちゃごちゃする）
    : "";
  // 大瓶に進化したときと同じ、4つの角のキラキラ（金・白・ピンク）。ぱっと開いて、くるっと回って消える
  const sparkCols = ["#ffe08a", "#ffffff", "#fff6c8", "#ffc4dc"];
  const sparks = [[8, 12, 14], [30, 8, 10], [70, 10, 16], [93, 16, 11], [4, 44, 9], [96, 46, 15], [22, 50, 12], [78, 52, 10],
    [12, 82, 16], [36, 92, 9], [64, 94, 13], [90, 84, 10], [42, 22, 9], [58, 30, 12], [50, 70, 10], [28, 30, 8], [72, 32, 8]]
    .map(([x, y, sz], i) => `<i class="gm-spark" style="left:${x}%;top:${y}%;width:${Math.round(sz * 1.45)}px;background:${sparkCols[i % sparkCols.length]};--d:${((i * 0.37) % 2.4).toFixed(2)}s"></i>`).join("");
  return `<div class="guide-merge" aria-hidden="true">
    <span class="gm-rays"></span><span class="gm-glow"></span>
    ${smalls}
    <div class="gm-big">${big}</div>
    ${sparks}
  </div>`;
}

// 「ほかにもあるよ」の絵：はねる女の子のまわりに、ごはん・からだ・服・貯金のマークがふわふわ
function guideOtherArt() {
  const items = [["meals", "ごはん", 15, 24, "★"], ["body", "からだ", 85, 24, "♥"], ["clothes", "服", 15, 70, "♥"], ["savings", "貯金", 85, 70, "★"]];
  const icons = items.map(([page, label, x, y, deco], i) => {
    const svg = document.querySelector(`.tabbar-btn[data-page="${page}"] svg`);
    return `<span class="go-icon" style="left:${x}%;top:${y}%;--d:${(i * 0.6).toFixed(1)}s">
      <span class="go-bubble">${svg ? svg.outerHTML : ""}<i class="go-deco ${deco === "♥" ? "heart" : "star"}">${deco}</i></span><b>${label}</b></span>`;
  }).join("");
  const sparkCols = ["#ffe08a", "#ffffff", "#ffc4dc"];
  const sparks = [[34, 12, 12], [66, 10, 15], [6, 46, 10], [94, 46, 13], [40, 90, 10], [60, 92, 12], [28, 52, 9], [72, 50, 9]]
    .map(([x, y, sz], i) => `<i class="gm-spark" style="left:${x}%;top:${y}%;width:${sz}px;background:${sparkCols[i % 3]};--d:${((i * 0.41) % 2.4).toFixed(2)}s"></i>`).join("");
  const girl = typeof nCharacterHtml === "function" ? nCharacterHtml("hands") : "";
  return `<div class="guide-other" aria-hidden="true"><span class="go-light"></span>${sparks}<div class="go-girl">${girl}<span class="go-shadow"></span></div>${icons}</div>`;
}

function guideMixHex() {
  const c = typeof DAY_COLORS !== "undefined" && DAY_COLORS.find((x) => x.name === "サクラピンク");
  return c ? c.hex : "#f6c1cf";
}

// 「|」のところでだけ改行する（ことばの途中で切れないように）。「\n」は必ず改行、**…** は太字
function guideLines(t) {
  return t.split("\n").map((line) => `<span class="guide-line">${line.split("|").map((w) => `<span class="nb">${w.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</span>`).join("")}</span>`).join("");
}

let guideStep = 0;
function drawGuide(dir = 0) {
  const s = GUIDE_STEPS[guideStep];
  const last = guideStep === GUIDE_STEPS.length - 1;
  $("guide-char").innerHTML = typeof nCharacterHtml === "function" ? nCharacterHtml(s.pose) : "";
  $("guide-art").innerHTML = s.art();
  // 1枚絵のページは、キャラと瓶のかわりに絵をそのまま出す
  const photo = $("guide-photo");
  photo.hidden = !s.photo;
  if (s.photo) photo.src = s.photo;
  photo.closest(".news-hero").classList.toggle("has-photo", !!s.photo);
  $("guide-art").classList.toggle("wide", !!s.wide);
  $("guide-art").classList.toggle("full", !!s.noChar);
  $("guide-char").hidden = !!s.noChar;
  $("guide-title").textContent = s.title;
  $("guide-text").innerHTML = guideLines(s.text) + (s.note ? `<p class="guide-note">${guideLines(s.note)}</p>` : "");
  $("guide-dots").innerHTML = GUIDE_STEPS.map((_, i) => `<i class="${i === guideStep ? "on" : ""}"></i>`).join("");
  $("guide-back").style.visibility = guideStep === 0 ? "hidden" : "";
  $("guide-next").textContent = last ? "はじめよう！" : "次へ";
  $("guide-skip").style.visibility = last ? "hidden" : "";
  const t = $("guide-track");
  if (dir && t.animate && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    t.animate([{ transform: `translateX(${dir * 40}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "ease-out" });
  }
}
function openGuide() {
  guideStep = 0;
  drawGuide();
  $("guide-modal").hidden = false;
}
function closeGuide() {
  $("guide-modal").hidden = true;
  if (!data.guideSeen) {
    data.guideSeen = true;
    saveData();
  }
}
const guideGo = (d) => {
  const n = guideStep + d;
  if (n < 0) return;
  if (n >= GUIDE_STEPS.length) return closeGuide();
  guideStep = n;
  drawGuide(d);
};
$("guide-next").addEventListener("click", () => guideGo(1));
$("guide-back").addEventListener("click", () => guideGo(-1));
$("guide-skip").addEventListener("click", closeGuide);
// 指で左右にめくることもできる
(() => {
  let sx = 0, sy = 0;
  const card = document.querySelector(".guide-card");
  card.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  card.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) guideGo(dx < 0 ? 1 : -1);
  });
})();
$("settings-news").addEventListener("click", () => {
  $("settings-modal").hidden = true;
  openGuide();
});
// はじめての人：最初の設定（体重）が終わったら出す
$("weight-form").addEventListener("submit", () => {
  setTimeout(() => {
    if (data.weight && !data.guideSeen && !(data.logs || []).length) openGuide();
  }, 600);
});
// 体重は入れたけど、まだ記録がない人にも出す（もう使っている人には出さない）
if (data.weight && !data.guideSeen && !(data.logs || []).length) setTimeout(openGuide, 800);
