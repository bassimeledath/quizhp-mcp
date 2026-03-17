import { useEffect, useCallback } from "react";
import type { ChoicePayload, QuizMessageEvent } from "../types";

interface UseGameMessagesProps {
  onChoice: (payload: ChoicePayload) => void;
  onNext?: () => void;
  onReady?: () => void;
  sessionId?: string;
}

/**
 * Hook to handle postMessage communication from the game iframe.
 * Only accepts messages with a matching sessionId to reject stale messages.
 */
export function useGameMessages({
  onChoice,
  onNext,
  onReady,
  sessionId,
}: UseGameMessagesProps) {
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = event.data as QuizMessageEvent & { sessionId?: string };
      if (!data || typeof data !== "object" || !data.type) return;

      // Reject messages from old game sessions
      if (sessionId && data.sessionId !== sessionId) return;

      switch (data.type) {
        case "quiz-choice":
        case "quiz-end":
          onChoice({
            choiceIndex:
              "choiceIndex" in data && typeof data.choiceIndex === "number"
                ? data.choiceIndex
                : undefined,
            isCorrect: data.isCorrect,
            explanation: data.explanation ?? "",
          });
          break;

        case "quiz-next":
          onNext?.();
          break;

        case "quiz-ready":
          onReady?.();
          break;
      }
    },
    [onChoice, onNext, onReady, sessionId]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
}
