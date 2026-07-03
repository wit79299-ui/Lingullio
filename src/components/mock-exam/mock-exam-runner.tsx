'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Award,
  RotateCcw,
  Home,
  ArrowRight,
  Eye,
  Target,
  BarChart3,
  FileText,
  Loader2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

type Phase = 'intro' | 'exam' | 'review' | 'results';

interface UserAnswer {
  questionId: string;
  selectedOptionId: string | null;
  timeSpent: number; // seconds
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

// ─── Main Component ─────────────────────────────────────────────────────

interface Props {
  exam: MockExamDetail;
  locale: string;
}

export function MockExamRunner({ exam, locale }: Props) {
  const router = useRouter();
  const { playingId, play, stop } = useAudioPlayer();

  // ─── State ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [showExplanation, setShowExplanation] = useState(false);
  const [examStartedAt] = useState<number>(Date.now());

  // Total time for the whole exam
  const totalSeconds = exam.total_duration_minutes * 60;
  const timer = useTimer(totalSeconds, () => handleSubmit());

  // ─── Derived data ─────────────────────────────────────────────────────

  const currentSection = exam.sections[currentSectionIdx];
  const allQuestions = useMemo(
    () => exam.sections.flatMap((s) => s.questions),
    [exam.sections]
  );
  const totalQuestions = allQuestions.length;

  // Global question index (across all sections)
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
      if (phase === 'review') return; // Read-only in review
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

  // ─── Audio playback for listening questions ───────────────────────────

  const playQuestionAudio = useCallback(
    (question: MockExamQuestion) => {
      const meta = question.metadata;
      const audio = meta?.audio as { script_hanzi?: string } | undefined;
      if (audio?.script_hanzi) {
        play(question.id, question.audio_url, audio.script_hanzi);
      }
    },
    [play]
  );

  // ─── Render phases ───────────────────────────────────────────────────

  if (phase === 'intro') {
    return <IntroScreen exam={exam} onStart={handleStartExam} />;
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
      />
    );
  }

  // ─── Exam / Review phase ──────────────────────────────────────────────

  const isReview = phase === 'review';
  const answer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
  const isLastQuestion =
    currentSectionIdx === exam.sections.length - 1 &&
    currentQuestionIdx === currentSection.questions.length - 1;

