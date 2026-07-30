// ─── TEF Exercise Engine : Dedicated Types ─────────────────────────────
// Separate from HSK exercise system, calibrated for NCLC scoring

// ── Exercise categories ──
export type TEFSection = 'CE' | 'CO' | 'EE' | 'EO';

export type TEFExerciseType =
  | 'qcm'                    // CE/CO: standard QCM with trap annotations
  | 'fill_blank'             // CE: cloze/lacunaire
  | 'text_matching'          // CE: match text segments
  | 'listening_qcm'          // CO: listen + QCM (uses TTS)
  | 'listening_dictation'    // CO: listen + write what you hear
  | 'writing_free'           // EE: free text with criteria scoring
  | 'writing_guided'         // EE: guided writing with structure prompts
  | 'speaking_response'      // EO: listen to prompt → record response
  | 'speaking_roleplay';     // EO: interactive roleplay with variants

// ── NCLC Level mapping ──
export type NCLCLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type NCLCStage = 'I' | 'II' | 'III';

export function getNCLCStage(level: NCLCLevel): NCLCStage {
  if (level <= 4) return 'I';
  if (level <= 8) return 'II';
  return 'III';
}

export function getNCLCLabel(level: NCLCLevel): string {
  const stage = getNCLCStage(level);
  return `NCLC ${level} (Stade ${stage})`;
}

// ── Base exercise interface ──
export interface TEFExercise {
  id: string;
  section: TEFSection;
  type: TEFExerciseType;
  nclcTarget: NCLCLevel;
  difficulty: 1 | 2 | 3;         // within the NCLC band
  points: number;
  meta: string;                    // e.g. "Famille A · Vie quotidienne · NCLC 5"
  instruction?: string;
}

// ── QCM Exercise (CE & CO) ──
export interface TEFChoice {
  text: string;
  piege?: string;      // trap name if this is a distractor
  explanation?: string; // shown after selecting this choice
}

export interface TEFQuestion {
  prompt: string;
  choices: TEFChoice[];
  correctIndex: number;
}

export interface TEFQCMExercise extends TEFExercise {
  type: 'qcm' | 'listening_qcm';
  stimulus?: string;     // reading text or description of audio
  ttsText?: string;      // text to read aloud via SpeechSynthesis (CO only)
  ttsSpeed?: number;     // speech rate (0.5 - 1.5)
  questions: TEFQuestion[];
}

// ── Fill-blank Exercise (CE) ──
export interface TEFBlank {
  position: number;      // index in text where blank appears
  correctAnswer: string;
  distractors: TEFChoice[];
}

export interface TEFFillBlankExercise extends TEFExercise {
  type: 'fill_blank';
  textWithBlanks: string; // text with ___(n)___ markers
  blanks: TEFBlank[];
}

// ── Writing Exercise (EE) ──
export interface WritingCriterion {
  id: string;
  label: string;
  maxPoints: number;
  descriptors: {
    nclc56: string;
    nclc7: string;
    nclc89: string;
  };
}

export interface TEFWritingExercise extends TEFExercise {
  type: 'writing_free' | 'writing_guided';
  sujet: string;          // writing prompt
  minWords: number;
  maxWords: number;
  criteria: WritingCriterion[];
  modelTexts: {
    nclc6: string;
    nclc9: string;
  };
  guidedPrompts?: string[]; // for guided writing
  keyPhrases?: {            // key phrases by NCLC level for auto-scoring
    basic: string[];       // NCLC 5-6
    intermediate: string[];// NCLC 7
    advanced: string[];    // NCLC 8-9
  };
}

// ── Speaking Exercise (EO) ──
export interface SpeakingVariant {
  type: string;           // "Objection", "Question retour", etc.
  examinerLine: string;   // what the examiner says
  expectedSkill: string;  // what this tests
}

export interface TEFSpeakingExercise extends TEFExercise {
  type: 'speaking_response' | 'speaking_roleplay';
  scenario: string;       // situation description
  ttsPrompt: string;      // examiner's opening line (read by TTS)
  ttsSpeed?: number;
  variants: SpeakingVariant[];
  evaluationCriteria: string[]; // criteria for self-eval or AI eval
  tipsForNCLC7: string[];       // specific tips to reach NCLC 7
}

// ── Listening Dictation (CO) ──
export interface TEFDictationExercise extends TEFExercise {
  type: 'listening_dictation';
  ttsText: string;
  ttsSpeed: number;
  expectedText: string;           // what they should write
  acceptableVariants: string[];   // acceptable alternative spellings
  keyWords: string[];             // must-include words for partial scoring
}

// ── Session & Results ──
export interface TEFExerciseAnswer {
  exerciseId: string;
  section: TEFSection;
  isCorrect: boolean;
  pointsEarned: number;
  pointsMax: number;
  userAnswer: unknown;
  timeSpent: number; // seconds
  trapTriggered?: string; // which trap the user fell for
}

export interface TEFSessionState {
  phase: 'intro' | 'exercise' | 'review' | 'results';
  section: TEFSection;
  currentIndex: number;
  answers: TEFExerciseAnswer[];
  startedAt: number;
  exerciseStartedAt: number;
}

export interface TEFSectionScore {
  section: TEFSection;
  rawScore: number;
  maxScore: number;
  percentage: number;
  estimatedNCLC: NCLCLevel;
  trapsTriggered: { name: string; count: number }[];
}

export interface TEFSessionResults {
  section: TEFSection;
  sectionScore: TEFSectionScore;
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  timeElapsed: number;
  byDifficulty: { level: number; correct: number; total: number }[];
  byType: { type: TEFExerciseType; correct: number; total: number }[];
  weakTraps: string[];        // most-triggered traps
  recommendation: string;     // personalized next step
}

// ── NCLC Score estimation from percentage ──
export function estimateNCLC(section: TEFSection, percentage: number): NCLCLevel {
  // Simplified estimation based on percentage score
  if (percentage >= 92) return 12;
  if (percentage >= 85) return 10;
  if (percentage >= 78) return 9;
  if (percentage >= 70) return 8;
  if (percentage >= 60) return 7;
  if (percentage >= 50) return 6;
  if (percentage >= 40) return 5;
  if (percentage >= 30) return 4;
  return 3;
}

// ── XP multipliers for TEF ──
export const TEF_XP_CONFIG = {
  qcm_correct: 10,
  qcm_incorrect: 2,
  qcm_streak_bonus: 5,      // per consecutive correct
  listening_correct: 15,     // harder → more XP
  listening_incorrect: 3,
  writing_submit: 25,        // for completing a writing task
  writing_criteria_bonus: 5, // per criterion above threshold
  speaking_submit: 30,       // for completing a speaking task
  speaking_fluency_bonus: 10,
  dictation_correct: 20,
  dictation_partial: 10,
  trap_avoided: 3,           // bonus for NOT falling for a trap
  session_complete: 50,
  perfect_section: 100,
  nclc7_reached: 200,        // one-time bonus
} as const;

// ── Section labels ──
export const SECTION_CONFIG: Record<TEFSection, {
  label: string;
  fullLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  maxScore: number;
}> = {
  CE: { label: 'CE', fullLabel: 'Compréhension écrite', icon: '📖', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', maxScore: 300 },
  CO: { label: 'CO', fullLabel: 'Compréhension orale', icon: '🎧', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', maxScore: 360 },
  EE: { label: 'EE', fullLabel: 'Expression écrite', icon: '✍️', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', maxScore: 450 },
  EO: { label: 'EO', fullLabel: 'Expression orale', icon: '🗣️', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', maxScore: 450 },
};
