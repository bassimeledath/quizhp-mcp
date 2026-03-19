import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { GameStore } from "./game-store.js";
import type { Template, QuestionType, Platform } from "./types.js";

const choiceSchema = z.object({
  text: z.string().min(1).describe("The choice text"),
  is_correct: z.boolean().describe("Whether this choice is correct"),
  explanation: z.string().describe("Explanation for this choice"),
});

const questionSchema = z
  .object({
    question_type: z
      .enum(["mcq", "true_false"])
      .describe("Type of question: 'mcq' for multiple choice (4 options) or 'true_false' for true/false (2 options)"),
    question: z.string().min(1).describe("The question text"),
    choices: z.array(choiceSchema).min(2).max(6).describe("Array of answer choices"),
  })
  .refine(
    (q) =>
      q.question_type === "true_false"
        ? q.choices.length === 2 &&
          q.choices.some((c) => c.text.toLowerCase() === "true") &&
          q.choices.some((c) => c.text.toLowerCase() === "false")
        : q.choices.length === 4,
    {
      message:
        "true_false questions must have exactly 2 choices with text 'true' or 'false', mcq questions must have exactly 4 choices",
    }
  )
  .refine(
    (q) => q.choices.filter((c) => c.is_correct).length === 1,
    {
      message: "Each question must have exactly one correct answer",
    }
  );

export interface QuizServerConfig {
  gameStore: GameStore;
  getWidgetHtml: () => Promise<string>;
  getTemplates: (types: QuestionType[], platform?: Platform) => Promise<Template[]>;
  /** Domains the widget iframe is allowed to connect to (for CSP) */
  connectDomains?: string[];
}

function log(message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.error(`[quizhp-server ${ts}] ${message}`, JSON.stringify(data));
  } else {
    console.error(`[quizhp-server ${ts}] ${message}`);
  }
}

export function createQuizServer(config: QuizServerConfig): McpServer {
  const server = new McpServer({
    name: "QuizHP",
    version: "1.0.0",
  });

  const { gameStore } = config;

  // ── play-quiz tool (model-visible, read-only) ──────────────────────
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
        idempotentHint: false,
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
      // Auto-fix questions: ensure exactly one correct answer per question.
      // Validation moved here from the Zod schema because hard schema rejections
      // cause Claude Desktop to hang (MCP App error responses leave the UI in loading state).
      for (const q of questions as Array<{ choices: Array<{ is_correct: boolean }> }>) {
        const correctCount = q.choices.filter((c) => c.is_correct).length;
        if (correctCount === 0) {
          q.choices[0].is_correct = true;
          log("Auto-fix: no correct answer, marking first choice as correct");
        } else if (correctCount > 1) {
          let seen = false;
          for (const c of q.choices) {
            if (c.is_correct) {
              if (seen) c.is_correct = false;
              else seen = true;
            }
          }
          log("Auto-fix: multiple correct answers, keeping only the first");
        }
      }

      const session = gameStore.createGame(questions, title ?? undefined);

      // Load templates via injected dependency (Node.js fs or Worker bundle)
      let templates: unknown[] = [];
      try {
        const types = questions.map((q: { question_type: string }) => q.question_type);
        templates = await config.getTemplates(types as QuestionType[], "web");
      } catch (err) {
        log("Template load error", { error: err instanceof Error ? err.message : String(err) });
      }

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
          templates,
        } as Record<string, unknown>,
      };
    }
  );

  // ── UI resource ───────────────────────────────────────────────────
  registerAppResource(
    server,
    "Quiz App",
    "ui://quizhp/quiz-app.html",
    {
      description: "Interactive quiz game UI",
      _meta: {
        ui: {
          csp: {
            connectDomains: config.connectDomains ?? [],
          },
        },
      },
    },
    async () => {
      const html = await config.getWidgetHtml();
      return {
        contents: [
          {
            uri: "ui://quizhp/quiz-app.html",
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    }
  );

  // ── Template resource (fallback for hosts that don't forward structuredContent) ──
  // Types are dot-separated: quizhp://templates/mcq.mcq.true_false
  server.resource(
    "quiz-templates",
    new ResourceTemplate("quizhp://templates/{types}", { list: undefined }),
    async (uri, { types }) => {
      const typeArr = (types as string).split(".").filter(Boolean) as QuestionType[];
      let templates: Template[] = [];
      try {
        templates = await config.getTemplates(typeArr, "web");
      } catch (err) {
        log("Template resource load error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(templates),
          },
        ],
      };
    }
  );

  return server;
}
