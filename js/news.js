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
    text: "運動した分だけ、小瓶にきれいな色がたまっていくアプリだよ。<br>毎日の運動を、瓶に集めていこう！",
  },
  {
    pose: "pointSide",
    art: () => bottleHtml([{ type: "pilates", min: 15, ts: 1 }, { type: "walking", min: 10, ts: 2 }, { type: "stretch", min: 10, ts: 3 }], BOTTLES[1], 0, SMALL_FULL_MIN),
    title: "運動を記録しよう",
    text: "ホームの「どの運動をした？」から、運動と時間を選んでね。<br>運動ごとの色が、今日の小瓶にたまるよ。<b>35分で満タン！</b>",
  },
  {
    pose: "jump",
    art: () => bottleHtml([{ type: "pilates", min: 35, ts: 1 }], BOTTLES[2], 0, SMALL_FULL_MIN, guideMixHex()),
    title: "一日の終わりにシェイク",
    text: "運動が終わったら「今日はおしまい」を押して、小瓶をふってね。<br>色がまざって、その日だけの1色になるよ。出た色は「色図鑑」に集まるよ。",
  },
  {
    pose: "guts",
    art: () => (typeof bigBottleHtml === "function"
      ? bigBottleHtml({ bottle: "heart", layers: [{ type: "pilates", min: 90 }, { type: "stretch", min: 60 }, { type: "walking", min: 100 }] })
      : bottleHtml([], BOTTLES[0], 0, SMALL_FULL_MIN)),
    title: "大瓶に合成しよう",
    text: "小瓶が合計<b>250分</b>たまったら、「瓶の棚」で合成してね。<br>ごほうびの大瓶に進化して、ショーケースに飾られるよ。",
  },
  {
    pose: "wink",
    art: () => `<div class="guide-charms">${["c04", "c01", "b02"].map((id) => { const c = typeof charmById === "function" && charmById(id); return c ? `<img src="${charmSrc(c)}" alt="">` : ""; }).join("")}</div>`,
    title: "コインでガチャ",
    text: "運動・ごはん・からだの記録や、ピラティスクイズでコインがもらえるよ。<br>左上の「ガチャ」でチャームやリボンを集めて、大瓶をかざろう。",
  },
  {
    pose: "hands",
    art: () => `<div class="guide-tabs"><span>🍚<i>ごはん</i></span><span>♡<i>からだ</i></span><span>👗<i>服</i></span><span>💰<i>貯金</i></span></div>`,
    title: "ほかにもあるよ",
    text: "下のボタンで、ごはん・からだ（体調・生理）・服・貯金も記録できるよ。<br>記録はこのスマホの中だけに保存されるよ。ときどき設定から「バックアップを保存」してね。",
  },
];

function guideMixHex() {
  const c = typeof DAY_COLORS !== "undefined" && DAY_COLORS.find((x) => x.name === "サクラピンク");
  return c ? c.hex : "#f6c1cf";
}

let guideStep = 0;
function drawGuide(dir = 0) {
  const s = GUIDE_STEPS[guideStep];
  const last = guideStep === GUIDE_STEPS.length - 1;
  $("guide-char").innerHTML = typeof nCharacterHtml === "function" ? nCharacterHtml(s.pose) : "";
  $("guide-art").innerHTML = s.art();
  $("guide-title").textContent = s.title;
  $("guide-text").innerHTML = `<p>${s.text}</p>`;
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
