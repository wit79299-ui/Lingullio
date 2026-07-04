// ─── Training Mode Store ──────────────────────────────────────────────────
// Zustand store for managing the active training mode.
// Modes:
//   - standard:         Default dashboard, user-driven navigation
//   - coach_autonome:   Auto-triggered after 15 days inactivity, app decides sessions
//   - parcours_inverse: User opts-in, declares HSK goal + deadline, follows dynamic roadmap

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── HSK Vocabulary Counts (from DB) ──────────────────────────────────────
export const HSK_VOCAB_COUNTS: Record<number, number> = {
  1: 150,
  2: 150,
  3: 300,
  4: 600,
  5: 1300,
  6: 2500,
  7: 5000, // HSK7-9 combined
};

/** Cumulative words needed from scratch to reach a given HSK level */
export function cumulativeWordsForHsk(targetLevel: number): number {
  let total = 0;
  for (let l = 1; l <= targetLevel; l++) {
    total += HSK_VOCAB_COUNTS[l] ?? 0;
  }
  return total;
}

// ─── Types ────────────────────────────────────────────────────────────────

export type TrainingMode = 'standard' | 'coach_autonome' | 'parcours_inverse';

export interface ParcoursInverseConfig {
  target_hsk_level: number;    // 1-7
  deadline_date: string;       // YYYY-MM-DD
  current_hsk_level: number;   // estimated or user-declared
  created_at: string;          // ISO string
  words_already_known: number; // estimated from gamification data
}

export interface ParcoursInverseRoadmap {
  total_words_needed: number;
  words_remaining: number;
  total_weeks: number;
  weeks_elapsed: number;
  words_per_week: number;
  lessons_per_week: number;
  revisions_per_week: number;
  mock_exams_schedule: number[]; // week numbers when mock exams should be taken
  daily_study_minutes: number;
  delay_risk: 'on_track' | 'slight_delay' | 'at_risk' | 'critical';
  expected_completion_date: string;
  weekly_progress: WeeklyMilestone[];
}

export interface WeeklyMilestone {
  week_number: number;
  target_words_cumulative: number;
  target_hsk_checkpoint: number | null; // if this week completes an HSK level
  has_mock_exam: boolean;
  description: string;
}

export interface CoachAutonomeState {
  auto_activated: boolean;
  activated_at: string | null;     // ISO string when auto-activated
  dismissed_until: string | null;  // YYYY-MM-DD – user can snooze for a day
  prescribed_sessions: PrescribedSession[];
}

export interface PrescribedSession {
  id: string;
  type: 'revision' | 'lesson' | 'practice' | 'mock_exam';
  title: string;
  description: string;
  href: string;
  duration_minutes: number;
  xp_estimate: number;
  reason: string;
  urgency: 'critical' | 'high' | 'medium';
  memory_decay_percent: number; // estimated % of vocab forgotten
}

// ─── Store Interface ──────────────────────────────────────────────────────

export interface TrainingModeStore {
  // Active mode
  active_mode: TrainingMode;

  // Parcours Inversé
  parcours_config: ParcoursInverseConfig | null;
  parcours_words_learned_snapshot: number; // words learned since parcours started

  // Coach Autonome
  coach_state: CoachAutonomeState;

  // Actions
  setMode: (mode: TrainingMode) => void;
  configureParcours: (config: ParcoursInverseConfig) => void;
  updateParcoursProgress: (wordsLearned: number) => void;
  resetToStandard: () => void;
  activateCoachAutonome: () => void;
  dismissCoach: () => void;
  deactivateCoach: () => void;

  // Computed
  calculateRoadmap: () => ParcoursInverseRoadmap | null;
}

// ─── Roadmap Calculator ──────────────────────────────────────────────────

