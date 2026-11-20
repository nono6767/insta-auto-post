// =========================================================
// ホームの小さな天気（天気マーク・気温・服装マーク）
// ・天気は Open-Meteo（登録・APIキーいらず）から、選んだ都道府県（県庁所在地）の今の天気を取る
// ・通信を少なくするため、取りに行くのは WEATHER_HOURS 時間に1回だけ。それ以外は保存した結果を出す
// ・取れなかったときは、なにも出さない
// ・傘マークは、今日のこれからの時間の降水確率で。夜（21時から）は、明日の天気・最高気温・服・傘
// =========================================================

const WEATHER_HOURS = 3;            // 何時間に1回、天気を取りに行くか
const WEATHER_CACHE = "n-app-weather"; // 天気を保存しておく名前（このスマホの中だけ）

// ★ 服装マーク：気温（°C）がこの数字以上なら、この服（上から順に見る）
//   絵は下の CLOTHES_SVG（コードで描いた小さな服の絵）
const CLOTHES_BY_TEMP = [
  { min: 25, icon: "tee", label: "半袖" },
  { min: 18, icon: "long", label: "長袖" },
  { min: 12, icon: "cardigan", label: "うす手" },
  { min: -99, icon: "coat", label: "コート" },
];
// ★ 傘マーク：これからの降水確率（%）がこの数字以上なら
const UMBRELLA = { big: 50, small: 30 }; // big 以上＝傘 ☂️ ／ small 以上＝折りたたみ傘 🌂 ／ それより下＝なし
const NIGHT_FROM = 21; // この時間からは、明日の天気を出す

// 服の絵（24×24）
const CLOTHES_SVG = {
  // 半袖Tシャツ
  tee: `<path d="M8 3.5 L3 6.5 L5 10.5 L7.5 9.2 V20.5 H16.5 V9.2 L19 10.5 L21 6.5 L16 3.5 C15 5.3 9 5.3 8 3.5 Z" fill="#ffc2d6" stroke="#c9577f" stroke-width="1.2" stroke-linejoin="round"/>`,
  // 長袖シャツ（そでが手首まで）
  long: `<path d="M8 3.5 L4.5 5.5 L2.5 18.5 L5.3 19 L7.5 10.5 V20.5 H16.5 V10.5 L18.7 19 L21.5 18.5 L19.5 5.5 L16 3.5 C15 5.3 9 5.3 8 3.5 Z" fill="#d9c8f5" stroke="#7d5fb5" stroke-width="1.2" stroke-linejoin="round"/>`,
  // うす手の上着（前あきのカーディガン）
  cardigan: `<path d="M8.5 3.5 L4.5 5.5 L2.5 18.5 L5.3 19 L7.5 10.5 V20.5 H16.5 V10.5 L18.7 19 L21.5 18.5 L19.5 5.5 L15.5 3.5 L12 10 Z" fill="#bfe3d4" stroke="#3f8c70" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 10 V20.5" stroke="#3f8c70" stroke-width="1.1"/><circle cx="13.3" cy="13" r=".9" fill="#3f8c70"/><circle cx="13.3" cy="16.5" r=".9" fill="#3f8c70"/>`,
  // コート（長め・えり・ベルト）
  coat: `<path d="M8.5 2.5 L4.5 4.5 L2.5 17.5 L5.3 18 L7 10 L6.5 22 H17.5 L17 10 L18.7 18 L21.5 17.5 L19.5 4.5 L15.5 2.5 L12 8 Z" fill="#e9c9a3" stroke="#9a6a3a" stroke-width="1.2" stroke-linejoin="round"/><path d="M8.5 2.5 L10.5 7 L12 8 L13.5 7 L15.5 2.5" fill="none" stroke="#9a6a3a" stroke-width="1.1"/><path d="M12 8 V22" stroke="#9a6a3a" stroke-width="1.1"/><path d="M6.9 14 H17.1" stroke="#9a6a3a" stroke-width="1.8"/>`,
};
const clothesSvg = (k) => `<svg class="wx-svg" viewBox="0 0 24 24" aria-hidden="true">${CLOTHES_SVG[k]}</svg>`;

