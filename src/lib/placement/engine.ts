// ─── Placement Test Engine ────────────────────────────────────────────────
// Scoring, adaptive routing, band analysis, placement logic
// Implements the full scoring_model from the JSON spec.

// ─── Types ───────────────────────────────────────────────────────────────

export interface ProfileQuestion {
  id: string;
  type: 'single_choice' | 'multi_choice';
  prompt_fr: string;
  options: Array<{
    id: string;
    text_fr: string;
    personalization_tags?: string[];
    plan_intensity?: string;
  }>;
}

export interface DiagnosticQuestion {
  id: string;
  order: number;
  band: string;
  difficulty: number;
  points: number;
  skill: string;
  subskills: string[];
  question_type: string;
  prompt_fr: string;
  stimulus?: {
    zh?: string;
    pinyin?: string;
    translation_hidden_fr?: string;
    fr?: string;
  };
  audio?: {
    script_zh: string;
    pinyin: string;
    tts_speed: string;
    repeat_allowed: number;
  };
  options?: Array<{
    id: string;
    text: string;
    diagnostic_if_selected?: string;
  }>;
  // For ordering questions
  blocks?: string[];
  correct_order?: string[];
  accepted_answers?: string[][];
  correct_answer_id?: string;
  explanation_fr: string;
  diagnostic_tags: {
    if_correct: string[];
    if_wrong: string[];
  };
  remediation: {
    module_id: string;
    priority: string;
    lesson_title_fr: string;
  };
}

export interface ProductionTask {
  id: string;
  order: number;
  band: string;
  difficulty: number;
  points: number;
  skill: string;
  question_type: string;
  prompt_fr: string;
  blocks?: string[];
  expected_answer_zh?: string;
  accepted_answers_zh?: string[];
  auto_scoring_rules?: Array<{ criterion: string; points: number }>;
  constraints?: {
    min_characters: number;
    max_characters: number;
    allow_pinyin: boolean;
    learner_instruction_fr: string;
  };
  rubric?: Array<{ criterion_id: string; description_fr: string; points: number }>;
  explanation_fr: string;
  diagnostic_tags: Record<string, string[]>;
  remediation: { module_id: string; priority: string; lesson_title_fr: string };
}

export interface PlacementTestData {
  profile_questions: ProfileQuestion[];
  diagnostic_questions: DiagnosticQuestion[];
  micro_production_tasks: ProductionTask[];
  scoring_model: {
    raw_points_max: number;
    band_points: Record<string, number>;
    skill_weights_for_dashboard: Record<string, number>;
    placement_logic: {
      levels: Array<{
        placement_id: string;
        estimated_hsk: string;
        estimated_cefr: string;
        conditions: string[];
        recommended_start: string;
      }>;
    };
  };
  result_templates: Record<string, {
    headline_fr: string;
    summary_fr: string;
    recommended_training_level: string;
    avoid_fr: string;
    four_week_plan: string[];
  }>;
  diagnostic_feedback_engine: {
    tag_aggregation_rules: Array<{
      tag: string;
      threshold_wrong_count: number;
      weakness_fr: string;
      revision_priority_fr: string;
    }>;
    strength_rules: Array<{
      skill: string;
      threshold_percent: number;
      strength_fr: string;
    }>;
  };
  test_design: {
    adaptive_recommendation: {
      early_exit_rules: Array<{
        condition: string;
        action: string;
      }>;
    };
  };
}

// ─── Answer types ────────────────────────────────────────────────────────

export interface ProfileAnswer {
  questionId: string;
  selectedIds: string[]; // single or multi
}

export interface DiagnosticAnswer {
  questionId: string;
  band: string;
  skill: string;
  points: number;
  isCorrect: boolean;
  selectedId?: string;
  selectedOrder?: string[];
  diagnosticTags: string[];
  timeSpent: number;
}

export interface ProductionAnswer {
  taskId: string;
  points: number;
  maxPoints: number;
  userText: string;
  isAutoScored: boolean;
}

// ─── Band scoring ────────────────────────────────────────────────────────

const BAND_NAMES = ['hsk1_band', 'hsk2_band', 'hsk3_band', 'hsk4_band', 'hsk5_hsk6_band'] as const;
const SKILL_NAMES = ['vocabulary', 'grammar', 'reading', 'listening', 'characters', 'micro_production'] as const;

export interface BandScore {
  band: string;
  earned: number;
  max: number;
  percent: number;
}

export interface SkillScore {
  skill: string;
  earned: number;
  max: number;
  percent: number;
}

