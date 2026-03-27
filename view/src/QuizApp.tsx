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
  mobileTemplates?: Template[];
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
        toolResultReceived.current = true;
        if (params.isError) {
          const text = params.content
            ?.filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map((c) => c.text)
            .join(" ") || "Tool execution failed";
          setErrorMessage(text);
          return;
        }
        const sc = params.structuredContent as {
          gameId?: string; questions?: Question[]; title?: string; templates?: Template[]; mobileTemplates?: Template[];
        } | undefined;
        if (sc?.questions?.length) {
          setQuizData({ gameId: sc.gameId, questions: sc.questions, title: sc.title, templates: sc.templates, mobileTemplates: sc.mobileTemplates });
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

  // Fallback: respect system dark/light preference when host doesn't provide a theme
  useEffect(() => {
    if (hostContext?.theme) return; // host controls the theme
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyDocumentTheme(mq.matches ? "dark" : "light");
    const onChange = (e: MediaQueryListEvent) => {
      if (!hostContext?.theme) applyDocumentTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hostContext?.theme]);

  // Fallback: fetch templates from server if not delivered via structuredContent.
  // Only fires if ontoolresult didn't provide templates (e.g. host doesn't forward structuredContent).
  // Waits for toolResultReceived to avoid racing with ontoolresult.
  const toolResultReceived = useRef(false);
  useEffect(() => {
    if (!app || !quizData?.questions?.length || templateFetchAttempted.current) return;
    // If we already have templates from structuredContent, no fallback needed
    if (quizData.templates?.length || quizData.mobileTemplates?.length) return;
    // Wait a tick for ontoolresult to arrive before falling back
    if (!toolResultReceived.current) return;
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
      preloadedTemplates={quizData.templates}
      preloadedMobileTemplates={quizData.mobileTemplates}
      hostContext={hostContext}
    />
  );
}
