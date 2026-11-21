// =========================================================
// 3. 食事の記録（朝・昼・夜）
// 毎食「腹八分目だった？」とお米の量、1日1回おやつ・つまみ食い。
// どれもワンタップ。同じボタンをもう一度押すと取り消せます。
// =========================================================

const MEALS = [
  { id: "breakfast", name: "朝ごはん" },
  { id: "lunch", name: "昼ごはん" },
  { id: "dinner", name: "夜ごはん" },
];
const HACHI_CHOICES = [
  { value: "yes", label: "腹八分目" },
  { value: "no", label: "食べすぎた" },
];
const RICE_CHOICES = [
  { value: "less", label: "少なめ" },
  { value: "usual", label: "いつも通り" },
  { value: "more", label: "おかわり" },
];
const SNACK_CHOICES = [
  { value: "none", label: "しなかった" },
  { value: "ate", label: "しちゃった" },
];

let mealDay = dateKey();

function dayMeals(key) {
  if (!data.meals) data.meals = {};
  return data.meals[key] || {};
}

function setMeal(key, path, value) {
  if (!data.meals) data.meals = {};
  const day = data.meals[key] || (data.meals[key] = {});
  if (path.length === 1) {
    day[path[0]] = value;
  } else {
    const meal = day[path[0]] || (day[path[0]] = {});
    meal[path[1]] = value;
  }
  saveData();
}

function choiceRow(options, current, onPick, color) {
  const row = document.createElement("div");
  row.className = "choice-row";
  for (const opt of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice-btn" + (current === opt.value ? " on" : "");
    if (color) b.style.setProperty("--on", color);
    b.textContent = opt.label;
    b.setAttribute("aria-pressed", String(current === opt.value));
    b.addEventListener("click", () => onPick(current === opt.value ? null : opt.value));
    row.append(b);
  }
  return row;
}

const NICE_WORDS = {
  hachi_yes: ["いいね、腹八分目！", "からだが軽いね", "ちょうどいいって大事だね"],
  hachi_no: ["そんな日もあるよ〜", "おいしかったならOK！", "次のごはんでととのえよ"],
  snack_none: ["花まる！", "えらい！がまんできたね", "今日はおやつなし、すごい"],
  snack_ate: ["たまにはいいよね", "ちゃんと記録できてえらい"],
};
function nice(kind) {
  const list = NICE_WORDS[kind];
  showToast(list[Math.floor(Math.random() * list.length)]);
}

function renderMeals() {
  const today = dateKey();
  if (mealDay > today) mealDay = today;
  const day = dayMeals(mealDay);

  $("meal-day-title").textContent = dayLabel(mealDay);
  $("meal-next").disabled = mealDay >= today;

  // 週のカレンダー（おやつなしの日に花まる）
  const strip = $("meal-week");
  strip.replaceChildren();
  const start = parseKey(weekStartKey(mealDay));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const snack = dayMeals(key).snack;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "week-cell" + (key === mealDay ? " current" : "") + (key === today ? " today" : "");
    cell.disabled = key > today;
    cell.innerHTML = `<span class="wd">${WEEKDAYS[d.getDay()]}</span><span class="dn">${d.getDate()}</span><span class="mark"></span>`;
    if (snack === "none") cell.querySelector(".mark").innerHTML = hanamaruSvg();
    else if (snack === "ate") cell.querySelector(".mark").innerHTML = `<span class="mark-dot"></span>`;
    cell.addEventListener("click", () => {
      mealDay = key;
      renderMeals();
    });
    strip.append(cell);
  }

  // 朝・昼・夜
  const box = $("meal-cards");
  box.replaceChildren();
  for (const meal of MEALS) {
    const m = day[meal.id] || {};
    const card = document.createElement("div");
    card.className = "card meal-card";
    const title = document.createElement("h3");
    title.className = "meal-title";
    title.textContent = meal.name;

    const q1 = document.createElement("p");
    q1.className = "meal-q";
    q1.textContent = "腹八分目だった？";
    const r1 = choiceRow(HACHI_CHOICES, m.hachi, (v) => {
      setMeal(mealDay, [meal.id, "hachi"], v);
      renderMeals();
      if (v) nice(v === "yes" ? "hachi_yes" : "hachi_no");
    }, "var(--rose)");

    const q2 = document.createElement("p");
    q2.className = "meal-q";
    q2.textContent = "お米";
    const r2 = choiceRow(RICE_CHOICES, m.rice, (v) => {
      setMeal(mealDay, [meal.id, "rice"], v);
      renderMeals();
    }, "#f2b544");

    card.append(title, q1, r1, q2, r2);
    box.append(card);
  }

  // おやつ・つまみ食い
  const snackRow = $("snack-row");
  snackRow.replaceWith(
    Object.assign(
      choiceRow(SNACK_CHOICES, day.snack, (v) => {
        setMeal(mealDay, ["snack"], v);
        renderMeals();
        renderAll(); // ホームと棚の瓶に浮かぶ星の数もすぐ更新
        if (v) nice(v === "none" ? "snack_none" : "snack_ate");
      }, "var(--rose)"),
      { id: "snack-row" }
    )
  );
}

$("meal-prev").addEventListener("click", () => {
  const d = parseKey(mealDay);
  d.setDate(d.getDate() - 1);
  mealDay = dateKey(d);
  renderMeals();
});
$("meal-next").addEventListener("click", () => {
  const d = parseKey(mealDay);
  d.setDate(d.getDate() + 1);
  mealDay = dateKey(d);
  renderMeals();
});

// ごはんタブを開いたら今日を表示
document.addEventListener("pagechange", (e) => {
  if (e.detail === "meals") {
    mealDay = dateKey();
    renderMeals();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderMeals();
});
renderMeals();
