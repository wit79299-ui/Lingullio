// ─── Knowledge Tracker Service ──────────────────────────────────────────────
// Bridge between exercise results and the Knowledge Map store.
// Extracts vocabulary/character/grammar IDs from exercise metadata
// and records each interaction in the user-knowledge-store.
//
// This service is called by:
//  - exercise-engine.tsx (after each answer)
//  - mock-exam-runner.tsx (after exam completion)
//  - revisions/page.tsx (after each flashcard review)

import { useUserKnowledgeStore, type RecordAttemptParams, type RegisterItemParams } from '@/stores/user-knowledge-store';
import type { ExerciseItem } from '@/lib/learner/queries';
import { estimateMemoryDecay } from '@/stores/training-mode-store';

// ─── Types ──────────────────────────────────────────────────────────────

/** Minimal exercise info needed to extract knowledge items */
export interface ExerciseKnowledgeInfo {
  exercise_id: string;
  exercise_type: string;
  metadata: Record<string, unknown>;
  prompt: string;
  explanation: string;
}

/** Extracted content item from exercise metadata */
export interface ExtractedItem {
  item_id: string;
  item_type: 'vocabulary' | 'character' | 'grammar';
  hsk_level: string;
  display: string;
  pinyin: string;
  meaning: string;
  audio_url?: string | null;
  theme?: string | null;
}

// ─── Extract content items from exercise metadata ───────────────────────
// Exercise metadata typically contains references to vocabulary, characters,
// or grammar points. We extract these to feed into the knowledge map.

export function extractItemsFromExercise(exercise: ExerciseKnowledgeInfo): ExtractedItem[] {
  const meta = exercise.metadata;
  const items: ExtractedItem[] = [];

  // ── Direct vocabulary reference ──
  if (meta.vocabulary_id && typeof meta.vocabulary_id === 'string') {
    items.push({
      item_id: meta.vocabulary_id as string,
      item_type: 'vocabulary',
      hsk_level: (meta.hsk_level as string) ?? '1',
      display: (meta.simplified as string) ?? (meta.word as string) ?? exercise.prompt,
      pinyin: (meta.pinyin as string) ?? '',
      meaning: (meta.meaning as string) ?? (meta.translation as string) ?? '',
      audio_url: (meta.audio_url as string) ?? null,
      theme: (meta.theme as string) ?? null,
    });
  }

  // ── Direct character reference ──
  if (meta.character_id && typeof meta.character_id === 'string') {
    items.push({
      item_id: meta.character_id as string,
      item_type: 'character',
      hsk_level: (meta.hsk_level as string) ?? '1',
      display: (meta.character as string) ?? exercise.prompt,
      pinyin: (meta.pinyin as string) ?? '',
      meaning: (meta.meaning as string) ?? '',
      audio_url: (meta.audio_url as string) ?? null,
    });
  }

  // ── Direct grammar reference ──
  if (meta.grammar_point_id && typeof meta.grammar_point_id === 'string') {
    items.push({
      item_id: meta.grammar_point_id as string,
      item_type: 'grammar',
      hsk_level: (meta.hsk_level as string) ?? '1',
      display: (meta.pattern as string) ?? exercise.prompt,
      pinyin: '',
      meaning: (meta.explanation_short as string) ?? '',
    });
  }

  // ── Vocabulary list in exercise (e.g., matching exercises with multiple words) ──
  if (Array.isArray(meta.vocabulary_items)) {
    for (const v of meta.vocabulary_items as Array<Record<string, unknown>>) {
      if (v.id && typeof v.id === 'string') {
        items.push({
          item_id: v.id as string,
          item_type: 'vocabulary',
          hsk_level: (v.hsk_level as string) ?? (meta.hsk_level as string) ?? '1',
          display: (v.simplified as string) ?? '',
          pinyin: (v.pinyin as string) ?? '',
          meaning: (v.meaning as string) ?? '',
          audio_url: (v.audio_url as string) ?? null,
          theme: (v.theme as string) ?? null,
        });
      }
    }
  }

  // ── Inline word data (common in MCQ/fill_blank) ──
  if (!items.length && meta.target_word && typeof meta.target_word === 'object') {
    const tw = meta.target_word as Record<string, unknown>;
    if (tw.id) {
      items.push({
        item_id: tw.id as string,
        item_type: (tw.type as 'vocabulary' | 'character' | 'grammar') ?? 'vocabulary',
        hsk_level: (tw.hsk_level as string) ?? (meta.hsk_level as string) ?? '1',
        display: (tw.simplified as string) ?? (tw.character as string) ?? (tw.pattern as string) ?? '',
        pinyin: (tw.pinyin as string) ?? '',
        meaning: (tw.meaning as string) ?? '',
        audio_url: (tw.audio_url as string) ?? null,
        theme: (tw.theme as string) ?? null,
      });
    }
  }

  // ── Fallback: Create a synthetic item from the prompt if no explicit references ──
  // This ensures we still track progress even for exercises without explicit item IDs
  if (!items.length && meta.simplified && meta.pinyin) {
    items.push({
      item_id: `synth-${exercise.exercise_id}`,
      item_type: 'vocabulary',
      hsk_level: (meta.hsk_level as string) ?? '1',
      display: (meta.simplified as string) ?? '',
      pinyin: (meta.pinyin as string) ?? '',
      meaning: (meta.meaning as string) ?? (meta.translation as string) ?? '',
      audio_url: (meta.audio_url as string) ?? null,
      theme: (meta.theme as string) ?? null,
    });
  }

  return items;
}

