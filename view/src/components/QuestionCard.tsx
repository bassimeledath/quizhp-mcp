const arrowStyle = (disabled: boolean) => ({
  color: disabled
    ? "var(--qz-text-secondary)"
    : "var(--qz-text-primary)",
  background: "transparent",
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.3 : 0.8,
  padding: "4px 6px",
  fontSize: "16px",
  lineHeight: 1,
  flexShrink: 0 as const,
  transition: "opacity 0.15s",
});

interface QuestionCardProps {
  questionText: string;
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  isPrevDisabled: boolean;
  isNextDisabled: boolean;
  isLastQuestion: boolean;
}

export function QuestionCard({
  questionText,
  onPrevious,
  onNext,
  isPrevDisabled,
  isNextDisabled,
  isLastQuestion,
}: QuestionCardProps) {

  return (
    <div
      className="w-full max-w-[720px] rounded-lg shadow-sm px-2 py-3"
      style={{
        background: "var(--qz-bg-primary)",
        border: `1px solid var(--qz-border-primary)`,
      }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevious}
          disabled={isPrevDisabled}
          style={arrowStyle(isPrevDisabled)}
          aria-label="Previous question"
        >
          ←
        </button>
        <p
          className="text-base font-medium flex-1 text-center leading-snug"
          style={{ color: "var(--qz-text-primary)" }}
        >
          {questionText}
        </p>
        <button
          onClick={onNext}
          disabled={isNextDisabled}
          style={arrowStyle(isNextDisabled)}
          aria-label={isLastQuestion ? "Finish quiz" : "Next question"}
        >
          {isLastQuestion ? "✓" : "→"}
        </button>
      </div>
    </div>
  );
}
