'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useRouter } from '@/i18n/navigation';
import {
  type PlacementTestData,
  type ProfileAnswer,
  type DiagnosticAnswer,
  type ProductionAnswer,
  type ProfileQuestion,
  type DiagnosticQuestion,
  type ProductionTask,
  type PlacementResult,
  buildPlacementResult,
  shouldEarlyExit,
  computeBandScores,
  checkOrderingAnswer,
  checkSentenceReconstruction,
} from '@/lib/placement/engine';
import {
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Check,
  X,
  Star,
  Target,
  Zap,
  BookOpen,
  Headphones,
  PenTool,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Clock,
  AlertTriangle,
  GripVertical,
  Trophy,
  TrendingUp,
  Shield,
  Calendar,
} from 'lucide-react';

// ─── Phase type ──────────────────────────────────────────────────────────
type Phase = 'welcome' | 'profile' | 'diagnostic' | 'production' | 'computing' | 'results';

// ─── Band labels ─────────────────────────────────────────────────────────
// Map placement IDs to course slugs
const PLACEMENT_TO_COURSE: Record<string, string> = {
  pre_hsk: 'hsk-1',
  hsk1_foundation: 'hsk-1',
  hsk2_consolidation: 'hsk-2',
  hsk3_ready: 'hsk-3',
  hsk4_ready: 'hsk-4',
  hsk5_ready: 'hsk-5',
  hsk6_ready: 'hsk-6',
  advanced_diagnostic_recommended: 'hsk-6',
};

const BAND_LABELS: Record<string, string> = {
  hsk1_band: 'HSK 1',
  hsk2_band: 'HSK 2',
  hsk3_band: 'HSK 3',
  hsk4_band: 'HSK 4',
  hsk5_hsk6_band: 'HSK 5-6',
};