// 都道府県（県庁所在地の緯度・経度）
const PREFS = [
  ["北海道", 43.06, 141.35], ["青森", 40.82, 140.74], ["岩手", 39.70, 141.15], ["宮城", 38.27, 140.87], ["秋田", 39.72, 140.10],
  ["山形", 38.24, 140.36], ["福島", 37.75, 140.47], ["茨城", 36.34, 140.45], ["栃木", 36.57, 139.88], ["群馬", 36.39, 139.06],
  ["埼玉", 35.86, 139.65], ["千葉", 35.61, 140.12], ["東京", 35.69, 139.69], ["神奈川", 35.45, 139.64], ["新潟", 37.90, 139.02],
  ["富山", 36.70, 137.21], ["石川", 36.59, 136.63], ["福井", 36.07, 136.22], ["山梨", 35.66, 138.57], ["長野", 36.65, 138.18],
  ["岐阜", 35.39, 136.72], ["静岡", 34.98, 138.38], ["愛知", 35.18, 136.91], ["三重", 34.73, 136.51], ["滋賀", 35.00, 135.87],
  ["京都", 35.02, 135.76], ["大阪", 34.69, 135.52], ["兵庫", 34.69, 135.18], ["奈良", 34.69, 135.83], ["和歌山", 34.23, 135.17],
  ["鳥取", 35.50, 134.24], ["島根", 35.47, 133.05], ["岡山", 34.66, 133.93], ["広島", 34.40, 132.46], ["山口", 34.19, 131.47],
  ["徳島", 34.07, 134.56], ["香川", 34.34, 134.04], ["愛媛", 33.84, 132.77], ["高知", 33.56, 133.53], ["福岡", 33.61, 130.42],
  ["佐賀", 33.25, 130.30], ["長崎", 32.74, 129.87], ["熊本", 32.79, 130.74], ["大分", 33.24, 131.61], ["宮崎", 31.91, 131.42],
  ["鹿児島", 31.56, 130.56], ["沖縄", 26.21, 127.68],
];
const DEFAULT_PREF = "東京";
const weatherPref = () => (PREFS.some((p) => p[0] === data.weatherPref) ? data.weatherPref : DEFAULT_PREF);

// 天気コード（WMO）→ マーク
function weatherIcon(code, isDay) {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 2) return isDay ? "🌤️" : "🌙";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}
const clothesFor = (t) => CLOTHES_BY_TEMP.find((c) => t >= c.min) || CLOTHES_BY_TEMP[CLOTHES_BY_TEMP.length - 1];

function readWeatherCache() {
  try {
    return JSON.parse(localStorage.getItem(WEATHER_CACHE) || "null");
  } catch (e) {
    return null;
  }
}

// 降水確率 → 傘マーク（なければ空）
const umbrellaFor = (p) => (p >= UMBRELLA.big ? { icon: "☂️", label: "傘" } : p >= UMBRELLA.small ? { icon: "🌂", label: "折りたたみ傘" } : null);
const hourKey = (d) => `${dateKey(d)}T${String(d.getHours()).padStart(2, "0")}:00`;

function drawWeather(w) {
  const el = $("weather");
  if (!el) return;
  if (!w || typeof w.temp !== "number") {
    el.hidden = true;
    return;
  }
  const now = new Date();
  const tomorrow = now.getHours() >= NIGHT_FROM && w.daily && w.daily.time && w.daily.time.length > 1;
  let t, code, isDay, rain;
  if (tomorrow) {
    // 夜は、明日の天気（マーク・最高気温・服・傘）
    const i = w.daily.time.indexOf(addDaysKey(dateKey(), 1));
    const k = i >= 0 ? i : 1;
    t = Math.round(w.daily.tmax[k]);
    code = w.daily.code[k];
    isDay = true;
    rain = w.daily.pmax[k] ?? 0;
  } else {
    // 今の天気と気温。傘は、今日のこれからの時間の降水確率（いちばん高いところ）
    t = Math.round(w.temp);
    code = w.code;
    isDay = w.isDay;
    const today = dateKey(), from = hourKey(now);
    rain = 0;
    (w.hourly?.time || []).forEach((h, i) => {
      if (h >= from && h.startsWith(today)) rain = Math.max(rain, w.hourly.prob[i] ?? 0);
    });
  }
  const c = clothesFor(t);
  const u = umbrellaFor(rain);
  el.innerHTML =
    (tomorrow ? `<span class="wx-tomorrow">明日</span>` : "") +
    `<span class="wx-icon">${weatherIcon(code, isDay)}</span><b>${t}°</b>` +
    `<span class="wx-clothes">${clothesSvg(c.icon)}${c.label}</span>` +
    (u ? `<span class="wx-umbrella">${u.icon}</span>` : "");
  el.setAttribute("aria-label", `${w.pref}の${tomorrow ? "明日の最高" : "今の"}気温 ${t}度。服は${c.label}${u ? `。${u.label}があると安心` : ""}`);
  el.hidden = false;
}

