// ─── User Knowledge Map Store ──────────────────────────────────────────────
// The brain of Lingullio. Tracks every vocabulary item, character, and grammar
// point the user has ever encountered. Stores SRS state (SM-2), mastery level,
// and per-item history. Persisted to localStorage via Zustand persist.
//
// This store is the single source of truth for:
//  - "Which words does the user know?"
//  - "Which items are due for SRS review?"
//  - "What are the user's weak areas?"
//  - "How many words has the user mastered for Parcours Inversé?"

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateSRS, createNewSRSItem, isDue, isMastered, reviewPriority } from '@/lib/gamification/srs-engine';
import type { SRSItem } from '@/lib/gamification/srs-engine';
import { syncManager } from '@/lib/sync/sync-manager';

// ─── Types ──────────────────────────────────────────────────────────────

export type ContentItemType = 'vocabulary' | 'character' | 'grammar';

export type MasteryLevel = 'unknown' | 'seen' | 'learning' | 'familiar' | 'mastered';

export interface KnowledgeItem {
  // Identity
  item_id: string;         // vocabulary_id, character_id, or grammar_point_id
  item_type: ContentItemType;
  level: string;       // "1", "2", ..., "7"

  // Display info (cached for offline/fast access)
  display: string;         // simplified character or pattern (e.g. "你好", "人", "虽然…但是…")
  pinyin: string;
  meaning: string;         // translated meaning
  audio_url?: string | null;
  theme?: string | null;   // vocabulary theme

  // SRS State (SM-2)
  srs: SRSItem;

  // Mastery
  mastery: MasteryLevel;

  // History
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  last_seen_at: string | null;        // ISO date
  first_seen_at: string;              // ISO date
  last_correct_at: string | null;     // ISO date
  last_incorrect_at: string | null;   // ISO date

  // Context
  source_lesson_ids: string[];        // which lessons exposed this item
  source_exercise_ids: string[];      // which exercises tested this item (last 10)
}

export interface KnowledgeStats {
  total_items: number;
  by_mastery: Record<MasteryLevel, number>;
  by_type: Record<ContentItemType, number>;
  by_hsk: Record<string, { total: number; mastered: number; learning: number; unknown: number }>;
  due_for_review: number;
  weakest_items: KnowledgeItem[];     // bottom 10 by accuracy
  mastered_count: number;
}

export interface ReviewQueue {
  items: KnowledgeItem[];
  overdue_count: number;
  due_today_count: number;
  upcoming_count: number;             // due in next 24h
}

// ─── Store Interface ────────────────────────────────────────────────────

export interface UserKnowledgeStore {
  // Data
  items: Record<string, KnowledgeItem>;  // keyed by item_id
  last_updated: string | null;

  // ── Record Actions ──
  /** Record that the user encountered an item (saw it in a lesson, flashcard, etc.) */
  recordSeen: (params: RecordSeenParams) => void;

  /** Record an exercise attempt on an item */
  recordAttempt: (params: RecordAttemptParams) => void;

  /** Bulk-register items from a lesson (when user starts exercises, we know which vocab is involved) */
  registerItems: (items: RegisterItemParams[]) => void;

  // ── Query Actions ──
  /** Get all items due for SRS review, sorted by priority */
  getReviewQueue: (filters?: ReviewFilters) => ReviewQueue;

  /** Get items by mastery level */
  getByMastery: (mastery: MasteryLevel, hskLevel?: string) => KnowledgeItem[];

  /** Get overall knowledge stats */
  getStats: () => KnowledgeStats;

  /** Get count of truly mastered words (for Parcours Inversé) */
  getMasteredWordCount: (maxHskLevel?: number) => number;

  /** Get items at risk of being forgotten (SRS overdue + low mastery) */
  getAtRiskItems: (limit?: number) => KnowledgeItem[];

  /** Get items for a specific HSK level */
  getByHskLevel: (hskLevel: string) => KnowledgeItem[];

  /** Get weakest items (lowest accuracy, min 3 attempts) */
  getWeakestItems: (limit?: number) => KnowledgeItem[];

  /** Lookup a single item */
  getItem: (itemId: string) => KnowledgeItem | null;

  /** Reset all knowledge */
  reset: () => void;

  /** Hydrate store from server data (called on login) */
  hydrateFromServer: (serverItems: Record<string, KnowledgeItem>) => void;
}

// ─── Param Types ────────────────────────────────────────────────────────

export interface RecordSeenParams {
  item_id: string;
  item_type: ContentItemType;
  level: string;
  display: string;
  pinyin: string;
  meaning: string;
  audio_url?: string | null;
  theme?: string | null;
  source_lesson_id?: string;
}