  const meta = currentQuestion?.metadata ?? {};
  const audioData = meta.audio as { script_hanzi?: string; script_pinyin?: string } | undefined;
  const stimulusData = meta.stimulus as { hanzi?: string; pinyin?: string } | undefined;
  const questionData = meta.question as { hanzi?: string; pinyin?: string } | undefined;
  const sectionType = (meta.section as string) || currentSection?.section_type;
  const partNumber = meta.part as number | undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top bar: timer + progress */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-cream-100 -mx-4 px-4 py-3 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Section info */}
          <div className="flex items-center gap-2 min-w-0">
            {sectionType === 'listening' ? (
              <Headphones className="h-4 w-4 text-blue-500 shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-purple-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-navy-700 truncate">
              {currentSection?.title}
              {partNumber ? ` · P${partNumber}` : ''}
            </span>
          </div>

          {/* Timer */}
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

          {isReview && (
            <Badge variant="review">Mode révision</Badge>
          )}

          {/* Question counter */}
          <span className="text-sm text-navy-400 shrink-0">
            {globalQuestionIdx + 1}/{totalQuestions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-cream-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            {/* Question instruction */}
            {currentQuestion.instruction && (
              <p className="text-xs text-navy-400 mb-3 italic">
                {currentQuestion.instruction}
              </p>
            )}

            {/* Audio button for listening questions */}
            {sectionType === 'listening' && audioData?.script_hanzi && (
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
                        : 'Écouter l\'audio'}
                    </p>
                    <p className="text-xs text-navy-400">
                      Cliquez pour {playingId === currentQuestion.id ? 'arrêter' : 'écouter'}
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

                {/* Show transcript in review */}
                {isReview && audioData.script_hanzi && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-sm font-medium text-navy-800">
                      {audioData.script_hanzi}
                    </p>
                    {audioData.script_pinyin && (
                      <p className="text-xs text-navy-400 mt-0.5">
                        {audioData.script_pinyin}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stimulus for reading questions */}
            {sectionType === 'reading' && stimulusData?.hanzi && (
              <div className="mb-4 p-4 rounded-xl bg-cream-50 border border-cream-200">
                <p className="text-xl font-medium text-navy-900 leading-relaxed">
                  {stimulusData.hanzi}
                </p>
                {stimulusData.pinyin && (
                  <p className="text-sm text-navy-400 mt-1">
                    {stimulusData.pinyin}
                  </p>
                )}
              </div>
            )}

            {/* Question text for listening part 4 */}
            {questionData?.hanzi && (
              <div className="mb-4 p-3 rounded-lg bg-navy-50 border border-navy-100">
                <p className="text-base font-medium text-navy-800">
                  {questionData.hanzi}
                </p>
                {questionData.pinyin && (
                  <p className="text-xs text-navy-400 mt-0.5">
                    {questionData.pinyin}
                  </p>
                )}
              </div>
            )}

            {/* Prompt */}
            {currentQuestion.prompt && !stimulusData && !questionData && (
              <p className="text-base font-medium text-navy-800 mb-4">
                {currentQuestion.prompt}
              </p>
            )}

            {/* Options */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((option) => {
                const isSelected = answer?.selectedOptionId === option.id;
                const isCorrect = option.is_correct;
                const showResult = isReview;

                let optionClass =
                  'border-cream-200 bg-white hover:border-teal-300 hover:bg-teal-50/30';
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
                    {/* Option label */}
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
                        isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isSelected ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          String.fromCharCode(64 + option.sort_order)
                        )
                      ) : (
                        String.fromCharCode(64 + option.sort_order)
                      )}
                    </span>

                    {/* Option content */}
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
                    <p className="text-sm text-teal-800">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={goPrev}
          disabled={globalQuestionIdx === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Précédent
        </Button>

        {/* Question dots / mini navigator */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-xs">
          {allQuestions.map((q, idx) => {
            const a = answers.get(q.id);
            const isCurrent = idx === globalQuestionIdx;
            let dotClass = 'bg-cream-200';
            if (a?.selectedOptionId) {
              if (isReview) {
                const correct = q.options.find((o) => o.is_correct);
                dotClass =
                  correct?.id === a.selectedOptionId
                    ? 'bg-emerald-400'
                    : 'bg-red-400';
              } else {
                dotClass = 'bg-teal-400';
              }
            }
            if (isCurrent) {
              dotClass += ' ring-2 ring-navy-400 ring-offset-1';
            }

            // Calculate section/question index from global index
            let secIdx = 0;
            let qIdx = idx;
            for (let i = 0; i < exam.sections.length; i++) {
              if (qIdx < exam.sections[i].questions.length) {
                secIdx = i;
                break;
              }
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPhase('results')}
          >
            Résultats
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

      {/* Submit button (fixed at bottom on mobile during exam) */}
      {!isReview && !isLastQuestion && (
        <div className="fixed bottom-20 right-4 lg:hidden z-30">
          <Button
            variant="danger"
            size="sm"
            onClick={handleSubmit}
            className="shadow-lg"
          >
            Terminer ({answeredCount}/{totalQuestions})
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Badge helper for review mode ────────────────────────────────────

function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    review: 'bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-medium',
  };
  return <span className={styles[variant] ?? ''}>{children}</span>;
}

// ─── Intro Screen ───────────────────────────────────────────────────────

function IntroScreen({
  exam,
  onStart,
}: {
  exam: MockExamDetail;
  onStart: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">{exam.title}</h1>
        {exam.description && (
          <p className="text-navy-400 max-w-md mx-auto">{exam.description}</p>
        )}
      </div>

      {/* Exam info */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-teal-500" />
            Informations de l&apos;examen
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-cream-50">
              <Clock className="h-5 w-5 text-navy-400" />
              <div>
                <p className="text-sm font-medium text-navy-700">{exam.total_duration_minutes} minutes</p>
                <p className="text-xs text-navy-400">Durée totale</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-cream-50">
              <Target className="h-5 w-5 text-navy-400" />
              <div>
                <p className="text-sm font-medium text-navy-700">{exam.total_points} points</p>
                <p className="text-xs text-navy-400">Score max</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-cream-50">
              <Award className="h-5 w-5 text-gold-500" />
              <div>
                <p className="text-sm font-medium text-navy-700">{exam.scoring.pass_threshold} points</p>
                <p className="text-xs text-navy-400">Seuil de réussite</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-cream-50">
              <BarChart3 className="h-5 w-5 text-navy-400" />
              <div>
                <p className="text-sm font-medium text-navy-700">
                  {exam.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions
                </p>
                <p className="text-xs text-navy-400">Au total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-4">Sections</h2>
          <div className="space-y-3">
            {exam.sections.map((section) => (
              <div
                key={section.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-cream-200"
              >
                {section.section_type === 'listening' ? (
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                )}
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

      {/* Rules */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Règles de l&apos;examen
          </h2>
          <ul className="space-y-2 text-sm text-navy-600">
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Le chronomètre démarre dès que tu cliques sur « Commencer ».
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Tu peux naviguer librement entre les questions.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Les questions d&apos;écoute utilisent la synthèse vocale (TTS).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              L&apos;examen se termine automatiquement quand le temps est écoulé.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Un résultat détaillé et des explications sont fournis à la fin.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Start button */}
      <div className="text-center pb-8">
        <Button variant="primary" size="xl" onClick={onStart} className="px-12">
          <Play className="h-5 w-5 mr-2" />
          Commencer l&apos;examen
        </Button>
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
}) {
  const totalQuestions = exam.sections.reduce(
    (sum, s) => sum + s.questions.length, 0
  );
  const percent = Math.round((results.totalEarned / exam.total_points) * 100);
  const timeFormatted = formatTime(timeSpent);

  // Determine band
  const bands = [
    { min: 0, max: 79, label: 'Non acquis', color: 'text-red-600', bg: 'bg-red-50' },
    { min: 80, max: 119, label: 'Presque prêt', color: 'text-amber-600', bg: 'bg-amber-50' },
    { min: 120, max: 159, label: 'Réussite fragile', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { min: 160, max: 179, label: 'Bon niveau HSK 1', color: 'text-teal-600', bg: 'bg-teal-50' },
    { min: 180, max: 200, label: 'Très solide', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];
  const band = bands.find(
    (b) => results.totalEarned >= b.min && results.totalEarned <= b.max
  ) ?? bands[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Score header */}
      <div className="text-center py-6">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
            results.passed
              ? 'bg-gradient-to-br from-emerald-100 to-teal-100'
              : 'bg-gradient-to-br from-red-100 to-orange-100'
          }`}
        >
          <span className="text-3xl font-bold">
            {results.passed ? '🎉' : '💪'}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-1">
          {results.passed ? 'Félicitations !' : 'Continue tes efforts !'}
        </h1>
        <p className="text-navy-400">{exam.title}</p>
      </div>

      {/* Score card */}
      <Card>
        <CardContent className="pt-5">
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-navy-900 mb-1">
              {results.totalEarned}
              <span className="text-xl text-navy-300">/{exam.total_points}</span>
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${band.bg} ${band.color}`}
              >
                {results.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {band.label}
              </span>
            </div>
          </div>

          {/* Score bar */}
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
            {/* Pass threshold marker */}
            <div
              className="absolute top-0 h-4 w-0.5 bg-navy-400"
              style={{
                left: `${(exam.scoring.pass_threshold / exam.total_points) * 100}%`,
              }}
              title={`Seuil : ${exam.scoring.pass_threshold}`}
            />
            <div
              className="absolute -bottom-5 text-[10px] text-navy-400 -translate-x-1/2"
              style={{
                left: `${(exam.scoring.pass_threshold / exam.total_points) * 100}%`,
              }}
            >
              {exam.scoring.pass_threshold}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-cream-100">
            <div className="text-center">
              <p className="text-lg font-semibold text-navy-800">
                {results.totalCorrect}/{totalQuestions}
              </p>
              <p className="text-xs text-navy-400">Bonnes réponses</p>
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

      {/* Section breakdown */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold text-navy-800 mb-4">Détail par section</h2>
          <div className="space-y-4">
            {results.sectionResults.map((sr) => {
              const sPercent =
                sr.totalPoints > 0
                  ? Math.round((sr.earnedPoints / sr.totalPoints) * 100)
                  : 0;
              return (
                <div key={sr.sectionType}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {sr.sectionType === 'listening' ? (
                        <Headphones className="h-4 w-4 text-blue-500" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="text-sm font-medium text-navy-700">
                        {sr.title}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-navy-800">
                      {sr.earnedPoints}/{sr.totalPoints}
                    </span>
                  </div>
                  <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        sPercent >= 60
                          ? 'bg-emerald-400'
                          : sPercent >= 40
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${sPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-navy-400 mt-1">
                    {sr.correct}/{sr.total} bonnes réponses · {sPercent}%
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pb-8">
        <Button variant="primary" size="lg" onClick={onReview} className="w-full sm:w-auto">
          <Eye className="h-4 w-4 mr-2" />
          Revoir les réponses
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
