/**
 * Exam system definitions and CEFR mapping for Lingullio.
 * These are static reference data — no DB dependency needed.
 */

export interface ExamSystem {
  id: string;
  name: string;
  fullName: string;
  language: string;
  /** ISO 639-1 target language code */
  targetLang: string;
  /** URL-safe prefix for slugs, e.g. "hsk", "jlpt" */
  slugPrefix: string;
  levels: ExamLevel[];
  flag: string; // emoji flag
}

export interface ExamLevel {
  /** Level identifier (e.g. "1", "N5", "1급") */
  level: string;
  /** CEFR equivalent */
  cefr: string;
  /** Approximate vocabulary count */
  vocabTarget: number;
  /** Approximate character/kana count (if applicable) */
  charTarget?: number;
  /** Approximate grammar points count */
  grammarTarget?: number;
}

// ----- HSK (Hanyu Shuiping Kaoshi) - Chinese -----
export const HSK: ExamSystem = {
  id: 'hsk',
  name: 'HSK',
  fullName: 'Hanyu Shuiping Kaoshi (汉语水平考试)',
  language: 'Chinois mandarin',
  targetLang: 'zh',
  slugPrefix: 'hsk',
  flag: '🇨🇳',
  levels: [
    { level: '1', cefr: 'A1',  vocabTarget: 300,  charTarget: 175, grammarTarget: 35 },
    { level: '2', cefr: 'A2',  vocabTarget: 600,  charTarget: 350, grammarTarget: 70 },
    { level: '3', cefr: 'B1',  vocabTarget: 1200, charTarget: 600, grammarTarget: 120 },
    { level: '4', cefr: 'B2',  vocabTarget: 2500, charTarget: 1000, grammarTarget: 200 },
    { level: '5', cefr: 'C1',  vocabTarget: 4500, charTarget: 1500, grammarTarget: 300 },
    { level: '6', cefr: 'C2',  vocabTarget: 7500, charTarget: 2000, grammarTarget: 400 },
    { level: '7-9', cefr: 'C1~C2+', vocabTarget: 11092, charTarget: 3500, grammarTarget: 550 },
  ],
};

// ----- JLPT (Japanese-Language Proficiency Test) -----
export const JLPT: ExamSystem = {
  id: 'jlpt',
  name: 'JLPT',
  fullName: 'Japanese-Language Proficiency Test (日本語能力試験)',
  language: 'Japonais',
  targetLang: 'ja',
  slugPrefix: 'jlpt',
  flag: '🇯🇵',
  levels: [
    { level: 'N5', cefr: 'A1',  vocabTarget: 800,  charTarget: 100, grammarTarget: 80 },
    { level: 'N4', cefr: 'A2',  vocabTarget: 1500, charTarget: 300, grammarTarget: 170 },
    { level: 'N3', cefr: 'B1',  vocabTarget: 3750, charTarget: 650, grammarTarget: 290 },
    { level: 'N2', cefr: 'B2',  vocabTarget: 6000, charTarget: 1000, grammarTarget: 400 },
    { level: 'N1', cefr: 'C1',  vocabTarget: 10000, charTarget: 2000, grammarTarget: 550 },
  ],
};

// ----- TOPIK (Test of Proficiency in Korean) -----
export const TOPIK: ExamSystem = {
  id: 'topik',
  name: 'TOPIK',
  fullName: 'Test of Proficiency in Korean (한국어능력시험)',
  language: 'Coréen',
  targetLang: 'ko',
  slugPrefix: 'topik',
  flag: '🇰🇷',
  levels: [
    { level: '1', cefr: 'A1',  vocabTarget: 800,  grammarTarget: 60 },
    { level: '2', cefr: 'A2',  vocabTarget: 1500, grammarTarget: 120 },
    { level: '3', cefr: 'B1',  vocabTarget: 3000, grammarTarget: 200 },
    { level: '4', cefr: 'B2',  vocabTarget: 5000, grammarTarget: 300 },
    { level: '5', cefr: 'C1',  vocabTarget: 7000, grammarTarget: 400 },
    { level: '6', cefr: 'C2',  vocabTarget: 10000, grammarTarget: 500 },
  ],
};

// ----- Registry of all exam systems -----
export const EXAM_SYSTEMS: Record<string, ExamSystem> = {
  HSK,
  JLPT,
  TOPIK,
};

/**
 * Get CEFR level for a given exam type and level.
 * e.g. getCefrLevel('HSK', '1') => 'A1'
 */
export function getCefrLevel(examType: string, level: string): string | null {
  const system = EXAM_SYSTEMS[examType.toUpperCase()];
  if (!system) return null;
  const found = system.levels.find((l) => l.level === level);
  return found?.cefr ?? null;
}

/**
 * Get target stats for a given exam level.
 */
export function getLevelTargets(examType: string, level: string): ExamLevel | null {
  const system = EXAM_SYSTEMS[examType.toUpperCase()];
  if (!system) return null;
  return system.levels.find((l) => l.level === level) ?? null;
}

/**
 * CEFR description labels (for UI display)
 */
export const CEFR_DESCRIPTIONS: Record<string, { fr: string; en: string }> = {
  'A1': { fr: 'Découverte', en: 'Breakthrough' },
  'A2': { fr: 'Survie', en: 'Waystage' },
  'B1': { fr: 'Seuil', en: 'Threshold' },
  'B2': { fr: 'Avancé', en: 'Vantage' },
  'C1': { fr: 'Autonome', en: 'Effective Proficiency' },
  'C2': { fr: 'Maîtrise', en: 'Mastery' },
  'C2+': { fr: 'Maîtrise supérieure', en: 'Superior Mastery' },
};
