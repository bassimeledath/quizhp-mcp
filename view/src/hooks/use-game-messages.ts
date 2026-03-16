import { useEffect, useCallback, type RefObject } from "react";
import type { ChoicePayload, QuizMessageEvent } from "../types";

interface UseGameMessagesProps {
  onChoice: (payload: ChoicePayload) => void;
  onNext?: () => void;
  onReady?: () => void;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
}

/**
 * Hook to handle postMessage communication from the game iframe.
 * When iframeRef is provided, ignores messages from stale/destroyed iframes.
 */
export function useGameMessages({
  onChoice,
  onNext,
  onReady,
  iframeRef,
}: UseGameMessagesProps) {
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Guard: ignore messages from stale iframes after navigation
      if (iframeRef && event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data as QuizMessageEvent;
      if (!data || typeof data !== "object" || !data.type) return;

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
    [onChoice, onNext, onReady, iframeRef]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
}
