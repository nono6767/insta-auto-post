// =========================================================
// 5. 服チェック
// お気に入りの服を登録して、着た写真を撮り、前回と見くらべる。
// 毎月1日（その月のチェックがまだなら1日以降も）に N がお知らせ。
// 写真はスマホの中（IndexedDB）にだけ保存。服のリストは localStorage。
// =========================================================

// 写真は見くらべ画面でも縦320pxくらいでしか出ないので、その2倍くらいの大きさで保存する
const PHOTO_MAX_PX = 640;         // 写真の長い辺をこの大きさまで小さくして保存
const PHOTO_JPEG_QUALITY = 0.62;  // JPEG の画質（iPhone はこちら）
const PHOTO_WEBP_QUALITY = 0.6;   // WebP の画質（WebP で保存できるスマホはこちら。さらに軽い）
const PHOTO_SIZE_VERSION = 3;     // 前の設定で保存した写真を小さくし直したかの目印

// ---------- 写真の保存場所（IndexedDB） ----------

const PHOTO_DB_NAME = "n-app-photos";
const LEGACY_PHOTO_DB_NAME = "n-undou-bin-photos"; // 前の保存名（自動で引っ越す）

let photoDbPromise = null;
function photoDb() {
  if (!photoDbPromise) {
    photoDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(PHOTO_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore("photos", { keyPath: "id" });
        store.createIndex("clothId", "clothId");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).then(async (db) => {
      await migrateLegacyPhotos(db).catch((e) => console.warn("写真の引っ越しに失敗", e));
      return db;
    });
  }
  return photoDbPromise;
}

// 前の保存名の写真を、新しい保存名へコピーしてから前のほうを消す
function migrateLegacyPhotos(db) {
  return new Promise((resolve) => {
    const req = indexedDB.open(LEGACY_PHOTO_DB_NAME);
    req.onupgradeneeded = () => req.transaction.abort(); // 前の保存場所がない＝引っ越し不要（作らない）
    req.onerror = () => resolve();
    req.onsuccess = () => {
      const old = req.result;
      if (!old.objectStoreNames.contains("photos")) {
        old.close();
        indexedDB.deleteDatabase(LEGACY_PHOTO_DB_NAME);
        return resolve();
      }
      const get = old.transaction("photos").objectStore("photos").getAll();
      get.onsuccess = () => {
        const photos = get.result || [];
        const tx = db.transaction("photos", "readwrite");
        photos.forEach((p) => tx.objectStore("photos").put(p));
        tx.oncomplete = () => {
          old.close();
          indexedDB.deleteDatabase(LEGACY_PHOTO_DB_NAME);
          resolve();
        };
        tx.onerror = () => { old.close(); resolve(); };
      };
      get.onerror = () => { old.close(); resolve(); };
    };
  });
}
async function photoTx(mode, fn) {
  const db = await photoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const result = fn(tx.objectStore("photos"));
    tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
// iPhone（ホーム画面のアプリ）では、画像（Blob）をそのまま保存できないことがある。
// そのときは文字（dataURL）にして保存する。読むときは、どちらでも Blob にもどす
const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
function dataUrlToBlob(url) {
  const [head, body] = url.split(",");
  const type = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}
const normPhoto = (p) => (p && !p.blob && p.dataUrl ? { ...p, blob: dataUrlToBlob(p.dataUrl) } : p);
async function addPhoto(photo) {
  try {
    await photoTx("readwrite", (s) => s.put(photo));
  } catch (e) {
    console.warn("Blobで保存できなかったので、文字にして保存", e);
    const { blob, ...rest } = photo;
    const dataUrl = await blobToDataUrl(blob);
    await photoTx("readwrite", (s) => s.put({ ...rest, dataUrl }));
  }
}
const deletePhoto = (id) => photoTx("readwrite", (s) => s.delete(id));
const photosOf = async (clothId) =>
  ((await photoTx("readonly", (s) => s.index("clothId").getAll(clothId))) || []).map(normPhoto).sort((a, b) => b.ts - a.ts);
const allPhotos = async () => ((await photoTx("readonly", (s) => s.getAll())) || []).map(normPhoto);
const clearPhotos = () => photoTx("readwrite", (s) => s.clear());
async function deletePhotosOf(clothId) {
  for (const p of await photosOf(clothId)) await deletePhoto(p.id);
}

const canvasToBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

// 写真（ファイルや保存ずみの画像）を読み込む。向きはブラウザが自動で直してくれる
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読めませんでした"));
    };
    img.src = url;
  });
}

