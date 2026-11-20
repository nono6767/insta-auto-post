// =========================================================
// ピラティスクイズ（キャラクターが出題する）
// ・問題集は data/quiz-questions.json（問題を足す・直すときは、このファイルだけ書きかえる）
// ・1回5問・4択。毎回ランダムに5問（選択肢の並びも毎回シャッフル）
// ・答えるたびに、キャラが正解と短い解説を教えてくれる
// ・最後までやると1コイン、全問正解なら3コイン（1日にクイズでもらえるのは3コインまで）
//   コインの数は js/gacha.js の COIN_RULES（quizPlay・quizPerfect・quizDailyMax）
// =========================================================

const QUIZ_FILE = "data/quiz-questions.json";
const QUIZ_COUNT = 5;

let quizBank = null; // 読みこんだ問題集
const quiz = { list: [], i: 0, score: 0, answered: false };

async function loadQuizBank() {
  if (quizBank) return quizBank;
  const res = await fetch(QUIZ_FILE, { cache: "no-cache" }).catch(() => null);
  const raw = res && res.ok ? await res.json().catch(() => null) : null;
  // 書きまちがいのある問題は、とばす（4択・正解の番号が0〜3）
  quizBank = (Array.isArray(raw) ? raw : []).filter(
    (q) => q && q.question && Array.isArray(q.choices) && q.choices.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4
  );
  return quizBank;
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 今日、クイズでもらったコイン
function quizCoinsToday() {
  const g = ensureGacha();
  return g.quizDay === dateKey() ? g.quizCoins || 0 : 0;
}

// キャラの絵（ポーズ）とふきだし
function quizSay(pose, html) {
  const p = currentCharacter().poses[pose] || currentCharacter().poses.wave;
  const fig = $("quiz-char");
  fig.innerHTML = `<img src="${p.src}" alt="${p.alt}" width="${p.w}" height="${p.h}">`;
  fig.classList.remove("pop");
  void fig.offsetWidth;
  fig.classList.add("pop");
  $("quiz-bubble").innerHTML = html;
}

async function openQuiz() {
  $("quiz-screen").hidden = false;
  document.body.classList.add("gacha-open");
  $("quiz-name").textContent = charName();
  const bank = await loadQuizBank();
  if (bank.length < QUIZ_COUNT) {
    quizSay("relax", "あれれ、問題集が読みこめなかったよ。<br>電波のいいところで、もう一度開いてみてね");
    $("quiz-body").replaceChildren();
    return;
  }
  startQuiz();
}
function closeQuiz() {
  $("quiz-screen").hidden = true;
  document.body.classList.remove("gacha-open");
  renderAll();
}

function startQuiz() {
  quiz.list = shuffle(quizBank).slice(0, QUIZ_COUNT).map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return { ...q, shown: order.map((k) => q.choices[k]), correct: order.indexOf(q.answer) };
  });
  quiz.i = 0;
  quiz.score = 0;
  showQuestion();
}

function drawProgress() {
  $("quiz-progress").innerHTML = quiz.list
    .map((q, k) => `<span class="${k < quiz.i ? (q.ok ? "ok" : "ng") : k === quiz.i ? "now" : ""}"></span>`)
    .join("");
}

function showQuestion() {
  const q = quiz.list[quiz.i];
  quiz.answered = false;
  drawProgress();
  quizSay(
    quiz.i === 0 ? "cheer" : "wave",
    `<span class="quiz-genre">${q.genre || "ピラティス"}</span><b class="quiz-qno">Q${quiz.i + 1}.</b> ${q.question}`
  );
  const body = $("quiz-body");
  body.replaceChildren();
  const box = document.createElement("div");
  box.className = "quiz-choices";
  q.shown.forEach((text, k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "quiz-choice";
    b.innerHTML = `<span class="quiz-mark">${"ABCD"[k]}</span><span></span>`;
    b.lastChild.textContent = text;
    b.addEventListener("click", () => answer(k));
    box.append(b);
  });
  body.append(box);
}

