'use client';

import { useState, useCallback, useMemo, useRef, useEffect, type RefObject } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { MockExamDetail, MockExamQuestion, MockExamOption } from '@/lib/learner/queries';
import {
  Play,
  Pause,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Volume2,
  BookOpen,
  Headphones,
  PenLine,
  Award,
  RotateCcw,
  Home,
  Eye,
  Target,
  BarChart3,
  FileText,
  ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useGamificationStore } from '@/stores/gamification-store';
import type { AttemptPayload, SessionSummary } from '@/lib/gamification/progress-service';
import { ConfettiBurst, LevelUpModal } from '@/components/gamification/xp-toast';
import { BADGES, RARITY_COLORS } from '@/lib/gamification/badges';
import { levelTitle } from '@/lib/gamification/xp-config';
import { cn } from '@/lib/utils';
import { Flame, Zap, Sparkles } from 'lucide-react';
import { recordExerciseInKnowledge } from '@/lib/gamification/knowledge-tracker';

// ─── Types ──────────────────────────────────────────────────────────────

type Phase = 'intro' | 'exam' | 'review' | 'results';

interface UserAnswer {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer?: string;
  timeSpent: number;
}

interface SectionResult {
  sectionType: string;
  title: string;
  totalPoints: number;
  earnedPoints: number;
  correct: number;
  total: number;
}

// ─── Timer Hook ─────────────────────────────────────────────────────────

function useTimer(initialSeconds: number, onComplete: () => void) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((seconds: number) => {
    setRemaining(seconds);
    setIsRunning(false);
  }, []);

  return { remaining, isRunning, start, pause, reset };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Metadata helpers (generic, all levels) ──────────────────────────

type Meta = Record<string, unknown>;

function getMeta(question: MockExamQuestion): {
  examType: string;
  section: string;
  part: number | undefined;
  audio: { script_hanzi?: string; script_pinyin?: string; repeat_count?: number };
  stimulus: Meta;
  examDisplay: Meta;
  review: Meta;
} {
  const m = question.metadata ?? {};
  return {
    examType: (m.mock_exam_type as string) ?? '',
    section: (m.section as string) ?? '',
    part: m.part as number | undefined,
    audio: (m.audio as { script_hanzi?: string; script_pinyin?: string; repeat_count?: number }) ?? {},
    stimulus: (m.stimulus as Meta) ?? {},
    examDisplay: (m.exam_display as Meta) ?? {},
    review: (m.review as Meta) ?? {},
  };
}

/**
 * Resolve an image option to a real URL.
 * - If option has an explicit `image_url` → use it
 * - If option has `student_image_path` with `/static/` → extract path
 * - For HSK1 legacy: derive from exam_display.image_id
 * - For HSK4 picture_choice: derive from hsk4_qNN_X.webp pattern
 */
function resolveOptionImageUrl(
  option: { id: string; image_prompt?: string; image_url?: string; student_image_path?: string },
  examType: string,
  questionNumber: number,
  hskLevel: number,
): string | null {
  // Explicit URL
  if (option.image_url) return option.image_url;

  // HSK3 shared bank images
  if (option.student_image_path) {
    // Path like: /mnt/data/.../hsk3_l_p1a_A_subway.png → find matching webp
    const basename = option.student_image_path.split('/').pop()?.replace('.png', '.webp');
    if (basename) {
      return `/static/mock-exam/hsk${hskLevel}/${basename}`;
    }
  }

  // HSK4 picture_choice: images are hsk4_q01_A.webp etc
  if (hskLevel === 4 && examType === 'picture_choice') {
    const label = option.id; // A, B, C, D
    return `/static/mock-exam/hsk4/hsk4_q${questionNumber.toString().padStart(2, '0')}_${label}.webp`;
  }

  // HSK1 audio_choose_picture / picture_true_false: q06_a.webp etc.
  if (hskLevel === 1 && (examType === 'audio_choose_picture')) {
    const label = option.id?.toLowerCase() || String.fromCharCode(96 + (parseInt(option.id) || 1));
    return `/static/mock-exam/hsk1/q${questionNumber.toString().padStart(2, '0')}_${label.toLowerCase()}.webp`;
  }

  // HSK2 sentence_picture_choice: hsk2_l_p2_qNN_A.webp etc.
  if (hskLevel === 2 && examType === 'sentence_picture_choice') {
    const label = option.id?.toLowerCase() || 'a';
    return `/static/mock-exam/hsk2/hsk2_l_p2_q${questionNumber.toString().padStart(2, '0')}_${label}.webp`;
  }

  return null;
}

/**
 * Get the question-level image for types that show a single image per question.
 */
function getQuestionImage(
  question: MockExamQuestion,
  examType: string,
  questionNumber: number,
  hskLevel: number,
): string | null {
  // Direct image_url from DB
  if (question.image_url) return question.image_url;

  const ed = (question.metadata?.exam_display as Meta) ?? {};

  // HSK1 patterns: image_id in exam_display
  if (hskLevel === 1 && ed.image_id) {
    // audio_picture_true_false / picture_sentence_true_false
    return `/static/mock-exam/hsk1/q${questionNumber.toString().padStart(2, '0')}.webp`;
  }

  // HSK2 picture_true_false: has image_url already set
  // No additional logic needed

  return null;
}

/**
 * Extract HSK level from the exam's course_id.
 * course_id = "a0000000-0000-0000-0000-00000000000N" → N
 */
