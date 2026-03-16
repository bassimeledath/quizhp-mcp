/**
 * Shared types for QuizHP — view-side copy.
 * Keep in sync with src/types.ts at the repo root.
 */

export type Platform = "web" | "mobile";
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

export interface Feedback {
  isCorrect?: boolean;
  explanation?: string;
}

export interface QuestionAttempt {
  wrongAttempts: number;
  completed: boolean;
}

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

export interface ChoicePayload {
  choiceIndex?: number;
  isCorrect: boolean;
  explanation?: string;
}
