'use client';

// ─── SyncProvider ─────────────────────────────────────────────────────
// Top-level component that handles:
// 1. Check if user is authenticated
// 2. Pull server data on login
// 3. Merge server data into local Zustand stores
// 4. Show subtle sync status indicator
//
// Place this in the learner layout so it runs on every page load.

import { useEffect, useRef, useState } from 'react';
import { syncManager, type PullResult } from '@/lib/sync/sync-manager';
import { useUserKnowledgeStore } from '@/stores/user-knowledge-store';
import { useGamificationStore } from '@/stores/gamification-store';
import { useTrainingModeStore } from '@/stores/training-mode-store';
import type { KnowledgeItem } from '@/stores/user-knowledge-store';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const hasInitialized = useRef(false);

  // Store actions (stable references)
  const hydrateKnowledge = useUserKnowledgeStore(s => s.hydrateFromServer);
  const hydrateGamification = useGamificationStore(s => s.hydrateFromServer);
  const hydrateTrainingMode = useTrainingModeStore(s => s.hydrateFromServer);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initSync() {
      setSyncStatus('syncing');

      // 1. Check authentication
      const isAuth = await syncManager.checkAuth();
      
      if (!isAuth) {
        // Not logged in — offline/demo mode, no sync
        setSyncStatus('offline');
        return;
      }

      // 2. Pull all data from server
      const pullResult = await syncManager.pullAll();

      if (!pullResult) {
        setSyncStatus('offline');
        return;
      }

      // 3. Merge server data into local stores
      mergeServerData(pullResult);

      setSyncStatus('synced');

      // 4. After merge, push local data back to server
      // (in case local had newer data that server didn't have)
      const knowledgeState = useUserKnowledgeStore.getState();
      const gamificationState = useGamificationStore.getState();
      const trainingModeState = useTrainingModeStore.getState();

      // Push back merged state
      syncManager.pushKnowledge(knowledgeState.items, knowledgeState.last_updated);
      syncManager.pushGamification({
        total_xp: gamificationState.total_xp,
        level: gamificationState.level,
        streak_days: gamificationState.streak_days,
        longest_streak: gamificationState.longest_streak,
        badges_unlocked: gamificationState.badges_unlocked,
        perfect_sessions: gamificationState.perfect_sessions,
        total_exercises: gamificationState.total_exercises,
        total_correct: gamificationState.total_correct,
        total_study_minutes: gamificationState.total_study_minutes,
        last_activity_date: gamificationState.last_activity_date,
        daily_exercises: gamificationState.daily_exercises,
        daily_correct: gamificationState.daily_correct,
        daily_xp: gamificationState.daily_xp,
        sessions_history: gamificationState.sessions_history,
      });
      syncManager.pushTrainingMode({
        active_mode: trainingModeState.active_mode,
        parcours_config: trainingModeState.parcours_config,
        parcours_words_learned_snapshot: trainingModeState.parcours_words_learned_snapshot,
        coach_state: trainingModeState.coach_state,
      });

      // 5. Also sync placement result if it exists locally but not on server
      if (!pullResult.placement) {
        const localPlacement = typeof window !== 'undefined'
          ? localStorage.getItem('lingullio_placement_result')
          : null;
        if (localPlacement) {
          try {
            const parsed = JSON.parse(localPlacement);
            await syncManager.pushPlacement({
              result_data: parsed,
              recommended_level: parsed.recommended_start || parsed.recommended_level,
              total_score: parsed.total_score,
              profile_answers: parsed.profile_answers,
            });
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    initSync();

    // Flush on page unload
    const handleBeforeUnload = () => {
      syncManager.flushAll();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hydrateKnowledge, hydrateGamification, hydrateTrainingMode]);

  function mergeServerData(data: PullResult) {
    // Merge knowledge items
    if (data.knowledge && data.knowledge.count > 0) {
      hydrateKnowledge(data.knowledge.items as Record<string, KnowledgeItem>);
    }

    // Merge gamification
    if (data.gamification) {
      hydrateGamification({
        ...data.gamification,
        sessions_history: data.gamification.sessions_history as Parameters<typeof hydrateGamification>[0]['sessions_history'],
      });
    }

    // Merge training mode
    if (data.training_mode) {
      hydrateTrainingMode(data.training_mode as Parameters<typeof hydrateTrainingMode>[0]);
    }

    // Hydrate placement result into localStorage (if server has it but local doesn't)
    if (data.placement?.result) {
      const localPlacement = localStorage.getItem('lingullio_placement_result');
      if (!localPlacement) {
        localStorage.setItem('lingullio_placement_result', JSON.stringify(data.placement.result));
      }
    }
  }

  return (
    <>
      {children}
      {/* Subtle sync indicator - only shows during active sync */}
      {syncStatus === 'syncing' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs text-gray-500">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          Syncing...
        </div>
      )}
    </>
  );
}
