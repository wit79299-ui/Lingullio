// ─── SM-2 Spaced Repetition Engine ──────────────────────────────────────
// Implements SuperMemo SM-2 algorithm for flashcard scheduling
//
// Quality scale: 0-5
//  0 = Complete blackout
//  1 = Incorrect, but recognized upon seeing answer
//  2 = Incorrect, but answer seemed easy to recall
//  3 = Correct, but with serious difficulty
//  4 = Correct, after some hesitation
//  5 = Perfect, instant recall

export interface SRSItem {
  ease_factor: number;   // >= 1.3, default 2.5
  interval_days: number; // days until next review
  repetitions: number;   // consecutive correct
  next_review_at: string; // ISO date
  last_quality: number;  // last answer quality 0-5
}

export interface SRSUpdate {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_quality: number;
}

/**
 * Calculate next SRS interval based on SM-2 algorithm.
 * @param item Current SRS state
 * @param quality Answer quality 0-5
 * @returns Updated SRS parameters
 */
export function calculateSRS(item: SRSItem, quality: number): SRSUpdate {
  const q = Math.min(5, Math.max(0, Math.round(quality)));
  
  let { ease_factor, interval_days, repetitions } = item;
  
  if (q >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 3;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval_days = 1;
  }
  
  // Update ease factor
  ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease_factor < 1.3) ease_factor = 1.3;
  
  // Calculate next review date
  const now = new Date();
  const next = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);
  
  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review_at: next.toISOString(),
    last_quality: q,
  };
}

/**
 * Convert exercise correctness to SRS quality.
 * Takes into account time spent and hints used.
 */
export function exerciseToQuality(
  isCorrect: boolean,
  timeSpentSeconds: number,
  hintUsed: boolean = false,
  expectedTimeSeconds: number = 30,
): number {
  if (!isCorrect) {
    // Wrong answer
    return hintUsed ? 0 : 1;
  }
  
  // Correct answer — assess quality
  const timeRatio = timeSpentSeconds / expectedTimeSeconds;
  
  if (hintUsed) return 3; // Correct with help
  if (timeRatio > 2) return 3; // Correct but very slow
  if (timeRatio > 1) return 4; // Correct, some hesitation
  return 5; // Fast and correct
}

/**
 * Default SRS item for newly encountered content.
 */
export function createNewSRSItem(): Omit<SRSItem, 'next_review_at'> & { next_review_at: string } {
  return {
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_at: new Date().toISOString(),
    last_quality: 0,
  };
}

/**
 * Check if an item is due for review.
 */
export function isDue(item: SRSItem): boolean {
  return new Date(item.next_review_at) <= new Date();
}

/**
 * Check if an item is "mastered" (interval > 21 days).
 */
export function isMastered(item: SRSItem): boolean {
  return item.interval_days > 21 && item.repetitions >= 5;
}

/**
 * Priority score for review queue — lower = more urgent.
 * Overdue items get negative scores (highest priority).
 */
export function reviewPriority(item: SRSItem): number {
  const now = new Date().getTime();
  const due = new Date(item.next_review_at).getTime();
  const hoursUntilDue = (due - now) / (1000 * 60 * 60);
  
  // Overdue items get very low (negative) priority = high urgency
  // Items with low ease factor get slight priority boost
  return hoursUntilDue - (2.5 - item.ease_factor) * 2;
}