function computeRoadmap(
  config: ParcoursInverseConfig,
  additionalWordsLearned: number,
): ParcoursInverseRoadmap {
  const now = new Date();
  const deadline = new Date(config.deadline_date);
  const created = new Date(config.created_at);

  const totalDays = Math.max(1, Math.ceil((deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(1, totalDays - daysElapsed);

  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const weeksElapsed = Math.floor(daysElapsed / 7);

  // Calculate words
  const targetTotalWords = cumulativeWordsForHsk(config.target_hsk_level);
  const wordsKnown = config.words_already_known + additionalWordsLearned;
  const wordsRemaining = Math.max(0, targetTotalWords - wordsKnown);

  const weeksRemaining = Math.max(1, totalWeeks - weeksElapsed);
  const wordsPerWeek = Math.ceil(wordsRemaining / weeksRemaining);

  // Lessons: ~15 new words per lesson
  const lessonsPerWeek = Math.max(1, Math.ceil(wordsPerWeek / 15));

  // Revisions: 2-3 per week minimum + more if behind
  const revisionsPerWeek = Math.max(2, Math.min(5, Math.ceil(lessonsPerWeek * 0.7)));

  // Study time: ~3 min per new word + 1 min per revision word
  const dailyStudyMinutes = Math.max(10, Math.ceil((wordsPerWeek * 3 + wordsPerWeek * revisionsPerWeek * 0.5) / 7));

  // Mock exams schedule: every 4 weeks, plus before each HSK level transition
  const mockExamWeeks: number[] = [];
  let cumulativeTarget = 0;
  for (let w = 1; w <= totalWeeks; w++) {
    cumulativeTarget += wordsPerWeek;
    // Every 4 weeks
    if (w % 4 === 0) mockExamWeeks.push(w);
    // At HSK level boundaries
    for (let hsk = config.current_hsk_level + 1; hsk <= config.target_hsk_level; hsk++) {
      const wordsForThisHsk = cumulativeWordsForHsk(hsk) - config.words_already_known;
      const weekForThisHsk = Math.ceil((wordsForThisHsk / (targetTotalWords - config.words_already_known)) * totalWeeks);
      if (w === weekForThisHsk && !mockExamWeeks.includes(w)) {
        mockExamWeeks.push(w);
      }
    }
  }

  // Delay risk assessment
  const expectedProgress = (daysElapsed / totalDays);
  const actualProgress = wordsKnown / targetTotalWords;
  let delayRisk: ParcoursInverseRoadmap['delay_risk'] = 'on_track';
  if (daysElapsed > 7) { // Only assess after first week
    const ratio = actualProgress / Math.max(0.01, expectedProgress);
    if (ratio < 0.5) delayRisk = 'critical';
    else if (ratio < 0.7) delayRisk = 'at_risk';
    else if (ratio < 0.9) delayRisk = 'slight_delay';
  }

  // Weekly milestones
  const weeklyProgress: WeeklyMilestone[] = [];
  let runningWords = config.words_already_known;
  for (let w = 1; w <= totalWeeks; w++) {
    runningWords += wordsPerWeek;
    let checkpoint: number | null = null;
    for (let hsk = 1; hsk <= config.target_hsk_level; hsk++) {
      const needed = cumulativeWordsForHsk(hsk);
      if (runningWords >= needed && runningWords - wordsPerWeek < needed) {
        checkpoint = hsk;
      }
    }
    weeklyProgress.push({
      week_number: w,
      target_words_cumulative: Math.min(runningWords, targetTotalWords),
      target_hsk_checkpoint: checkpoint,
      has_mock_exam: mockExamWeeks.includes(w),
      description: checkpoint
        ? `Objectif HSK${checkpoint} atteint !`
        : mockExamWeeks.includes(w)
          ? 'Examen blanc programme'
          : `+${wordsPerWeek} mots`,
    });
  }

  return {
    total_words_needed: targetTotalWords,
    words_remaining: wordsRemaining,
    total_weeks: totalWeeks,
    weeks_elapsed: weeksElapsed,
    words_per_week: wordsPerWeek,
    lessons_per_week: lessonsPerWeek,
    revisions_per_week: revisionsPerWeek,
    mock_exams_schedule: mockExamWeeks,
    daily_study_minutes: dailyStudyMinutes,
    delay_risk: delayRisk,
    expected_completion_date: config.deadline_date,
    weekly_progress: weeklyProgress,
  };
}

// ─── Ebbinghaus Forgetting Curve ─────────────────────────────────────────
// R = e^(-t/S) where t = time (days), S = stability (default ~14 for new vocab)
export function estimateMemoryDecay(daysSinceLastReview: number, stability: number = 14): number {
  const retention = Math.exp(-daysSinceLastReview / stability);
  return Math.round((1 - retention) * 100); // % forgotten
}

// ─── Store ────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  active_mode: 'standard' as TrainingMode,
  parcours_config: null as ParcoursInverseConfig | null,
  parcours_words_learned_snapshot: 0,
  coach_state: {
    auto_activated: false,
    activated_at: null,
    dismissed_until: null,
    prescribed_sessions: [],
  } as CoachAutonomeState,
};

export const useTrainingModeStore = create<TrainingModeStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setMode: (mode) => {
        set({ active_mode: mode });
        // If switching away from coach, deactivate it
        if (mode !== 'coach_autonome') {
          set(s => ({
            coach_state: { ...s.coach_state, auto_activated: false, activated_at: null },
          }));
        }
      },

      configureParcours: (config) => {
        set({
          active_mode: 'parcours_inverse',
          parcours_config: config,
          parcours_words_learned_snapshot: 0,
        });
      },

      updateParcoursProgress: (wordsLearned) => {
        set({ parcours_words_learned_snapshot: wordsLearned });
      },

      resetToStandard: () => {
        set({
          active_mode: 'standard',
          parcours_config: null,
          parcours_words_learned_snapshot: 0,
          coach_state: { ...INITIAL_STATE.coach_state },
        });
      },

      activateCoachAutonome: () => {
        set({
          active_mode: 'coach_autonome',
          coach_state: {
            auto_activated: true,
            activated_at: new Date().toISOString(),
            dismissed_until: null,
            prescribed_sessions: [],
          },
        });
      },

      dismissCoach: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        set(s => ({
          coach_state: {
            ...s.coach_state,
            dismissed_until: tomorrow.toISOString().split('T')[0],
          },
        }));
      },

      deactivateCoach: () => {
        set({
          active_mode: 'standard',
          coach_state: { ...INITIAL_STATE.coach_state },
        });
      },

      calculateRoadmap: () => {
        const state = get();
        if (!state.parcours_config) return null;
        return computeRoadmap(state.parcours_config, state.parcours_words_learned_snapshot);
      },
    }),
    {
      name: 'lingullio-training-mode',
      partialize: (state) => ({
        active_mode: state.active_mode,
        parcours_config: state.parcours_config,
        parcours_words_learned_snapshot: state.parcours_words_learned_snapshot,
        coach_state: state.coach_state,
      }),
    }
  )
);
