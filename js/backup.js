// =========================================================
// 設定とバックアップ
// 「バックアップを保存」：記録と服の写真を全部、1つのファイルにする
// 「バックアップから戻す」：そのファイルを選ぶと記録が元に戻る
// 最後のバックアップから2週間たったら、N がやさしくお知らせ
// =========================================================

const BACKUP_APP_ID = "n-app";           // このアプリのバックアップだという目印
const BACKUP_FORMAT_VERSION = 1;
const BACKUP_REMIND_DAYS = 14;

// ---------- お知らせ ----------

// 最後のバックアップ（まだなら使い始めた日）から何日たったか
function daysSinceBackup() {
  const from = data.lastBackupAt || data.createdAt || Date.now();
  return Math.floor((Date.now() - from) / 86400000);
}
function backupDue() {
  return !!data.weight && daysSinceBackup() >= BACKUP_REMIND_DAYS;
}
// ホームのNの吹き出し用
function backupBubble() {
  if (!backupDue()) return null;
  return data.lastBackupAt
    ? "そろそろバックアップしよう〜。右上の歯車からできるよ"
    : "記録がたまってきたね。右上の歯車からバックアップしておこう";
}

function formatDateTime(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---------- 設定画面 ----------

function openSettings() {
  $("backup-last").textContent = data.lastBackupAt
    ? `前回：${formatDateTime(data.lastBackupAt)}（${daysSinceBackup()}日前）`
    : "まだバックアップしていないよ";
  $("backup-save").classList.toggle("due", backupDue());
  $("app-version").textContent = `アプリの版：${APP_VERSION}`;
  $("settings-character-sub").textContent = `いまは ${charName()}（${currentCharacter().desc}）`;
  $("settings-modal").hidden = false;
}
const closeSettings = () => {
  $("settings-modal").hidden = true;
};
$("settings-btn").addEventListener("click", openSettings);
$("settings-close").addEventListener("click", closeSettings);
$("settings-weight").addEventListener("click", () => {
  closeSettings();
  openWeightModal(false);
});

// ---------- キャラクターを選ぶ ----------
function openCharacterPicker() {
  const box = $("char-choices");
  box.replaceChildren();
  const now = data.character || "n";
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const p = c.poses.guts;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "char-choice";
    b.setAttribute("aria-pressed", String(id === now));
    b.innerHTML = `<img src="${p.src}" alt="" width="${p.w}" height="${p.h}"><b>${c.name}</b><small>${c.desc}</small>`;
    b.addEventListener("click", () => {
      data.character = id;
      saveData();
      $("character-modal").hidden = true;
      renderAll();
      showToast(`キャラクターを ${c.name} にしたよ`);
    });
    box.append(b);
  }
  $("character-modal").hidden = false;
}
$("settings-character").addEventListener("click", () => {
  closeSettings();
  openCharacterPicker();
});
$("character-close").addEventListener("click", () => ($("character-modal").hidden = true));

// ---------- バックアップを保存 ----------

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function makeBackup() {
  const photos = [];
  for (const p of await allPhotos()) {
    photos.push({ id: p.id, clothId: p.clothId, date: p.date, ts: p.ts, type: p.blob.type || "image/jpeg", base64: await blobToBase64(p.blob) });
  }
  const exportedAt = Date.now();
  const snapshot = { ...data, lastBackupAt: exportedAt };
  return {
    file: {
      app: BACKUP_APP_ID,
      format: BACKUP_FORMAT_VERSION,
      exportedAt,
      appVersion: APP_VERSION,
      data: snapshot,
      photos,
    },
    exportedAt,
  };
}

