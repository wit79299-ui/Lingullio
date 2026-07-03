// ─── Exercise data types ────────────────────────────────────────────────────

export type ExerciseType =
  | 'mcq'
  | 'fill_blank'
  | 'matching'
  | 'reorder'
  | 'character_recognition'
  | 'flashcard'
  | 'listening_comprehension'
  | 'dictation'
  | 'controlled_translation'
  | 'reading_comprehension';

export interface Exercise {
  id: string;
  exercise_type: ExerciseType;
  difficulty: number;     // 1-3
  points: number;         // e.g. 10, 15, 20
  sort_order: number;
  audio_url: string | null;
  metadata: Record<string, unknown>;
  prompt: string;
  instruction: string;
  explanation: string;
  hint: string | null;
}

// ─── Answer tracking ────────────────────────────────────────────────────────

export interface ExerciseAnswer {
  exerciseId: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsMax: number;
  userAnswer: unknown;
  timeSpent: number; // seconds
}

// ─── Session state ──────────────────────────────────────────────────────────

export type SessionPhase = 'intro' | 'exercise' | 'review' | 'results';

export interface SessionState {
  phase: SessionPhase;
  currentIndex: number;
  answers: ExerciseAnswer[];
  startedAt: number;
  exerciseStartedAt: number;
}

// ─── HSK Scoring ────────────────────────────────────────────────────────────

/** HSK1 exam: 200 total points, 120 to pass (60%) */
export const HSK_CONFIG = {
  totalPoints: 200,
  passScore: 120,
  passPercent: 60,
  timeLimit: 40 * 60, // 40 minutes in seconds
  sections: {
    listening: { weight: 0.40, label: 'Listening' },
    reading:   { weight: 0.60, label: 'Reading' },
  },
} as const;

export interface SessionResults {
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
  hskScore: number;        // Scaled to /200
  timeElapsed: number;     // seconds
  byDifficulty: { level: number; correct: number; total: number }[];
  byType: { type: ExerciseType; correct: number; total: number }[];
  weakAreas: string[];
}
