/**
 * Shared types for QuizHP MCP Server
 * Inlined from @quiz/types for standalone use
 */

// ============================================================================
// Platform Types
// ============================================================================

export type Platform = "web" | "mobile";

// ============================================================================
// Question Types
// ============================================================================

export type QuestionType = "mcq" | "true_false";

export interface Choice {
  text: string;
  is_correct: boolean;
  explanation: string;
}

export interface Question {
  question_type: QuestionType;
  question: string;
  choices: Choice[];
}

/**
 * Serialized question format for template injection.
 * This is the shape used by the canvas game templates.
 */
export interface SerializedQuestion {
  type: QuestionType;
  prompt: string;
  choices: Array<{
    text: string;
    is_correct: boolean;
    explanation: string;
  }>;
  isLastQuestion: boolean;
}

// ============================================================================
// Template Types
// ============================================================================

export interface GameControl {
  keys?: string[];
  type: string;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  code: string;
  game_controls: GameControl[];
  game_instructions: string;
  created_at: string;
  updated_at: string;
  supported_question_type: string;
  is_active: boolean;
  platform?: Platform;
}

export interface GeneratedTemplatesResponse {
  templates: Template[];
}

// ============================================================================
// Quiz State Types
// ============================================================================

export interface Feedback {
  isCorrect?: boolean;
  explanation?: string;
}

/**
 * Tracks the user's attempts for a single question.
 */
export interface QuestionAttempt {
  wrongAttempts: number;
  completed: boolean;
}

// ============================================================================
// Event Types (postMessage communication)
// ============================================================================

export interface QuizChoiceEvent {
  type: "quiz-choice";
  choiceIndex?: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizEndEvent {
  type: "quiz-end";
  isCorrect: boolean;
  explanation: string;
}

export interface QuizNextEvent {
  type: "quiz-next";
}

export interface QuizReadyEvent {
  type: "quiz-ready";
}

export type QuizMessageEvent =
  | QuizChoiceEvent
  | QuizEndEvent
  | QuizNextEvent
  | QuizReadyEvent;

// ============================================================================
// Component Props Types
// ============================================================================

export interface ChoicePayload {
  choiceIndex?: number;
  isCorrect: boolean;
  explanation?: string;
}

export interface GameShellProps {
  currentQuestion: Question;
  hydratedHTML: string;
  feedback: Feedback | null;
  onFeedbackChange: (feedback: Feedback | null) => void;
  onChoice: (payload: ChoicePayload) => void;
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
}

// ============================================================================
// Template Index Types (for bundled templates)
// ============================================================================

export interface TemplateIndexEntry {
  name: string;
  path: string;
  platform: Platform;
  questionType: QuestionType;
  instructions: string;
  controls: GameControl[];
}

export interface TemplateIndex {
  version: number;
  templates: TemplateIndexEntry[];
}