function getHskLevel(exam: MockExamDetail): number {
  const lastChar = exam.course_id.charAt(exam.course_id.length - 1);
  return parseInt(lastChar) || 1;
}

/**
 * Get the absolute question number for image path resolution.
 */
function getQuestionNumber(
  question: MockExamQuestion,
  sectionType: string,
  sectionIdx: number,
  exam: MockExamDetail,
): number {
  // For HSK1: listening Q1-20, reading Q21-40
  // For HSK2: listening Q1-35, reading Q36-60
  // General: accumulate sort_orders from previous sections
  let offset = 0;
  for (let i = 0; i < sectionIdx; i++) {
    offset += exam.sections[i].questions.length;
  }
  return offset + question.sort_order;
}

// ─── Shared image bank logic ────────────────────────────────────────

interface SharedBank {
  bankId: string;
  images: Array<{ id: string; url: string; label: string }>;
}

function getSharedImageBank(
  question: MockExamQuestion,
  examType: string,
  hskLevel: number,
): SharedBank | null {
  const ed = (question.metadata?.exam_display as Meta) ?? {};
  const bankId = ed.image_bank_id as string;
  if (!bankId) return null;

  const imageOptions = (ed.image_options as Array<{
    id: string;
    image_id?: string;
    student_image_path?: string;
    description_fr_admin?: string;
  }>) ?? [];

  if (imageOptions.length === 0) return null;

  const images = imageOptions.map((opt) => {
    let url = '';
    if (opt.student_image_path) {
      const basename = opt.student_image_path.split('/').pop()?.replace('.png', '.webp');
      url = `/static/mock-exam/hsk${hskLevel}/${basename}`;
    } else if (opt.image_id) {
      url = `/static/mock-exam/hsk${hskLevel}/${opt.image_id}.webp`;
    }
    return { id: opt.id, url, label: opt.id };
  });

  return { bankId, images };
}

// HSK1 shared bank (sentence_picture_matching: r2_bank_a..e)
function getHsk1SharedBank(examType: string): SharedBank | null {
  if (examType !== 'sentence_picture_matching') return null;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return {
    bankId: 'hsk1_r2_bank',
    images: letters.map((l) => ({
      id: l,
      url: `/static/mock-exam/hsk1/r2_bank_${l.toLowerCase()}.webp`,
      label: l,
    })),
  };
}

// HSK2 shared bank: hsk2_l_p2_qNN_row.webp (3-image row per question)
// → actually each question has its own row image, not truly shared

// ─── Question type display helpers ──────────────────────────────────

/** Does this type have image-based options (grid layout)? */
function hasImageOptions(examType: string): boolean {
  return [
    'audio_choose_picture',       // HSK1
    'picture_choice',             // HSK4
    'sentence_picture_choice',    // HSK2
  ].includes(examType);
}

/** Does this type show a shared image bank above the options? */
function hasSharedBank(examType: string): boolean {
  return [
    'sentence_picture_matching',                          // HSK1
    'audio_dialogue_choose_picture_from_shared_bank',     // HSK3
    'audio_monologue_choose_picture_from_shared_bank',    // HSK3
  ].includes(examType);
}

/** Does this question show a single question-level image? */
function hasQuestionImage(examType: string): boolean {
  return [
    'audio_picture_true_false',       // HSK1
    'picture_sentence_true_false',    // HSK1
    'picture_true_false',             // HSK2
  ].includes(examType);
}

/** Is this an essay/writing type? */
function isEssayType(examType: string): boolean {
  return [
    'picture_prompt_writing',             // HSK4
    'guided_composition_handwritten',     // HSK5
    'summary_rewrite_memory_based',       // HSK6
  ].includes(examType);
}

/** Section icon helper */
function SectionIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'listening') return <Headphones className={className} />;
  if (type === 'writing') return <PenLine className={className} />;
  return <BookOpen className={className} />;
}

function sectionColor(type: string): string {
  if (type === 'listening') return 'text-blue-500';
  if (type === 'writing') return 'text-amber-500';
  return 'text-purple-500';
}

// ─── Main Component ─────────────────────────────────────────────────────

interface Props {
  exam: MockExamDetail;
  locale: string;
}

