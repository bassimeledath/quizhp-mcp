import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { Question, Template } from "../types";
import { useQuizStore } from "../store/quiz-store";
import { GameRuntime } from "./GameRuntime";
import { EndScreen } from "./EndScreen";
import { FeedbackToast } from "./FeedbackToast";
import { GameInfoModal } from "./GameInfoModal";

import { QuestionCard } from "./QuestionCard";
import { LoadingSpinner } from "./LoadingSpinner";
import { ExpandButton } from "./ExpandButton";
import { ExpandableQuestionText } from "./ExpandableQuestionText";
import type { ChoicePayload } from "../types";
import { injectQuestionIntoTemplate } from "../lib/template-injector";

interface QuizContainerProps {
  app: App;
  questions: Question[];
  hostContext?: McpUiHostContext;
  preloadedTemplates?: Template[];
  preloadedMobileTemplates?: Template[];
}

export function QuizContainer({
  app,
  questions: inputQuestions,
  hostContext,
  preloadedTemplates,
  preloadedMobileTemplates,
}: QuizContainerProps) {
  const {
    questions,
    templates,
    currentQuestionIndex,
    quizCompleted,
    attemptRecords,
    isLoading,
    error,
    setQuestions,
    setTemplates,
    goToNextQuestion,
    goToPreviousQuestion,
    resetQuiz,
    handleChoice: rawHandleChoice,
    setError,
    getCurrentQuestion,
    getCurrentTemplate,
    isFirstQuestion,
    isLastQuestion,
  } = useQuizStore();

  const isMobile =
    hostContext?.platform === "mobile" ||
    hostContext?.deviceCapabilities?.touch === true;

  // Derive display mode from host context
  const displayMode = hostContext?.displayMode ?? "inline";

  // Session ID — changes on every restart, used to tag iframe postMessages.
  // Stale messages from old sessions are rejected by use-game-messages.
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [visibleFeedback, setVisibleFeedback] = useState<import("../types").Feedback | null>(null);

  // Reset sessionId + clear feedback on restart
  const handleRestart = useCallback(() => {
    resetQuiz();
    setSessionId(crypto.randomUUID());
    setVisibleFeedback(null);
  }, [resetQuiz]);

  // Clear feedback on question change
  useEffect(() => {
    setVisibleFeedback(null);
  }, [currentQuestionIndex]);

  const handleChoice = useCallback(
    (payload: ChoicePayload) => {
      rawHandleChoice(payload);
      setVisibleFeedback({ isCorrect: payload.isCorrect, explanation: payload.explanation });
    },
    [rawHandleChoice]
  );

  const requestDisplayMode = useCallback(
    async (mode: "inline" | "fullscreen" | "pip") => {
      try {
        return await app.requestDisplayMode({ mode });
      } catch {
        return { mode };
      }
    },
    [app]
  );

  // Initialize questions
  useEffect(() => {
    if (inputQuestions.length > 0) {
      setQuestions(inputQuestions);
    }
  }, [inputQuestions, setQuestions]);

  // Use templates delivered via structuredContent, picking the right platform set.
  // Re-runs when isMobile changes (e.g. hostContext arrives after initial load).
  const lastPlatformRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (questions.length === 0) return;

    const mobileCandidates = preloadedMobileTemplates ?? [];
    const webCandidates = preloadedTemplates ?? [];
    const chosen = isMobile && mobileCandidates.length > 0 ? mobileCandidates : webCandidates;

    // Skip if templates already set AND platform hasn't changed
    if (templates.length > 0 && lastPlatformRef.current === isMobile) return;

    if (chosen.length > 0) {
      lastPlatformRef.current = isMobile;
      setTemplates(chosen);
    }
  }, [questions, templates.length, isMobile, preloadedTemplates, preloadedMobileTemplates, setTemplates]);

  // Report score to Claude when quiz completes
  useEffect(() => {
    if (!quizCompleted) return;

    let completedCount = 0;
    let perfectCount = 0;
    let totalWrongAttempts = 0;
    for (const a of attemptRecords) {
      totalWrongAttempts += a.wrongAttempts;
      if (a.completed) {
        completedCount++;
        if (a.wrongAttempts === 0) perfectCount++;
      }
    }

    app
      .updateModelContext({
        content: [
          {
            type: "text",
            text: `Quiz complete! Score: ${completedCount}/${questions.length} correct. ${perfectCount} perfect answers. ${totalWrongAttempts} total wrong attempts.`,
          },
        ],
        structuredContent: {
          totalQuestions: questions.length,
          correctCount: completedCount,
          perfectCount,
          totalWrongAttempts,
          perQuestion: attemptRecords.map((a, i) => ({
            questionIndex: i,
            completed: a.completed,
            wrongAttempts: a.wrongAttempts,
          })),
        },
      })
      .catch(() => {
        // Score reporting is best-effort
      });
  }, [quizCompleted, attemptRecords, questions.length, app]);

  const [showInfo, setShowInfo] = useState(false);

  const isReady = !isLoading && templates.length > 0 && questions.length > 0;
  const currentQuestion = getCurrentQuestion();
  const currentTemplate = getCurrentTemplate();
  const isLast = isLastQuestion();

  const hydratedHTML = useMemo(
    () =>
      currentQuestion && currentTemplate
        ? injectQuestionIntoTemplate(
            currentTemplate.code,
            currentQuestion,
            isLast,
            sessionId
          )
        : "",
    [currentQuestion, currentTemplate, isLast, sessionId]
  );

  // Error state (must be checked before loading — when templates fail,
  // isReady is false but we want to show the error, not a spinner)
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isReady) {
    return (
      <LoadingSpinner
        message={isLoading ? "Loading quiz..." : "Preparing templates..."}
      />
    );
  }

  // End screen
  if (quizCompleted) {
    return (
      <div
        className="font-sans h-full overflow-hidden relative"
        style={{
          background:
            "linear-gradient(to bottom, var(--qz-bg-primary, #111827), var(--qz-bg-secondary, #1f2937))",
        }}
      >
        <ExpandButton
          displayMode={displayMode}
          onRequestDisplayMode={requestDisplayMode}
        />
        <div className="flex flex-col items-center justify-center h-full p-3 sm:p-4 md:p-6" style={{ maxWidth: 720, maxHeight: 480, margin: "0 auto" }}>
          <EndScreen
            totalQuestions={questions.length}
            attemptRecords={attemptRecords}
            onPlayAgain={handleRestart}
          />
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    const isFullscreen = displayMode === "fullscreen";

    if (!isFullscreen) {
      // Compact preview with expand prompt
      return (
        <div className="font-sans relative" style={{ background: "var(--qz-bg-primary)" }}>
          <div className="flex flex-col p-3 gap-3">
            {currentQuestion && (
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded"
                  style={{ color: "var(--qz-text-secondary)", background: "var(--qz-bg-secondary)" }}>
                  {currentQuestionIndex + 1}/{questions.length}
                </span>
                <ExpandableQuestionText
                  text={currentQuestion.question}
                  maxLines={4}
                  textClassName="text-sm font-medium"
                  textStyle={{ color: "var(--qz-text-primary)" }}
                  wrapperClassName="flex-1"
                  chipAlign="start"
                />
                <button
                  onClick={() => requestDisplayMode("fullscreen")}
                  className="flex-shrink-0 p-1.5 rounded-md transition-colors"
                  style={{ background: "var(--qz-bg-secondary)", border: `1px solid var(--qz-border-primary)` }}
                  aria-label="Expand to fullscreen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: "var(--qz-text-secondary)" }}>
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              </div>
            )}

            <div
              className="relative rounded-lg overflow-hidden cursor-pointer"
              style={{ aspectRatio: "9/16", border: `1px solid var(--qz-border-primary)` }}
              onClick={() => requestDisplayMode("fullscreen")}
            >
              <GameRuntime
                srcDoc={hydratedHTML}
                onChoice={handleChoice}
                onNext={goToNextQuestion}
                fullscreen
                displayMode={displayMode}
                sessionId={sessionId}
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="bg-white/90 px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-lg">
                  Tap to expand
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fullscreen mobile layout
    return (
      <div className="font-sans h-screen w-screen flex flex-col overflow-hidden relative"
        style={{
          background: "var(--qz-bg-secondary)",
          paddingTop: hostContext?.safeAreaInsets?.top ? `${hostContext.safeAreaInsets.top}px` : undefined,
          paddingBottom: hostContext?.safeAreaInsets?.bottom ? `${hostContext.safeAreaInsets.bottom}px` : undefined,
        }}>
        <ExpandButton
          displayMode={displayMode}
          onRequestDisplayMode={requestDisplayMode}
        />

        {currentQuestion && (
          <div className="flex-shrink-0 px-2 py-2 pr-12"
            style={{ background: "var(--qz-bg-primary)", borderBottom: `1px solid var(--qz-border-primary)` }}>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousQuestion}
                disabled={isFirstQuestion()}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: isFirstQuestion() ? "not-allowed" : "pointer",
                  opacity: isFirstQuestion() ? 0.3 : 0.8,
                  padding: "4px 6px",
                  fontSize: "14px",
                  color: "var(--qz-text-primary)",
                  flexShrink: 0,
                }}
                aria-label="Previous question"
              >
                ←
              </button>
              <ExpandableQuestionText
                text={currentQuestion.question}
                maxLines={4}
                textClassName="text-sm font-medium text-center"
                textStyle={{ color: "var(--qz-text-primary)" }}
                wrapperClassName="flex-1"
                chipAlign="center"
              />
              <button
                onClick={goToNextQuestion}
                disabled={false}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.8,
                  padding: "4px 6px",
                  fontSize: "14px",
                  color: "var(--qz-text-primary)",
                  flexShrink: 0,
                }}
                aria-label={isLastQuestion() ? "Finish quiz" : "Next question"}
              >
                {isLastQuestion() ? "✓" : "→"}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center justify-center opacity-80 transition-all duration-200 hover:opacity-100 hover:scale-110"
            style={{
              position: "absolute",
              top: 6,
              left: 8,
              zIndex: 10,
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "1.5px solid #F5A742",
              background: "rgba(245,167,66,0.15)",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="Game info"
          >
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 700, fontSize: "14px", color: "#F5A742", lineHeight: 1 }}>i</span>
          </button>
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 8,
              zIndex: 10,
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--qz-text-secondary)",
              background: "rgba(0,0,0,0.45)",
              borderRadius: "9999px",
              padding: "2px 7px",
              opacity: 0.75,
              pointerEvents: "none",
            }}
          >
            {currentQuestionIndex + 1}/{questions.length}
          </span>
          <GameRuntime
            srcDoc={hydratedHTML}
            onChoice={handleChoice}
            onNext={goToNextQuestion}
            fullscreen
            displayMode={displayMode}
            sessionId={sessionId}
          />
          {visibleFeedback && (
            <FeedbackToast
              feedback={visibleFeedback}
              onDismiss={() => setVisibleFeedback(null)}
            />
          )}
          {showInfo && currentTemplate && (
            <GameInfoModal
              template={currentTemplate}
              onClose={() => setShowInfo(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      className="font-sans relative min-h-full"
      style={{
        background: "var(--qz-bg-primary)",
        paddingBottom:
          displayMode === "fullscreen"
            ? hostContext?.safeAreaInsets?.bottom ?? 0
            : undefined,
      }}
    >
      <ExpandButton
        displayMode={displayMode}
        onRequestDisplayMode={requestDisplayMode}
      />

      <div className="flex flex-col items-center gap-4 p-3 sm:p-4 md:p-6">
        {currentQuestion && (
          <QuestionCard
            questionText={currentQuestion.question}
            onPrevious={goToPreviousQuestion}
            onNext={goToNextQuestion}
            isPrevDisabled={isFirstQuestion()}
            isNextDisabled={false}
            isLastQuestion={isLastQuestion()}
          />
        )}

        <div className="relative w-full" style={{ maxWidth: 720 }}>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center justify-center opacity-80 transition-all duration-200 hover:opacity-100 hover:scale-110"
            style={{
              position: "absolute",
              top: 8,
              left: 10,
              zIndex: 10,
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "1.5px solid #F5A742",
              background: "rgba(245,167,66,0.15)",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="Game info"
          >
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 700, fontSize: "16px", color: "#F5A742", lineHeight: 1 }}>i</span>
          </button>
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              zIndex: 10,
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--qz-text-secondary)",
              background: "rgba(0,0,0,0.45)",
              borderRadius: "9999px",
              padding: "2px 8px",
              opacity: 0.75,
              pointerEvents: "none",
            }}
          >
            {currentQuestionIndex + 1}/{questions.length}
          </span>
          <GameRuntime
            srcDoc={hydratedHTML}
            onChoice={handleChoice}
            onNext={goToNextQuestion}
            maxHeight={displayMode === "inline" ? "420px" : "480px"}
            displayMode={displayMode}
            sessionId={sessionId}
          />
          {visibleFeedback && (
            <FeedbackToast
              feedback={visibleFeedback}
              onDismiss={() => setVisibleFeedback(null)}
            />
          )}
          {showInfo && currentTemplate && (
            <GameInfoModal
              template={currentTemplate}
              onClose={() => setShowInfo(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
