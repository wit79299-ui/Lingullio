// ─── TEF Exercises — Structured exercise data ──────────────────────────
// Converts the raw tef-data.ts content into typed TEFExercise objects
// for the exercise engine.

import {
  ceItems, coItems, eeItems, eeGrille, eoItems, diagQuestions,
} from './tef-data';
import type {
  TEFQCMExercise,
  TEFWritingExercise,
  TEFSpeakingExercise,
  WritingCriterion,
} from './tef-types';

// ══════════════════════════════════════════════════════════════════════════
// CE EXERCISES (Compréhension écrite)
// ══════════════════════════════════════════════════════════════════════════

export const ceExercises: TEFQCMExercise[] = ceItems.map((item, idx) => ({
  id: `ce-${idx + 1}`,
  section: 'CE' as const,
  type: 'qcm' as const,
  nclcTarget: parseNCLC(item.meta),
  difficulty: parseDifficulty(item.meta),
  points: 15,
  meta: item.meta,
  stimulus: item.text,
  questions: item.questions.map((q) => ({
    prompt: q.q,
    choices: q.choices.map((c) => ({
      text: c.t,
      piege: c.piege,
      explanation: c.exp,
    })),
    correctIndex: q.correct,
  })),
}));

// ══════════════════════════════════════════════════════════════════════════
// CO EXERCISES (Compréhension orale — with TTS)
// ══════════════════════════════════════════════════════════════════════════

export const coExercises: TEFQCMExercise[] = coItems.map((item, idx) => ({
  id: `co-${idx + 1}`,
  section: 'CO' as const,
  type: 'listening_qcm' as const,
  nclcTarget: parseNCLC(item.meta),
  difficulty: parseDifficulty(item.meta),
  points: 20,
  meta: item.meta,
  stimulus: item.text,
  ttsText: item.text ?? '',   // This text will be spoken by SpeechSynthesis
  ttsSpeed: item.meta.includes('NCLC 9') ? 1.0 : item.meta.includes('NCLC 7') ? 0.9 : 0.85,
  questions: item.questions.map((q) => ({
    prompt: q.q,
    choices: q.choices.map((c) => ({
      text: c.t,
      piege: c.piege,
      explanation: c.exp,
    })),
    correctIndex: q.correct,
  })),
}));

// ══════════════════════════════════════════════════════════════════════════
// EE EXERCISES (Expression écrite)
// ══════════════════════════════════════════════════════════════════════════

const eeWritingCriteria: WritingCriterion[] = eeGrille.rows.map((row, idx) => ({
  id: `ee-criterion-${idx + 1}`,
  label: row[0],
  maxPoints: 20,
  descriptors: {
    nclc56: row[1],
    nclc7: row[2],
    nclc89: row[3],
  },
}));

export const eeExercises: TEFWritingExercise[] = eeItems.map((item, idx) => ({
  id: `ee-${idx + 1}`,
  section: 'EE' as const,
  type: 'writing_free' as const,
  nclcTarget: 7,
  difficulty: (idx === 0 ? 1 : 2) as 1 | 2 | 3,
  points: 50,
  meta: idx === 0 ? 'Section A — Fait divers · NCLC 5-9' : 'Section B — Argumentation · NCLC 5-9',
  sujet: item.sujet,
  minWords: idx === 0 ? 80 : 200,
  maxWords: idx === 0 ? 150 : 350,
  criteria: eeWritingCriteria,
  modelTexts: {
    nclc6: item.n6,
    nclc9: item.n9,
  },
  keyPhrases: idx === 0 ? {
    basic: ['les pompiers', 'la fumée', 'l\'appartement', 'découvert', 'blessé'],
    intermediate: ['sont intervenus', 'il s\'est avéré', 'heureusement', 'surveillance'],
    advanced: ['quoique', 'un véritable drame', 'avec une rapidité remarquable', 'l\'ampleur'],
  } : {
    basic: ['le télétravail', 'avantages', 'bureau', 'solution', 'collègues'],
    intermediate: ['équilibre', 'modèle hybride', 'cohésion', 'flexibilité', 'productivité'],
    advanced: ['il n\'en demeure pas moins que', 'organisation modulable', 'dimension collective', 'il serait excessif'],
  },
}));

// ══════════════════════════════════════════════════════════════════════════
// EO EXERCISES (Expression orale — with Speech Recognition)
// ══════════════════════════════════════════════════════════════════════════

export const eoExercises: TEFSpeakingExercise[] = eoItems.map((item, idx) => ({
  id: `eo-${idx + 1}`,
  section: 'EO' as const,
  type: 'speaking_roleplay' as const,
  nclcTarget: 7,
  difficulty: (idx === 0 ? 1 : 2) as 1 | 2 | 3,
  points: 50,
  meta: item.titre,
  scenario: item.titre,
  ttsPrompt: item.base,
  ttsSpeed: 0.9,
  variants: item.variantes.map((v) => ({
    type: v[0],
    examinerLine: v[1],
    expectedSkill: v[2],
  })),
  evaluationCriteria: [
    'Fluidité et aisance',
    'Richesse du vocabulaire',
    'Capacité d\'interaction (reformuler, relancer)',
    'Utilisation de connecteurs',
    'Registre de langue adapté',
  ],
  tipsForNCLC7: [
    'Reformulez avant de répondre sur le fond',
    'Utilisez des chevilles (alors, voyons, effectivement) pour combler la réflexion',
    'Relancez l\'interlocuteur avec des questions',
    'Variez les connecteurs : cependant, par ailleurs, en revanche',
    'Ne mémorisez pas un script — entraînez la réaction',
  ],
}));

// ══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC EXERCISES
// ══════════════════════════════════════════════════════════════════════════

export const diagnosticExercises: TEFQCMExercise[] = diagQuestions.map((q, idx) => ({
  id: `diag-${idx + 1}`,
  section: 'CE' as const, // diagnostic is a mix
  type: 'qcm' as const,
  nclcTarget: (idx < 2 ? 5 : idx < 4 ? 6 : idx < 6 ? 7 : 9) as 5 | 6 | 7 | 9,
  difficulty: (idx < 2 ? 1 : idx < 5 ? 2 : 3) as 1 | 2 | 3,
  points: 10,
  meta: `Question ${idx + 1}/8 — Diagnostic`,
  questions: [{
    prompt: q.q,
    choices: q.choices.map((c) => ({ text: c })),
    correctIndex: q.correct,
  }],
}));

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function parseNCLC(meta: string): 5 | 6 | 7 | 8 | 9 {
  const match = meta.match(/NCLC\s+(\d+)/);
  if (match) {
    const n = parseInt(match[1]);
    if (n >= 5 && n <= 9) return n as 5 | 6 | 7 | 8 | 9;
  }
  return 7; // default
}

function parseDifficulty(meta: string): 1 | 2 | 3 {
  const nclc = parseNCLC(meta);
  if (nclc <= 5) return 1;
  if (nclc <= 7) return 2;
  return 3;
}
