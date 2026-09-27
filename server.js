import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const SAVED_FILE = path.join(DATA_DIR, "saved.json");
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

// APIキーが無い場合はダミーの案を返す「お試しモード」で動かす
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const CaptionSchema = z.object({
  style: z.string(),
  text: z.string(),
  hashtags: z.array(z.string()),
});

// 深めトーン1案＋軽めトーン2案を構造で固定し、深めトーンが必ず含まれるようにする
const CaptionsSchema = z.object({
  deep: CaptionSchema,
  light: z.array(CaptionSchema).length(2),
});

const DEEP_STYLE_LABEL = "深めトーン";

const SYSTEM_PROMPT = `あなたはピラティスインストラクターのInstagramアカウントの投稿文を書く、日本語のコピーライターです。
ユーザーが入力した「今日の投稿テーマ・素材メモ」をもとに、Instagram投稿用のキャプション案を3つ作ります。
その日の気分で選べるよう、deep に「深めトーン」の案を1つ、light に軽めトーンの案を2つ入れてください。

## deep：深めトーン（以下のスタイルガイドに沿う）

### 書き方の型（この順番で構成する）
1. 日常のあるある（スマホ、姿勢、生活習慣など、読者が身に覚えのある場面）
2. それによって体で実際に起きていること（専門知識に基づく、でも難しい専門用語は使わない）
3. ピラティス的な視点の転換（「実はこう捉えると変わる」という一言）
4. 具体的な身体感覚の描写（「〜な感じ」という、実際にやってみたくなる表現）
5. 短い呼びかけで締める（断定せず、読者に委ねる終わり方）

### トーンのルール
- 「〜が大切です」「〜しましょう」のような教える口調・当たり前を言う口調は使わない
- 「〜なんです」より「〜だなって思った」のような、気づきベースの語り口にする
- 抽象的な話だけで終わらせず、必ず具体的な身体感覚とセットにする
- 全体は短め（3〜5文程度）でもよく、5要素を全部無理に入れなくてよい
- 絵文字は使わないか、ごく控えめにする

## light：軽めトーン（2案）
- 2案はそれぞれトーンを変える（例：親しみやすい／情報しっかり／短くエモーショナル）
- 改行や絵文字を適度に使い、気軽に読めるようにする

## 3案共通
- style にはその案のトーンを10文字程度で書く（deep の style は「${DEEP_STYLE_LABEL}」とする）
- text は本文のみ（ハッシュタグは含めない）。スマホで読みやすいよう適度に改行する
- hashtags には「#」付きのハッシュタグを5〜10個入れる
- メモに無い事実（価格・日付・店名など）は作らない`;

async function generateCaptions(theme) {
  if (!client) return mockCaptions(theme);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(CaptionsSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `今日の投稿テーマ・素材メモ:\n${theme}` }],
  });

  if (response.stop_reason === "refusal") {
    throw new HttpError(422, "この内容ではキャプションを生成できませんでした。テーマを変えてお試しください。");
  }
  if (!response.parsed_output) {
    throw new HttpError(502, "AIの応答を読み取れませんでした。もう一度お試しください。");
  }
  const { deep, light } = response.parsed_output;
  return [{ ...deep, style: DEEP_STYLE_LABEL }, ...light];
}

function mockCaptions(theme) {
  const short = theme.split("\n")[0].slice(0, 40);
  return [
    {
      style: DEEP_STYLE_LABEL,
      text: `スマホを見てると、気づいたら首が前に出てる。\n頭の重さを首の後ろだけで支えてるから、夕方には肩までガチガチになるんだなって思った。\n首を「伸ばす」より、頭のてっぺんが糸でふわっと吊られる感じにすると、肩がすっと下りていく。\n「${short}」の日、ちょっと試してみる？`,
      hashtags: ["#ピラティス", "#姿勢改善", "#スマホ首", "#からだの使い方"],
    },
    {
      style: "親しみやすい",
      text: `今日は「${short}」の話☺️\nちょっとした発見があったのでシェアします！\nみなさんはどう思いますか？コメントで教えてね👇`,
      hashtags: ["#今日のひとこま", "#日常", "#instagood"],
    },
    {
      style: "情報しっかり",
      text: `【${short}】\n\n✔️ ポイント1\n✔️ ポイント2\n✔️ ポイント3\n\n保存してあとで見返してください📌`,
      hashtags: ["#まとめ", "#保存推奨", "#暮らしのヒント"],
    },
  ];
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadSaved() {
  try {
    return JSON.parse(await readFile(SAVED_FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeSaved(items) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SAVED_FILE, JSON.stringify(items, null, 2));
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw new HttpError(413, "入力が長すぎます。");
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new HttpError(400, "リクエストの形式が正しくありません。");
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

async function serveStatic(req, res) {
  const urlPath = new URL(req.url, "http://localhost").pathname;
  const filePath = path.join(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 404, { error: "Not found" });
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/status" && req.method === "GET") {
    return sendJson(res, 200, { mock: !client });
  }

  if (pathname === "/api/generate" && req.method === "POST") {
    const { theme } = await readJsonBody(req);
    if (typeof theme !== "string" || !theme.trim()) {
      throw new HttpError(400, "投稿テーマを入力してください。");
    }
    const captions = await generateCaptions(theme.trim());
    return sendJson(res, 200, { captions, mock: !client });
  }

  if (pathname === "/api/saved" && req.method === "GET") {
    const items = await loadSaved();
    return sendJson(res, 200, { items });
  }

  if (pathname === "/api/saved" && req.method === "POST") {
    const { theme, style, text, hashtags } = await readJsonBody(req);
    if (typeof text !== "string" || !text.trim()) {
      throw new HttpError(400, "保存する投稿文がありません。");
    }
    const item = {
      id: randomUUID(),
      theme: String(theme ?? ""),
      style: String(style ?? ""),
      text,
      hashtags: Array.isArray(hashtags) ? hashtags.map(String) : [],
      savedAt: new Date().toISOString(),
    };
    const items = await loadSaved();
    items.unshift(item);
    await writeSaved(items);
    return sendJson(res, 201, { item });
  }

  const deleteMatch = pathname.match(/^\/api\/saved\/([\w-]+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const items = await loadSaved();
    await writeSaved(items.filter((i) => i.id !== deleteMatch[1]));
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(404, "Not found");
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if (pathname.startsWith("/api/")) return await handleApi(req, res, pathname);
    return await serveStatic(req, res);
  } catch (err) {
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
    if (err instanceof Anthropic.AuthenticationError) {
      return sendJson(res, 500, { error: "APIキーが正しくありません。.env の ANTHROPIC_API_KEY を確認してください。" });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return sendJson(res, 429, { error: "混み合っています。少し待ってからもう一度お試しください。" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(err);
      return sendJson(res, 502, { error: "AIの呼び出しに失敗しました。時間をおいてお試しください。" });
    }
    console.error(err);
    sendJson(res, 500, { error: "サーバーでエラーが発生しました。" });
  }
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT} で起動しました${client ? "" : "（APIキー未設定：お試しモード）"}`);
});
