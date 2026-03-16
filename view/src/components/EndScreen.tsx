import type { QuestionAttempt } from "../types";

interface EndScreenProps {
  totalQuestions: number;
  attemptRecords: QuestionAttempt[];
  onPlayAgain: () => void;
}

function AttemptLine({
  questionIndex,
  attempt,
}: {
  questionIndex: number;
  attempt: QuestionAttempt;
}) {
  const squares: string[] = [];

  if (!attempt.completed && attempt.wrongAttempts === 0) {
    squares.push("\u2b1c"); // white square
  } else {
    for (let i = 0; i < attempt.wrongAttempts; i++) {
      squares.push("\ud83d\udfe5"); // red square
    }
    if (attempt.completed) {
      squares.push("\ud83d\udfe9"); // green square
    }
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm w-8 opacity-60">Q{questionIndex + 1}</span>
      <span className="text-xl tracking-wide">{squares.join(" ")}</span>
    </div>
  );
}

export function EndScreen({
  totalQuestions,
  attemptRecords,
  onPlayAgain,
}: EndScreenProps) {
  const completedCount = attemptRecords.filter((a) => a.completed).length;
  const perfectCount = attemptRecords.filter(
    (a) => a.completed && a.wrongAttempts === 0
  ).length;
  const totalWrongAttempts = attemptRecords.reduce(
    (sum, a) => sum + a.wrongAttempts,
    0
  );

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center w-full"
      style={{ maxWidth: 720 }}>
      <div className="text-7xl mb-6">{"\ud83c\udf89"}</div>

      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--qz-text-primary, #fff)" }}>
        Quiz Complete!
      </h1>

      <p className="text-lg mb-6" style={{ color: "var(--qz-text-secondary, #d1d5db)" }}>
        You finished all {totalQuestions} question
        {totalQuestions !== 1 ? "s" : ""}!
      </p>

      <div className="backdrop-blur-sm rounded-lg p-4 mb-6 min-w-[200px]"
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}>
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide"
          style={{ color: "var(--qz-text-secondary, #e5e7eb)" }}>
          Your Results
        </h2>
        <div className="flex flex-col items-start">
          {attemptRecords.map((attempt, index) => (
            <AttemptLine key={index} questionIndex={index} attempt={attempt} />
          ))}
        </div>
      </div>

      <div className="text-sm mb-6" style={{ color: "var(--qz-text-secondary, #9ca3af)" }}>
        {perfectCount === totalQuestions ? (
          <span className="text-green-400 font-medium">
            Perfect score! {"\ud83c\udf1f"}
          </span>
        ) : (
          <span>
            {completedCount}/{totalQuestions} correct
            {totalWrongAttempts > 0 &&
              ` \u2022 ${totalWrongAttempts} wrong attempt${totalWrongAttempts !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      <button
        onClick={onPlayAgain}
        className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold text-lg hover:bg-blue-600 active:bg-blue-700 transition-colors cursor-pointer"
      >
        Play Again
      </button>
    </div>
  );
}
