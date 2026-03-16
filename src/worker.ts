/**
 * Cloudflare Worker entry point for QuizHP MCP Server.
 *
 * Uses the MCP SDK's StreamableHTTPServerTransport with Web Standard
 * Request/Response objects (compatible with Cloudflare Workers).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

// ── Inline types (Worker can't use Node fs) ──────────────────────────

interface GameSession {
  gameId: string;
  title: string;
  questions: unknown[];
  createdAt: number;
}

// ── Simple in-memory store (per-isolate) ─────────────────────────────

const sessions = new Map<string, GameSession>();

function createGame(questions: unknown[], title?: string): GameSession {
  const gameId = `g_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const session: GameSession = {
    gameId,
    title: title || "Quiz",
    questions,
    createdAt: Date.now(),
  };
  sessions.set(gameId, session);
  return session;
}

// ── Zod schemas ──────────────────────────────────────────────────────

const choiceSchema = z.object({
  text: z.string().min(1).describe("The choice text"),
  is_correct: z.boolean().describe("Whether this choice is correct"),
  explanation: z.string().describe("Explanation for this choice"),
});

const questionSchema = z
  .object({
    question_type: z
      .enum(["mcq", "true_false"])
      .describe("Type of question"),
    question: z.string().min(1).describe("The question text"),
    choices: z.array(choiceSchema).describe("Array of answer choices"),
  })
  .refine(
    (q) => {
      if (q.question_type === "true_false") {
        return (
          q.choices.length === 2 &&
          q.choices.every((c) => ["true", "false"].includes(c.text.toLowerCase()))
        );
      }
      if (q.question_type === "mcq") {
        return q.choices.length === 4;
      }
      return true;
    },
    {
      message:
        "true_false: 2 choices (true/false), mcq: 4 choices",
    }
  );

// ── CORS helpers ─────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://claude.ai",
  "https://claude.com",
  "https://chatgpt.com",
  "https://chat.openai.com",
];

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };
}

// ── Create MCP server (per-request, stateless) ───────────────────────

function createMcpServer(widgetHtml: string): McpServer {
  const server = new McpServer({
    name: "QuizHP",
    version: "1.0.0",
  });

  registerAppTool(
    server,
    "play-quiz",
    {
      title: "Play Quiz",
      description: `Display an interactive quiz game. Generate well-crafted quiz questions, then call this tool.

Guidelines:
- Generate 5-10 questions per quiz (unless the user specifies a count)
- Mix question types: mostly mcq (4 choices), with some true_false for variety
- Each answer choice text: concise, under 60 characters
- Write clear explanations for every choice (correct and incorrect)
- Exactly one correct answer per question
- Vary difficulty: start easier, get progressively harder
- For document-based quizzes: ground questions in specific document facts
- Avoid "all of the above" or "none of the above" answers

The quiz renders as interactive mini-games (archery, puzzles, switches, etc.) — one unique game per question.`,
      inputSchema: {
        questions: z
          .array(questionSchema)
          .min(1)
          .max(50)
          .describe("Array of quiz questions"),
        title: z
          .string()
          .max(200)
          .optional()
          .describe("Optional title for the quiz"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: {
          resourceUri: "ui://quizhp/quiz-app.html",
          visibility: ["model"] as const,
        },
      },
    },
    async ({ questions, title }) => {
      const session = createGame(questions, title ?? undefined);

      // Note: In the Worker environment, templates must be provided by
      // the client or fetched from an external source since we can't
      // read from the filesystem. Templates are empty here — the client
      // structuredContent will carry them if available.
      return {
        content: [
          {
            type: "text" as const,
            text: `Quiz "${session.title}" with ${questions.length} questions is ready to play!`,
          },
        ],
        structuredContent: {
          gameId: session.gameId,
          questions,
          title: session.title,
          templates: [],
        } as Record<string, unknown>,
      };
    }
  );

  registerAppResource(
    server,
    "Quiz App",
    "ui://quizhp/quiz-app.html",
    {
      description: "Interactive quiz game UI",
      _meta: {
        ui: {
          csp: {
            connectDomains: [],
          },
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: "ui://quizhp/quiz-app.html",
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
        },
      ],
    })
  );

  return server;
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
        try {
          const widgetHtml = `<!DOCTYPE html><html><body><p>QuizHP Worker</p></body></html>`;
          const server = createMcpServer(widgetHtml);

          const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });

          await server.connect(transport);

          const response = await transport.handleRequest(request);
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