export interface PlacementResult {
  placementId: string;
  estimatedHsk: string;
  estimatedCefr: string;
  recommendedStart: string;
  headline: string;
  summary: string;
  avoidAdvice: string;
  fourWeekPlan: string[];
  trainingLevel: string;
  bandScores: BandScore[];
  skillScores: SkillScore[];
  totalScore: number;
  totalMax: number;
  totalPercent: number;
  strengths: string[];
  weaknesses: Array<{ text: string; priority: string }>;
  remediations: Array<{ title: string; priority: string; moduleId: string }>;
  confidence: 'high' | 'medium' | 'low';
  profileTags: string[];
  planIntensity: string;
}

// ─── Compute band scores ─────────────────────────────────────────────────

export function computeBandScores(
  answers: DiagnosticAnswer[],
  data: PlacementTestData
): BandScore[] {
  const bandMax = data.scoring_model.band_points;
  const bandEarned: Record<string, number> = {};

  for (const band of BAND_NAMES) {
    bandEarned[band] = 0;
  }

  for (const a of answers) {
    if (a.isCorrect && bandEarned[a.band] !== undefined) {
      bandEarned[a.band] += a.points;
    }
  }

  return BAND_NAMES.map(band => ({
    band,
    earned: bandEarned[band] ?? 0,
    max: bandMax[band] ?? 0,
    percent: bandMax[band] > 0 ? Math.round((bandEarned[band] / bandMax[band]) * 100) : 0,
  }));
}

// ─── Compute skill scores ────────────────────────────────────────────────

export function computeSkillScores(
  diagnosticAnswers: DiagnosticAnswer[],
  productionAnswers: ProductionAnswer[]
): SkillScore[] {
  const skillEarned: Record<string, number> = {};
  const skillMax: Record<string, number> = {};

  for (const s of SKILL_NAMES) {
    skillEarned[s] = 0;
    skillMax[s] = 0;
  }

  for (const a of diagnosticAnswers) {
    skillMax[a.skill] = (skillMax[a.skill] ?? 0) + a.points;
    if (a.isCorrect) {
      skillEarned[a.skill] = (skillEarned[a.skill] ?? 0) + a.points;
    }
  }

  for (const p of productionAnswers) {
    skillEarned['micro_production'] += p.points;
    skillMax['micro_production'] += p.maxPoints;
  }

  return SKILL_NAMES.map(skill => ({
    skill,
    earned: skillEarned[skill] ?? 0,
    max: skillMax[skill] ?? 0,
    percent: (skillMax[skill] ?? 0) > 0 ? Math.round(((skillEarned[skill] ?? 0) / skillMax[skill]) * 100) : 0,
  }));
}

// ─── Check adaptive early exit ───────────────────────────────────────────

export function shouldEarlyExit(
  bandScores: BandScore[],
  currentQuestionOrder: number
): { shouldStop: boolean; reason: string } {
  const bandMap = Object.fromEntries(bandScores.map(b => [b.band, b]));

  const hsk1 = bandMap['hsk1_band'];
  const hsk2 = bandMap['hsk2_band'];

  // After HSK1 band (q006), check if we should stop
  if (currentQuestionOrder === 6 && hsk1 && hsk1.percent < 35) {
    return { shouldStop: true, reason: 'pre_hsk_early_exit' };
  }

  // After HSK2 band (q012)
  if (currentQuestionOrder === 12 && hsk1 && hsk2) {
    if (hsk1.percent >= 35 && hsk2.percent < 40) {
      return { shouldStop: true, reason: 'hsk1_hsk2_consolidation' };
    }
  }

  return { shouldStop: false, reason: '' };
}

// ─── Determine placement level ───────────────────────────────────────────

export function determinePlacement(
  bandScores: BandScore[],
  productionAnswers: ProductionAnswer[],
  data: PlacementTestData
): PlacementResult['placementId'] {
  const bp = Object.fromEntries(bandScores.map(b => [`${b.band}_score_percent`, b.percent]));
  
  const prodTotal = productionAnswers.reduce((s, p) => s + p.points, 0);
  const prodMax = productionAnswers.reduce((s, p) => s + p.maxPoints, 0);
  const prodPct = prodMax > 0 ? Math.round((prodTotal / prodMax) * 100) : 0;
  bp['micro_production_score_percent'] = prodPct;

  // Walk levels from highest to lowest, return first match
  const levels = data.scoring_model.placement_logic.levels;
  
  // Check from highest to lowest
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    const allConditionsMet = level.conditions.every(cond => {
      const match = cond.match(/(\w+_score_percent)\s*(>=|<)\s*(\d+)/);
      if (!match) return true;
      const [, key, op, valStr] = match;
      const actual = bp[key] ?? 0;
      const threshold = parseInt(valStr);
      return op === '>=' ? actual >= threshold : actual < threshold;
    });
    if (allConditionsMet) return level.placement_id;
  }

  return 'pre_hsk';
}

// ─── Build full result ───────────────────────────────────────────────────

