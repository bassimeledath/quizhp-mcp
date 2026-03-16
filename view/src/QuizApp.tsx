import { useState, useCallback, useEffect, useRef } from "react";
import {
  useApp,
  applyHostStyleVariables,
  applyHostFonts,
  applyDocumentTheme,
} from "@modelcontextprotocol/ext-apps/react";
import type {
  McpUiHostContext,
  McpUiDisplayMode,
} from "@modelcontextprotocol/ext-apps";
import type { Question, Template } from "./types";
import { QuizContainer } from "./components/QuizContainer";
import { LoadingSpinner } from "./components/LoadingSpinner";

interface QuizData {
  gameId?: string;
  questions: Question[];
  title?: string;
  templates?: Template[];
}

export function QuizApp() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const templateFetchAttempted = useRef(false);

  const onAppCreated = useCallback(
    (app: import("@modelcontextprotocol/ext-apps").App) => {
      app.ontoolinput = (params) => {
        const args = params.arguments as { questions?: Question[]; title?: string } | undefined;
        if (args?.questions?.length) {
          setQuizData((prev) => prev?.questions?.length ? prev : {
            questions: args.questions!,
            title: args.title,
          });
        }
      };

      app.ontoolresult = (params) => {
        if (params.isError) {
          const text = params.content
            ?.filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map((c) => c.text)
            .join(" ") || "Tool execution failed";
          setErrorMessage(text);
          return;
        }
        const sc = params.structuredContent as {
          gameId?: string; questions?: Question[]; title?: string; templates?: Template[];
        } | undefined;
        if (sc?.questions?.length) {
          setQuizData({ gameId: sc.gameId, questions: sc.questions, title: sc.title, templates: sc.templates });
        }
      };

      app.onhostcontextchanged = (ctx) => {
        setHostContext((prev) => ({ ...prev, ...ctx }));
        if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
        if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
        if (ctx.theme) applyDocumentTheme(ctx.theme);
      };
    },
    []
  );

  const { app, isConnected, error } = useApp({
    appInfo: { name: "QuizHP", version: "1.0.0" },
    capabilities: {
      availableDisplayModes: ["inline", "fullscreen"] as McpUiDisplayMode[],
    },
    onAppCreated,
  });

  useEffect(() => {
    if (isConnected && app && !hostContext) {
      const ctx = app.getHostContext();
      if (ctx) {
        setHostContext(ctx);
        if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
        if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
        if (ctx.theme) applyDocumentTheme(ctx.theme);
      }
    }
  }, [isConnected, app, hostContext]);

  // Fallback: fetch templates from server if not delivered via structuredContent
  useEffect(() => {
    if (!app || !quizData?.questions?.length || quizData.templates?.length || templateFetchAttempted.current) return;
    templateFetchAttempted.current = true;

    const types = quizData.questions.map((q) => q.question_type).join(".");
    app
      .readServerResource({ uri: `quizhp://templates/${types}` })
      .then((result) => {
        const text = result.contents?.[0]?.text;
        if (typeof text === "string") {
          const templates = JSON.parse(text) as Template[];
          if (templates.length > 0) {
            setQuizData((prev) => prev ? { ...prev, templates } : prev);
          }
        }
      })
      .catch(() => {
        // Resource fetch failed — host may not support serverResources
      });
  }, [app, quizData]);

  if (error) return <div style={{ padding: 24, color: "red" }}>{error.message}</div>;
  if (errorMessage) return <div style={{ padding: 24, color: "red" }}>{errorMessage}</div>;
  if (!isConnected) return <LoadingSpinner message="Connecting..." />;
  if (!quizData?.questions?.length) return <LoadingSpinner message="Generating questions..." />;

  return (
    <QuizContainer
      app={app!}
      questions={quizData.questions}
      title={quizData.title}
      gameId={quizData.gameId}
      preloadedTemplates={quizData.templates}
      hostContext={hostContext}
    />
  );
}