function answer(k) {
  if (quiz.answered) return;
  quiz.answered = true;
  const q = quiz.list[quiz.i];
  q.ok = k === q.correct;
  if (q.ok) quiz.score++;
  const btns = $("quiz-body").querySelectorAll(".quiz-choice");
  btns.forEach((b, j) => {
    b.disabled = true;
    if (j === q.correct) b.classList.add("right");
    else if (j === k) b.classList.add("wrong");
  });
  drawProgress();
  const head = q.ok ? `<b class="quiz-ok">正解！すごい〜✨</b>` : `<b class="quiz-ng">おしい！</b> 正解は「${q.shown[q.correct]}」だよ`;
  quizSay(q.ok ? "quota" : "relax", `${head}<br><span class="quiz-exp"></span>`);
  $("quiz-bubble").querySelector(".quiz-exp").textContent = q.explanation || "";
  if (q.ok) quizSparkle();
  const next = document.createElement("button");
  next.type = "button";
  next.className = "primary-btn quiz-next";
  next.textContent = quiz.i < quiz.list.length - 1 ? "次の問題へ" : "結果を見る";
  next.addEventListener("click", () => {
    quiz.i++;
    if (quiz.i < quiz.list.length) showQuestion();
    else finishQuiz();
  });
  $("quiz-body").append(next);
}

function finishQuiz() {
  drawProgress();
  const perfect = quiz.score === quiz.list.length;
  // コイン：最後までやったら1、全問正解なら3（1日の上限まで）
  const g = ensureGacha();
  if (g.quizDay !== dateKey()) (g.quizDay = dateKey()), (g.quizCoins = 0);
  const want = perfect ? COIN_RULES.quizPerfect : COIN_RULES.quizPlay;
  const give = Math.max(0, Math.min(want, COIN_RULES.quizDailyMax - g.quizCoins));
  g.quizCoins += give;
  g.coins += give;
  saveData();
  updateCoinBadge();
  if (give) coinPop(give, perfect ? "クイズ全問正解" : "クイズに参加");

  const coinText = give
    ? `コインを <b>${give}枚</b> もらったよ！`
    : `今日のクイズのコインは、もう${COIN_RULES.quizDailyMax}枚もらったよ。また明日ね`;
  quizSay(
    perfect ? "full" : quiz.score >= 3 ? "love" : "cheer",
    perfect
      ? `<b class="quiz-ok">全問正解〜！！</b><br>ピラティスマスターだね✨ ${coinText}`
      : `<b>${quiz.list.length}問中 ${quiz.score}問 正解！</b><br>${quiz.score >= 3 ? "いい感じ！" : "つぎはもっといけるよ！"} ${coinText}`
  );
  if (perfect) for (let i = 0; i < 3; i++) setTimeout(quizSparkle, i * 400);
  const body = $("quiz-body");
  body.replaceChildren();
  const result = document.createElement("div");
  result.className = "quiz-result";
  result.innerHTML = `
    <p class="quiz-score"><b>${quiz.score}</b> / ${quiz.list.length}</p>
    <ul class="quiz-review">${quiz.list
      .map((q) => `<li class="${q.ok ? "ok" : "ng"}"><span>${q.ok ? "○" : "×"}</span><span></span></li>`)
      .join("")}</ul>
    <p class="quiz-today">今日のクイズコイン ${quizCoinsToday()} / ${COIN_RULES.quizDailyMax}</p>
    <div class="quiz-end-btns">
      <button class="primary-btn" type="button" id="quiz-again">もう1回</button>
      <button class="text-btn" type="button" id="quiz-done">もどる</button>
    </div>`;
  result.querySelectorAll(".quiz-review li").forEach((li, k) => (li.lastChild.textContent = quiz.list[k].question));
  body.append(result);
  $("quiz-again").addEventListener("click", startQuiz);
  $("quiz-done").addEventListener("click", closeQuiz);
}

// 正解のときのキラキラ
function quizSparkle() {
  const stage = $("quiz-screen");
  const fig = $("quiz-char").getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("span");
    s.className = "g-spark quiz-spark";
    s.style.left = fig.left + Math.random() * fig.width + "px";
    s.style.top = fig.top + Math.random() * fig.height * 0.7 + stage.scrollTop + "px";
    s.style.animationDelay = (i * 0.06).toFixed(2) + "s";
    stage.append(s);
    setTimeout(() => s.remove(), 1600);
  }
}

// ホームのクイズのカード
function renderQuizCard() {
  if (!$("quiz-card")) return;
  const p = currentCharacter().poses.cheer;
  $("quiz-card-char").innerHTML = `<img src="${p.src}" alt="" width="${p.w}" height="${p.h}">`;
  $("quiz-card-title").textContent = `${charName()}のピラティスクイズ`;
  $("quiz-card-sub").textContent = `今日のクイズコイン ${quizCoinsToday()} / ${COIN_RULES.quizDailyMax}`;
}

$("quiz-card").addEventListener("click", openQuiz);
$("quiz-close").addEventListener("click", closeQuiz);
{
  const base = renderAll;
  renderAll = function () {
    base();
    renderQuizCard();
  };
}
renderQuizCard();