export function MockExamRunner({ exam, locale }: Props) {
  const router = useRouter();
  const { playingId, play, stop } = useAudioPlayer();
  const hskLevel = getHskLevel(exam);

  // ─── State ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [showExplanation, setShowExplanation] = useState(false);
  const [examStartedAt] = useState<number>(Date.now());

  const totalSeconds = exam.total_duration_minutes * 60;
  const timer = useTimer(totalSeconds, () => handleSubmit());

  // ─── Derived data ─────────────────────────────────────────────────────

  const currentSection = exam.sections[currentSectionIdx];
  const allQuestions = useMemo(
    () => exam.sections.flatMap((s) => s.questions),
    [exam.sections]
  );
  const totalQuestions = allQuestions.length;

  const globalQuestionIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < currentSectionIdx; i++) {
      idx += exam.sections[i].questions.length;
    }
    return idx + currentQuestionIdx;
  }, [currentSectionIdx, currentQuestionIdx, exam.sections]);

  const currentQuestion: MockExamQuestion | undefined =
    currentSection?.questions[currentQuestionIdx];

  const answeredCount = answers.size;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // ─── Answer handling ──────────────────────────────────────────────────

  const selectAnswer = useCallback(
    (questionId: string, optionId: string) => {
      if (phase === 'review') return;
      setAnswers((prev) => {
        const next = new Map(prev);
        const existing = next.get(questionId);
        next.set(questionId, {
          questionId,
          selectedOptionId: optionId,
          timeSpent: (existing?.timeSpent ?? 0) + 1,
        });
        return next;
      });
    },
    [phase]
  );

  // ─── Navigation ───────────────────────────────────────────────────────

  const goToQuestion = useCallback(
    (sectionIdx: number, questionIdx: number) => {
      stop();
      setShowExplanation(false);
      setCurrentSectionIdx(sectionIdx);
      setCurrentQuestionIdx(questionIdx);
    },
    [stop]
  );

  const goNext = useCallback(() => {
    stop();
    setShowExplanation(false);
    if (currentQuestionIdx < currentSection.questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else if (currentSectionIdx < exam.sections.length - 1) {
      setCurrentSectionIdx((prev) => prev + 1);
      setCurrentQuestionIdx(0);
    }
  }, [currentQuestionIdx, currentSectionIdx, currentSection, exam.sections, stop]);

  const goPrev = useCallback(() => {
    stop();
    setShowExplanation(false);
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
    } else if (currentSectionIdx > 0) {
      const prevSection = exam.sections[currentSectionIdx - 1];
      setCurrentSectionIdx((prev) => prev - 1);
      setCurrentQuestionIdx(prevSection.questions.length - 1);
    }
  }, [currentQuestionIdx, currentSectionIdx, exam.sections, stop]);

  // ─── Submit & Results ─────────────────────────────────────────────────

  const computeResults = useCallback(() => {
    const sectionResults: SectionResult[] = exam.sections.map((section) => {
      let correct = 0;
      let earned = 0;
      for (const q of section.questions) {
        const answer = answers.get(q.id);
        if (answer?.selectedOptionId) {
          const correctOption = q.options.find((o) => o.is_correct);
          if (correctOption && answer.selectedOptionId === correctOption.id) {
            correct++;
            earned += q.points;
          }
        }
      }
      return {
        sectionType: section.section_type,
        title: section.title,
        totalPoints: section.total_points,
        earnedPoints: earned,
        correct,
        total: section.questions.length,
      };
    });

    const totalEarned = sectionResults.reduce((sum, r) => sum + r.earnedPoints, 0);
    const totalCorrect = sectionResults.reduce((sum, r) => sum + r.correct, 0);
    const passed = totalEarned >= exam.scoring.pass_threshold;

    return { sectionResults, totalEarned, totalCorrect, passed };
  }, [answers, exam]);

  const handleSubmit = useCallback(() => {
    timer.pause();
    stop();
    setPhase('results');
  }, [timer, stop]);

  const handleStartExam = useCallback(() => {
    setPhase('exam');
    setCurrentSectionIdx(0);
    setCurrentQuestionIdx(0);
    timer.start();
  }, [timer]);

  const handleReview = useCallback(() => {
    setPhase('review');
    setCurrentSectionIdx(0);
    setCurrentQuestionIdx(0);
  }, []);

  const handleRetry = useCallback(() => {
    setAnswers(new Map());
    setPhase('intro');
    setCurrentSectionIdx(0);
    setCurrentQuestionIdx(0);
    setShowExplanation(false);
    timer.reset(totalSeconds);
  }, [timer, totalSeconds]);

  // ─── Audio playback ───────────────────────────────────────────────────

  const playQuestionAudio = useCallback(
    (question: MockExamQuestion) => {
      const { audio } = getMeta(question);
      const text = audio?.script_hanzi ?? '';
      play(question.id, question.audio_url, text);
    },
    [play]
  );

  // ─── Render phases ───────────────────────────────────────────────────

  if (phase === 'intro') {
    return <IntroScreen exam={exam} hskLevel={hskLevel} onStart={handleStartExam} />;
  }

  if (phase === 'results') {
    const results = computeResults();
    return (
      <ResultsScreen
        exam={exam}
        results={results}
        answers={answers}
        timeSpent={Math.floor((Date.now() - examStartedAt) / 1000)}
        onReview={handleReview}
        onRetry={handleRetry}
        onHome={() => router.push('/mock-exams')}
        hskLevel={hskLevel}
      />
    );
  }

  // ─── Exam / Review phase ──────────────────────────────────────────────

  if (!currentQuestion) return null;

  const isReview = phase === 'review';
  const answer = answers.get(currentQuestion.id);
  const isLastQuestion =
    currentSectionIdx === exam.sections.length - 1 &&
    currentQuestionIdx === currentSection.questions.length - 1;

  const { examType, section: sectionType, part: partNumber, audio: audioData, stimulus: stimulusData, examDisplay } = getMeta(currentQuestion);
  const activeSectionType = sectionType || currentSection?.section_type;
  const questionNumber = getQuestionNumber(currentQuestion, activeSectionType, currentSectionIdx, exam);

  // Image resolution
  const questionImage = hasQuestionImage(examType)
    ? getQuestionImage(currentQuestion, examType, questionNumber, hskLevel)
    : null;

  const sharedBank = hasSharedBank(examType)
    ? (hskLevel === 1
        ? getHsk1SharedBank(examType)
        : getSharedImageBank(currentQuestion, examType, hskLevel))
    : null;

  const imageOptionsList = hasImageOptions(examType)
    ? (examDisplay.image_options as Array<{
        id: string;
        image_prompt?: string;
        image_url?: string;
        student_image_path?: string;
      }>) ?? []
    : [];

  // Essay type detection
  const essay = isEssayType(examType);

  // Stimulus display
  const stimulusHanzi = (stimulusData.hanzi as string) ?? (stimulusData.passage_hanzi as string) ?? (stimulusData.passage_with_blank as string) ?? '';
  const stimulusPinyin = (stimulusData.pinyin as string) ?? '';
  const questionHanzi = ((currentQuestion.metadata?.question as Meta)?.hanzi as string) ?? '';
  const questionPinyin = ((currentQuestion.metadata?.question as Meta)?.pinyin as string) ?? '';

  // For sentence_ordering_mcq (HSK6): numbered sentences in stimulus
  const sentences = (stimulusData.sentences as string[]) ?? [];

  // For audio_judgement (HSK5-6): statement shown during exam
  const statementZh = (examDisplay.statement_zh as string) ?? '';
  const statementPinyin = (examDisplay.statement_pinyin as string) ?? '';

  // For fill_blank_mcq: the sentence with blank
  const fillBlankSentence = (stimulusData.hanzi as string) ?? (stimulusData.sentence_hanzi as string) ?? '';

  // For reorder_words: word tiles
  const wordTiles = (examDisplay.word_tiles_zh as string[]) ?? (stimulusData.word_bank as string[]) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top bar: timer + progress */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-cream-100 -mx-4 px-4 py-3 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <SectionIcon type={activeSectionType} className={`h-4 w-4 shrink-0 ${sectionColor(activeSectionType)}`} />
            <span className="text-sm font-medium text-navy-700 truncate">
              {currentSection?.title}
              {partNumber ? ` · P${partNumber}` : ''}
            </span>
          </div>

          {!isReview && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-semibold ${
                timer.remaining < 120
                  ? 'bg-red-50 text-red-600 animate-pulse'
                  : timer.remaining < 300
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-navy-50 text-navy-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timer.remaining)}
            </div>
          )}

          {isReview && <Badge variant="review">Mode r&eacute;vision</Badge>}

          <span className="text-sm text-navy-400 shrink-0">
            {globalQuestionIdx + 1}/{totalQuestions}
          </span>
        </div>

        <div className="mt-2 h-1.5 bg-cream-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          {/* Instruction */}
          {currentQuestion.instruction && (
            <p className="text-xs text-navy-400 mb-3 italic">
              {currentQuestion.instruction}
            </p>
          )}

          {/* Question-level image */}
          {questionImage && (
            <div className="mb-4 flex justify-center">
              <div className="relative w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden border-2 border-cream-200 bg-cream-50">
                <Image
                  src={questionImage}
                  alt={`Question ${questionNumber}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 384px"
                  priority
                />
              </div>
            </div>
          )}

          {/* Shared image bank */}
          {sharedBank && (
            <div className="mb-4">
              <p className="text-xs font-medium text-navy-500 mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Banque d&apos;images
              </p>
              <div className={`grid gap-2 ${sharedBank.images.length <= 5 ? `grid-cols-${sharedBank.images.length}` : 'grid-cols-5'}`}>
                {sharedBank.images.map((img) => (
                  <div key={img.id} className="flex flex-col items-center gap-1">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-cream-200 bg-cream-50">
                      <Image
                        src={img.url}
                        alt={`Image ${img.label}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 20vw, 80px"
                      />
                    </div>
                    <span className="text-xs font-semibold text-navy-600 bg-cream-100 px-2 py-0.5 rounded-full">
                      {img.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio button for listening questions */}
          {activeSectionType === 'listening' && audioData?.script_hanzi && (
            <div className="mb-4">
              <button
                onClick={() => playQuestionAudio(currentQuestion)}
                className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all ${
                  playingId === currentQuestion.id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-cream-200 bg-cream-50 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    playingId === currentQuestion.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {playingId === currentQuestion.id ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-navy-700">
                    {playingId === currentQuestion.id
                      ? 'Lecture en cours...'
                      : '\u00C9couter l\'audio'}
                  </p>
                  <p className="text-xs text-navy-400">
                    {audioData.repeat_count
                      ? `${audioData.repeat_count} \u00e9coute(s) autoris\u00e9e(s)`
                      : `Cliquez pour ${playingId === currentQuestion.id ? 'arr\u00eater' : '\u00e9couter'}`}
                  </p>
                </div>
                {playingId === currentQuestion.id && (
                  <div className="ml-auto flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-blue-400 rounded-full animate-pulse"
                        style={{
                          height: `${12 + Math.random() * 12}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>

              {/* Transcript in review */}
              {isReview && audioData.script_hanzi && (
                <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm font-medium text-navy-800 whitespace-pre-line">
                    {audioData.script_hanzi}
                  </p>
                  {audioData.script_pinyin && (
                    <p className="text-xs text-navy-400 mt-1 whitespace-pre-line">
                      {audioData.script_pinyin}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Statement for audio_judgement (HSK5-6) */}
          {statementZh && (
            <div className="mb-4 p-3 rounded-lg bg-navy-50 border border-navy-100">
              <p className="text-base font-medium text-navy-800">{statementZh}</p>
              {statementPinyin && (
                <p className="text-xs text-navy-400 mt-0.5">{statementPinyin}</p>
              )}
            </div>
          )}

          {/* Sentences for sentence_ordering_mcq (HSK6) */}
          {sentences.length > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-cream-50 border border-cream-200 space-y-1.5">
              {sentences.map((s, i) => (
                <p key={i} className="text-base text-navy-800 leading-relaxed">{s}</p>
              ))}
            </div>
          )}

          {/* Stimulus for reading questions / fill_blank */}
          {stimulusHanzi && !sentences.length && (
            <div className="mb-4 p-4 rounded-xl bg-cream-50 border border-cream-200">
              <p className="text-xl font-medium text-navy-900 leading-relaxed whitespace-pre-line">
                {stimulusHanzi}
              </p>
              {stimulusPinyin && (
                <p className="text-sm text-navy-400 mt-1 whitespace-pre-line">{stimulusPinyin}</p>
              )}
            </div>
          )}

          {/* Question text (for listening part 4 etc.) */}
          {questionHanzi && (
            <div className="mb-4 p-3 rounded-lg bg-navy-50 border border-navy-100">
              <p className="text-base font-medium text-navy-800">{questionHanzi}</p>
              {questionPinyin && (
                <p className="text-xs text-navy-400 mt-0.5">{questionPinyin}</p>
              )}
            </div>
          )}

          {/* Word tiles for reorder_words */}
          {wordTiles.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-navy-500 mb-2">Mots \u00e0 remettre en ordre :</p>
              <div className="flex flex-wrap gap-2">
                {wordTiles.map((word, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-white border-2 border-cream-200 text-navy-700 text-sm font-medium"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt (fallback) */}
          {currentQuestion.prompt && !stimulusHanzi && !questionHanzi && !statementZh && sentences.length === 0 && (
            <p className="text-base font-medium text-navy-800 mb-4">
              {currentQuestion.prompt}
            </p>
          )}

          {/* Essay/writing type */}
          {essay && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <PenLine className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {examType === 'summary_rewrite_memory_based'
                    ? 'R\u00e9sum\u00e9 / R\u00e9\u00e9criture'
                    : 'Expression \u00e9crite'}
                </span>
              </div>
              <p className="text-sm text-amber-700">
                Cette question n\u00e9cessite une r\u00e9ponse \u00e9crite. En conditions d&apos;examen, utilisez la feuille de r\u00e9ponse.
              </p>
              {currentQuestion.image_url && (
                <div className="mt-3 flex justify-center">
                  <div className="relative w-full max-w-md aspect-[3/4] rounded-lg overflow-hidden border border-amber-300 bg-white">
                    <Image
                      src={currentQuestion.image_url}
                      alt="Feuille de r\u00e9ponse"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw, 448px"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Options — Image grid or text list */}
          {!essay && hasImageOptions(examType) && imageOptionsList.length > 0 ? (
            <div className={`grid gap-3 ${imageOptionsList.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answer?.selectedOptionId === option.id;
                const isCorrect = option.is_correct;
                const showResult = isReview;
                const optLabel = String.fromCharCode(64 + option.sort_order);
                const imgOpt = imageOptionsList[idx] ?? imageOptionsList.find((o) => o.id === optLabel);
                const imgUrl = imgOpt
                  ? resolveOptionImageUrl(imgOpt, examType, questionNumber, hskLevel)
                  : null;

                let cardClass = 'border-cream-200 bg-white hover:border-teal-300 hover:shadow-md';
                if (isSelected && !showResult) {
                  cardClass = 'border-teal-400 bg-teal-50 ring-2 ring-teal-200 shadow-md';
                }
                if (showResult && isCorrect) {
                  cardClass = 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200';
                }
                if (showResult && isSelected && !isCorrect) {
                  cardClass = 'border-red-400 bg-red-50 ring-2 ring-red-200';
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(currentQuestion.id, option.id)}
                    disabled={isReview}
                    className={`relative flex flex-col items-center rounded-xl border-2 transition-all overflow-hidden ${cardClass} ${
                      isReview ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {imgUrl && (
                      <div className="relative w-full aspect-square bg-cream-50">
                        <Image
                          src={imgUrl}
                          alt={`Option ${optLabel}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 33vw, 200px"
                        />
                      </div>
                    )}
                    <div
                      className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        isSelected && !showResult
                          ? 'bg-teal-500 text-white'
                          : showResult && isCorrect
                          ? 'bg-emerald-500 text-white'
                          : showResult && isSelected && !isCorrect
                          ? 'bg-red-500 text-white'
                          : 'bg-white/90 text-navy-700 border border-cream-200'
                      }`}
                    >
                      {showResult ? (
                        isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                        isSelected ? <XCircle className="h-3.5 w-3.5" /> : optLabel
                      ) : optLabel}
                    </div>
                    {!imgUrl && (
                      <div className="p-3 text-center">
                        <span className="text-sm text-navy-700">{option.content}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : !essay ? (
            <div className="space-y-2.5">
              {currentQuestion.options.map((option) => {
                const isSelected = answer?.selectedOptionId === option.id;
                const isCorrect = option.is_correct;
                const showResult = isReview;

                let optionClass = 'border-cream-200 bg-white hover:border-teal-300 hover:bg-teal-50/30';
                if (isSelected && !showResult) {
                  optionClass = 'border-teal-400 bg-teal-50 ring-1 ring-teal-200';
                }
                if (showResult && isCorrect) {
                  optionClass = 'border-emerald-400 bg-emerald-50';
                }
                if (showResult && isSelected && !isCorrect) {
                  optionClass = 'border-red-400 bg-red-50';
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(currentQuestion.id, option.id)}
                    disabled={isReview}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${optionClass} ${
                      isReview ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        isSelected && !showResult
                          ? 'bg-teal-500 text-white'
                          : showResult && isCorrect
                          ? 'bg-emerald-500 text-white'
                          : showResult && isSelected && !isCorrect
                          ? 'bg-red-500 text-white'
                          : 'bg-cream-100 text-navy-600'
                      }`}
                    >
                      {showResult ? (
                        isCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                        isSelected ? <XCircle className="h-4 w-4" /> :
                        String.fromCharCode(64 + option.sort_order)
                      ) : String.fromCharCode(64 + option.sort_order)}
                    </span>
                    <span
                      className={`text-sm ${
                        showResult && isCorrect
                          ? 'text-emerald-800 font-medium'
                          : showResult && isSelected && !isCorrect
                          ? 'text-red-800'
                          : 'text-navy-700'
                      }`}
                    >
                      {option.content}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Explanation in review mode */}
          {isReview && (
            <div className="mt-4">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <Eye className="h-4 w-4" />
                {showExplanation ? 'Masquer' : 'Voir'} l&apos;explication
              </button>
              {showExplanation && currentQuestion.explanation && (
                <div className="mt-2 p-3 rounded-lg bg-teal-50 border border-teal-200">
                  <p className="text-sm text-teal-800 whitespace-pre-line">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pb-6">
        <Button variant="secondary" size="sm" onClick={goPrev} disabled={globalQuestionIdx === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Pr&eacute;c&eacute;dent
        </Button>

        <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-xs">
          {allQuestions.map((q, idx) => {
            const a = answers.get(q.id);
            const isCurrent = idx === globalQuestionIdx;
            let dotClass = 'bg-cream-200';
            if (a?.selectedOptionId) {
              if (isReview) {
                const correct = q.options.find((o) => o.is_correct);
                dotClass = correct?.id === a.selectedOptionId ? 'bg-emerald-400' : 'bg-red-400';
              } else {
                dotClass = 'bg-teal-400';
              }
            }
            if (isCurrent) dotClass += ' ring-2 ring-navy-400 ring-offset-1';

            let secIdx = 0;
            let qIdx = idx;
            for (let i = 0; i < exam.sections.length; i++) {
              if (qIdx < exam.sections[i].questions.length) { secIdx = i; break; }
              qIdx -= exam.sections[i].questions.length;
            }

            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(secIdx, qIdx)}
                className={`w-3 h-3 rounded-full shrink-0 transition-all ${dotClass}`}
                title={`Question ${idx + 1}`}
              />
            );
          })}
        </div>

        {isReview ? (
          <Button variant="secondary" size="sm" onClick={() => setPhase('results')}>
            R&eacute;sultats
            <BarChart3 className="h-4 w-4 ml-1" />
          </Button>
        ) : isLastQuestion ? (
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Terminer
            <CheckCircle2 className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={goNext}>
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {!isReview && !isLastQuestion && (
        <div className="fixed bottom-20 right-4 lg:hidden z-30">
          <Button variant="danger" size="sm" onClick={handleSubmit} className="shadow-lg">
            Terminer ({answeredCount}/{totalQuestions})
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Badge helper ────────────────────────────────────────────────────

function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    review: 'bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium',
  };
  return <span className={styles[variant] ?? ''}>{children}</span>;
}

// ─── Intro Screen ───────────────────────────────────────────────────────

function IntroScreen({
  exam,
  hskLevel,
  onStart,
}: {
  exam: MockExamDetail;
  hskLevel: number;
  onStart: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">{exam.title}</h1>
        {exam.description && (
          <p className="text-navy-400 max-w-md mx-auto">{exam.description}</p>
        )}
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-teal-500" />
            Informations de l&apos;examen
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoTile icon={<Clock className="h-5 w-5 text-navy-400" />} value={`${exam.total_duration_minutes} minutes`} label="Dur\u00e9e totale" />
            <InfoTile icon={<Target className="h-5 w-5 text-navy-400" />} value={`${exam.total_points} points`} label="Score max" />
            <InfoTile icon={<Award className="h-5 w-5 text-gold-500" />} value={`${exam.scoring.pass_threshold} points`} label="Seuil de r\u00e9ussite" />
            <InfoTile
              icon={<BarChart3 className="h-5 w-5 text-navy-400" />}
              value={`${exam.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions`}
              label="Au total"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-4">Sections</h2>
          <div className="space-y-3">
            {exam.sections.map((section) => (
              <div key={section.id} className="flex items-center gap-3 p-3 rounded-lg border border-cream-200">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  section.section_type === 'listening' ? 'bg-blue-100' :
                  section.section_type === 'writing' ? 'bg-amber-100' : 'bg-purple-100'
                }`}>
                  <SectionIcon
                    type={section.section_type}
                    className={`h-5 w-5 ${
                      section.section_type === 'listening' ? 'text-blue-600' :
                      section.section_type === 'writing' ? 'text-amber-600' : 'text-purple-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-800">{section.title}</p>
                  <p className="text-xs text-navy-400">
                    {section.questions.length} questions · {section.total_points} pts
                    {section.duration_minutes ? ` · ~${section.duration_minutes} min` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            R&egrave;gles de l&apos;examen
          </h2>
          <ul className="space-y-2 text-sm text-navy-600">
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">&bull;</span>Le chronom\u00e8tre d\u00e9marre d\u00e8s que tu cliques sur &laquo; Commencer &raquo;.</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">&bull;</span>Tu peux naviguer librement entre les questions.</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">&bull;</span>Les questions d&apos;\u00e9coute utilisent un audio g\u00e9n\u00e9r\u00e9 (TTS chinois haute qualit\u00e9).</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">&bull;</span>L&apos;examen se termine automatiquement quand le temps est \u00e9coul\u00e9.</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">&bull;</span>Un r\u00e9sultat d\u00e9taill\u00e9 et des explications sont fournis \u00e0 la fin.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center pb-8">
        <Button variant="primary" size="xl" onClick={onStart} className="px-12">
          <Play className="h-5 w-5 mr-2" />
          Commencer l&apos;examen
        </Button>
      </div>
    </div>
  );
}

function InfoTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-cream-50">
      {icon}
      <div>
        <p className="text-sm font-medium text-navy-700">{value}</p>
        <p className="text-xs text-navy-400">{label}</p>
      </div>
    </div>
  );
}

// ─── Results Screen ─────────────────────────────────────────────────────

function ResultsScreen({
  exam,
  results,
  answers,
  timeSpent,
  onReview,
  onRetry,
  onHome,
  hskLevel,
}: {
  exam: MockExamDetail;
  results: {
    sectionResults: SectionResult[];
    totalEarned: number;
    totalCorrect: number;
    passed: boolean;
  };
  answers: Map<string, UserAnswer>;
  timeSpent: number;
  onReview: () => void;
  onRetry: () => void;
  onHome: () => void;
  hskLevel: number;
}) {
  const finishSessionLocal = useGamificationStore(s => s.finishSessionLocal);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title: string } | null>(null);
  const gamificationProcessed = useRef(false);

  const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const percent = Math.round((results.totalEarned / exam.total_points) * 100);
  const timeFormatted = formatTime(timeSpent);

  // Process gamification (once)
  useEffect(() => {
    if (gamificationProcessed.current) return;
    gamificationProcessed.current = true;

    // Build attempt payloads from all questions
    const attemptPayloads: AttemptPayload[] = [];
    exam.sections.forEach((section) => {
      section.questions.forEach((q) => {
        const answer = answers.get(q.id);
        const correctOption = q.options.find((o) => o.is_correct);
        const isCorrect = !!(answer?.selectedOptionId && correctOption && answer.selectedOptionId === correctOption.id);
        attemptPayloads.push({
          exercise_id: q.id,
          is_correct: isCorrect,
          score: isCorrect ? q.points : 0,
          max_score: q.points,
          time_spent_seconds: answer?.timeSpent ?? 0,
          user_answer: answer?.selectedOptionId ?? null,
          exercise_type: `mock_exam_hsk${hskLevel}`,
          skill_tags: [section.section_type],
        });
      });
    });

    const summary = finishSessionLocal(attemptPayloads, timeSpent);
    setSessionSummary(summary);

    // ── Record each exam question in the Knowledge Map ──
    exam.sections.forEach((section) => {
      section.questions.forEach((q) => {
        const answer = answers.get(q.id);
        const correctOption = q.options.find((o) => o.is_correct);
        const isCorrect = !!(answer?.selectedOptionId && correctOption && answer.selectedOptionId === correctOption.id);
        recordExerciseInKnowledge(
          {
            exercise_id: q.id,
            exercise_type: (q.metadata?.mock_exam_type as string) ?? `mock_exam_hsk${hskLevel}`,
            metadata: q.metadata ?? {},
            prompt: q.prompt ?? '',
            explanation: q.explanation ?? '',
          },
          isCorrect,
          answer?.timeSpent ?? 0,
          false,
        );
      });
    });

    // ── Save exam result to history (localStorage) ──
    try {
      const historyKey = 'lingullio_mock_exam_history';
      const existing = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
      existing.push({
        examId: exam.id,
        examTitle: exam.title,
        courseSlug: exam.course_slug,
        totalEarned: results.totalEarned,
        totalPoints: exam.total_points,
        totalCorrect: results.totalCorrect,
        totalQuestions,
        percent,
        passed: results.passed,
        timeSpent,
        completedAt: new Date().toISOString(),
        xpEarned: summary.xp_earned,
        sectionResults: results.sectionResults.map(sr => ({
          sectionTitle: sr.title,
          earned: sr.earnedPoints,
          max: sr.totalPoints,
          correct: sr.correct,
          total: sr.total,
        })),
      });
      // Keep last 50 results
      if (existing.length > 50) existing.splice(0, existing.length - 50);
      localStorage.setItem(historyKey, JSON.stringify(existing));
    } catch (e) {
      console.warn('[MockExam] Failed to save history:', e);
    }

    // Confetti on pass or high XP
    if (results.passed || summary.xp_earned >= 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }

    // Level up modal
    if (summary.level_up) {
      setTimeout(() => {
        setShowLevelUp({ level: summary.level_after, title: levelTitle(summary.level_after) });
      }, 900);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bands = [
    { min: 0, max: 39, label: 'Non acquis', color: 'text-red-600', bg: 'bg-red-50' },
    { min: 40, max: 59, label: 'Presque pr\u00eat', color: 'text-amber-600', bg: 'bg-amber-50' },
    { min: 60, max: 74, label: 'R\u00e9ussite fragile', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { min: 75, max: 89, label: 'Bon niveau', color: 'text-teal-600', bg: 'bg-teal-50' },
    { min: 90, max: 100, label: 'Tr\u00e8s solide', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];
  const band = bands.find((b) => percent >= b.min && percent <= b.max) ?? bands[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <ConfettiBurst active={showConfetti} />
      {showLevelUp && (
        <LevelUpModal
          level={showLevelUp.level}
          title={showLevelUp.title}
          onClose={() => setShowLevelUp(null)}
        />
      )}

      <div className="text-center py-6">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
            results.passed
              ? 'bg-gradient-to-br from-emerald-100 to-teal-100'
              : 'bg-gradient-to-br from-red-100 to-orange-100'
          }`}
        >
          <span className="text-3xl font-bold">{results.passed ? '\uD83C\uDF89' : '\uD83D\uDCAA'}</span>
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-1">
          {results.passed ? 'F\u00e9licitations !' : 'Continue tes efforts !'}
        </h1>
        <p className="text-navy-400">{exam.title}</p>
        {/* XP earned floating badge */}
        {sessionSummary && (
          <div className="mt-3 animate-xp-count">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold shadow-sm">
              <Zap className="h-4 w-4" />
              +{sessionSummary.xp_earned} XP
            </span>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-navy-900 mb-1">
              {results.totalEarned}
              <span className="text-xl text-navy-300">/{exam.total_points}</span>
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${band.bg} ${band.color}`}>
                {results.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {band.label}
              </span>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="h-4 bg-cream-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  results.passed
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : 'bg-gradient-to-r from-orange-400 to-red-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div
              className="absolute top-0 h-4 w-0.5 bg-navy-400"
              style={{ left: `${(exam.scoring.pass_threshold / exam.total_points) * 100}%` }}
              title={`Seuil : ${exam.scoring.pass_threshold}`}
            />
            <div
              className="absolute -bottom-5 text-[10px] text-navy-400 -translate-x-1/2"
              style={{ left: `${(exam.scoring.pass_threshold / exam.total_points) * 100}%` }}
            >
              {exam.scoring.pass_threshold}
            </div>
          </div>

          {/* Gamification summary row */}
          {sessionSummary && (
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-emerald-600 animate-xp-count">+{sessionSummary.xp_earned}</p>
                <p className="text-[10px] text-emerald-600/70">XP gagn&eacute;s</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-lg font-bold text-orange-600">{sessionSummary.streak_days}</p>
                <p className="text-[10px] text-orange-600/70">S&eacute;rie</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-lg font-bold text-purple-600">{sessionSummary.new_badges.length > 0 ? `+${sessionSummary.new_badges.length}` : '-'}</p>
                <p className="text-[10px] text-purple-600/70">Badges</p>
              </div>
            </div>
          )}

          {/* New badges earned */}
          {sessionSummary && sessionSummary.new_badges.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 mb-4">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-3">
                <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                Nouveaux badges d&eacute;bloqu&eacute;s !
              </p>
              <div className="flex flex-wrap gap-2">
                {sessionSummary.new_badges.map(badgeId => {
                  const badge = BADGES.find(b => b.id === badgeId);
                  if (!badge) return null;
                  const colors = RARITY_COLORS[badge.rarity];
                  return (
                    <div key={badgeId} className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border',
                      colors.bg, colors.border
                    )}>
                      <span className="text-xl">{badge.icon}</span>
                      <div>
                        <p className={cn('text-xs font-bold', colors.text)}>{badge.name_fr}</p>
                        <p className="text-[10px] text-navy-400">{badge.description_fr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-cream-100">
            <div className="text-center">
              <p className="text-lg font-semibold text-navy-800">{results.totalCorrect}/{totalQuestions}</p>
              <p className="text-xs text-navy-400">Bonnes r\u00e9ponses</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-navy-800">{percent}%</p>
              <p className="text-xs text-navy-400">Score</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-navy-800">{timeFormatted}</p>
              <p className="text-xs text-navy-400">Temps</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-4">D\u00e9tail par section</h2>
          <div className="space-y-4">
            {results.sectionResults.map((sr) => {
              const sPercent = sr.totalPoints > 0 ? Math.round((sr.earnedPoints / sr.totalPoints) * 100) : 0;
              return (
                <div key={sr.sectionType + sr.title}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SectionIcon type={sr.sectionType} className={`h-4 w-4 ${sectionColor(sr.sectionType)}`} />
                      <span className="text-sm font-medium text-navy-700">{sr.title}</span>
                    </div>
                    <span className="text-sm font-semibold text-navy-800">{sr.earnedPoints}/{sr.totalPoints}</span>
                  </div>
                  <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        sPercent >= 60 ? 'bg-emerald-400' : sPercent >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${sPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-navy-400 mt-1">
                    {sr.correct}/{sr.total} bonnes r\u00e9ponses · {sPercent}%
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center gap-3 pb-8">
        <Button variant="primary" size="lg" onClick={onReview} className="w-full sm:w-auto">
          <Eye className="h-4 w-4 mr-2" />
          Revoir les r\u00e9ponses
        </Button>
        <Button variant="secondary" size="lg" onClick={onRetry} className="w-full sm:w-auto">
          <RotateCcw className="h-4 w-4 mr-2" />
          Recommencer
        </Button>
        <Button variant="ghost" size="lg" onClick={onHome} className="w-full sm:w-auto">
          <Home className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    </div>
  );
}
