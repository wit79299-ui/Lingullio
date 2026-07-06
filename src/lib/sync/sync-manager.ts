// ─── SyncManager ──────────────────────────────────────────────────────
// Client-side orchestrator for Supabase progression sync.
//
// Architecture:
//   - On login/app start: pull all data from server, merge with local
//   - On each store mutation: debounced push to server
//   - Offline-first: local stores always work, sync when possible
//   - Conflict resolution: merge strategy (max of counters, union of arrays)
//
// Usage in stores:
//   import { syncManager } from '@/lib/sync/sync-manager';
//   // After mutation:
//   syncManager.pushKnowledge(get().items, get().last_updated);

'use client';

// ─── Config ──────────────────────────────────────────────────────────

const SYNC_DEBOUNCE_MS = 2000;     // Debounce writes by 2s
const SYNC_RETRY_DELAY_MS = 5000;  // Retry failed syncs after 5s
const MAX_RETRIES = 3;

// ─── Types ──────────────────────────────────────────────────────────

interface SyncState {
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

type SyncTarget = 'knowledge' | 'gamification' | 'training-mode' | 'placement';

// ─── SyncManager Class ───────────────────────────────────────────────

class SyncManager {
  private state: SyncState = {
    isAuthenticated: false,
    isSyncing: false,
    lastSyncAt: null,
    error: null,
  };

  private debounceTimers: Map<SyncTarget, ReturnType<typeof setTimeout>> = new Map();
  private retryCounters: Map<SyncTarget, number> = new Map();
  private pendingPayloads: Map<SyncTarget, unknown> = new Map();
  private listeners: Set<(state: SyncState) => void> = new Set();

  // ── State Management ─────────────────────────────────────────────

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.getState()));
  }

  // ── Auth Check ───────────────────────────────────────────────────

  /**
   * Check if user is authenticated by calling /api/user/profile.
   * If not authenticated, sync is disabled (offline-only mode).
   */
  async checkAuth(): Promise<boolean> {
    try {
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      this.state.isAuthenticated = res.ok;
    } catch {
      this.state.isAuthenticated = false;
    }
    this.notify();
    return this.state.isAuthenticated;
  }

  setAuthenticated(value: boolean) {
    this.state.isAuthenticated = value;
    this.notify();
  }

  // ── Full Pull (on login) ─────────────────────────────────────────

  /**
   * Pull all progression data from server and merge into local stores.
   * Called on app startup when user is authenticated.
   * Returns the server data for stores to merge locally.
   */
  async pullAll(): Promise<PullResult | null> {
    if (!this.state.isAuthenticated) return null;

    this.state.isSyncing = true;
    this.state.error = null;
    this.notify();

    try {
      const res = await fetch('/api/sync/pull', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          this.state.isAuthenticated = false;
          this.notify();
          return null;
        }
        throw new Error(`Pull failed: ${res.status}`);
      }

      const data = await res.json();
      this.state.lastSyncAt = data.pulled_at;
      this.state.isSyncing = false;
      this.state.error = null;
      this.notify();

      return data as PullResult;
    } catch (err) {
      console.error('[SyncManager] Pull error:', err);
      this.state.isSyncing = false;
      this.state.error = (err as Error).message;
      this.notify();
      return null;
    }
  }

  // ── Debounced Push Methods ───────────────────────────────────────

  /**
   * Push knowledge items (debounced).
   * Called after every recordSeen/recordAttempt/registerItems.
   */
  pushKnowledge(items: Record<string, unknown>, lastUpdated: string | null) {
    this.debouncedPush('knowledge', { items, last_updated: lastUpdated });
  }

  /**
   * Push gamification state (debounced).
   * Called after finishSessionLocal / addXp.
   */
  pushGamification(state: Record<string, unknown>) {
    this.debouncedPush('gamification', state);
  }

  /**
   * Push training mode config (debounced).
   * Called after setMode / configureParcours / etc.
   */
  pushTrainingMode(state: Record<string, unknown>) {
    this.debouncedPush('training-mode', state);
  }

  /**
   * Push placement result (immediate, no debounce).
   * Called once when placement test is completed.
   */
  async pushPlacement(data: Record<string, unknown>): Promise<boolean> {
    if (!this.state.isAuthenticated) return false;

    try {
      const res = await fetch('/api/sync/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      return res.ok;
    } catch (err) {
      console.error('[SyncManager] Placement push error:', err);
      return false;
    }
  }

  // ── Internal Debounce Logic ──────────────────────────────────────

  private debouncedPush(target: SyncTarget, payload: unknown) {
    if (!this.state.isAuthenticated) return;

    // Store latest payload
    this.pendingPayloads.set(target, payload);

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(target);
    if (existingTimer) clearTimeout(existingTimer);

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.executePush(target);
    }, SYNC_DEBOUNCE_MS);

    this.debounceTimers.set(target, timer);
  }

  private async executePush(target: SyncTarget) {
    const payload = this.pendingPayloads.get(target);
    if (!payload) return;

    this.pendingPayloads.delete(target);
    this.debounceTimers.delete(target);

    try {
      const res = await fetch(`/api/sync/${target}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.retryCounters.delete(target);
        this.state.lastSyncAt = new Date().toISOString();
        this.state.error = null;
        this.notify();
        console.debug(`[SyncManager] ${target} synced successfully`);
      } else if (res.status === 401) {
        this.state.isAuthenticated = false;
        this.notify();
      } else {
        throw new Error(`Push ${target} failed: ${res.status}`);
      }
    } catch (err) {
      console.warn(`[SyncManager] ${target} push failed:`, err);
      
      // Retry logic
      const retries = (this.retryCounters.get(target) || 0) + 1;
      this.retryCounters.set(target, retries);

      if (retries <= MAX_RETRIES) {
        // Re-queue the payload for retry
        this.pendingPayloads.set(target, payload);
        const timer = setTimeout(() => {
          this.executePush(target);
        }, SYNC_RETRY_DELAY_MS * retries);
        this.debounceTimers.set(target, timer);
      } else {
        this.state.error = `Sync ${target} failed after ${MAX_RETRIES} retries`;
        this.notify();
        this.retryCounters.delete(target);
      }
    }
  }

  // ── Flush (force immediate sync of all pending) ──────────────────

  async flushAll(): Promise<void> {
    // Clear all debounce timers and push immediately
    for (const [target, timer] of this.debounceTimers) {
      clearTimeout(timer);
      this.debounceTimers.delete(target);
      await this.executePush(target);
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  destroy() {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingPayloads.clear();
    this.listeners.clear();
  }
}

// ─── Types ──────────────────────────────────────────────────────────

export interface PullResult {
  knowledge: {
    items: Record<string, unknown>;
    count: number;
  };
  gamification: {
    total_xp: number;
    level: number;
    streak_days: number;
    longest_streak: number;
    badges_unlocked: string[];
    perfect_sessions: number;
    total_exercises: number;
    total_correct: number;
    total_study_minutes: number;
    last_activity_date: string | null;
    daily_exercises: number;
    daily_correct: number;
    daily_xp: number;
    sessions_history: unknown[];
  } | null;
  training_mode: {
    active_mode: string;
    parcours_config: unknown;
    parcours_words_learned_snapshot: number;
    coach_state: unknown;
  };
  placement: {
    result: unknown;
    recommended_level: string | null;
    total_score: number | null;
    completed_at: string;
  } | null;
  sync_version: number;
  pulled_at: string;
}

// ─── Singleton Export ────────────────────────────────────────────────

export const syncManager = new SyncManager();
