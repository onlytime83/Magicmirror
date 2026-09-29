import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const port = Number(process.env.PORT || 8080);
const root = resolve(".");
const publicFiles = new Set(["index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg"]);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/manifest+json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const personas = {
  moon: "温柔、安静，像月光一样陪伴对方。",
  queen: "坚定、自信，鼓励对方看见自己的力量。",
  flower: "细腻、浪漫，善于用花与成长的意象回应。",
  fate: "带一点神秘感，但不声称能预言未来。",
  sun: "明亮、积极，同时认真倾听对方的感受。",
};

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_000) throw new Error("消息太长，请缩短后再发送。");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleChat(request, response) {
  if (!process.env.AI_API_KEY) {
    sendJson(response, 503, { error: "对话模型尚未配置。请在服务端设置 AI_API_KEY 后重启服务。" });
    return;
  }

  try {
    const payload = await readJson(request);
    if (!Array.isArray(payload.messages)) {
      sendJson(response, 400, { error: "对话内容格式不正确。" });
      return;
    }
    const messages = payload.messages.slice(-16).map(message => {
      if (!["user", "assistant"].includes(message.role) || typeof message.content !== "string") {
        throw new Error("对话内容格式不正确。");
      }
      return { role: message.role, content: message.content.slice(0, 2000) };
    });
    if (!messages.length || messages.at(-1).role !== "user") {
      sendJson(response, 400, { error: "请先发送一条消息。" });
      return;
    }

    const persona = personas[payload.persona] ? payload.persona : "moon";
    const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: `你是“魔镜魔镜”的中文陪伴助手。${personas[persona]}温暖、真诚、简洁地回应，不评判外貌，不假装看到了摄像头画面，不提供医疗或危险建议。` },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const result = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      console.error("Model API returned", upstream.status, result?.error?.message || "unknown error");
      sendJson(response, 502, { error: "模型服务暂时不可用，请检查服务端模型配置。" });
      return;
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      sendJson(response, 502, { error: "模型暂时没有返回内容，请再试一次。" });
      return;
    }
    sendJson(response, 200, { reply: reply.trim() });
  } catch (error) {
    const status = error.name === "TimeoutError" ? 504 : error instanceof SyntaxError ? 400 : 400;
    sendJson(response, status, { error: error.message || "请求失败，请稍后重试。" });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/api/chat" && request.method === "POST") {
    await handleChat(request, response);
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "接口不存在。" });
    return;
  }
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filename = requested.slice(1);
  if (!publicFiles.has(filename)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const filepath = resolve(root, filename);
  response.writeHead(200, { "Content-Type": mimeTypes[extname(filepath)] || "application/octet-stream" });
  createReadStream(filepath).pipe(response);
});

server.listen(port, "0.0.0.0", () => console.log(`Magic Mirror listening on http://localhost:${port}`));