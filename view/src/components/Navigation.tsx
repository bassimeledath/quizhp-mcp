import type { QuestionAttempt } from "../types";

interface NavigationProps {
  currentIndex: number;
  totalQuestions: number;
  attemptRecords: QuestionAttempt[];
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
}

export function Navigation({
  currentIndex,
  totalQuestions,
  attemptRecords,
  isFirstQuestion,
  isLastQuestion,
  onPrevious,
  onNext,
  compact,
}: NavigationProps) {
  const currentAttempt = attemptRecords[currentIndex];
  const canAdvance = currentAttempt?.completed === true;

  const buttonBase = compact
    ? "px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
    : "px-4 py-2 text-sm font-medium rounded-lg transition-colors";

  return (
    <div
      className="flex items-center justify-between w-full"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: compact ? "6px 12px" : "8px 16px",
        background: "var(--qz-bg-primary)",
        borderTop: "1px solid var(--qz-border-primary)",
      }}
    >
      <button
        onClick={onPrevious}
        disabled={isFirstQuestion}
        className={buttonBase}
        style={{
          color: isFirstQuestion
            ? "var(--qz-text-disabled, #6b7280)"
            : "var(--qz-text-secondary)",
          background: "var(--qz-bg-secondary)",
          border: "1px solid var(--qz-border-primary)",
          cursor: isFirstQuestion ? "not-allowed" : "pointer",
          opacity: isFirstQuestion ? 0.5 : 1,
        }}
      >
        ← Previous
      </button>

      <span
        className={compact ? "text-xs font-medium" : "text-sm font-medium"}
        style={{ color: "var(--qz-text-secondary)" }}
      >
        {currentIndex + 1} of {totalQuestions}
      </span>

      <button
        onClick={onNext}
        disabled={!canAdvance}
        className={buttonBase}
        style={{
          color: canAdvance
            ? "var(--qz-text-on-accent, #ffffff)"
            : "var(--qz-text-disabled, #6b7280)",
          background: canAdvance
            ? "var(--qz-accent-primary, #3b82f6)"
            : "var(--qz-bg-secondary)",
          border: "1px solid",
          borderColor: canAdvance
            ? "var(--qz-accent-primary, #3b82f6)"
            : "var(--qz-border-primary)",
          cursor: canAdvance ? "pointer" : "not-allowed",
          opacity: canAdvance ? 1 : 0.5,
        }}
      >
        {isLastQuestion ? "Finish" : "Next →"}
      </button>
    </div>
  );
}