const SKILL_LABELS: Record<string, { label: string; icon: typeof BookOpen }> = {
  vocabulary: { label: 'Vocabulaire', icon: BookOpen },
  grammar: { label: 'Grammaire', icon: PenTool },
  reading: { label: 'Lecture', icon: BookOpen },
  listening: { label: 'Écoute', icon: Headphones },
  characters: { label: 'Caractères', icon: Star },
  micro_production: { label: 'Production', icon: PenTool },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PlacementTest() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [testData, setTestData] = useState<PlacementTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile
  const [profileAnswers, setProfileAnswers] = useState<ProfileAnswer[]>([]);
  const [profileIndex, setProfileIndex] = useState(0);

  // Diagnostic
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<DiagnosticAnswer[]>([]);
  const [diagnosticIndex, setDiagnosticIndex] = useState(0);
  const [earlyExitReason, setEarlyExitReason] = useState('');

  // Production
  const [productionAnswers, setProductionAnswers] = useState<ProductionAnswer[]>([]);
  const [productionIndex, setProductionIndex] = useState(0);

  // Results
  const [result, setResult] = useState<PlacementResult | null>(null);

  // Router for skip-to-beginner
  const router = useRouter();

  // Timer
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Load test data
  useEffect(() => {
    fetch('/static/placement-test.json')
      .then((r) => r.json())
      .then((json) => {
        const pt = json.placement_test;
        setTestData({
          profile_questions: pt.profile_questions,
          diagnostic_questions: pt.diagnostic_questions,
          micro_production_tasks: pt.micro_production_tasks,
          scoring_model: pt.scoring_model,
          result_templates: pt.result_templates,
          diagnostic_feedback_engine: pt.diagnostic_feedback_engine,
          test_design: pt.test_design,
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger le test. Réessaie.');
        setLoading(false);
      });
  }, []);

  // Timer
  useEffect(() => {
    if (phase === 'diagnostic' || phase === 'production') {
      if (startTime === 0) setStartTime(Date.now());
      const iv = setInterval(() => setElapsed(Math.floor((Date.now() - (startTime || Date.now())) / 1000)), 1000);
      return () => clearInterval(iv);
    }
  }, [phase, startTime]);

  // ─── Profile handlers ──────────────────────────────────────────────────
  const handleProfileAnswer = useCallback(
    (questionId: string, selectedIds: string[]) => {
      setProfileAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== questionId);
        return [...filtered, { questionId, selectedIds }];
      });
    },
    []
  );

  const goNextProfile = useCallback(() => {
    if (!testData) return;
    if (profileIndex < testData.profile_questions.length - 1) {
      setProfileIndex((i) => i + 1);
    } else {
      setPhase('diagnostic');
      setStartTime(Date.now());
    }
  }, [testData, profileIndex]);

  const goPrevProfile = useCallback(() => {
    if (profileIndex > 0) setProfileIndex((i) => i - 1);
  }, [profileIndex]);

  // ─── Diagnostic handlers ──────────────────────────────────────────────
  const handleDiagnosticAnswer = useCallback(
    (answer: DiagnosticAnswer) => {
      if (!testData) return;

      const newAnswers = [...diagnosticAnswers, answer];
      setDiagnosticAnswers(newAnswers);

      // Check early exit after each band
      const bandScores = computeBandScores(newAnswers, testData);
      const currentOrder = answer.questionId
        ? (testData.diagnostic_questions.find((q) => q.id === answer.questionId)?.order ?? 0)
        : 0;

      const exit = shouldEarlyExit(bandScores, currentOrder);
      if (exit.shouldStop) {
        setEarlyExitReason(exit.reason);
        setPhase('production');
        return;
      }

      // Next question or move to production
      if (diagnosticIndex < testData.diagnostic_questions.length - 1) {
        setDiagnosticIndex((i) => i + 1);
      } else {
        setPhase('production');
      }
    },
    [testData, diagnosticAnswers, diagnosticIndex]
  );

  // ─── Production handlers ──────────────────────────────────────────────
  const handleProductionAnswer = useCallback(
    (answer: ProductionAnswer) => {
      if (!testData) return;
      const newAnswers = [...productionAnswers, answer];
      setProductionAnswers(newAnswers);

      if (productionIndex < testData.micro_production_tasks.length - 1) {
        setProductionIndex((i) => i + 1);
      } else {
        // Compute results
        setPhase('computing');
        setTimeout(() => {
          const r = buildPlacementResult(profileAnswers, diagnosticAnswers, newAnswers, testData);
          setResult(r);
          setPhase('results');
        }, 2500);
      }
    },
    [testData, productionAnswers, productionIndex, profileAnswers, diagnosticAnswers]
  );

  // ─── Computed progress ─────────────────────────────────────────────────
  const totalSteps = useMemo(() => {
    if (!testData) return 0;
    return (
      testData.profile_questions.length +
      testData.diagnostic_questions.length +
      testData.micro_production_tasks.length
    );
  }, [testData]);

  const currentStep = useMemo(() => {
    if (!testData) return 0;
    if (phase === 'profile') return profileIndex + 1;
    if (phase === 'diagnostic')
      return testData.profile_questions.length + diagnosticIndex + 1;
    if (phase === 'production')
      return (
        testData.profile_questions.length +
        diagnosticAnswers.length +
        productionIndex + 1
      );
    return 0;
  }, [testData, phase, profileIndex, diagnosticIndex, diagnosticAnswers.length, productionIndex]);

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;
  if (!testData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-teal-50/30">
      {/* Progress bar */}
      {phase !== 'welcome' && phase !== 'computing' && phase !== 'results' && (
        <ProgressBar
          currentStep={currentStep}
          totalSteps={totalSteps}
          phase={phase}
          elapsed={elapsed}
        />
      )}

      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {phase === 'welcome' && (
          <WelcomeScreen
            testDesign={testData.test_design}
            onStart={() => setPhase('profile')}
            onSkipBeginner={() => {
              // Store a beginner placement result and go straight to HSK1
              try {
                localStorage.setItem(
                  'lingullio_placement_result',
                  JSON.stringify({
                    placementId: 'pre_hsk',
                    estimatedHsk: 'Pre-HSK',
                    estimatedCefr: 'A0',
                    recommendedStart: 'HSK 1 – Module 1',
                    trainingLevel: 'Fondations chinoises puis HSK 1',
                    totalPercent: 0,
                    profileTags: ['beginner_skip'],
                    planIntensity: 'standard',
                    strengths: [],
                    weaknesses: [],
                    completedAt: new Date().toISOString(),
                    skipped: true,
                  })
                );
              } catch {
                // localStorage might be unavailable
              }
              router.push('/courses/hsk-1');
            }}
          />
        )}

        {phase === 'profile' && (
          <ProfilePhase
            question={testData.profile_questions[profileIndex]}
            index={profileIndex}
            total={testData.profile_questions.length}
            currentAnswer={profileAnswers.find(
              (a) => a.questionId === testData.profile_questions[profileIndex].id
            )}
            onAnswer={handleProfileAnswer}
            onNext={goNextProfile}
            onPrev={goPrevProfile}
          />
        )}

        {phase === 'diagnostic' && (
          <DiagnosticPhase
            question={testData.diagnostic_questions[diagnosticIndex]}
            index={diagnosticIndex}
            total={testData.diagnostic_questions.length}
            onAnswer={handleDiagnosticAnswer}
          />
        )}

        {phase === 'production' && (
          <ProductionPhase
            task={testData.micro_production_tasks[productionIndex]}
            index={productionIndex}
            total={testData.micro_production_tasks.length}
            onAnswer={handleProductionAnswer}
          />
        )}

        {phase === 'computing' && <ComputingScreen />}

        {phase === 'results' && result && <ResultsScreen result={result} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════

function ProgressBar({
  currentStep,
  totalSteps,
  phase,
  elapsed,
}: {
  currentStep: number;
  totalSteps: number;
  phase: Phase;
  elapsed: number;
}) {
  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const phaseLabel =
    phase === 'profile'
      ? 'Profil'
      : phase === 'diagnostic'
        ? 'Diagnostic'
        : phase === 'production'
          ? 'Production'
          : '';

  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-cream-100 px-4 py-3">
      <div className="mx-auto max-w-2xl flex items-center gap-4">
        <span className="text-xs font-medium text-navy-500 uppercase tracking-wider min-w-[80px]">
          {phaseLabel}
        </span>
        <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-400 min-w-[70px] justify-end">
          <Clock className="w-3.5 h-3.5" />
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function WelcomeScreen({
  testDesign,
  onStart,
  onSkipBeginner,
}: {
  testDesign: PlacementTestData['test_design'];
  onStart: () => void;
  onSkipBeginner: () => void;
}) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      {/* Hero icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-200/50">
        <Target className="w-10 h-10 text-white" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-3">
        Test de positionnement
      </h1>
      <p className="text-navy-500 text-lg mb-8 max-w-md">
        Découvre ton niveau actuel, tes forces, tes lacunes et ton meilleur
        point de départ pour préparer le HSK.
      </p>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
        <InfoCard icon={Clock} label="~16 min" sublabel="Durée estimée" />
        <InfoCard icon={Zap} label="Adaptatif" sublabel="S'adapte à ton niveau" />
        <InfoCard icon={Shield} label="Sans stress" sublabel="Pas de piège" />
      </div>

      {/* Steps preview */}
      <Card className="w-full mb-8">
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-4">
            Comment ça marche
          </h3>
          <div className="space-y-3">
            <StepPreview n={1} text="5 questions sur ton profil" />
            <StepPreview n={2} text="Questions de diagnostic adaptatives" />
            <StepPreview n={3} text="2 mini-exercices de production" />
            <StepPreview n={4} text="Ton bilan personnalisé avec plan d'action" />
          </div>
        </CardContent>
      </Card>

      <Button variant="teal" size="xl" onClick={onStart} className="w-full sm:w-auto">
        Commencer le test
        <ArrowRight className="w-5 h-5 ml-1" />
      </Button>

      {/* Skip for total beginners */}
      <div className="mt-6 w-full">
        {!showSkipConfirm ? (
          <button
            onClick={() => setShowSkipConfirm(true)}
            className="text-sm text-navy-400 hover:text-navy-600 transition-colors underline underline-offset-4 decoration-dashed"
          >
            Je suis totalement débutant en chinois
          </button>
        ) : (
          <div className="p-5 rounded-xl bg-cream-50 border border-cream-200 animate-fade-in max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-sm text-navy-700 text-left">
                Pas de souci ! Tu commenceras directement par les <strong>fondations</strong> du chinois, puis le <strong>HSK 1</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={onSkipBeginner}>
                Commencer depuis zéro
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSkipConfirm(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: typeof Clock;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-cream-50/50 border border-cream-100">
      <Icon className="w-5 h-5 text-teal-500 mb-2" />
      <span className="font-semibold text-navy-900 text-sm">{label}</span>
      <span className="text-xs text-navy-400">{sublabel}</span>
    </div>
  );
}

function StepPreview({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold shrink-0">
        {n}
      </div>
      <span className="text-sm text-navy-600">{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE PHASE
// ═══════════════════════════════════════════════════════════════════════════

function ProfilePhase({
  question,
  index,
  total,
  currentAnswer,
  onAnswer,
  onNext,
  onPrev,
}: {
  question: ProfileQuestion;
  index: number;
  total: number;
  currentAnswer?: ProfileAnswer;
  onAnswer: (qId: string, selectedIds: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(currentAnswer?.selectedIds ?? []);

  // Reset selection when question changes
  useEffect(() => {
    setSelected(currentAnswer?.selectedIds ?? []);
  }, [question.id, currentAnswer]);

  const toggleOption = (optId: string) => {
    if (question.type === 'single_choice') {
      const newSel = [optId];
      setSelected(newSel);
      onAnswer(question.id, newSel);
      // Auto-advance after brief delay for single choice
      setTimeout(onNext, 350);
    } else {
      setSelected((prev) => {
        const newSel = prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId];
        onAnswer(question.id, newSel);
        return newSel;
      });
    }
  };

  const canProceed = selected.length > 0;

  return (
    <div className="animate-slide-in">
      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
          <Star className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider">
          Profil · {index + 1}/{total}
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-2">
        {question.prompt_fr}
      </h2>

      {question.type === 'multi_choice' && (
        <p className="text-sm text-navy-400 mb-6">Plusieurs réponses possibles</p>
      )}
      {question.type === 'single_choice' && (
        <p className="text-sm text-navy-400 mb-6">Choisis une réponse</p>
      )}

      <div className="space-y-3 mb-8">
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-teal-400 bg-teal-50/50 shadow-sm'
                  : 'border-cream-100 bg-white hover:border-cream-200 hover:bg-cream-50/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-teal-500 bg-teal-500' : 'border-cream-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm ${isSelected ? 'text-navy-900 font-medium' : 'text-navy-700'}`}>
                  {opt.text_fr}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation (only show explicit button for multi_choice) */}
      {question.type === 'multi_choice' && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onPrev} disabled={index === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <Button variant="teal" onClick={onNext} disabled={!canProceed}>
            Continuer
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC PHASE
// ═══════════════════════════════════════════════════════════════════════════

function DiagnosticPhase({
  question,
  index,
  total,
  onAnswer,
}: {
  question: DiagnosticQuestion;
  index: number;
  total: number;
  onAnswer: (a: DiagnosticAnswer) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const questionStartRef = useRef(Date.now());
  const { playingId, play, stop } = useAudioPlayer();

  // Reset state on new question
  useEffect(() => {
    setSelectedId(null);
    setSelectedOrder([]);
    setShowFeedback(false);
    setIsCorrect(false);
    questionStartRef.current = Date.now();
    stop();
  }, [question.id, stop]);

  const bandLabel = BAND_LABELS[question.band] ?? question.band;

  const submitMCQ = (optId: string) => {
    if (showFeedback) return;
    setSelectedId(optId);
    const correct = optId === question.correct_answer_id;
    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer({
        questionId: question.id,
        band: question.band,
        skill: question.skill,
        points: correct ? question.points : 0,
        isCorrect: correct,
        selectedId: optId,
        diagnosticTags: correct ? question.diagnostic_tags.if_correct : question.diagnostic_tags.if_wrong,
        timeSpent: Math.floor((Date.now() - questionStartRef.current) / 1000),
      });
    }, 1500);
  };

  const submitOrdering = () => {
    if (showFeedback) return;
    const correct = checkOrderingAnswer(
      selectedOrder,
      question.correct_order ?? [],
      question.accepted_answers
    );
    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer({
        questionId: question.id,
        band: question.band,
        skill: question.skill,
        points: correct ? question.points : 0,
        isCorrect: correct,
        selectedOrder,
        diagnosticTags: correct ? question.diagnostic_tags.if_correct : question.diagnostic_tags.if_wrong,
        timeSpent: Math.floor((Date.now() - questionStartRef.current) / 1000),
      });
    }, 1500);
  };

  const isListening = question.question_type === 'listening_multiple_choice';
  const isOrdering = question.question_type === 'ordering';

  return (
    <div className="animate-slide-in" key={question.id}>
      {/* Phase badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <span className="text-xs font-medium text-teal-600 uppercase tracking-wider">
            Diagnostic · {index + 1}/{total}
          </span>
        </div>
        <span className="text-xs font-medium text-navy-400 bg-cream-50 px-2.5 py-1 rounded-full">
          {bandLabel}
        </span>
      </div>

      {/* Stimulus */}
      {question.stimulus && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
          {question.stimulus.zh && (
            <p className="text-2xl font-medium text-navy-900 mb-1">{question.stimulus.zh}</p>
          )}
          {question.stimulus.pinyin && (
            <p className="text-sm text-navy-400 italic">{question.stimulus.pinyin}</p>
          )}
          {question.stimulus.fr && (
            <p className="text-sm text-navy-500 mt-1">{question.stimulus.fr}</p>
          )}
        </div>
      )}

      {/* Audio button for listening questions */}
      {isListening && question.audio && (
        <AudioButton
          audio={question.audio}
          questionId={question.id}
          playingId={playingId}
          onPlay={play}
        />
      )}

      {/* Question prompt */}
      <h2 className="text-lg sm:text-xl font-bold text-navy-900 mb-6">
        {question.prompt_fr}
      </h2>

      {/* MCQ Options */}
      {!isOrdering && question.options && (
        <div className="space-y-3 mb-6">
          {question.options.map((opt) => {
            const isSelected = selectedId === opt.id;
            const isCorrectOpt = opt.id === question.correct_answer_id;
            let optClass = 'border-cream-100 bg-white hover:border-cream-200';

            if (showFeedback) {
              if (isCorrectOpt) optClass = 'border-emerald-400 bg-emerald-50';
              else if (isSelected && !isCorrectOpt) optClass = 'border-red-300 bg-red-50';
              else optClass = 'border-cream-100 bg-cream-50/30 opacity-60';
            } else if (isSelected) {
              optClass = 'border-teal-400 bg-teal-50/50 shadow-sm';
            }

            return (
              <button
                key={opt.id}
                onClick={() => submitMCQ(opt.id)}
                disabled={showFeedback}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${optClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isSelected || (showFeedback && isCorrectOpt) ? 'font-medium text-navy-900' : 'text-navy-700'}`}>
                    {opt.text}
                  </span>
                  {showFeedback && isCorrectOpt && (
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrectOpt && (
                    <X className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Ordering */}
      {isOrdering && question.blocks && (
        <OrderingRenderer
          blocks={question.blocks}
          selectedOrder={selectedOrder}
          onChange={setSelectedOrder}
          showFeedback={showFeedback}
          isCorrect={isCorrect}
          correctOrder={question.correct_order ?? []}
          onSubmit={submitOrdering}
        />
      )}

      {/* Feedback message */}
      {showFeedback && (
        <FeedbackMessage isCorrect={isCorrect} explanation={question.explanation_fr} />
      )}
    </div>
  );
}

// ─── Audio Button ────────────────────────────────────────────────────────

function AudioButton({
  audio,
  questionId,
  playingId,
  onPlay,
}: {
  audio: DiagnosticQuestion['audio'];
  questionId: string;
  playingId: string | null;
  onPlay: (id: string, url: string | null, text: string) => void;
}) {
  const [playCount, setPlayCount] = useState(0);
  const maxPlays = audio?.repeat_allowed ?? 2;
  const isPlaying = playingId === questionId;

  // Auto-play audio once when the listening question appears
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (!autoPlayedRef.current && audio?.script_zh) {
      autoPlayedRef.current = true;
      // Small delay to ensure SpeechSynthesis voices are loaded
      const timer = setTimeout(() => {
        setPlayCount(1);
        onPlay(questionId, null, audio.script_zh);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = () => {
    if (playCount >= maxPlays && !isPlaying) return;
    if (!isPlaying) setPlayCount((c) => c + 1);
    onPlay(questionId, null, audio?.script_zh ?? '');
  };

  const remaining = maxPlays - playCount;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlay}
          disabled={remaining <= 0 && !isPlaying}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
            isPlaying
              ? 'border-teal-400 bg-teal-50 text-teal-700 shadow-sm shadow-teal-100'
              : remaining > 0
                ? 'border-cream-200 bg-white hover:border-teal-300 hover:shadow-sm text-navy-700'
                : 'border-cream-100 bg-cream-50 text-navy-300 cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-75" />
              <Volume2 className="relative w-5 h-5 text-teal-600" />
            </span>
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {isPlaying ? 'Écoute en cours…' : remaining > 0 ? 'Réécouter' : 'Écoutes épuisées'}
          </span>
        </button>
        <span className="text-xs text-navy-400">
          {remaining > 0
            ? `${remaining} écoute${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`
            : ''}
        </span>
      </div>
      {/* Hint for listening questions */}
      <p className="mt-2 text-xs text-navy-400 flex items-center gap-1.5">
        <Headphones className="w-3.5 h-3.5" />
        Écoute attentivement puis choisis la bonne réponse
      </p>
    </div>
  );
}

// ─── Ordering Renderer ───────────────────────────────────────────────────

function OrderingRenderer({
  blocks,
  selectedOrder,
  onChange,
  showFeedback,
  isCorrect,
  correctOrder,
  onSubmit,
}: {
  blocks: string[];
  selectedOrder: string[];
  onChange: (order: string[]) => void;
  showFeedback: boolean;
  isCorrect: boolean;
  correctOrder: string[];
  onSubmit: () => void;
}) {
  const available = blocks.filter((b) => !selectedOrder.includes(b));

  const addBlock = (block: string) => {
    if (showFeedback) return;
    onChange([...selectedOrder, block]);
  };

  const removeBlock = (index: number) => {
    if (showFeedback) return;
    onChange(selectedOrder.filter((_, i) => i !== index));
  };

  const resetOrder = () => {
    if (showFeedback) return;
    onChange([]);
  };

  return (
    <div className="mb-6">
      {/* Sentence builder area */}
      <div
        className={`min-h-[60px] p-4 rounded-xl border-2 border-dashed mb-4 flex flex-wrap gap-2 ${
          showFeedback
            ? isCorrect
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-red-300 bg-red-50/50'
            : 'border-cream-200 bg-cream-50/30'
        }`}
      >
        {selectedOrder.length === 0 && (
          <span className="text-sm text-navy-300 italic">Clique sur les mots pour construire la phrase…</span>
        )}
        {selectedOrder.map((block, i) => (
          <button
            key={`sel-${i}`}
            onClick={() => removeBlock(i)}
            disabled={showFeedback}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showFeedback
                ? isCorrect
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
                : 'bg-teal-100 text-teal-800 hover:bg-teal-200 cursor-pointer'
            }`}
          >
            {block}
          </button>
        ))}
      </div>

      {/* Available blocks */}
      <div className="flex flex-wrap gap-2 mb-4">
        {available.map((block, i) => (
          <button
            key={`avl-${i}`}
            onClick={() => addBlock(block)}
            disabled={showFeedback}
            className="px-3 py-1.5 rounded-lg bg-white border border-cream-200 text-sm text-navy-700 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
          >
            {block}
          </button>
        ))}
      </div>

      {/* Actions */}
      {!showFeedback && (
        <div className="flex items-center gap-3">
          <Button
            variant="teal"
            onClick={onSubmit}
            disabled={selectedOrder.length === 0}
          >
            Valider
            <Check className="w-4 h-4 ml-1" />
          </Button>
          {selectedOrder.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetOrder}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Recommencer
            </Button>
          )}
        </div>
      )}

      {/* Show correct answer if wrong */}
      {showFeedback && !isCorrect && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium mb-1">Réponse correcte :</p>
          <p className="text-sm text-emerald-800 font-medium">{correctOrder.join('')}</p>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Message ────────────────────────────────────────────────────

function FeedbackMessage({
  isCorrect,
  explanation,
}: {
  isCorrect: boolean;
  explanation: string;
}) {
  return (
    <div
      className={`p-4 rounded-xl border animate-fade-in ${
        isCorrect
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {isCorrect ? (
          <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        )}
        <div>
          <p className={`text-sm font-medium mb-1 ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isCorrect ? 'Bravo !' : 'Pas tout à fait…'}
          </p>
          <p className="text-xs text-navy-600">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION PHASE
// ═══════════════════════════════════════════════════════════════════════════

function ProductionPhase({
  task,
  index,
  total,
  onAnswer,
}: {
  task: ProductionTask;
  index: number;
  total: number;
  onAnswer: (a: ProductionAnswer) => void;
}) {
  if (task.question_type === 'controlled_sentence_reconstruction') {
    return (
      <SentenceReconstructionTask task={task} index={index} total={total} onAnswer={onAnswer} />
    );
  }

  return <OpenTextTask task={task} index={index} total={total} onAnswer={onAnswer} />;
}

// ─── Sentence Reconstruction ─────────────────────────────────────────────

function SentenceReconstructionTask({
  task,
  index,
  total,
  onAnswer,
}: {
  task: ProductionTask;
  index: number;
  total: number;
  onAnswer: (a: ProductionAnswer) => void;
}) {
  const [order, setOrder] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ points: number; maxPoints: number } | null>(null);

  const blocks = task.blocks ?? [];
  const available = blocks.filter((b) => !order.includes(b));

  const handleSubmit = () => {
    const r = checkSentenceReconstruction(order, task);
    setResult(r);
    setSubmitted(true);

    setTimeout(() => {
      onAnswer({
        taskId: task.id,
        points: r.points,
        maxPoints: r.maxPoints,
        userText: order.join(''),
        isAutoScored: true,
      });
    }, 2000);
  };

  return (
    <div className="animate-slide-in">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
          <PenTool className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <span className="text-xs font-medium text-purple-500 uppercase tracking-wider">
          Production · {index + 1}/{total}
        </span>
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-navy-900 mb-6">
        {task.prompt_fr}
      </h2>

      {/* Sentence builder */}
      <div
        className={`min-h-[60px] p-4 rounded-xl border-2 border-dashed mb-4 flex flex-wrap gap-2 ${
          submitted
            ? result && result.points > 0
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-red-300 bg-red-50/50'
            : 'border-cream-200 bg-cream-50/30'
        }`}
      >
        {order.length === 0 && (
          <span className="text-sm text-navy-300 italic">Reconstitue la phrase…</span>
        )}
        {order.map((block, i) => (
          <button
            key={`sel-${i}`}
            onClick={() => !submitted && setOrder((prev) => prev.filter((_, j) => j !== i))}
            disabled={submitted}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              submitted
                ? result && result.points > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
                : 'bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer'
            }`}
          >
            {block}
          </button>
        ))}
      </div>

      {/* Available blocks */}
      <div className="flex flex-wrap gap-2 mb-6">
        {available.map((block, i) => (
          <button
            key={`avl-${i}`}
            onClick={() => !submitted && setOrder((prev) => [...prev, block])}
            disabled={submitted}
            className="px-3 py-1.5 rounded-lg bg-white border border-cream-200 text-sm text-navy-700 hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
          >
            {block}
          </button>
        ))}
      </div>

      {/* Actions */}
      {!submitted && (
        <div className="flex items-center gap-3">
          <Button
            variant="teal"
            onClick={handleSubmit}
            disabled={order.length !== blocks.length}
          >
            Valider
            <Check className="w-4 h-4 ml-1" />
          </Button>
          {order.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setOrder([])}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Recommencer
            </Button>
          )}
        </div>
      )}

      {/* Feedback */}
      {submitted && result && (
        <FeedbackMessage
          isCorrect={result.points > 0}
          explanation={task.explanation_fr}
        />
      )}
    </div>
  );
}

// ─── Open Text ───────────────────────────────────────────────────────────

function OpenTextTask({
  task,
  index,
  total,
  onAnswer,
}: {
  task: ProductionTask;
  index: number;
  total: number;
  onAnswer: (a: ProductionAnswer) => void;
}) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const constraints = task.constraints;
  const minChars = constraints?.min_characters ?? 0;
  const maxChars = constraints?.max_characters ?? 500;

  const handleSubmit = () => {
    setSubmitted(true);

    // Auto-score based on rubric criteria
    let points = 0;
    const maxPoints = task.points;

    if (task.rubric) {
      // Give proportional points based on text length relative to constraints
      const charCount = text.trim().length;
      if (charCount >= minChars) {
        // At least 1 point for meeting minimum
        points += 1;
        // Additional points for longer/more complete text
        if (charCount >= minChars * 2) points += 1;
        if (charCount >= minChars * 3) points += 1;
        // Check for Chinese characters
        const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        if (chineseCount >= 5) points += 1;
        if (chineseCount >= 10) points += 1;
      }
      points = Math.min(points, maxPoints);
    }

    setTimeout(() => {
      onAnswer({
        taskId: task.id,
        points,
        maxPoints,
        userText: text,
        isAutoScored: false,
      });
    }, 1000);
  };

  return (
    <div className="animate-slide-in">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
          <PenTool className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <span className="text-xs font-medium text-purple-500 uppercase tracking-wider">
          Production · {index + 1}/{total}
        </span>
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-navy-900 mb-3">
        {task.prompt_fr}
      </h2>

      {constraints?.learner_instruction_fr && (
        <p className="text-sm text-navy-400 mb-6 italic">
          {constraints.learner_instruction_fr}
        </p>
      )}

      <div className="relative mb-4">
        <textarea
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= maxChars) setText(e.target.value);
          }}
          disabled={submitted}
          rows={5}
          placeholder="Écris ta réponse en chinois ici…"
          className={`w-full p-4 rounded-xl border-2 text-base resize-none transition-colors focus:outline-none ${
            submitted
              ? 'border-cream-100 bg-cream-50 text-navy-500'
              : 'border-cream-200 bg-white focus:border-teal-400 text-navy-900 placeholder:text-navy-300'
          }`}
          style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
        />
        <div className="absolute bottom-3 right-3 text-xs text-navy-300">
          {text.length}/{maxChars}
        </div>
      </div>

      {text.length > 0 && text.length < minChars && !submitted && (
        <p className="text-xs text-amber-500 mb-4">
          Minimum {minChars} caractères ({minChars - text.length} restants)
        </p>
      )}

      {!submitted && (
        <Button
          variant="teal"
          onClick={handleSubmit}
          disabled={text.trim().length < minChars}
        >
          Soumettre
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      )}

      {submitted && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-teal-500" />
            <p className="text-sm font-medium text-teal-700">
              Réponse enregistrée. Merci !
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTING SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function ComputingScreen() {
  const [step, setStep] = useState(0);
  const steps = [
    'Analyse de tes réponses…',
    'Calcul de ton profil de compétences…',
    'Préparation de ton plan personnalisé…',
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-8 shadow-lg shadow-teal-200/50 animate-bounce">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      <div className="space-y-4 w-full max-w-xs">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 transition-all duration-500 ${
              i <= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {i < step ? (
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            ) : i === step ? (
              <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-cream-100" />
            )}
            <span className={`text-sm ${i <= step ? 'text-navy-700' : 'text-navy-300'}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function ResultsScreen({ result }: { result: PlacementResult }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero result */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200/50">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-2">
          {result.headline}
        </h1>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 font-bold text-lg">
            {result.estimatedHsk}
          </span>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium text-sm">
            {result.estimatedCefr}
          </span>
        </div>
        <p className="text-navy-500 max-w-md mx-auto text-sm leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* Score overview */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider">
              Score global
            </h3>
            <span className="text-2xl font-bold text-teal-600">
              {result.totalScore}/{result.totalMax}
            </span>
          </div>
          <div className="w-full h-3 bg-cream-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${result.totalPercent}%` }}
            />
          </div>
          <p className="text-xs text-navy-400 text-right">{result.totalPercent}%</p>
        </CardContent>
      </Card>

      {/* Band scores */}
      <Card>
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-4">
            Scores par niveau
          </h3>
          <div className="space-y-3">
            {result.bandScores.map((bs) => (
              <BandScoreBar key={bs.band} bandScore={bs} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skill breakdown */}
      <Card>
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-4">
            Compétences
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {result.skillScores
              .filter((ss) => ss.max > 0)
              .map((ss) => (
                <SkillCard key={ss.skill} skillScore={ss} />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
        <Card>
          <CardContent className="py-6">
            {result.strengths.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Tes points forts
                </h3>
                <div className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-navy-700">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.weaknesses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Axes de travail
                </h3>
                <div className="space-y-2">
                  {result.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-navy-700">
                      <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      {w.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Avoid advice */}
      {result.avoidAdvice && (
        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1">Conseil important</p>
              <p className="text-xs text-navy-600">{result.avoidAdvice}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4-week plan */}
      {result.fourWeekPlan.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-500" />
              Ton plan sur 4 semaines
            </h3>
            <div className="space-y-4">
              {result.fourWeekPlan.map((week, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold">
                      S{i + 1}
                    </div>
                    {i < result.fourWeekPlan.length - 1 && (
                      <div className="w-0.5 flex-1 bg-cream-200 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-navy-700 pt-1.5 pb-3">{week}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remediations */}
      {result.remediations.length > 0 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left"
        >
          <Card className={showDetails ? 'ring-1 ring-teal-200' : ''}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-500" />
                  Modules de révision recommandés
                </h3>
                <ChevronRight
                  className={`w-5 h-5 text-navy-400 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                />
              </div>
              {showDetails && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  {result.remediations.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-cream-50"
                    >
                      <span className="text-sm text-navy-700">{r.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.priority === 'critical'
                            ? 'bg-red-50 text-red-600'
                            : r.priority === 'high'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-cream-100 text-navy-500'
                        }`}
                      >
                        {r.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </button>
      )}

      {/* CTA */}
      <ResultCTA result={result} />
    </div>
  );
}

// ─── Band Score Bar ──────────────────────────────────────────────────────

function BandScoreBar({ bandScore }: { bandScore: PlacementResult['bandScores'][0] }) {
  const label = BAND_LABELS[bandScore.band] ?? bandScore.band;
  const color =
    bandScore.percent >= 70
      ? 'from-emerald-400 to-emerald-500'
      : bandScore.percent >= 40
        ? 'from-amber-400 to-amber-500'
        : 'from-red-300 to-red-400';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-navy-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${bandScore.percent}%` }}
        />
      </div>
      <span className="text-xs text-navy-400 w-12 text-right">
        {bandScore.earned}/{bandScore.max}
      </span>
    </div>
  );
}

// ─── Skill Card ──────────────────────────────────────────────────────────

function SkillCard({ skillScore }: { skillScore: PlacementResult['skillScores'][0] }) {
  const meta = SKILL_LABELS[skillScore.skill] ?? { label: skillScore.skill, icon: Star };
  const Icon = meta.icon;
  const color =
    skillScore.percent >= 70
      ? 'text-emerald-500 bg-emerald-50'
      : skillScore.percent >= 40
        ? 'text-amber-500 bg-amber-50'
        : 'text-red-400 bg-red-50';

  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-cream-50/50 border border-cream-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-navy-700 text-center mb-1">{meta.label}</span>
      <span className="text-lg font-bold text-navy-900">{skillScore.percent}%</span>
      <span className="text-[10px] text-navy-400">{skillScore.earned}/{skillScore.max}</span>
    </div>
  );
}

// ─── Result CTA ──────────────────────────────────────────────────────────

function ResultCTA({ result }: { result: PlacementResult }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const courseSlug = PLACEMENT_TO_COURSE[result.placementId] ?? 'hsk-1';

  const handleStart = () => {
    setSaving(true);
    // Store placement result in localStorage for onboarding adaptation
    try {
      localStorage.setItem(
        'lingullio_placement_result',
        JSON.stringify({
          placementId: result.placementId,
          estimatedHsk: result.estimatedHsk,
          estimatedCefr: result.estimatedCefr,
          recommendedStart: result.recommendedStart,
          trainingLevel: result.trainingLevel,
          totalPercent: result.totalPercent,
          profileTags: result.profileTags,
          planIntensity: result.planIntensity,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          completedAt: new Date().toISOString(),
        })
      );
    } catch {
      // localStorage might be unavailable
    }
    setTimeout(() => {
      router.push(`/courses/${courseSlug}`);
    }, 300);
  };

  return (
    <div className="text-center pt-4 pb-8">
      <Button variant="teal" size="xl" onClick={handleStart} disabled={saving}>
        {saving ? 'Préparation…' : 'Commencer mon apprentissage'}
        <ArrowRight className="w-5 h-5 ml-1" />
      </Button>
      <p className="text-xs text-navy-400 mt-3">
        Cours recommandé : <span className="font-medium text-navy-600">{result.trainingLevel}</span>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY SCREENS
// ═══════════════════════════════════════════════════════════════════════════

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-white to-teal-50/30">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center animate-pulse mb-4">
          <Target className="w-6 h-6 text-teal-500" />
        </div>
        <p className="text-sm text-navy-400">Chargement du test…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-white to-teal-50/30">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-navy-700 font-medium mb-2">Oups !</p>
        <p className="text-sm text-navy-400">{message}</p>
      </div>
    </div>
  );
}
