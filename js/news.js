// =========================================================
// お知らせ（新しくなったこと）：はじめて開いたときに1回だけ出す
// ・NEWS に1つ足すと、まだ見ていない人にだけ出る（見たかどうかは data.newsSeen）
// ・auto: false のあいだは自動では出さない（設定の「お知らせを見る」からだけ。お試し用）
// =========================================================

const NEWS = [
  {
    id: "2026-11-chores-poop",
    auto: true, // アプリを開いたときに1回だけ出す
    title: "新しくなったよ！",
    items: [
      {
        icon: `<span class="news-dot" style="--c:#e8a48a">🧹</span>`,
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
      {
        icon: `<span class="news-dot news-swatches"><i style="--c:#eeb39f"></i><i style="--c:#f7c89c"></i><i style="--c:#d9b6c1"></i><i style="--c:#d6d2b8"></i></span>`,
        head: "色図鑑が10色ふえて60色に",
        text: "家事をまぜた日にだけ出会える色も。シェイクして集めてみてね",
      },
    ],
  },
];

const newsSeen = () => (data.newsSeen = data.newsSeen || []);

function showNews(n) {
  const box = $("news-modal");
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
  const id = box.dataset.id;
  if (id && !newsSeen().includes(id)) newsSeen().push(id), saveData();
  box.hidden = true;
}
// 起動したとき：まだ見ていない自動のお知らせがあれば出す
function checkNews() {
  const n = NEWS.find((x) => x.auto && !newsSeen().includes(x.id));
  if (n) setTimeout(() => showNews(n), 800);
}
$("news-ok").addEventListener("click", closeNews);
$("settings-news").addEventListener("click", () => {
  $("settings-modal").hidden = true;
  showNews(NEWS[0]);
});
checkNews();
