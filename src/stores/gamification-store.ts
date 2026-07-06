// ─── Gamification Store ──────────────────────────────────────────────────
// Zustand store for gamification state. In DEMO mode, persists to localStorage.
// In production mode, syncs with Supabase via progress-service.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { XP_CONFIG, levelFromXp, levelTitle } from '@/lib/gamification/xp-config';
import { BADGES, checkNewBadges, type UserBadgeStats, type BadgeDefinition } from '@/lib/gamification/badges';
import type { AttemptPayload, SessionSummary, GamificationState } from '@/lib/gamification/progress-service';
import { syncManager } from '@/lib/sync/sync-manager';

// ─── Types ──────────────────────────────────────────────────────────────

export interface GamificationStore {
  // State
  total_xp: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  badges_unlocked: string[];
  perfect_sessions: number;
  total_exercises: number;
  total_correct: number;
  total_study_minutes: number;
  last_activity_date: string | null; // YYYY-MM-DD
  daily_exercises: number;
  daily_correct: number;
  daily_xp: number;
  sessions_history: SessionHistoryEntry[];
  
  // Pending notifications
  pending_notifications: GamificationNotification[];

  // Actions
  finishSessionLocal: (attempts: AttemptPayload[], sessionTimeSeconds: number) => SessionSummary;
  addXp: (amount: number, reason: string) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  getStats: () => UserBadgeStats;
  getLevelInfo: () => { level: number; currentXp: number; nextLevelXp: number; progress: number; title: string };
  reset: () => void;
  hydrateFromServer: (serverState: Partial<GamificationStore>) => void;
}

export interface SessionHistoryEntry {
  date: string; // YYYY-MM-DD
  xp_earned: number;
  exercises_done: number;
  correct_count: number;
  time_seconds: number;
  percentage: number;
}

export interface GamificationNotification {
  id: string;
  type: 'xp' | 'level_up' | 'badge' | 'streak' | 'perfect';
  title: string;
  description: string;
  icon?: string;
  xp_amount?: number;
  badge?: BadgeDefinition;
  new_level?: number;
  created_at: number;
}

// ─── Initial State ──────────────────────────────────────────────────────

const INITIAL_STATE = {
  total_xp: 0,
  level: 1,
  streak_days: 0,
  longest_streak: 0,
  badges_unlocked: [] as string[],
  perfect_sessions: 0,
  total_exercises: 0,
  total_correct: 0,
  total_study_minutes: 0,
  last_activity_date: null as string | null,
  daily_exercises: 0,
  daily_correct: 0,
  daily_xp: 0,
  sessions_history: [] as SessionHistoryEntry[],
  pending_notifications: [] as GamificationNotification[],
};

