#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createQuizServer } from "./quiz-server.js";
import { GameStore } from "./game-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Domains the widget iframe is allowed to connect to (for CSP)
const CONNECT_DOMAINS = (process.env.CONNECT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://claude.com",
  "https://chatgpt.com",
  "https://chat.openai.com",
];

const gameStore = new GameStore();

/** Load the bundled single-file HTML widget */
async function getWidgetHtml(): Promise<string> {
  const htmlPath = join(__dirname, "..", "view", "index.html");
  try {
    return await readFile(htmlPath, "utf-8");
  } catch {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QuizHP</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
.spinner{width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 1rem}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div style="text-align:center"><div class="spinner"></div><p>Quiz widget not built yet. Run <code>npm run build:view</code></p></div></body></html>`;
  }
}

const app = express();
app.use(express.json());

// CORS for MCP clients (Claude.ai, ChatGPT)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // Allow localhost for development
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.header("Access-Control-Expose-Headers", "mcp-session-id");
  next();
});

app.options("/mcp", (_req, res) => {
  res.sendStatus(204);
});

// GET /mcp — Streamable HTTP spec: return 405 for stateless servers
app.get("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method Not Allowed: This server operates in stateless mode" },
    id: null,
  });
});

// DELETE /mcp — session termination (no-op for stateless)
app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method Not Allowed: This server operates in stateless mode" },
    id: null,
  });
});

// Stateless Streamable HTTP endpoint
app.post("/mcp", async (req, res) => {
  try {
    const server = createQuizServer({
      gameStore,
      getWidgetHtml,
      connectDomains: CONNECT_DOMAINS,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", name: "QuizHP MCP Server" });
});

app.listen(PORT, () => {
  console.log(`QuizHP MCP Server listening on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});