export interface RecordAttemptParams {
  item_id: string;
  item_type: ContentItemType;
  level: string;
  display: string;
  pinyin: string;
  meaning: string;
  audio_url?: string | null;
  theme?: string | null;
  is_correct: boolean;
  time_spent_seconds: number;
  hint_used?: boolean;
  source_exercise_id?: string;
  source_lesson_id?: string;
}

export interface RegisterItemParams {
  item_id: string;
  item_type: ContentItemType;
  level: string;
  display: string;
  pinyin: string;
  meaning: string;
  audio_url?: string | null;
  theme?: string | null;
  source_lesson_id?: string;
}

export interface ReviewFilters {
  item_type?: ContentItemType;
  level?: string;
  limit?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function computeMastery(item: KnowledgeItem): MasteryLevel {
  if (item.times_seen === 0) return 'unknown';
  if (item.times_seen === 1 && item.times_correct === 0) return 'seen';

  const accuracy = item.times_seen > 0
    ? item.times_correct / item.times_seen
    : 0;

  if (isMastered(item.srs) && accuracy >= 0.8) return 'mastered';
  if (item.srs.interval_days >= 7 && accuracy >= 0.7) return 'familiar';
  if (item.times_seen >= 2) return 'learning';
  return 'seen';
}

function createKnowledgeItem(params: RegisterItemParams): KnowledgeItem {
  const now = new Date().toISOString();
  return {
    item_id: params.item_id,
    item_type: params.item_type,
    level: params.level,
    display: params.display,
    pinyin: params.pinyin,
    meaning: params.meaning,
    audio_url: params.audio_url ?? null,
    theme: params.theme ?? null,
    srs: createNewSRSItem(),
    mastery: 'unknown',
    times_seen: 0,
    times_correct: 0,
    times_incorrect: 0,
    last_seen_at: null,
    first_seen_at: now,
    last_correct_at: null,
    last_incorrect_at: null,
    source_lesson_ids: params.source_lesson_id ? [params.source_lesson_id] : [],
    source_exercise_ids: [],
  };
}

/** Convert exercise correctness + time to SRS quality (0-5) */
function toSrsQuality(isCorrect: boolean, timeSeconds: number, hintUsed: boolean = false): number {
  if (!isCorrect) return hintUsed ? 0 : 1;
  if (hintUsed) return 3;
  if (timeSeconds > 30) return 3;
  if (timeSeconds > 15) return 4;
  return 5;
}

// ─── Store ──────────────────────────────────────────────────────────────

export const useUserKnowledgeStore = create<UserKnowledgeStore>()(
  persist(
    (set, get) => ({
      items: {},
      last_updated: null,

      // ── Record: item seen ─────────────────────────────────────────
      recordSeen: (params) => {
        set((state) => {
          const existing = state.items[params.item_id];
          const now = new Date().toISOString();

          if (existing) {
            // Update existing
            const updated: KnowledgeItem = {
              ...existing,
              last_seen_at: now,
              times_seen: existing.times_seen + 1,
              // Update cached display info
              display: params.display || existing.display,
              pinyin: params.pinyin || existing.pinyin,
              meaning: params.meaning || existing.meaning,
              audio_url: params.audio_url ?? existing.audio_url,
              theme: params.theme ?? existing.theme,
              source_lesson_ids: params.source_lesson_id
                ? [...new Set([...existing.source_lesson_ids, params.source_lesson_id])]
                : existing.source_lesson_ids,
            };
            updated.mastery = computeMastery(updated);
            const newState = {
              items: { ...state.items, [params.item_id]: updated },
              last_updated: now,
            };
            // Sync to server (debounced)
            syncManager.pushKnowledge(newState.items, now);
            return newState;
          }

          // Create new
          const newItem = createKnowledgeItem(params);
          newItem.times_seen = 1;
          newItem.last_seen_at = now;
          newItem.mastery = 'seen';
          const newState = {
            items: { ...state.items, [params.item_id]: newItem },
            last_updated: now,
          };
          // Sync to server (debounced)
          syncManager.pushKnowledge(newState.items, now);
          return newState;
        });
      },

      // ── Record: exercise attempt ──────────────────────────────────
      recordAttempt: (params) => {
        set((state) => {
          const now = new Date().toISOString();
          let item = state.items[params.item_id];

          if (!item) {
            // First encounter via exercise
            item = createKnowledgeItem({
              item_id: params.item_id,
              item_type: params.item_type,
              level: params.level,
              display: params.display,
              pinyin: params.pinyin,
              meaning: params.meaning,
              audio_url: params.audio_url,
              theme: params.theme,
              source_lesson_id: params.source_lesson_id,
            });
          }

          // Update SRS
          const quality = toSrsQuality(params.is_correct, params.time_spent_seconds, params.hint_used);
          const newSrs = calculateSRS(item.srs, quality);

          // Update exercise sources (keep last 20)
          const exerciseSources = params.source_exercise_id
            ? [...item.source_exercise_ids, params.source_exercise_id].slice(-20)
            : item.source_exercise_ids;

          const lessonSources = params.source_lesson_id
            ? [...new Set([...item.source_lesson_ids, params.source_lesson_id])]
            : item.source_lesson_ids;

          const updated: KnowledgeItem = {
            ...item,
            // Update display info
            display: params.display || item.display,
            pinyin: params.pinyin || item.pinyin,
            meaning: params.meaning || item.meaning,
            audio_url: params.audio_url ?? item.audio_url,
            theme: params.theme ?? item.theme,
            // SRS
            srs: newSrs,
            // Stats
            times_seen: item.times_seen + 1,
            times_correct: item.times_correct + (params.is_correct ? 1 : 0),
            times_incorrect: item.times_incorrect + (params.is_correct ? 0 : 1),
            last_seen_at: now,
            last_correct_at: params.is_correct ? now : item.last_correct_at,
            last_incorrect_at: !params.is_correct ? now : item.last_incorrect_at,
            // Sources
            source_exercise_ids: exerciseSources,
            source_lesson_ids: lessonSources,
          };
          updated.mastery = computeMastery(updated);

          const newState = {
            items: { ...state.items, [params.item_id]: updated },
            last_updated: now,
          };
          // Sync to server (debounced)
          syncManager.pushKnowledge(newState.items, now);
          return newState;
        });
      },

      // ── Bulk register ─────────────────────────────────────────────
      registerItems: (itemList) => {
        set((state) => {
          const now = new Date().toISOString();
          const newItems = { ...state.items };

          for (const params of itemList) {
            if (!newItems[params.item_id]) {
              newItems[params.item_id] = createKnowledgeItem(params);
            } else {
              // Update cached info + add lesson source
              const existing = newItems[params.item_id];
              newItems[params.item_id] = {
                ...existing,
                display: params.display || existing.display,
                pinyin: params.pinyin || existing.pinyin,
                meaning: params.meaning || existing.meaning,
                audio_url: params.audio_url ?? existing.audio_url,
                theme: params.theme ?? existing.theme,
                source_lesson_ids: params.source_lesson_id
                  ? [...new Set([...existing.source_lesson_ids, params.source_lesson_id])]
                  : existing.source_lesson_ids,
              };
            }
          }

          // Sync to server (debounced)
          syncManager.pushKnowledge(newItems, now);
          return { items: newItems, last_updated: now };
        });
      },

      // ── Query: Review Queue ───────────────────────────────────────
      getReviewQueue: (filters) => {
        const allItems = Object.values(get().items);
        let candidates = allItems.filter(
          (item) => item.times_seen > 0 // Only items the user has encountered
        );

        if (filters?.item_type) {
          candidates = candidates.filter((i) => i.item_type === filters.item_type);
        }
        if (filters?.level) {
          candidates = candidates.filter((i) => i.level === filters.level);
        }

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const dueItems = candidates.filter((i) => isDue(i.srs));
        const upcomingItems = candidates.filter(
          (i) => !isDue(i.srs) && new Date(i.srs.next_review_at) <= tomorrow
        );

        // Sort due items by priority (most urgent first)
        dueItems.sort((a, b) => reviewPriority(a.srs) - reviewPriority(b.srs));

        const limit = filters?.limit ?? 30;

        return {
          items: dueItems.slice(0, limit),
          overdue_count: dueItems.length,
          due_today_count: dueItems.length,
          upcoming_count: upcomingItems.length,
        };
      },

      // ── Query: By mastery ─────────────────────────────────────────
      getByMastery: (mastery, hskLevel) => {
        let items = Object.values(get().items).filter((i) => i.mastery === mastery);
        if (hskLevel) items = items.filter((i) => i.level === hskLevel);
        return items;
      },

      // ── Query: Stats ──────────────────────────────────────────────
      getStats: () => {
        const allItems = Object.values(get().items);

        const byMastery: Record<MasteryLevel, number> = {
          unknown: 0, seen: 0, learning: 0, familiar: 0, mastered: 0,
        };
        const byType: Record<ContentItemType, number> = {
          vocabulary: 0, character: 0, grammar: 0,
        };
        const byHsk: Record<string, { total: number; mastered: number; learning: number; unknown: number }> = {};

        let dueForReview = 0;

        for (const item of allItems) {
          byMastery[item.mastery]++;
          byType[item.item_type]++;

          if (!byHsk[item.level]) {
            byHsk[item.level] = { total: 0, mastered: 0, learning: 0, unknown: 0 };
          }
          byHsk[item.level].total++;
          if (item.mastery === 'mastered') byHsk[item.level].mastered++;
          else if (item.mastery === 'learning' || item.mastery === 'familiar') byHsk[item.level].learning++;
          else byHsk[item.level].unknown++;

          if (item.times_seen > 0 && isDue(item.srs)) dueForReview++;
        }

        // Weakest items: lowest accuracy, min 3 attempts
        const weakest = allItems
          .filter((i) => i.times_seen >= 3)
          .map((i) => ({ item: i, accuracy: i.times_correct / i.times_seen }))
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 10)
          .map((w) => w.item);

        return {
          total_items: allItems.length,
          by_mastery: byMastery,
          by_type: byType,
          by_hsk: byHsk,
          due_for_review: dueForReview,
          weakest_items: weakest,
          mastered_count: byMastery.mastered,
        };
      },

      // ── Query: Mastered word count ────────────────────────────────
      getMasteredWordCount: (maxHskLevel) => {
        const items = Object.values(get().items);
        return items.filter((i) => {
          if (i.item_type !== 'vocabulary') return false;
          if (i.mastery !== 'mastered' && i.mastery !== 'familiar') return false;
          if (maxHskLevel && parseInt(i.level) > maxHskLevel) return false;
          return true;
        }).length;
      },

      // ── Query: At-risk items ──────────────────────────────────────
      getAtRiskItems: (limit = 15) => {
        const now = new Date();
        const items = Object.values(get().items);

        return items
          .filter((i) => i.times_seen > 0 && isDue(i.srs))
          .map((i) => {
            const overdueDays = Math.max(0,
              (now.getTime() - new Date(i.srs.next_review_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return { item: i, overdueDays };
          })
          .sort((a, b) => b.overdueDays - a.overdueDays)
          .slice(0, limit)
          .map((r) => r.item);
      },

      // ── Query: By HSK level ───────────────────────────────────────
      getByHskLevel: (hskLevel) => {
        return Object.values(get().items).filter((i) => i.level === hskLevel);
      },

      // ── Query: Weakest items ──────────────────────────────────────
      getWeakestItems: (limit = 10) => {
        return Object.values(get().items)
          .filter((i) => i.times_seen >= 3)
          .sort((a, b) => {
            const accA = a.times_correct / a.times_seen;
            const accB = b.times_correct / b.times_seen;
            return accA - accB;
          })
          .slice(0, limit);
      },

      // ── Query: Single item ────────────────────────────────────────
      getItem: (itemId) => {
        return get().items[itemId] ?? null;
      },

      // ── Reset ─────────────────────────────────────────────────────
      reset: () => {
        set({ items: {}, last_updated: null });
      },

      // ── Hydrate from server ───────────────────────────────────────
      hydrateFromServer: (serverItems) => {
        set((state) => {
          const merged = { ...state.items };
          for (const [itemId, serverItem] of Object.entries(serverItems)) {
            const local = merged[itemId];
            if (!local) {
              // Server has item we don't — take it
              merged[itemId] = serverItem;
            } else {
              // Both have item — merge: take the one with more activity
              // (higher times_seen or more recent last_seen_at)
              const serverNewer = (serverItem.last_seen_at || '') > (local.last_seen_at || '');
              const serverMoreSeen = serverItem.times_seen > local.times_seen;
              if (serverNewer || serverMoreSeen) {
                merged[itemId] = {
                  ...serverItem,
                  // Keep the maximum of counters
                  times_seen: Math.max(local.times_seen, serverItem.times_seen),
                  times_correct: Math.max(local.times_correct, serverItem.times_correct),
                  times_incorrect: Math.max(local.times_incorrect, serverItem.times_incorrect),
                  // Union lesson/exercise sources
                  source_lesson_ids: [...new Set([...local.source_lesson_ids, ...serverItem.source_lesson_ids])],
                  source_exercise_ids: [...new Set([...local.source_exercise_ids, ...serverItem.source_exercise_ids])].slice(-20),
                };
              }
            }
          }
          return {
            items: merged,
            last_updated: new Date().toISOString(),
          };
        });
      },
    }),
    {
      name: 'lingullio-knowledge-map',
      partialize: (state) => ({
        items: state.items,
        last_updated: state.last_updated,
      }),
    }
  )
);
