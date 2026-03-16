import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { GameStore } from "./game-store.js";
import { getTemplatesForQuestions } from "./template-store.js";

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
        "true_false questions must have exactly 2 choices with text 'true' or 'false', mcq questions must have exactly 4 choices",
    }
  );

export interface QuizServerConfig {
  gameStore: GameStore;
  getWidgetHtml: () => Promise<string>;
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
      const session = gameStore.createGame(questions, title ?? undefined);

      // Load templates from bundled templates directory
      let templates: unknown[] = [];
      try {
        const types = questions.map((q: { question_type: string }) => q.question_type);
        templates = await getTemplatesForQuestions(types as ("mcq" | "true_false")[], "web");
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

  return server;
}