export function buildPlacementResult(
  profileAnswers: ProfileAnswer[],
  diagnosticAnswers: DiagnosticAnswer[],
  productionAnswers: ProductionAnswer[],
  data: PlacementTestData
): PlacementResult {
  const bandScores = computeBandScores(diagnosticAnswers, data);
  const skillScores = computeSkillScores(diagnosticAnswers, productionAnswers);
  
  const placementId = determinePlacement(bandScores, productionAnswers, data);
  const level = data.scoring_model.placement_logic.levels.find(l => l.placement_id === placementId);
  const template = data.result_templates[placementId];

  // Total
  const totalScore = diagnosticAnswers.filter(a => a.isCorrect).reduce((s, a) => s + a.points, 0)
    + productionAnswers.reduce((s, p) => s + p.points, 0);
  const totalMax = diagnosticAnswers.reduce((s, a) => s + a.points, 0)
    + productionAnswers.reduce((s, p) => s + p.maxPoints, 0);

  // Strengths
  const strengths: string[] = [];
  for (const rule of data.diagnostic_feedback_engine.strength_rules) {
    const ss = skillScores.find(s => s.skill === rule.skill);
    if (ss && ss.percent >= rule.threshold_percent) {
      strengths.push(rule.strength_fr);
    }
  }

  // Weaknesses via tag aggregation
  const tagCounts: Record<string, number> = {};
  for (const a of diagnosticAnswers) {
    if (!a.isCorrect) {
      for (const tag of a.diagnosticTags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
  }

  const weaknesses: Array<{ text: string; priority: string }> = [];
  for (const rule of data.diagnostic_feedback_engine.tag_aggregation_rules) {
    if ((tagCounts[rule.tag] ?? 0) >= rule.threshold_wrong_count) {
      weaknesses.push({
        text: rule.weakness_fr,
        priority: 'high',
      });
    }
  }

  // Remediations from wrong answers
  const remediationMap = new Map<string, { title: string; priority: string; moduleId: string }>();
  for (const a of diagnosticAnswers) {
    if (!a.isCorrect) {
      const q = data.diagnostic_questions.find(dq => dq.id === a.questionId);
      if (q?.remediation) {
        remediationMap.set(q.remediation.module_id, {
          title: q.remediation.lesson_title_fr,
          priority: q.remediation.priority,
          moduleId: q.remediation.module_id,
        });
      }
    }
  }

  // Profile tags
  const profileTags: string[] = [];
  let planIntensity = 'standard';
  for (const pa of profileAnswers) {
    for (const selId of pa.selectedIds) {
      const pq = data.profile_questions.find(p => p.id === pa.questionId);
      const opt = pq?.options.find(o => o.id === selId);
      if (opt?.personalization_tags) profileTags.push(...opt.personalization_tags);
      if (opt?.plan_intensity) planIntensity = opt.plan_intensity;
    }
  }

  // Confidence
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (diagnosticAnswers.length >= 24) confidence = 'high';
  if (diagnosticAnswers.length < 18) confidence = 'low';

  return {
    placementId,
    estimatedHsk: level?.estimated_hsk ?? 'Pre-HSK',
    estimatedCefr: level?.estimated_cefr ?? 'A0',
    recommendedStart: level?.recommended_start ?? '',
    headline: template?.headline_fr ?? '',
    summary: template?.summary_fr ?? '',
    avoidAdvice: template?.avoid_fr ?? '',
    fourWeekPlan: template?.four_week_plan ?? [],
    trainingLevel: template?.recommended_training_level ?? '',
    bandScores,
    skillScores,
    totalScore,
    totalMax,
    totalPercent: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    strengths,
    weaknesses,
    remediations: Array.from(remediationMap.values()),
    confidence,
    profileTags,
    planIntensity,
  };
}

// ─── Check ordering answer ───────────────────────────────────────────────

export function checkOrderingAnswer(
  userOrder: string[],
  correctOrder: string[],
  acceptedAnswers?: string[][]
): boolean {
  const normalize = (arr: string[]) => arr.join('|');
  if (normalize(userOrder) === normalize(correctOrder)) return true;
  if (acceptedAnswers) {
    return acceptedAnswers.some(acc => normalize(userOrder) === normalize(acc));
  }
  return false;
}

// ─── Check production task 1 (sentence reconstruction) ───────────────────

export function checkSentenceReconstruction(
  userOrder: string[],
  task: ProductionTask
): { points: number; maxPoints: number } {
  const userSentence = userOrder.join('');
  const maxPoints = task.points;
  
  if (!task.accepted_answers_zh) return { points: 0, maxPoints };
  
  const isAccepted = task.accepted_answers_zh.some(
    accepted => userSentence === accepted.replace(/[。！？，]/g, '')
  );
  
  // Simple scoring: all or nothing for auto-scored
  return { points: isAccepted ? maxPoints : 0, maxPoints };
}
