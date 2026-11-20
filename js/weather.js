// =========================================================
// ホームの小さな天気（天気マーク・気温・服装マーク）
// ・天気は Open-Meteo（登録・APIキーいらず）から、選んだ都道府県（県庁所在地）の今の天気を取る
// ・通信を少なくするため、取りに行くのは WEATHER_HOURS 時間に1回だけ。それ以外は保存した結果を出す
// ・取れなかったときは、なにも出さない
// =========================================================

const WEATHER_HOURS = 3;            // 何時間に1回、天気を取りに行くか
const WEATHER_CACHE = "n-app-weather"; // 天気を保存しておく名前（このスマホの中だけ）

// ★ 服装マーク：気温（°C）がこの数字以上なら、この服（上から順に見る）
const CLOTHES_BY_TEMP = [
  { min: 25, icon: "👕", label: "半袖" },
  { min: 18, icon: "👚", label: "長袖" },
  { min: 12, icon: "🧥", label: "うす手" },
  { min: -99, icon: "🧣", label: "コート" },
];

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

function drawWeather(w) {
  const el = $("weather");
  if (!el) return;
  if (!w || typeof w.temp !== "number") {
    el.hidden = true;
    return;
  }
  const t = Math.round(w.temp);
  const c = clothesFor(t);
  el.innerHTML = `<span class="wx-icon">${weatherIcon(w.code, w.isDay)}</span><b>${t}°</b><span class="wx-clothes">${c.icon}${c.label}</span>`;
  el.setAttribute("aria-label", `${w.pref}の今の気温 ${t}度。服は${c.label}`);
  el.hidden = false;
}

let weatherLoading = false;
async function updateWeather(force = false) {
  const pref = weatherPref();
  const cache = readWeatherCache();
  const fresh = cache && cache.pref === pref && Date.now() - cache.ts < WEATHER_HOURS * 3600 * 1000;
  // 前に取った天気があれば、まずそれを出す（古くても、取り直すまでのあいだ）
  drawWeather(cache && cache.pref === pref ? cache : null);
  if ((fresh && !force) || weatherLoading || !navigator.onLine) return;
  weatherLoading = true;
  try {
    const [, lat, lon] = PREFS.find((p) => p[0] === pref);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FTokyo`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("weather " + res.status);
    const j = await res.json();
    const cur = j.current || {};
    if (typeof cur.temperature_2m !== "number") throw new Error("no temp");
    const w = { pref, ts: Date.now(), temp: cur.temperature_2m, code: cur.weather_code, isDay: cur.is_day !== 0 };
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
});
updateWeather();