// 写真を小さくして、いちばん軽い形式で保存できるようにする
async function shrinkPhoto(blob) {
  const img = await loadImage(blob);
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = await canvasToBlob(canvas, "image/jpeg", PHOTO_JPEG_QUALITY);
  // WebP で保存できるスマホなら WebP も作って、軽いほうを使う（iPhone はたいてい JPEG になる）
  const webp = await canvasToBlob(canvas, "image/webp", PHOTO_WEBP_QUALITY);
  const best = webp && webp.type === "image/webp" && (!jpeg || webp.size < jpeg.size) ? webp : jpeg;
  if (!best) throw new Error("写真を作れませんでした");
  return best;
}

// 前の設定（長い辺1200px）で保存した写真を、今の設定で小さくし直す（1回だけ）
async function reshrinkOldPhotos() {
  if ((data.photoSizeVersion || 1) >= PHOTO_SIZE_VERSION) return 0;
  let changed = 0;
  for (const p of await allPhotos()) {
    try {
      const img = await loadImage(p.blob);
      if (Math.max(img.naturalWidth, img.naturalHeight) <= PHOTO_MAX_PX + 8) continue;
      const smaller = await shrinkPhoto(p.blob);
      if (smaller.size < p.blob.size) {
        const { dataUrl, ...rest } = p;
        await addPhoto({ ...rest, blob: smaller });
        changed++;
      }
    } catch (e) {
      console.warn("写真を小さくし直せませんでした", e);
    }
  }
  data.photoSizeVersion = PHOTO_SIZE_VERSION;
  saveData();
  return changed;
}

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`);

// 表示用のURL（作り直すたびに前のものを片付ける）
let photoUrls = [];
function photoUrl(blob) {
  const url = URL.createObjectURL(blob);
  photoUrls.push(url);
  return url;
}
function releasePhotoUrls() {
  photoUrls.forEach((u) => URL.revokeObjectURL(u));
  photoUrls = [];
}

// ---------- 服のリスト ----------

function clothes() {
  if (!data.clothes) data.clothes = [];
  return data.clothes;
}
const monthKey = (key = dateKey()) => key.slice(0, 7);

// 今月まだ写真を撮っていない服があるか（服チェックが残っているか）
let clothesPhotoMonths = {}; // clothId → 最後に撮った月（描画のたびに更新）
function clothesCheckPending() {
  const list = clothes();
  if (!list.length) return false;
  return list.some((c) => clothesPhotoMonths[c.id] !== monthKey());
}

// ホームのNの吹き出し用（体調のひとことより後ろ）
function clothesBubble() {
  return clothesCheckPending() ? "今月の服チェック、まだだよ〜。服タブで写真を撮ってみよう" : null;
}

function shortDateLong(key) {
  const d = parseKey(key);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

async function renderClothes() {
  releasePhotoUrls();
  const list = $("clothes-list");
  const items = clothes();
  $("clothes-empty").hidden = items.length > 0;

  // 写真がスマホの中でどれくらい場所を使っているか
  const all = await allPhotos();
  const usage = $("photo-usage");
  usage.hidden = all.length === 0;
  usage.textContent = `写真 ${all.length}枚・合計 ${kb(all.reduce((t, p) => t + p.blob.size, 0))}（1枚あたり約${kb(all.reduce((t, p) => t + p.blob.size, 0) / Math.max(1, all.length))}）`;

  const cards = [];
  for (const c of items) {
    const photos = await photosOf(c.id);
    clothesPhotoMonths[c.id] = photos[0] ? monthKey(photos[0].date) : null;

    const card = document.createElement("div");
    card.className = "card cloth-card";
    const thumb = photos[0]
      ? `<img class="cloth-thumb" alt="" src="${photoUrl(photos[0].blob)}">`
      : `<div class="cloth-thumb empty">まだ写真がないよ</div>`;
    card.innerHTML = `
      ${thumb}
      <div class="cloth-info">
        <div class="cloth-head"><h3 class="cloth-name"></h3><button class="fix-btn" type="button">直す</button></div>
        <p class="cloth-meta"></p>
        <div class="cloth-actions">
          <button class="primary-btn small" type="button" data-act="shoot">写真を撮る</button>
          <button class="choice-btn" type="button" data-act="compare">見くらべる</button>
        </div>
      </div>`;
    card.querySelector(".cloth-name").textContent = c.name;
    const done = clothesPhotoMonths[c.id] === monthKey();
    card.querySelector(".cloth-meta").textContent = photos[0]
      ? `前回：${shortDateLong(photos[0].date)}（写真${photos.length}枚）${done ? "・今月チェック済み" : ""}`
      : "写真を撮ってみよう";
    const compareBtn = card.querySelector('[data-act="compare"]');
    compareBtn.disabled = photos.length < 1;
    if (photos.length === 1) compareBtn.textContent = "写真を見る"; // 1枚だけのときも、見る・消すができる
    compareBtn.addEventListener("click", () => openCompare(c, photos));
    card.querySelector('[data-act="shoot"]').addEventListener("click", () => takePhoto(c));
    card.querySelector(".fix-btn").addEventListener("click", () => openClothModal(c));
    cards.push(card);
  }
  list.replaceChildren(...cards);

  // 今月の服チェックのお知らせ
  const banner = $("check-banner");
  const pending = clothesCheckPending();
  banner.hidden = !pending;
  if (pending) {
    const left = items.filter((c) => clothesPhotoMonths[c.id] !== monthKey()).length;
    banner.textContent = `今月の服チェック：あと${left}着。写真を撮るとチェック完了だよ`;
  }
}

// ---------- 写真を撮る ----------

let shootingCloth = null;
function takePhoto(cloth) {
  shootingCloth = cloth;
  const input = $("photo-input");
  input.value = "";
  input.click();
}
$("photo-input").addEventListener("change", async () => {
  const file = $("photo-input").files[0];
  const cloth = shootingCloth;
  shootingCloth = null;
  if (!file || !cloth) return;
  try {
    showToast("写真を保存しているよ…");
    const blob = await shrinkPhoto(file);
    const wasPending = clothesCheckPending();
    await addPhoto({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), clothId: cloth.id, date: dateKey(), ts: Date.now(), blob });
    await renderClothes();
    renderAll();
    if (wasPending && !clothesCheckPending()) showToast("今月の服チェック完了！おつかれさま");
    else showToast("写真を保存したよ");
  } catch (e) {
    console.warn(e);
    showToast(`写真を保存できませんでした（${(e && (e.name || e.message)) || "原因不明"}）`);
  }
});

// ---------- 見くらべる ----------

let comparing = { cloth: null, photos: [] };
function openCompare(cloth, photos) {
  comparing = { cloth, photos };
  $("compare-title").textContent = cloth.name;
  const options = photos.map((p, i) => `<option value="${i}">${shortDateLong(p.date)}${i === 0 ? "（今回）" : i === 1 ? "（前回）" : ""}</option>`).join("");
  $("compare-left").innerHTML = options;
  $("compare-right").innerHTML = options;
  const single = photos.length < 2; // 1枚だけのときは、1枚を大きく（右がわはかくす）
  document.querySelector("#compare-modal .compare").classList.toggle("single", single);
  $("compare-left").value = single ? "0" : "1";   // 左：前回
  $("compare-right").value = "0";  // 右：今回
  showComparePhotos();
  $("compare-modal").hidden = false;
}
function showComparePhotos() {
  for (const side of ["left", "right"]) {
    const p = comparing.photos[Number($("compare-" + side).value)];
    $("compare-" + side + "-img").innerHTML = p ? `<img alt="" src="${photoUrl(p.blob)}">` : "";
    const del = document.querySelector(`.compare-col [data-side="${side}"]`);
    del.classList.remove("armed");
    del.textContent = "この写真を消す";
  }
}
$("compare-left").addEventListener("change", showComparePhotos);
$("compare-right").addEventListener("change", showComparePhotos);
document.querySelectorAll(".compare-col [data-side]").forEach((del) => {
  del.addEventListener("click", async () => {
    if (!del.classList.contains("armed")) {
      del.classList.add("armed");
      del.textContent = "本当に消す";
      return;
    }
    const p = comparing.photos[Number($("compare-" + del.dataset.side).value)];
    if (!p) return;
    await deletePhoto(p.id);
    $("compare-modal").hidden = true;
    await renderClothes();
    renderAll();
    showToast("写真を消したよ", {
      label: "もとに戻す",
      run: async () => {
        await addPhoto(p);
        await renderClothes();
        renderAll();
      },
    });
  });
});
$("compare-close").addEventListener("click", () => {
  $("compare-modal").hidden = true;
});

// ---------- 服の登録・名前の変更・削除 ----------

let editingCloth = null;
function openClothModal(cloth) {
  editingCloth = cloth;
  $("cloth-modal-title").textContent = cloth ? "服の名前を変える" : "服を登録する";
  $("cloth-save").textContent = cloth ? "保存" : "登録する";
  $("cloth-name").value = cloth ? cloth.name : "";
  const del = $("cloth-delete");
  del.hidden = !cloth;
  del.classList.remove("armed");
  del.textContent = "この服を消す";
  $("cloth-modal").hidden = false;
  setTimeout(() => $("cloth-name").focus(), 50);
}
$("add-cloth").addEventListener("click", () => openClothModal(null));
$("cloth-cancel").addEventListener("click", () => {
  $("cloth-modal").hidden = true;
});
$("cloth-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const name = $("cloth-name").value.trim();
  if (!name) return;
  if (editingCloth) {
    editingCloth.name = name;
  } else {
    clothes().push({ id: "c" + Date.now().toString(36), name });
  }
  saveData();
  $("cloth-modal").hidden = true;
  await renderClothes();
  renderAll();
  showToast(editingCloth ? "名前を変えたよ" : "登録したよ！写真を撮ってみよう");
});
$("cloth-delete").addEventListener("click", async () => {
  const del = $("cloth-delete");
  if (!del.classList.contains("armed")) {
    del.classList.add("armed");
    del.textContent = "写真ごと本当に消す";
    return;
  }
  const c = editingCloth;
  data.clothes = clothes().filter((x) => x !== c);
  saveData();
  await deletePhotosOf(c.id);
  delete clothesPhotoMonths[c.id];
  $("cloth-modal").hidden = true;
  await renderClothes();
  renderAll();
  showToast("服を消したよ");
});

// ---------- 毎月1日のお知らせ ----------

function maybeShowMonthlyCheck() {
  const today = dateKey();
  const month = monthKey(today);
  if (!data.weight) return; // 最初の設定がまだのとき
  if (Number(today.slice(8)) !== 1) return; // 1日だけポップアップ（それ以外の日はホームの吹き出しでさりげなく）
  if (data.clothesNoticeMonth === month) return;
  if (clothes().length && !clothesCheckPending()) return;
  data.clothesNoticeMonth = month;
  saveData();
  $("check-text").textContent = clothes().length
    ? "お気に入りの服を着て、写真を撮ってみよう。前回とくらべられるよ。"
    : "お気に入りの服を登録して、着た写真を撮ってみよう。来月くらべられるよ。";
  $("check-n").innerHTML = nCharacterHtml("love");
  $("check-modal").hidden = false;
}
$("check-later").addEventListener("click", () => {
  $("check-modal").hidden = true;
});
$("check-go").addEventListener("click", () => {
  $("check-modal").hidden = true;
  document.querySelector('.tabbar-btn[data-page="clothes"]').click();
});

document.addEventListener("pagechange", (e) => {
  if (e.detail === "clothes") renderClothes();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderClothes().then(() => { renderAll(); maybeShowMonthlyCheck(); });
});
renderClothes().then(async () => {
  renderAll(); // ホームのNの吹き出しに服チェックを反映
  maybeShowMonthlyCheck();
  // 前に撮った写真を軽くし直す（終わったら表示を更新）
  const changed = await reshrinkOldPhotos();
  if (changed > 0) {
    await renderClothes();
    showToast(`前に撮った写真${changed}枚を軽くしたよ`);
  }
});
