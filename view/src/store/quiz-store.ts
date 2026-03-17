import { create } from "zustand";
import type {
  Question,
  Template,
  QuestionAttempt,
  ChoicePayload,
} from "../types";

interface QuizState {
  questions: Question[];
  templates: Template[];
  currentQuestionIndex: number;
  quizCompleted: boolean;
  attemptRecords: QuestionAttempt[];
  isLoading: boolean;
  error: string | null;
}

interface QuizActions {
  setQuestions: (questions: Question[]) => void;
  setTemplates: (templates: Template[]) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  resetQuiz: () => void;
  handleChoice: (payload: ChoicePayload) => void;
  setError: (error: string | null) => void;
  getCurrentQuestion: () => Question | null;
  getCurrentTemplate: () => Template | null;
  isFirstQuestion: () => boolean;
  isLastQuestion: () => boolean;
}

export type QuizStore = QuizState & QuizActions;

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  templates: [],
  currentQuestionIndex: 0,
  quizCompleted: false,
  attemptRecords: [],
  isLoading: false,
  error: null,

  setQuestions: (questions) => {
    set({
      questions,
      attemptRecords: questions.map(() => ({
        wrongAttempts: 0,
        completed: false,
      })),
      currentQuestionIndex: 0,
      quizCompleted: false,
    });
  },

  setTemplates: (templates) => {
    set({ templates, isLoading: false });
  },

  goToNextQuestion: () => {
    const { currentQuestionIndex, questions, quizCompleted } = get();
    if (quizCompleted) return;
    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    } else {
      set({ quizCompleted: true });
    }
  },

  goToPreviousQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  resetQuiz: () => {
    const { questions } = get();
    set({
      currentQuestionIndex: 0,
      quizCompleted: false,
      attemptRecords: questions.map(() => ({
        wrongAttempts: 0,
        completed: false,
      })),
    });
  },

  handleChoice: (payload) => {
    const { currentQuestionIndex, attemptRecords } = get();
    const updated = [...attemptRecords];
    const record = updated[currentQuestionIndex];
    if (record) {
      if (payload.isCorrect) {
        updated[currentQuestionIndex] = { ...record, completed: true };
      } else {
        updated[currentQuestionIndex] = {
          ...record,
          wrongAttempts: record.wrongAttempts + 1,
        };
      }
      set({ attemptRecords: updated });
    }
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },

  getCurrentQuestion: () => {
    const { questions, currentQuestionIndex } = get();
    return questions[currentQuestionIndex] ?? null;
  },

  getCurrentTemplate: () => {
    const { templates, currentQuestionIndex } = get();
    if (templates.length === 0) return null;
    return templates[currentQuestionIndex % templates.length] ?? null;
  },

  isFirstQuestion: () => {
    return get().currentQuestionIndex === 0;
  },

  isLastQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    return currentQuestionIndex === questions.length - 1;
  },
}));