// ファイルを渡す：iPhone などは共有シート（「"ファイル"に保存」など）、それ以外はダウンロード
async function deliverFile(blob, filename) {
  const file = new File([blob], filename, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Kのうんどう瓶 バックアップ" });
      return true;
    } catch (e) {
      if (e && e.name === "AbortError") return false; // 共有をやめた
      // 共有できないときはダウンロードにする
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

$("backup-save").addEventListener("click", async () => {
  const btn = $("backup-save");
  btn.disabled = true;
  try {
    const { file, exportedAt } = await makeBackup();
    const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
    const name = `n-app-backup-${dateKey()}.json`;
    const done = await deliverFile(blob, name);
    if (!done) {
      showToast("バックアップをやめたよ");
      return;
    }
    data.lastBackupAt = exportedAt;
    saveData();
    renderAll();
    closeSettings();
    showToast(`バックアップしたよ（${Math.max(1, Math.round(blob.size / 1024))}KB）`);
  } catch (e) {
    console.warn(e);
    showToast("バックアップを作れませんでした");
  } finally {
    btn.disabled = false;
  }
});

// ---------- バックアップから戻す ----------

let pendingRestore = null;

function pickRestoreFile() {
  const input = $("restore-input");
  input.value = "";
  input.click();
}
$("backup-restore").addEventListener("click", pickRestoreFile);
$("weight-restore").addEventListener("click", pickRestoreFile);

function checkBackup(obj) {
  if (!obj || obj.app !== BACKUP_APP_ID) return "このアプリのバックアップファイルではないみたい";
  if (obj.format > BACKUP_FORMAT_VERSION) return "新しい版のアプリで作ったファイルです。アプリを開き直してからもう一度試してね";
  if (!obj.data || !Array.isArray(obj.data.logs)) return "ファイルの中身が読めませんでした";
  if (obj.photos && !Array.isArray(obj.photos)) return "ファイルの中身が読めませんでした";
  return null;
}

$("restore-input").addEventListener("change", async () => {
  const f = $("restore-input").files[0];
  if (!f) return;
  let obj;
  try {
    obj = JSON.parse(await f.text());
  } catch {
    showToast("ファイルが読めませんでした");
    return;
  }
  const problem = checkBackup(obj);
  if (problem) {
    showToast(problem);
    return;
  }
  pendingRestore = obj;
  const d = obj.data;
  const parts = [
    `${formatDateTime(obj.exportedAt)} に保存`,
    `運動 ${d.logs.length}件`,
    `ごはん ${Object.keys(d.meals || {}).length}日分`,
    `からだ ${Object.keys(d.body || {}).length}日分・生理 ${(d.periods || []).length}回`,
    `服 ${(d.clothes || []).length}着・写真 ${(obj.photos || []).length}枚`,
    `大瓶 ${(d.bigBottles || []).length}本`,
    `貯金 ${((d.savings && d.savings.deposits) || []).length}回分`,
  ];
  $("restore-summary").textContent = parts.join("／");
  $("settings-modal").hidden = true;
  $("restore-modal").hidden = false;
});

$("restore-cancel").addEventListener("click", () => {
  pendingRestore = null;
  $("restore-modal").hidden = true;
});

$("restore-go").addEventListener("click", async () => {
  const obj = pendingRestore;
  if (!obj) return;
  const btn = $("restore-go");
  btn.disabled = true;
  try {
    // 写真を先に入れかえて、うまくいったら記録を入れかえる
    await clearPhotos();
    for (const p of obj.photos || []) {
      await addPhoto({ id: p.id, clothId: p.clothId, date: p.date, ts: p.ts, blob: base64ToBlob(p.base64, p.type || "image/jpeg") });
    }
    const restored = { ...emptyData(), ...obj.data };
    if (!obj.data.bottleSystem) delete restored.bottleSystem; // 前のしくみのバックアップなら、開き直したときに大瓶へ引っ越す
    if (!restored.lastBackupAt) restored.lastBackupAt = obj.exportedAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    data = restored;
    $("restore-modal").hidden = true;
    $("weight-modal").hidden = true;
    showToast("記録を元に戻したよ！");
    setTimeout(() => location.reload(), 900); // 画面ぜんぶを新しい記録で表示し直す
  } catch (e) {
    console.warn(e);
    btn.disabled = false;
    showToast("元に戻せませんでした。ファイルを確かめてね");
  }
});

renderAll(); // ホームのNの吹き出しと歯車の点にお知らせを反映
