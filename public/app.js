const $ = (sel) => document.querySelector(sel);

const state = { theme: "", savedCount: 0 };

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "通信に失敗しました。");
  return data;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (toast.hidden = true), 1800);
}

function showError(message) {
  const el = $("#error");
  el.textContent = message || "";
  el.hidden = !message;
}

function setSavedCount(n) {
  state.savedCount = n;
  const badge = $("#saved-count");
  badge.textContent = n;
  badge.hidden = n === 0;
}

// ---- タブ切り替え ----
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.view;
    document.querySelectorAll(".tab").forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active);
    });
    $("#view-create").hidden = view !== "create";
    $("#view-saved").hidden = view !== "saved";
    if (view === "saved") loadSaved();
  });
});

// ---- ① テーマ入力 → ② 3案生成 ----
$("#theme-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const theme = $("#theme").value.trim();
  if (!theme) return;

  const btn = $("#generate-btn");
  btn.disabled = true;
  btn.textContent = "AIが考え中…";
  showError("");

  try {
    const { captions } = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ theme }),
    });
    state.theme = theme;
    renderCaptions(captions);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "キャプションを3案つくる";
  }
});

function renderCaptions(captions) {
  const list = $("#caption-list");
  list.innerHTML = "";
  const tpl = $("#caption-tpl");

  captions.forEach((c, i) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".caption-label").textContent = `案${i + 1}`;
    node.querySelector(".caption-style").textContent = c.style;
    node.querySelector(".caption-text").value = c.text;
    node.querySelector(".caption-tags").textContent = c.hashtags.join(" ");

    // ③ 選んだ案を保存
    const saveBtn = node.querySelector(".save-btn");
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      try {
        await api("/api/saved", {
          method: "POST",
          body: JSON.stringify({
            theme: state.theme,
            style: c.style,
            text: node.querySelector(".caption-text").value,
            hashtags: c.hashtags,
          }),
        });
        saveBtn.textContent = "保存しました ✓";
        saveBtn.classList.add("is-saved");
        setSavedCount(state.savedCount + 1);
        showToast("保存しました");
      } catch (err) {
        saveBtn.disabled = false;
        showToast(err.message);
      }
    });

    list.appendChild(node);
  });

  $("#results").hidden = false;
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- 保存済み一覧 ----
async function loadSaved() {
  try {
    const { items } = await api("/api/saved");
    renderSaved(items);
  } catch (err) {
    showToast(err.message);
  }
}

function renderSaved(items) {
  const list = $("#saved-list");
  list.innerHTML = "";
  setSavedCount(items.length);
  $("#saved-empty").hidden = items.length > 0;
  const tpl = $("#saved-tpl");

  items.forEach((item) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".saved-date").textContent = new Date(item.savedAt).toLocaleString("ja-JP", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const style = node.querySelector(".caption-style");
    style.textContent = item.style;
    style.hidden = !item.style;
    node.querySelector(".saved-theme").textContent = item.theme ? `テーマ：${item.theme}` : "";
    node.querySelector(".saved-text").textContent = item.text;
    node.querySelector(".caption-tags").textContent = item.hashtags.join(" ");

    node.querySelector(".copy-btn").addEventListener("click", async () => {
      const full = [item.text, item.hashtags.join(" ")].filter(Boolean).join("\n\n");
      try {
        await navigator.clipboard.writeText(full);
        showToast("コピーしました");
      } catch {
        showToast("コピーできませんでした");
      }
    });

    node.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm("この投稿文を削除しますか？")) return;
      await api(`/api/saved/${item.id}`, { method: "DELETE" });
      loadSaved();
    });

    list.appendChild(node);
  });
}

// ---- 初期化 ----
api("/api/status").then(({ mock }) => ($("#mock-notice").hidden = !mock)).catch(() => {});
api("/api/saved").then(({ items }) => setSavedCount(items.length)).catch(() => {});
