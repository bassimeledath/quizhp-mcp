import { create } from "zustand";
import type {
  Question,
  Template,
  Feedback,
  QuestionAttempt,
  Platform,
  ChoicePayload,
} from "../types";

interface QuizState {
  questions: Question[];
  templates: Template[];
  currentQuestionIndex: number;
  quizCompleted: boolean;
  feedback: Feedback | null;
  attemptRecords: QuestionAttempt[];
  isLoading: boolean;
  error: string | null;
  platform: Platform;
  templatePlatform: Platform | null;
  resetGeneration: number;
}

interface QuizActions {
  setQuestions: (questions: Question[]) => void;
  setTemplates: (templates: Template[], platform: Platform) => void;
  setPlatform: (platform: Platform) => void;
  goToQuestion: (index: number) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  completeQuiz: () => void;
  resetQuiz: () => void;
  setFeedback: (feedback: Feedback | null) => void;
  handleChoice: (payload: ChoicePayload) => void;
  setLoading: (isLoading: boolean) => void;
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
  feedback: null,
  attemptRecords: [],
  isLoading: false,
  error: null,
  platform: "web",
  templatePlatform: null,
  resetGeneration: 0,

  setQuestions: (questions) => {
    set({
      questions,
      attemptRecords: questions.map(() => ({
        wrongAttempts: 0,
        completed: false,
      })),
      currentQuestionIndex: 0,
      quizCompleted: false,
      feedback: null,
    });
  },

  setTemplates: (templates, platform) => {
    set({ templates, templatePlatform: platform, isLoading: false });
  },

  setPlatform: (platform) => {
    set({ platform });
  },

  goToQuestion: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({ currentQuestionIndex: index, feedback: null });
    }
  },

  goToNextQuestion: () => {
    const { currentQuestionIndex, questions, quizCompleted } = get();
    if (quizCompleted) return;
    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1, feedback: null });
    } else {
      set({ quizCompleted: true, feedback: null });
    }
  },

  goToPreviousQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1, feedback: null });
    }
  },

  completeQuiz: () => {
    set({ quizCompleted: true, feedback: null });
  },

  resetQuiz: () => {
    const { questions, resetGeneration } = get();
    set({
      currentQuestionIndex: 0,
      quizCompleted: false,
      feedback: null,
      resetGeneration: resetGeneration + 1,
      attemptRecords: questions.map(() => ({
        wrongAttempts: 0,
        completed: false,
      })),
    });
  },

  setFeedback: (feedback) => {
    set({ feedback });
  },

  handleChoice: (payload) => {
    const { currentQuestionIndex, attemptRecords, quizCompleted } = get();
    if (quizCompleted) return;
    set({
      feedback: {
        isCorrect: payload.isCorrect,
        explanation: payload.explanation,
      },
    });

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

  setLoading: (isLoading) => {
    set({ isLoading });
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
