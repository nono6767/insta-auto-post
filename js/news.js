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
    art: guideShakeArt, // 層になった小瓶がシャカシャカゆれて、1色にまざる
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

// 「一日の終わりにシェイク」の絵：3色の層の小瓶がゆれて → ぱっと光って → まざった1色になる（くり返し）
function guideShakeArt() {
  // ピラティス・ダンス・筋トレ → まざると「コーラルピンク」（かわいい色になる組み合わせ）
  const logs = [{ type: "pilates", min: 10, ts: 1 }, { type: "dance", min: 15, ts: 2 }, { type: "strength", min: 10, ts: 3 }];
  let mix = guideMixHex();
  try {
    if (typeof mixDayColor === "function") mix = mixDayColor({ pilates: 10, dance: 15, strength: 10 }, (t) => (sportById(t) || { color: "#ddd" }).color, (t) => (sportById(t) || {}).deep || 1).hex;
  } catch (e) { /* 計算できないときは見本の色 */ }
  const shape = BOTTLES[2];
  const sparks = [[18, 20, 12], [82, 24, 14], [12, 70, 10], [88, 68, 12], [50, 6, 10]]
    .map(([x, y, sz], i) => `<i class="gs-spark" style="left:${x}%;top:${y}%;width:${sz}px;--d:${(i * 0.05).toFixed(2)}s"></i>`).join("");
  return `<div class="guide-shake" aria-hidden="true">
    <div class="gs-jar">
      <div class="gs-layer gs-before">${bottleHtml(logs, shape, 0, SMALL_FULL_MIN)}</div>
      <div class="gs-layer gs-after">${bottleHtml(logs, shape, 0, SMALL_FULL_MIN, mix)}</div>
    </div>
    ${["l", "r"].map((side) => `<svg class="gs-lines ${side}" viewBox="0 0 22 56"><path d="M10 4 Q0 28 10 52"/><path d="M19 15 Q12 28 19 41"/></svg>`).join("")}
    ${sparks}
  </div>`;
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
function closeGuide(startTour = false) {
  $("guide-modal").hidden = true;
  if (startTour) setTimeout(startTour_, 350); // 「はじめよう！」で閉じたら、画面の上でのチュートリアルへ
  if (!data.guideSeen) {
    data.guideSeen = true;
    saveData();
  }
}
const guideGo = (d) => {
  const n = guideStep + d;
  if (n < 0) return;
  if (n >= GUIDE_STEPS.length) return closeGuide(true);
  guideStep = n;
  drawGuide(d);
};
$("guide-next").addEventListener("click", () => guideGo(1));
$("guide-back").addEventListener("click", () => guideGo(-1));
$("guide-skip").addEventListener("click", () => closeGuide());
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

// =========================================================
// チュートリアル：使い方ガイドのあと、本物の画面のボタンを1つずつ光らせて説明する
// （まわりを暗くして、説明するところだけ丸く明るくする）
// =========================================================

const TOURS = {};
TOURS.home = [
  { sel: "#jar", text: "これが<b>今日の小瓶</b>。<br>運動を記録すると、ここに色がたまっていくよ" },
  { sel: "#sports", text: "今日した運動は<b>ここから選んでね</b>。<br>運動をタップして、時間を入れるだけ！" },
  { sel: ".today.card", text: "今日の運動の時間はここに出るよ。<br><b>35分で小瓶が満タン！</b>" },
  { sel: "#quiz-card", text: "<b>ピラティスクイズ</b>。<br>答えるとコインがもらえるよ" },
  { sel: "#coin-btn", text: "コインはここにたまるよ。<br>タップすると<b>ガチャ</b>がひけるよ" },
  { sel: '.tabbar-btn[data-page="shelf"]', text: "小瓶や大瓶、色図鑑は<br><b>「瓶の棚」</b>で見られるよ" },
  { sel: "#settings-btn", text: "使い方は<b>設定</b>から<br>いつでも見なおせるよ" },
  { sel: "#sports", text: "準備はばっちり！<br>さっそく<b>今日の運動を記録</b>してみよう", last: true },
];
// ごはん・からだ・服・貯金は、はじめてその画面を開いたときに1回だけ（up：そのまわりのカードごと光らせる）
TOURS.meals = [
  { sel: "#meal-week", text: "今週のごはんの記録だよ。<br>おやつをがまんした日には<b>花まる</b>がつくよ" },
  { sel: "#meal-cards > :first-child", text: "朝・昼・夜のごはんを<b>タップで記録</b>してね。<br>記録すると<b>コイン+1</b>（1日1回）" },
  { sel: "#snack-row", up: ".card", text: "おやつ・つまみ食いを<b>しなかった日</b>は、<br>その日の小瓶に<b>星</b>がうかぶよ" },
  { sel: "#page-meals .day-nav", text: "‹ › で、<b>前の日</b>のごはんも<br>あとから記録できるよ", last: true },
];
TOURS.body = [
  { sel: "#body-week", text: "今週のからだの記録だよ。<br>1週間の調子がひと目でわかるよ" },
  { sel: "#condition-row", up: ".card", text: "<b>体調・気分</b>をタップで記録してね。<br>記録すると<b>コイン+1</b>（1日1回）" },
  { sel: "#poop-row", text: "お通じが「出た」日は、<br>その日の小瓶に<b>すっきりの泡</b>がのぼるよ" },
  { sel: "#period-btn", up: ".card", text: "<b>生理</b>の記録はここ。<br>始まった日と終わった日を押してね", last: true },
];
const TA_DRESS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2.5h6l-.8 4.2L19 21H5l4.8-14.3Z" fill="currentColor"/><path d="M9.6 6.7h4.8" stroke="#fff" stroke-width="1.2"/></svg>`;
TOURS.clothes = [
  { sel: "#page-clothes .lead", text: "お気に入りの服を着て<b>写真</b>を撮って、<br>前回の自分とくらべてみよう" },
  {
    // 光らせるところはなし（まん中に、流れの絵つきで出す）
    art: `<div class="ta-flow"><span><i>1</i>服を登録</span><b>›</b><span><i>2</i>着て写真</span><b>›</b><span><i>3</i>見くらべる</span></div>`,
    text: "同じ服を着て、<b>月に1回くらい</b>写真を撮ってね。<br>撮るたびに、写真がたまっていくよ",
  },
  {
    art: `<div class="ta-compare">
      <figure><span class="ta-photo old">${TA_DRESS}</span><figcaption>前回</figcaption></figure>
      <span class="ta-vs">⇄</span>
      <figure><span class="ta-photo new">${TA_DRESS}<i>✦</i></span><figcaption>今回</figcaption></figure></div>`,
    text: "2枚たまったら「<b>見くらべる</b>」。<br><b>左に前回、右に今回</b>の写真が並ぶよ。<br>写真の上の欄で、くらべる写真も選べるよ",
  },
  { sel: '#clothes-list [data-act="shoot"]', text: "服を着たら、ここで<b>写真を撮る</b>よ" },
  { sel: '#clothes-list [data-act="compare"]', text: "<b>見くらべる</b>はここ！<br>前回と今回が左右に並ぶよ" },
  { sel: "#add-cloth", text: "服は<b>ここから登録</b>できるよ。<br>写真はこのスマホの中にだけ保存されるよ", last: true },
];
// はじめて運動を記録したあと（ホーム）
TOURS.firstLog = [
  { sel: "#log-list > :first-child", text: "記録は<b>ここにたまっていく</b>よ。<br>まちがえたら「直す」で、時間を変えたり<b>取り消し</b>たりできるよ" },
  { sel: "#jar", text: "今日の小瓶に色が入ったよ！<br><b>35分で満タン</b>。満タンになると<b>コイン+3</b>" },
  { sel: ".today.card", text: "満タンをこえても、運動はちゃんと<b>カウント</b>されるよ。<br>そのあとも30分ごとに<b>おまけコイン+1</b>。目指せ満タン！" },
  { sel: "#day-end-btn", text: "その日の運動が終わったら<br>「<b>今日はおしまい</b>」を押してね。<br>小瓶を<b>シェイク</b>して、1色にまぜられるよ" },
];
// 内容を作り直したチュートリアルは、名前をかえて、もう一度だけ出す
const TOUR_SEEN_KEY = { clothes: "clothes2" };
const tourSeenKey = (name) => TOUR_SEEN_KEY[name] || name;
TOURS.savings = [
  { sel: "#savings-jar", text: "これが<b>貯金瓶</b>。<br>入れた分だけコインがたまっていくよ" },
  { sel: "#savings-setup-btn", text: "まずは<b>目標の金額</b>を決めよう。<br>毎週いくら入れたらいいか計算するよ" },
  { sel: "#savings-weekly", text: "毎週の分を入れたら押してね。<br><b>コイン+5</b>（1週間に1回）" },
  { sel: "#savings-extra", text: "追加で入れたときはこっち。<br><b>コイン+3</b>（1日1回）" },
  { sel: "#savings-deco", text: "<b>着せ替え</b>で、チャームやリボンを<br>貯金瓶につけられるよ", last: true },
];
let TOUR_STEPS = TOURS.home;
let tourName = "home";

let tourStep = 0;
let tourEl = null;
function tourBuild() {
  if (tourEl) return tourEl;
  tourEl = document.createElement("div");
  tourEl.className = "tour";
  tourEl.hidden = true;
  tourEl.innerHTML = `<div class="tour-hole"></div>
    <div class="tour-bubble" role="dialog" aria-live="polite">
      <div class="tour-char"></div>
      <div class="tour-art"></div>
      <p class="tour-text"></p>
      <div class="tour-foot"><button class="text-btn tour-skip" type="button">スキップ</button><span class="tour-count"></span><button class="primary-btn tour-next" type="button">次へ</button></div>
    </div>`;
  document.body.append(tourEl);
  tourEl.querySelector(".tour-next").addEventListener("click", () => tourGo(1));
  tourEl.querySelector(".tour-skip").addEventListener("click", tourEnd);
  window.addEventListener("resize", () => !tourEl.hidden && tourPlace());
  return tourEl;
}
function startTour_(name = "home") {
  tourName = name;
  TOUR_STEPS = TOURS[name];
  if (name === "home") {
    const home = document.querySelector('.tabbar-btn[data-page="home"]');
    if (home) home.click(); // ホーム画面で説明する
  }
  tourBuild();
  // 今の画面で見えているところだけで説明する（数字がとばないように。最後の1つで「わかった！」）
  const steps = TOURS[name].filter((st) => tourTarget(st));
  if (!steps.length) return;
  TOUR_STEPS = steps.map((st, i) => ({ ...st, last: i === steps.length - 1 }));
  tourStep = 0;
  tourEl.hidden = false;
  document.documentElement.classList.add("touring");
  tourShow();
}
function tourTarget(st = TOUR_STEPS[tourStep]) {
  if (!st.sel) return document.body; // 光らせるところがない説明（まん中に出す）
  let el = document.querySelector(st.sel);
  if (el && st.up) el = el.closest(st.up) || el;
  if (!el || el.closest("[hidden]")) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null; // 見えていないところ（まだ服がない、など）はとばす
}
function tourShow() {
  const st = TOUR_STEPS[tourStep];
  const el = tourTarget();
  if (!el) return tourGo(1); // 見つからないところは、とばす
  const art = tourEl.querySelector(".tour-art");
  art.innerHTML = st.art || "";
  art.hidden = !st.art;
  if (st.sel) el.scrollIntoView({ block: "center", behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  tourEl.querySelector(".tour-text").innerHTML = st.text;
  tourEl.querySelector(".tour-count").textContent = `${tourStep + 1} / ${TOUR_STEPS.length}`;
  tourEl.querySelector(".tour-next").textContent = st.last ? (tourName === "home" ? "はじめる！" : "わかった！") : "次へ";
  tourEl.querySelector(".tour-skip").style.visibility = st.last ? "hidden" : "";
  tourEl.querySelector(".tour-char").innerHTML = typeof nCharacterHtml === "function" ? nCharacterHtml(st.last ? "jump" : tourStep % 2 ? "pointUp" : "pointSide") : "";
  requestAnimationFrame(tourPlace);
}
function tourPlace() {
  const el = tourTarget();
  if (!el) return;
  const st = TOUR_STEPS[tourStep];
  const hole = tourEl.querySelector(".tour-hole");
  const bub = tourEl.querySelector(".tour-bubble");
  if (!st.sel) {
    // まん中に小さな穴（見えない）を置いて、全体を暗くする。ふきだしは画面のまん中
    Object.assign(hole.style, { left: "50%", top: "50%", width: "0px", height: "0px" });
    bub.style.top = `${Math.max(8, (innerHeight - bub.offsetHeight) / 2)}px`;
    return;
  }
  const r = el.getBoundingClientRect();
  const pad = 8;
  hole.style.left = `${r.left - pad}px`;
  hole.style.top = `${r.top - pad}px`;
  hole.style.width = `${r.width + pad * 2}px`;
  hole.style.height = `${r.height + pad * 2}px`;
  // ふきだしは、光らせたところの下（下に場所がなければ上）
  const bh = bub.offsetHeight;
  const below = r.bottom + pad + 14;
  const top = below + bh < innerHeight - 8 ? below : Math.max(8, r.top - pad - 14 - bh);
  bub.style.top = `${top}px`;
  bub.classList.toggle("up", top < r.top);
}
function tourGo(d) {
  const n = tourStep + d;
  if (n >= TOUR_STEPS.length) return tourEnd();
  tourStep = n;
  tourShow();
}
// はじめて運動を記録したら、記録のたまり方・満タン・シェイクを説明する
document.addEventListener("log-recorded", () => {
  if (data.toursSeen && data.toursSeen.firstLog) return;
  setTimeout(() => {
    const busy = (tourEl && !tourEl.hidden) || document.querySelector(".modal-backdrop:not([hidden])");
    const home = document.getElementById("page-home");
    if (!busy && home && !home.hidden) startTour_("firstLog");
  }, 900);
});
// ごはん・からだ・服・貯金：はじめて開いたときにチュートリアル
document.querySelectorAll(".tabbar-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    if (!TOURS[page] || page === "home") return;
    if (data.toursSeen && data.toursSeen[tourSeenKey(page)]) return;
    setTimeout(() => {
      const busy = (tourEl && !tourEl.hidden) || document.querySelector(".modal-backdrop:not([hidden])");
      const shown = document.getElementById(`page-${page}`);
      if (!busy && shown && !shown.hidden) startTour_(page);
    }, 450);
  });
});
function tourEnd() {
  if (tourEl) tourEl.hidden = true;
  if (!data.toursSeen) data.toursSeen = {};
  if (!data.toursSeen[tourSeenKey(tourName)]) {
    data.toursSeen[tourSeenKey(tourName)] = true;
    saveData();
  }
  document.documentElement.classList.remove("touring");
  window.scrollTo({ top: 0 });
}