// ─── Store ──────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ─── Finish session (DEMO / offline mode) ──────────────────────
      finishSessionLocal: (attempts, sessionTimeSeconds) => {
        const state = get();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Reset daily counters if new day
        let dailyExercises = state.daily_exercises;
        let dailyCorrect = state.daily_correct;
        let dailyXp = state.daily_xp;
        if (state.last_activity_date !== todayStr) {
          dailyExercises = 0;
          dailyCorrect = 0;
          dailyXp = 0;
        }

        const levelBefore = state.level;
        let xpEarned = 0;
        let totalXp = state.total_xp;

        // ── Calculate XP ──
        const correctCount = attempts.filter(a => a.is_correct).length;
        const totalCount = attempts.length;
        const isPerfect = correctCount === totalCount && totalCount > 0;

        // Base XP per exercise
        attempts.forEach(a => {
          xpEarned += a.is_correct ? XP_CONFIG.exercise_correct : XP_CONFIG.exercise_incorrect;
        });

        // Perfect session bonus
        if (isPerfect && totalCount >= 3) {
          xpEarned += XP_CONFIG.perfect_session;
        }

        // Speed bonus
        const avgTime = sessionTimeSeconds / Math.max(1, totalCount);
        if (avgTime < 10 && correctCount > totalCount * 0.8) {
          xpEarned += XP_CONFIG.speed_bonus;
        }

        // ── Update streak ──
        let streakDays = state.streak_days;
        let longestStreak = state.longest_streak;

        if (state.last_activity_date !== todayStr) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (state.last_activity_date === yesterdayStr) {
            streakDays += 1;
            xpEarned += XP_CONFIG.streak_day_bonus;
          } else if (!state.last_activity_date || state.last_activity_date < yesterdayStr) {
            streakDays = 1;
          }
          // First login bonus
          xpEarned += XP_CONFIG.first_login_of_day;
        }

        if (streakDays > longestStreak) {
          longestStreak = streakDays;
        }

        // ── Update totals ──
        totalXp += xpEarned;
        const perfectSessions = state.perfect_sessions + (isPerfect ? 1 : 0);
        const totalExercises = state.total_exercises + totalCount;
        const totalCorrect = state.total_correct + correctCount;
        const totalStudyMinutes = state.total_study_minutes + Math.ceil(sessionTimeSeconds / 60);

        // ── Check badges ──
        const badgeStats: UserBadgeStats = {
          total_exercises: totalExercises,
          total_correct: totalCorrect,
          streak_days: streakDays,
          longest_streak: longestStreak,
          total_xp: totalXp,
          level: levelFromXp(totalXp).level,
          mock_exams_taken: 0,
          mock_exams_passed: 0,
          vocab_mastered: 0,
          chars_mastered: 0,
          grammar_mastered: 0,
          total_study_minutes: totalStudyMinutes,
          perfect_sessions: perfectSessions,
          lessons_completed: 0,
          days_active: 0,
          levels_completed: [],
        };

        const newBadges = checkNewBadges(badgeStats, state.badges_unlocked);
        const newBadgeIds = newBadges.map(b => b.id);
        const allBadges = [...state.badges_unlocked, ...newBadgeIds];

        // Badge XP
        newBadges.forEach(b => {
          xpEarned += b.xp_reward;
          totalXp += b.xp_reward;
        });

        const finalLevel = levelFromXp(totalXp).level;
        const levelUp = finalLevel > levelBefore;

        // ── Build notifications ──
        const notifications: GamificationNotification[] = [];
        const ts = Date.now();

        // XP notification
        notifications.push({
          id: `xp-${ts}`,
          type: 'xp',
          title: `+${xpEarned} XP`,
          description: `${correctCount}/${totalCount} correct`,
          xp_amount: xpEarned,
          created_at: ts,
        });

        // Level up
        if (levelUp) {
          notifications.push({
            id: `lvl-${ts}`,
            type: 'level_up',
            title: `Level ${finalLevel}!`,
            description: levelTitle(finalLevel),
            new_level: finalLevel,
            icon: '🎉',
            created_at: ts + 1,
          });
        }

        // Perfect session
        if (isPerfect && totalCount >= 3) {
          notifications.push({
            id: `perfect-${ts}`,
            type: 'perfect',
            title: 'Perfect session!',
            description: `${totalCount}/${totalCount} - +${XP_CONFIG.perfect_session} XP bonus`,
            icon: '✨',
            created_at: ts + 2,
          });
        }

        // New badges
        newBadges.forEach((badge, i) => {
          notifications.push({
            id: `badge-${badge.id}-${ts}`,
            type: 'badge',
            title: badge.name_fr,
            description: badge.description_fr,
            icon: badge.icon,
            badge,
            xp_amount: badge.xp_reward,
            created_at: ts + 3 + i,
          });
        });

        // Streak milestones
        if (streakDays > (state.streak_days || 0) && [3, 7, 14, 30, 60, 100].includes(streakDays)) {
          notifications.push({
            id: `streak-${streakDays}-${ts}`,
            type: 'streak',
            title: `${streakDays} days in a row!`,
            description: `Record: ${longestStreak} days`,
            icon: '🔥',
            created_at: ts + 10,
          });
        }

        // ── Session history ──
        const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
        const historyEntry: SessionHistoryEntry = {
          date: todayStr,
          xp_earned: xpEarned,
          exercises_done: totalCount,
          correct_count: correctCount,
          time_seconds: sessionTimeSeconds,
          percentage,
        };

        // Keep last 90 entries
        const history = [...state.sessions_history, historyEntry].slice(-90);

        // ── Commit state ──
        const newState = {
          total_xp: totalXp,
          level: finalLevel,
          streak_days: streakDays,
          longest_streak: longestStreak,
          badges_unlocked: allBadges,
          perfect_sessions: perfectSessions,
          total_exercises: totalExercises,
          total_correct: totalCorrect,
          total_study_minutes: totalStudyMinutes,
          last_activity_date: todayStr,
          daily_exercises: dailyExercises + totalCount,
          daily_correct: dailyCorrect + correctCount,
          daily_xp: dailyXp + xpEarned,
          sessions_history: history,
          pending_notifications: [...state.pending_notifications, ...notifications],
        };
        set(newState);

        // Sync to server (debounced)
        syncManager.pushGamification({
          total_xp: totalXp,
          level: finalLevel,
          streak_days: streakDays,
          longest_streak: longestStreak,
          badges_unlocked: allBadges,
          perfect_sessions: perfectSessions,
          total_exercises: totalExercises,
          total_correct: totalCorrect,
          total_study_minutes: totalStudyMinutes,
          last_activity_date: todayStr,
          daily_exercises: dailyExercises + totalCount,
          daily_correct: dailyCorrect + correctCount,
          daily_xp: dailyXp + xpEarned,
          sessions_history: history,
        });

        return {
          xp_earned: xpEarned,
          streak_days: streakDays,
          new_badges: newBadgeIds,
          level_before: levelBefore,
          level_after: finalLevel,
          level_up: levelUp,
          total_xp: totalXp,
        };
      },

      addXp: (amount, reason) => {
        const state = get();
        const totalXp = state.total_xp + amount;
        const newLevel = levelFromXp(totalXp).level;
        const notifications: GamificationNotification[] = [];

        if (newLevel > state.level) {
          notifications.push({
            id: `lvl-${Date.now()}`,
            type: 'level_up',
            title: `Level ${newLevel}!`,
            description: levelTitle(newLevel),
            new_level: newLevel,
            icon: '🎉',
            created_at: Date.now(),
          });
        }

        set({
          total_xp: totalXp,
          level: newLevel,
          pending_notifications: [...state.pending_notifications, ...notifications],
        });

        // Sync to server
        const updated = get();
        syncManager.pushGamification({
          total_xp: updated.total_xp,
          level: updated.level,
          streak_days: updated.streak_days,
          longest_streak: updated.longest_streak,
          badges_unlocked: updated.badges_unlocked,
          perfect_sessions: updated.perfect_sessions,
          total_exercises: updated.total_exercises,
          total_correct: updated.total_correct,
          total_study_minutes: updated.total_study_minutes,
          last_activity_date: updated.last_activity_date,
          daily_exercises: updated.daily_exercises,
          daily_correct: updated.daily_correct,
          daily_xp: updated.daily_xp,
          sessions_history: updated.sessions_history,
        });
      },

      dismissNotification: (id) => {
        set(s => ({ pending_notifications: s.pending_notifications.filter(n => n.id !== id) }));
      },

      clearNotifications: () => {
        set({ pending_notifications: [] });
      },

      getStats: () => {
        const s = get();
        return {
          total_exercises: s.total_exercises,
          total_correct: s.total_correct,
          streak_days: s.streak_days,
          longest_streak: s.longest_streak,
          total_xp: s.total_xp,
          level: s.level,
          mock_exams_taken: 0,
          mock_exams_passed: 0,
          vocab_mastered: 0,
          chars_mastered: 0,
          grammar_mastered: 0,
          total_study_minutes: s.total_study_minutes,
          perfect_sessions: s.perfect_sessions,
          lessons_completed: 0,
          days_active: new Set(s.sessions_history.map(h => h.date)).size,
          levels_completed: [],
        };
      },

      getLevelInfo: () => {
        const s = get();
        const info = levelFromXp(s.total_xp);
        return { ...info, title: levelTitle(info.level) };
      },

      reset: () => set(INITIAL_STATE),

      // ── Hydrate from server data ─────────────────────────────────
      hydrateFromServer: (serverState) => {
        set((state) => {
          // Merge strategy: take the maximum of counters
          return {
            total_xp: Math.max(state.total_xp, serverState.total_xp || 0),
            level: Math.max(state.level, serverState.level || 1),
            streak_days: Math.max(state.streak_days, serverState.streak_days || 0),
            longest_streak: Math.max(state.longest_streak, serverState.longest_streak || 0),
            badges_unlocked: [...new Set([...state.badges_unlocked, ...(serverState.badges_unlocked || [])])],
            perfect_sessions: Math.max(state.perfect_sessions, serverState.perfect_sessions || 0),
            total_exercises: Math.max(state.total_exercises, serverState.total_exercises || 0),
            total_correct: Math.max(state.total_correct, serverState.total_correct || 0),
            total_study_minutes: Math.max(state.total_study_minutes, serverState.total_study_minutes || 0),
            last_activity_date: [state.last_activity_date, serverState.last_activity_date]
              .filter(Boolean)
              .sort()
              .pop() || null,
            daily_exercises: serverState.daily_exercises ?? state.daily_exercises,
            daily_correct: serverState.daily_correct ?? state.daily_correct,
            daily_xp: serverState.daily_xp ?? state.daily_xp,
            sessions_history: serverState.sessions_history 
              ? (serverState.sessions_history as typeof state.sessions_history)
              : state.sessions_history,
          };
        });
      },
    }),
    {
      name: 'lingullio-gamification',
      partialize: (state) => ({
        total_xp: state.total_xp,
        level: state.level,
        streak_days: state.streak_days,
        longest_streak: state.longest_streak,
        badges_unlocked: state.badges_unlocked,
        perfect_sessions: state.perfect_sessions,
        total_exercises: state.total_exercises,
        total_correct: state.total_correct,
        total_study_minutes: state.total_study_minutes,
        last_activity_date: state.last_activity_date,
        daily_exercises: state.daily_exercises,
        daily_correct: state.daily_correct,
        daily_xp: state.daily_xp,
        sessions_history: state.sessions_history,
      }),
    }
  )
);
