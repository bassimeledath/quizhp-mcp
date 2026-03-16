import { useEffect, useRef, useState } from "react";
import type { Feedback } from "../types";

interface FeedbackToastProps {
  feedback: Feedback;
  onDismiss: () => void;
}

export function FeedbackToast({ feedback, onDismiss }: FeedbackToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isCorrect = feedback.isCorrect;
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Clean up dismiss animation timer on unmount to prevent
  // stale onDismiss from clearing the next question's feedback
  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissTimer.current = setTimeout(onDismiss, 150);
  };

  return (
    <div
      className={`absolute z-50 flex justify-center pointer-events-none transition-all duration-150 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{ bottom: 8, left: 8, right: 8 }}
    >
      <div
        className={`pointer-events-auto w-full p-3 rounded-lg shadow-lg flex items-start gap-2 backdrop-blur-sm ${
          isCorrect
            ? "border border-green-400"
            : "border border-red-400"
        }`}
        style={{
          background: isCorrect
            ? "rgba(240, 253, 244, 0.92)"
            : "rgba(254, 242, 242, 0.92)",
        }}
      >
        <span className="text-2xl flex-shrink-0">
          {isCorrect ? "\u2705" : "\u274c"}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-base ${isCorrect ? "text-green-800" : "text-red-800"}`}
          >
            {isCorrect ? "Correct!" : "Incorrect"}
          </p>
          {feedback.explanation && (
            <p
              className={`text-sm mt-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}
            >
              {feedback.explanation}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 p-1 rounded-full transition-colors ${
            isCorrect
              ? "text-green-600 hover:bg-green-200"
              : "text-red-600 hover:bg-red-200"
          }`}
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