// ─── Record exercise attempt in knowledge map ───────────────────────────

export function recordExerciseInKnowledge(
  exercise: ExerciseKnowledgeInfo,
  isCorrect: boolean,
  timeSpentSeconds: number,
  hintUsed: boolean = false,
  lessonId?: string,
) {
  const store = useUserKnowledgeStore.getState();
  const extracted = extractItemsFromExercise(exercise);

  for (const item of extracted) {
    store.recordAttempt({
      item_id: item.item_id,
      item_type: item.item_type,
      hsk_level: item.hsk_level,
      display: item.display,
      pinyin: item.pinyin,
      meaning: item.meaning,
      audio_url: item.audio_url,
      theme: item.theme,
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds,
      hint_used: hintUsed,
      source_exercise_id: exercise.exercise_id,
      source_lesson_id: lessonId,
    });
  }

  return extracted;
}

// ─── Register vocabulary from a lesson before exercises start ────────────

export function registerLessonVocabulary(
  lessonId: string,
  items: Array<{
    id: string;
    type: 'vocabulary' | 'character' | 'grammar';
    hsk_level: string;
    display: string;
    pinyin: string;
    meaning: string;
    audio_url?: string | null;
    theme?: string | null;
  }>,
) {
  const store = useUserKnowledgeStore.getState();
  const registerParams: RegisterItemParams[] = items.map((item) => ({
    item_id: item.id,
    item_type: item.type,
    hsk_level: item.hsk_level,
    display: item.display,
    pinyin: item.pinyin,
    meaning: item.meaning,
    audio_url: item.audio_url,
    theme: item.theme,
    source_lesson_id: lessonId,
  }));
  store.registerItems(registerParams);
}

// ─── Record flashcard review ────────────────────────────────────────────

export function recordFlashcardReview(
  itemId: string,
  itemType: 'vocabulary' | 'character' | 'grammar',
  hskLevel: string,
  display: string,
  pinyin: string,
  meaning: string,
  isCorrect: boolean,
  timeSpentSeconds: number,
  audioUrl?: string | null,
) {
  const store = useUserKnowledgeStore.getState();
  store.recordAttempt({
    item_id: itemId,
    item_type: itemType,
    hsk_level: hskLevel,
    display,
    pinyin,
    meaning,
    audio_url: audioUrl,
    is_correct: isCorrect,
    time_spent_seconds: timeSpentSeconds,
  });
}

// ─── Get items at risk with memory decay details ────────────────────────
// Used by Coach Autonome to show specific words being forgotten

export interface AtRiskItemDetail {
  item_id: string;
  display: string;
  pinyin: string;
  meaning: string;
  hsk_level: string;
  item_type: 'vocabulary' | 'character' | 'grammar';
  days_overdue: number;
  memory_decay_percent: number;
  mastery: string;
  accuracy: number;
}

export function getAtRiskItemsDetailed(limit: number = 15): AtRiskItemDetail[] {
  const store = useUserKnowledgeStore.getState();
  const atRiskItems = store.getAtRiskItems(limit);
  const now = new Date();

  return atRiskItems.map((item) => {
    const daysOverdue = Math.max(0, Math.floor(
      (now.getTime() - new Date(item.srs.next_review_at).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const daysSinceLastSeen = item.last_seen_at
      ? Math.floor((now.getTime() - new Date(item.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const decayPercent = estimateMemoryDecay(daysSinceLastSeen, item.srs.ease_factor * 6);

    return {
      item_id: item.item_id,
      display: item.display,
      pinyin: item.pinyin,
      meaning: item.meaning,
      hsk_level: item.hsk_level,
      item_type: item.item_type,
      days_overdue: daysOverdue,
      memory_decay_percent: decayPercent,
      mastery: item.mastery,
      accuracy: item.times_seen > 0 ? Math.round((item.times_correct / item.times_seen) * 100) : 0,
    };
  });
}

// ─── Review queue summary for Daily Plan ────────────────────────────────

export interface ReviewSummary {
  due_count: number;
  upcoming_count: number;
  overdue_count: number;
  by_type: { vocabulary: number; character: number; grammar: number };
  by_hsk: Record<string, number>;
  urgent_items: Array<{ display: string; pinyin: string; meaning: string }>;
}

export function getReviewSummary(): ReviewSummary {
  const store = useUserKnowledgeStore.getState();
  const queue = store.getReviewQueue({ limit: 100 });

  const byType = { vocabulary: 0, character: 0, grammar: 0 };
  const byHsk: Record<string, number> = {};

  for (const item of queue.items) {
    byType[item.item_type]++;
    byHsk[item.hsk_level] = (byHsk[item.hsk_level] ?? 0) + 1;
  }

  return {
    due_count: queue.due_today_count,
    upcoming_count: queue.upcoming_count,
    overdue_count: queue.overdue_count,
    by_type: byType,
    by_hsk: byHsk,
    urgent_items: queue.items.slice(0, 5).map((i) => ({
      display: i.display,
      pinyin: i.pinyin,
      meaning: i.meaning,
    })),
  };
}