let weatherLoading = false;
async function updateWeather(force = false) {
  const pref = weatherPref();
  const cache = readWeatherCache();
  // 前の版で保存した天気（傘・明日のデータがない）は、1回だけ取り直す
  const fresh = cache && cache.pref === pref && cache.daily && Date.now() - cache.ts < WEATHER_HOURS * 3600 * 1000;
  // 前に取った天気があれば、まずそれを出す（古くても、取り直すまでのあいだ）
  drawWeather(cache && cache.pref === pref ? cache : null);
  if ((fresh && !force) || weatherLoading || !navigator.onLine) return;
  weatherLoading = true;
  try {
    const [, lat, lon] = PREFS.find((p) => p[0] === pref);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&hourly=precipitation_probability&daily=weather_code,temperature_2m_max,precipitation_probability_max&forecast_days=2&timezone=Asia%2FTokyo`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("weather " + res.status);
    const j = await res.json();
    const cur = j.current || {};
    if (typeof cur.temperature_2m !== "number") throw new Error("no temp");
    // 今の天気・今日と明日の1時間ごとの降水確率・明日の天気（1回の通信でまとめて取る）
    const d = j.daily || {};
    const w = {
      pref, ts: Date.now(), temp: cur.temperature_2m, code: cur.weather_code, isDay: cur.is_day !== 0,
      hourly: { time: j.hourly?.time || [], prob: j.hourly?.precipitation_probability || [] },
      daily: { time: d.time || [], code: d.weather_code || [], tmax: d.temperature_2m_max || [], pmax: d.precipitation_probability_max || [] },
    };
    try {
      localStorage.setItem(WEATHER_CACHE, JSON.stringify(w));
    } catch (e) {}
    drawWeather(w);
  } catch (e) {
    // 取れなかったときは、なにもしない（保存した天気がなければ、表示は出さない）
  } finally {
    weatherLoading = false;
  }
}

// ---------- 設定：天気の地域 ----------
function openWeatherPref() {
  const sel = $("weather-pref-select");
  sel.replaceChildren(...PREFS.map(([name]) => new Option(name, name, false, name === weatherPref())));
  $("weather-modal").hidden = false;
}
$("settings-weather").addEventListener("click", () => {
  $("settings-modal").hidden = true;
  openWeatherPref();
});
$("weather-cancel").addEventListener("click", () => ($("weather-modal").hidden = true));
$("weather-save").addEventListener("click", () => {
  data.weatherPref = $("weather-pref-select").value;
  saveData();
  $("weather-modal").hidden = true;
  updateWeather(true);
  showToast(`天気の地域を${data.weatherPref}にしたよ`);
});
$("settings-btn").addEventListener("click", () => {
  $("settings-weather-sub").textContent = `いまは ${weatherPref()}`;
});

// アプリを開いたとき・戻ってきたときに（数時間に1回だけ取りに行く）
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateWeather();
setInterval(() => drawWeather(readWeatherCache()?.pref === weatherPref() ? readWeatherCache() : null), 10 * 60 * 1000); // 21時になったら明日の表示に（通信はしない）
});
updateWeather();
setInterval(() => drawWeather(readWeatherCache()?.pref === weatherPref() ? readWeatherCache() : null), 10 * 60 * 1000); // 21時になったら明日の表示に（通信はしない）
