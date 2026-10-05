// ═══════════════════════════════════════════════════════════════════════════
// TEF Adaptive Engine — Adjusts exercise difficulty based on performance
// ═══════════════════════════════════════════════════════════════════════════
//
// Algorithm:
// 1. Start at estimated NCLC (from diagnostic or history, default 6)
// 2. After each exercise:
//    - Correct → increase score by 1.0 (+ 0.5 bonus if no trap triggered)
//    - Incorrect → decrease score by 1.5
// 3. Map running score to target NCLC band
// 4. Pick next exercise from available pool matching target NCLC ±1
// 5. Avoid repeating recently-seen exercises
// 6. Favor exercises from under-represented families/sections

import type { TEFQCMExercise } from './tef-types';

export interface AdaptiveState {
  currentNCLC: number;         // running estimate (float, e.g. 6.3)
  targetNCLC: number;          // rounded target for next exercise pick
  exercisesSeen: Set<string>;  // IDs of exercises already served
  correctStreak: number;
  history: { id: string; nclc: number; correct: boolean; trapHit: boolean }[];
}

export function createAdaptiveState(startNCLC: number = 6): AdaptiveState {
  return {
    currentNCLC: startNCLC,
    targetNCLC: startNCLC,
    exercisesSeen: new Set(),
    correctStreak: 0,
    history: [],
  };
}

export function updateAdaptiveState(
  state: AdaptiveState,
  exerciseId: string,
  exerciseNCLC: number,
  correct: boolean,
  trapHit: boolean,
): AdaptiveState {
  const newState = { ...state, exercisesSeen: new Set(state.exercisesSeen) };
  newState.exercisesSeen.add(exerciseId);

  // Update running NCLC estimate
  let delta = 0;
  if (correct) {
    delta = 0.4; // base increase
    if (!trapHit) delta += 0.2; // bonus for avoiding trap
    if (exerciseNCLC >= state.currentNCLC) delta += 0.2; // harder exercise bonus
    newState.correctStreak = state.correctStreak + 1;
    // Streak bonus: accelerate if 3+ correct in a row
    if (newState.correctStreak >= 3) delta += 0.15;
  } else {
    delta = -0.6; // base decrease
    if (exerciseNCLC <= state.currentNCLC) delta -= 0.2; // penalty for failing easy exercise
    newState.correctStreak = 0;
  }

  newState.currentNCLC = Math.max(4, Math.min(11, state.currentNCLC + delta));
  newState.targetNCLC = Math.round(newState.currentNCLC);
  // Clamp to 5-9 for exercise selection (our exercises range)
  newState.targetNCLC = Math.max(5, Math.min(9, newState.targetNCLC));

  newState.history = [...state.history, { id: exerciseId, nclc: exerciseNCLC, correct, trapHit }];

  return newState;
}

export function pickNextExercise(
  state: AdaptiveState,
  pool: TEFQCMExercise[],
): TEFQCMExercise | null {
  // Filter out already-seen exercises
  const available = pool.filter(e => !state.exercisesSeen.has(e.id));
  if (available.length === 0) return null;

  const target = state.targetNCLC;

  // Priority 1: exact NCLC match
  const exact = available.filter(e => e.nclcTarget === target);
  if (exact.length > 0) return pickRandom(exact);

  // Priority 2: ±1 NCLC
  const near = available.filter(e => Math.abs(e.nclcTarget - target) <= 1);
  if (near.length > 0) return pickRandom(near);

  // Priority 3: ±2 NCLC
  const wider = available.filter(e => Math.abs(e.nclcTarget - target) <= 2);
  if (wider.length > 0) return pickRandom(wider);

  // Fallback: any available
  return pickRandom(available);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get a descriptive label for the current adaptive level
export function getAdaptiveLabel(nclc: number): { label: string; labelEN: string; color: string } {
  if (nclc >= 9) return { label: 'Stade III avancé', labelEN: 'Advanced Stage III', color: 'text-purple-700 bg-purple-50' };
  if (nclc >= 8) return { label: 'Stade III', labelEN: 'Stage III', color: 'text-indigo-700 bg-indigo-50' };
  if (nclc >= 7) return { label: 'Stade II+ (pivot)', labelEN: 'Stage II+ (pivot)', color: 'text-blue-700 bg-blue-50' };
  if (nclc >= 6) return { label: 'Stade II', labelEN: 'Stage II', color: 'text-teal-700 bg-teal-50' };
  if (nclc >= 5) return { label: 'Stade II débutant', labelEN: 'Early Stage II', color: 'text-amber-700 bg-amber-50' };
  return { label: 'Stade I', labelEN: 'Stage I', color: 'text-red-700 bg-red-50' };
}
