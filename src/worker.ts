/**
 * Cloudflare Worker entry point for QuizHP MCP Server.
 *
 * Uses the shared createQuizServer() factory from quiz-server.ts
 * with Worker-compatible dependencies (no Node.js fs/path).
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createQuizServer } from "./quiz-server.js";
import { GameStore } from "./game-store.js";
import { WIDGET_HTML, WORKER_TEMPLATES } from "./worker-bundle.js";
import type { Template, QuestionType, Platform } from "./types.js";

// ── Module-level state (persists across requests within isolate) ─────

const gameStore = new GameStore();

// ── Worker template lookup ───────────────────────────────────────────

// Group bundled templates by "platform:questionType" key for fast lookup
const templatesByKey = new Map<string, typeof WORKER_TEMPLATES>();
for (const t of WORKER_TEMPLATES) {
  const key = `${t.platform}:${t.questionType}`;
  if (!templatesByKey.has(key)) templatesByKey.set(key, []);
  templatesByKey.get(key)!.push(t);
}

async function getTemplates(types: QuestionType[], platform?: Platform): Promise<Template[]> {
  const resolvedPlatform = platform ?? "web";
  const usedPerKey = new Map<string, Set<number>>();
  const results: Template[] = [];

  for (const qType of types) {
    const key = `${resolvedPlatform}:${qType}`;
    const candidates = templatesByKey.get(key) ?? [];
    if (candidates.length === 0) continue;

    if (!usedPerKey.has(key)) usedPerKey.set(key, new Set());
    const used = usedPerKey.get(key)!;
    if (used.size >= candidates.length) used.clear();

    let idx: number;
    do {
      idx = Math.floor(Math.random() * candidates.length);
    } while (used.has(idx));
    used.add(idx);

    const entry = candidates[idx];
    results.push({
      id: entry.name,
      name: entry.name,
      code: entry.code,
      game_controls: entry.controls as Template["game_controls"],
      game_instructions: entry.instructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      supported_question_type: entry.questionType,
      is_active: true,
      platform: entry.platform as Platform,
    });
  }

  return results;
}

async function getWidgetHtml(): Promise<string> {
  return WIDGET_HTML;
}

// ── CORS helpers ─────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://claude.com",
  "https://chatgpt.com",
  "https://chat.openai.com",
];

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return {}; // No CORS headers — browser will block the request
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, mcp-protocol-version",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };
}

// ── Worker fetch handler ─────────────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json(
        { status: "ok", name: "QuizHP MCP Worker" },
        { headers: corsHeaders(request) }
      );
    }

    // MCP endpoint
    if (url.pathname === "/mcp") {
      if (request.method === "GET" || request.method === "DELETE") {
        return Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32000, message: "Method Not Allowed: stateless mode" },
            id: null,
          },
          { status: 405, headers: corsHeaders(request) }
        );
      }

      if (request.method === "POST") {
        // Enforce body size limit on actual bytes (not just content-length header).
        // Note: Cloudflare has built-in DDoS protection, but this is per-request
        // payload defense — not a substitute for per-IP rate limiting. Configure
        // Cloudflare Rate Limiting Rules in the dashboard for that.
        const MAX_BODY_BYTES = 102_400; // 100 KB
        const body = await request.arrayBuffer();
        if (body.byteLength > MAX_BODY_BYTES) {
          return Response.json(
            {
              jsonrpc: "2.0",
              error: { code: -32000, message: "Request body too large" },
              id: null,
            },
            { status: 413, headers: corsHeaders(request) }
          );
        }
        // Re-create the request with the consumed body so downstream can read it
        const checkedRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body,
        });

        try {
          const server = createQuizServer({
            gameStore,
            getWidgetHtml,
            getTemplates,
            connectDomains: [],
          });

          const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
          });

          await server.connect(transport);

          const response = await transport.handleRequest(checkedRequest);
          const headers = new Headers(response.headers);
          for (const [k, v] of Object.entries(corsHeaders(request))) {
            headers.set(k, v);
          }

          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch (error) {
          console.error("MCP request error:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500, headers: corsHeaders(request) }
          );
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders(request) });
  },
};
