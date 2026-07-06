'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import {
  ArrowRight, RotateCcw, CheckCircle2, XCircle, Lightbulb,
  Clock, Trophy, Target, Zap, ChevronRight, Volume2,
  BarChart3, Eye, EyeOff, ArrowLeft,
} from 'lucide-react';
import type {
  Exercise, ExerciseAnswer, SessionState, SessionResults,
  ExerciseType,
} from './types';
import { useGamificationStore, type GamificationNotification } from '@/stores/gamification-store';
import type { AttemptPayload, SessionSummary } from '@/lib/gamification/progress-service';
import { XpBadgeInline } from '@/components/gamification/xp-bar';
import { ConfettiBurst, LevelUpModal } from '@/components/gamification/xp-toast';
import { BADGES, RARITY_COLORS } from '@/lib/gamification/badges';
import { levelTitle } from '@/lib/gamification/xp-config';
import { recordExerciseInKnowledge } from '@/lib/gamification/knowledge-tracker';
import { Flame, Award } from 'lucide-react';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ExerciseEngineProps {
  exercises: Exercise[];
  lessonTitle: string;
  moduleTitle: string;
  hskLevel: string;
  slug: string;
  lessonId: string;
  backHref: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function calculateResults(exercises: Exercise[], answers: ExerciseAnswer[], startedAt: number): SessionResults {
  const totalPoints = answers.reduce((s, a) => s + a.pointsEarned, 0);
  const maxPoints = answers.reduce((s, a) => s + a.pointsMax, 0);
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const hskScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 200) : 0;
  const timeElapsed = Math.round((Date.now() - startedAt) / 1000);

  // By difficulty
  const diffMap = new Map<number, { correct: number; total: number }>();
  answers.forEach((a, i) => {
    const d = exercises[i]?.difficulty ?? 1;
    const entry = diffMap.get(d) ?? { correct: 0, total: 0 };
    entry.total++;
    if (a.isCorrect) entry.correct++;
    diffMap.set(d, entry);
  });
  const byDifficulty = Array.from(diffMap.entries())
    .map(([level, data]) => ({ level, ...data }))
    .sort((a, b) => a.level - b.level);

  // By type
  const typeMap = new Map<ExerciseType, { correct: number; total: number }>();
  answers.forEach((a, i) => {
    const t = exercises[i]?.exercise_type ?? 'mcq';
    const entry = typeMap.get(t as ExerciseType) ?? { correct: 0, total: 0 };
    entry.total++;
    if (a.isCorrect) entry.correct++;
    typeMap.set(t as ExerciseType, entry);
  });
  const byType = Array.from(typeMap.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.total - a.total);

  // Weak areas (< 50% on types with 2+ exercises)
  const weakAreas: string[] = [];
  byType.forEach(({ type, correct, total }) => {
    if (total >= 2 && correct / total < 0.5) {
      weakAreas.push(type);
    }
  });

  return {
    totalPoints, maxPoints, percentage,
    passed: hskScore >= 120,
    hskScore, timeElapsed,
    byDifficulty, byType, weakAreas,
  };
}

// ─── Exercise Type Labels ───────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  mcq: 'QCM',
  fill_blank: 'Texte a trous',
  matching: 'Associations',
  reorder: 'Remise en ordre',
  character_recognition: 'Recognition',
  flashcard: 'Flashcard',
  listening_comprehension: 'Comprehension orale',
  dictation: 'Dictation',
  controlled_translation: 'Traduction',
  reading_comprehension: 'Lecture',
};

const DIFFICULTY_LABELS = ['', '\u2605', '\u2605\u2605', '\u2605\u2605\u2605'];
const DIFFICULTY_COLORS = ['', 'text-emerald-500', 'text-amber-500', 'text-red-500'];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ExerciseEngine({ exercises, lessonTitle, moduleTitle, hskLevel, slug, lessonId, backHref }: ExerciseEngineProps) {
  const { playingId, play: playAudio } = useAudioPlayer();
  const finishSessionLocal = useGamificationStore(s => s.finishSessionLocal);

  const [session, setSession] = useState<SessionState>({
    phase: 'intro',
    currentIndex: 0,
    answers: [],
    startedAt: 0,
    exerciseStartedAt: 0,
  });

  // Gamification state for results phase
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title: string } | null>(null);
  const gamificationProcessed = useRef(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session.phase === 'exercise' || session.phase === 'review') {
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - session.startedAt) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.phase, session.startedAt]);

  // ─── Phase handlers ─────────────────────────────────────────────────────

  const startSession = useCallback(() => {
    const now = Date.now();
    setSession({
      phase: 'exercise',
      currentIndex: 0,
      answers: [],
      startedAt: now,
      exerciseStartedAt: now,
    });
    setElapsed(0);
  }, []);

  const recordAnswer = useCallback((answer: ExerciseAnswer) => {
    setSession(prev => ({
      ...prev,
      answers: [...prev.answers, answer],
      phase: 'review',
    }));
  }, []);

  const nextExercise = useCallback(() => {
    setSession(prev => {
      const nextIndex = prev.currentIndex + 1;
      const isLast = nextIndex >= exercises.length;
      return {
        ...prev,
        currentIndex: isLast ? prev.currentIndex : nextIndex,
        phase: isLast ? 'results' : 'exercise',
        exerciseStartedAt: Date.now(),
      };
    });
  }, [exercises.length]);

  const restartSession = useCallback(() => {
    setSession({
      phase: 'intro',
      currentIndex: 0,
      answers: [],
      startedAt: 0,
      exerciseStartedAt: 0,
    });
    setElapsed(0);
    setSessionSummary(null);
    setShowConfetti(false);
    setShowLevelUp(null);
    gamificationProcessed.current = false;
  }, []);

  // ─── Current exercise ───────────────────────────────────────────────────

  const currentExercise = exercises[session.currentIndex];
  const lastAnswer = session.answers[session.answers.length - 1];
  const answeredCount = session.answers.length;
  const progress = exercises.length > 0 ? (answeredCount / exercises.length) * 100 : 0;

  // ═══ INTRO PHASE ═══
  if (session.phase === 'intro') {
    const typeBreakdown = new Map<string, number>();
    exercises.forEach(e => typeBreakdown.set(e.exercise_type, (typeBreakdown.get(e.exercise_type) ?? 0) + 1));
    const totalPoints = exercises.reduce((s, e) => s + e.points, 0);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="!py-0 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-8 text-white text-center">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-90" />
            <h2 className="text-xl font-bold">{lessonTitle}</h2>
            <p className="text-teal-100 text-sm mt-1">{moduleTitle} - HSK {hskLevel}</p>
          </div>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-2xl font-bold text-navy-900">{exercises.length}</p>
                <p className="text-xs text-navy-400">Questions</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-2xl font-bold text-navy-900">{totalPoints}</p>
                <p className="text-xs text-navy-400">Max points</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-2xl font-bold text-teal-600">120/200</p>
                <p className="text-xs text-navy-400">HSK score required</p>
              </div>
            </div>

            {/* Pass explanation */}
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <div className="flex items-start gap-2">
                <BarChart3 className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                <div className="text-sm text-navy-700">
                  <p className="font-semibold text-sky-700 mb-1">HSK scoring scale</p>
                  <p>Your raw score is converted to <strong>200 points</strong> (HSK scale). You need at least <strong>120/200</strong> (60%) to pass the level.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-cream-100 pt-4">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">Exercise types</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(typeBreakdown.entries()).map(([type, count]) => (
                  <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-cream-50 text-xs text-navy-600 border border-cream-200">
                    {TYPE_LABELS[type] ?? type} <span className="font-bold text-teal-600">&times;{count}</span>
                  </span>
                ))}
              </div>
            </div>

            <Button onClick={startSession} variant="teal" size="lg" className="w-full mt-2">
              <Zap className="h-5 w-5" />
              Start exercises
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ RESULTS PHASE ═══
  if (session.phase === 'results') {
    const results = calculateResults(exercises, session.answers, session.startedAt);

    // Process gamification (once)
    if (!gamificationProcessed.current) {
      gamificationProcessed.current = true;
      const attemptPayloads: AttemptPayload[] = session.answers.map((a, i) => ({
        exercise_id: exercises[i]?.id ?? `ex-${i}`,
        is_correct: a.isCorrect,
        score: a.pointsEarned,
        max_score: a.pointsMax,
        time_spent_seconds: a.timeSpent,
        user_answer: a.userAnswer,
        exercise_type: exercises[i]?.exercise_type ?? 'mcq',
        skill_tags: (exercises[i] as unknown as { skill_tags?: string[] })?.skill_tags ?? [],
      }));
      const summary = finishSessionLocal(attemptPayloads, results.timeElapsed);
      setSessionSummary(summary);

      // ── Record each exercise in the Knowledge Map ──
      session.answers.forEach((a, i) => {
        const ex = exercises[i];
        if (!ex) return;
        recordExerciseInKnowledge(
          {
            exercise_id: ex.id,
            exercise_type: ex.exercise_type,
            metadata: ex.metadata,
            prompt: ex.prompt,
            explanation: ex.explanation,
          },
          a.isCorrect,
          a.timeSpent,
          false, // hintUsed - individual hint tracking per exercise not yet wired
          lessonId,
        );
      });

      // Confetti on pass or perfect
      if (results.passed || summary.xp_earned >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Level up modal
      if (summary.level_up) {
        setTimeout(() => {
          setShowLevelUp({ level: summary.level_after, title: levelTitle(summary.level_after) });
        }, 800);
      }
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <ConfettiBurst active={showConfetti} />
        {showLevelUp && (
          <LevelUpModal
            level={showLevelUp.level}
            title={showLevelUp.title}
            onClose={() => setShowLevelUp(null)}
          />
        )}

        {/* Score hero */}
        <Card className="!py-0 overflow-hidden">
          <div className={cn(
            'px-6 py-10 text-center text-white relative',
            results.passed
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-orange-400 to-red-500'
          )}>
            {results.passed ? (
              <Trophy className="h-14 w-14 mx-auto mb-3 drop-shadow-lg" />
            ) : (
              <Target className="h-14 w-14 mx-auto mb-3 drop-shadow-lg" />
            )}
            <p className="text-6xl font-extrabold tracking-tight">
              {results.hskScore}<span className="text-3xl opacity-70">/200</span>
            </p>
            <p className="text-xl font-semibold mt-2">
              {results.passed ? 'Congratulations, level passed!' : 'Not yet, keep practicing!'}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {results.percentage}% - {results.totalPoints}/{results.maxPoints} raw points
            </p>
            {/* XP earned floating badge */}
            {sessionSummary && (
              <div className="mt-3 animate-xp-count">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold">
                  <Zap className="h-4 w-4" />
                  +{sessionSummary.xp_earned} XP
                </span>
              </div>
            )}
          </div>
          <CardContent className="p-6 space-y-5">
            {/* Gamification summary row */}
            {sessionSummary && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold text-emerald-600 animate-xp-count">+{sessionSummary.xp_earned}</p>
                  <p className="text-[10px] text-emerald-600/70">XP earned</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-lg font-bold text-orange-600">{sessionSummary.streak_days}</p>
                  <p className="text-[10px] text-orange-600/70">Streak</p>
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
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-3">
                  New badges unlocked!
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

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-lg font-bold text-navy-900">
                  {session.answers.filter(a => a.isCorrect).length}/{session.answers.length}
                </p>
                <p className="text-xs text-navy-400">Correct</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-lg font-bold text-navy-900">{formatTime(results.timeElapsed)}</p>
                <p className="text-xs text-navy-400">Time</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3">
                <p className={cn('text-lg font-bold', results.passed ? 'text-emerald-600' : 'text-red-500')}>
                  {results.passed ? 'Passed' : `${120 - results.hskScore} pts needed`}
                </p>
                <p className="text-xs text-navy-400">{results.passed ? 'Status' : 'To pass'}</p>
              </div>
            </div>

            {/* By difficulty */}
            <div className="border-t border-cream-100 pt-4">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">By difficulty</p>
              <div className="space-y-2.5">
                {results.byDifficulty.map(d => {
                  const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                  return (
                    <div key={d.level} className="flex items-center gap-3">
                      <span className={cn('text-sm w-14 shrink-0', DIFFICULTY_COLORS[d.level])}>
                        {DIFFICULTY_LABELS[d.level]}
                      </span>
                      <div className="flex-1 bg-cream-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-navy-600 w-16 text-right">
                        {d.correct}/{d.total} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By type */}
            <div className="border-t border-cream-100 pt-4">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">By type</p>
              <div className="grid grid-cols-2 gap-2">
                {results.byType.map(t => {
                  const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
                  return (
                    <div key={t.type} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-cream-25 border border-cream-100">
                      <span className="text-xs text-navy-600">{TYPE_LABELS[t.type] ?? t.type}</span>
                      <span className={cn(
                        'text-xs font-bold',
                        pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
                      )}>
                        {t.correct}/{t.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weak areas */}
            {results.weakAreas.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                  Points a travailler
                </p>
                <div className="flex flex-wrap gap-2">
                  {results.weakAreas.map(area => (
                    <span key={area} className="px-3 py-1 rounded-full bg-white text-red-600 text-xs font-medium border border-red-200">
                      {TYPE_LABELS[area] ?? area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Answer review */}
            <AnswerReview answers={session.answers} exercises={exercises} />

            <div className="flex gap-3">
              <Button onClick={restartSession} variant="teal" size="lg" className="flex-1">
                <RotateCcw className="h-4 w-4" />
                Restart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ REVIEW PHASE (after answering, before next) ═══
  if (session.phase === 'review' && lastAnswer && currentExercise) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ProgressBar progress={progress} elapsed={elapsed} total={exercises.length} current={answeredCount} />

        <Card className="!py-0 overflow-hidden">
          <div className={cn(
            'px-6 py-5 text-center',
            lastAnswer.isCorrect ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-red-50 border-b border-red-100'
          )}>
            {lastAnswer.isCorrect ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
                <span className="text-lg font-bold">Correct ! +{lastAnswer.pointsEarned} pts</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-red-500">
                <XCircle className="h-7 w-7" />
                <span className="text-lg font-bold">Incorrect - 0 pts</span>
              </div>
            )}
          </div>
          <CardContent className="p-6 space-y-4">
            {/* Show correct answer for wrong responses */}
            {!lastAnswer.isCorrect && (
              <CorrectAnswerDisplay exercise={currentExercise} />
            )}

            {currentExercise.explanation && (
              <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1">Explication</p>
                    <p className="text-sm text-navy-700 leading-relaxed">{currentExercise.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={nextExercise} variant="teal" size="lg" className="w-full">
              {answeredCount >= exercises.length ? 'See results' : 'Next question'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ EXERCISE PHASE ═══
  if (!currentExercise) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <ProgressBar progress={progress} elapsed={elapsed} total={exercises.length} current={session.currentIndex + 1} />

      <Card className="!py-0 overflow-hidden">
        {/* Exercise header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cream-25 border-b border-cream-100">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">
              {TYPE_LABELS[currentExercise.exercise_type] ?? currentExercise.exercise_type}
            </span>
            <span className={cn('text-sm', DIFFICULTY_COLORS[currentExercise.difficulty] || '')}>
              {DIFFICULTY_LABELS[currentExercise.difficulty] || ''}
            </span>
          </div>
          <span className="text-xs font-medium text-navy-400 bg-white px-2 py-1 rounded-full border border-cream-200">
            {currentExercise.points} pts
          </span>
        </div>

        <CardContent className="p-6">
          {/* Instruction */}
          {currentExercise.instruction && (
            <p className="text-xs text-navy-400 italic mb-3">{currentExercise.instruction}</p>
          )}

          {/* Exercise renderer */}
          <ExerciseRenderer
            key={currentExercise.id}
            exercise={currentExercise}
            onAnswer={recordAnswer}
            playAudio={playAudio}
            playingId={playingId}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ progress, elapsed, total, current }: { progress: number; elapsed: number; total: number; current: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-navy-500">
        <span className="font-medium">Question {current}/{total}</span>
        <span className="flex items-center gap-1 font-mono">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(elapsed)}
        </span>
      </div>
      <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Correct Answer Display ─────────────────────────────────────────────────

function CorrectAnswerDisplay({ exercise }: { exercise: Exercise }) {
  const meta = exercise.metadata ?? {};
  const type = exercise.exercise_type;
  let display: string | null = null;

  if (type === 'mcq' || type === 'listening_comprehension') {
    const options = (meta.options as string[]) ?? [];
    const idx = (meta.correct_index as number) ?? 0;
    display = options[idx] ?? null;
  } else if (type === 'character_recognition') {
    const options = (meta.options as Array<{ char: string; pinyin: string }>) ?? [];
    const idx = (meta.correct_index as number) ?? 0;
    const opt = options[idx];
    display = opt ? `${opt.char} (${opt.pinyin})` : null;
  } else if (type === 'fill_blank' || type === 'dictation' || type === 'controlled_translation') {
    display = (meta.correct_answer as string) ?? null;
  } else if (type === 'reorder') {
    display = (meta.correct_sentence as string) ?? null;
  }

  if (!display) return null;

  return (
    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Correct answer</p>
      <p className="text-base font-medium text-emerald-900">{display}</p>
    </div>
  );
}

// ─── Answer Review Accordion ────────────────────────────────────────────────

function AnswerReview({ answers, exercises }: { answers: ExerciseAnswer[]; exercises: Exercise[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-cream-100 pt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
          Review answers ({answers.filter(a => a.isCorrect).length}/{answers.length} correct)
        </span>
        <span className="text-xs text-navy-400">{expanded ? 'Hide' : 'Show'}</span>
      </button>
      {expanded && (
        <div className="space-y-2 mt-3 max-h-80 overflow-y-auto">
          {answers.map((a, i) => (
            <div key={i} className={cn(
              'flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm',
              a.isCorrect ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
            )}>
              {a.isCorrect ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-navy-700 font-medium">Q{i + 1}.</span>{' '}
                <span className="text-navy-600">{exercises[i]?.prompt?.slice(0, 80)}</span>
              </div>
              <span className="text-xs text-navy-400 shrink-0 font-mono">
                {a.pointsEarned}/{a.pointsMax}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISE RENDERER - dispatches to type-specific components
// ═══════════════════════════════════════════════════════════════════════════

interface RendererProps {
  exercise: Exercise;
  onAnswer: (answer: ExerciseAnswer) => void;
  playAudio: (id: string, url: string | null, text: string) => void;
  playingId: string | null;
}

function ExerciseRenderer({ exercise, onAnswer, playAudio, playingId }: RendererProps) {
  const startTime = useRef(Date.now());

  const submitAnswer = useCallback((isCorrect: boolean, userAnswer: unknown) => {
    onAnswer({
      exerciseId: exercise.id,
      isCorrect,
      pointsEarned: isCorrect ? exercise.points : 0,
      pointsMax: exercise.points,
      userAnswer,
      timeSpent: Math.round((Date.now() - startTime.current) / 1000),
    });
  }, [exercise, onAnswer]);

  const meta = exercise.metadata ?? {};

  switch (exercise.exercise_type) {
    case 'mcq':
      return <MCQRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    case 'character_recognition':
      return <CharRecognitionRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    case 'fill_blank':
      return <FillBlankRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    case 'dictation':
      return <DictationRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} playAudio={playAudio} playingId={playingId} />;
    case 'controlled_translation':
      return <TranslationRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    case 'matching':
      return <MatchingRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    case 'reorder':
      return <ReorderRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    case 'flashcard':
      return <FlashcardRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} playAudio={playAudio} playingId={playingId} />;
    case 'listening_comprehension':
      return <ListeningRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} playAudio={playAudio} playingId={playingId} />;
    case 'reading_comprehension':
      return <ReadingRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
    default:
      return <MCQRenderer exercise={exercise} meta={meta} onSubmit={submitAnswer} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE-SPECIFIC RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Shared Hint Toggle ─────────────────────────────────────────────────────

function HintToggle({ hint }: { hint: string | null | undefined }) {
  const [show, setShow] = useState(false);
  if (!hint) return null;
  return (
    <button
      type="button"
      onClick={() => setShow(!show)}
      className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600 transition-colors"
    >
      {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {show ? hint : "Show hint"}
    </button>
  );
}

// ─── MCQ ────────────────────────────────────────────────────────────────────

function MCQRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  // Support options at meta.options OR meta.interactive.options (some exercises use nested format)
  const interactive = (meta.interactive as Record<string, unknown>) ?? {};
  const options = (meta.options as string[]) ?? (interactive.options as string[]) ?? [];
  const correctIndex = (meta.correct_index as number) ?? (interactive.correct_index as number) ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">{exercise.prompt}</p>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm leading-relaxed',
              selected === i
                ? 'border-teal-500 bg-teal-50 text-navy-900 shadow-sm'
                : 'border-cream-200 bg-white text-navy-700 hover:border-cream-300 hover:bg-cream-25'
            )}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-100 text-navy-500 text-xs font-bold mr-3">
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        ))}
      </div>
      <HintToggle hint={exercise.hint} />
      <Button
        onClick={() => onSubmit(selected === correctIndex, selected)}
        variant="teal" size="lg" className="w-full"
        disabled={selected === null}
      >
        Submit answer
      </Button>
    </div>
  );
}

// ─── Character Recognition ──────────────────────────────────────────────────
// Options are objects: { char, pinyin }

function CharRecognitionRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = (meta.options as Array<{ char: string; pinyin: string }>) ?? [];
  const correctIndex = (meta.correct_index as number) ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">{exercise.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all',
              selected === i
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-cream-200 bg-white hover:border-cream-300 hover:bg-cream-25'
            )}
          >
            <span className="text-4xl font-medium text-navy-900">{opt.char}</span>
            <span className="text-sm text-teal-600 font-mono mt-1">{opt.pinyin}</span>
          </button>
        ))}
      </div>
      <HintToggle hint={exercise.hint} />
      <Button
        onClick={() => onSubmit(selected === correctIndex, selected)}
        variant="teal" size="lg" className="w-full"
        disabled={selected === null}
      >
        Submit answer
      </Button>
    </div>
  );
}

// ─── Fill Blank ─────────────────────────────────────────────────────────────

function FillBlankRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const [value, setValue] = useState('');
  const correctAnswer = (meta.correct_answer as string) ?? '';
  const alternatives = (meta.accept_alternatives as string[]) ?? [];
  const template = (meta.sentence_template as string) ?? '';

  const checkAnswer = () => {
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    const correct = lower === correctAnswer.toLowerCase() ||
      trimmed === correctAnswer ||
      alternatives.some(alt => lower === alt.toLowerCase() || trimmed === alt);
    onSubmit(correct, trimmed);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">{exercise.prompt}</p>
      {template && (
        <div className="bg-cream-25 rounded-xl p-4 border border-cream-100 text-center">
          <p className="text-xl text-navy-800 font-medium">{template.replace('___', ' _____ ')}</p>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) checkAnswer(); }}
        placeholder="Your answer..."
        className="w-full px-4 py-3.5 rounded-xl border-2 border-cream-200 bg-white text-navy-900 text-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        autoFocus
        autoComplete="off"
      />
      <HintToggle hint={exercise.hint} />
      <Button onClick={checkAnswer} variant="teal" size="lg" className="w-full" disabled={!value.trim()}>
        Submit answer
      </Button>
    </div>
  );
}

// ─── Dictation ──────────────────────────────────────────────────────────────
// Listen to audio then type what you hear

function DictationRenderer({ exercise, meta, onSubmit, playAudio, playingId }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
  playAudio: (id: string, url: string | null, text: string) => void; playingId: string | null;
}) {
  const [value, setValue] = useState('');
  const [playCount, setPlayCount] = useState(0);
  const audioText = (meta.audio_text as string) ?? '';
  const correctAnswer = (meta.correct_answer as string) ?? audioText;
  const alternatives = (meta.accept_alternatives as string[]) ?? [];

  const handlePlay = () => {
    playAudio(`dictation-${exercise.id}`, exercise.audio_url, audioText);
    setPlayCount(c => c + 1);
  };

  const checkAnswer = () => {
    const trimmed = value.trim();
    // Strip punctuation for comparison
    const normalize = (s: string) => s.replace(/[。，！？、；：""''（）\s.,!?;:'"()\s]/g, '').toLowerCase();
    const correct = normalize(trimmed) === normalize(correctAnswer) ||
      alternatives.some(alt => normalize(trimmed) === normalize(alt));
    onSubmit(correct, trimmed);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">{exercise.prompt || 'Listen and write what you hear'}</p>

      <button
        type="button"
        onClick={handlePlay}
        className={cn(
          'w-full flex items-center justify-center gap-3 px-6 py-5 rounded-xl border-2 transition-all',
          playingId === `dictation-${exercise.id}`
            ? 'border-teal-500 bg-teal-50 text-teal-700'
            : 'border-cream-200 bg-white text-navy-600 hover:border-teal-300 hover:bg-teal-50'
        )}
      >
        <Volume2 className={cn('h-7 w-7', playingId === `dictation-${exercise.id}` && 'animate-pulse')} />
        <div className="text-left">
          <span className="font-medium block">{playingId === `dictation-${exercise.id}` ? 'Playing...' : 'Ecouter l\'audio'}</span>
          <span className="text-xs opacity-60">Listen {playCount > 0 ? `(${playCount}x)` : ''}</span>
        </div>
      </button>

      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) checkAnswer(); }}
        placeholder="Type what you hear..."
        className="w-full px-4 py-3.5 rounded-xl border-2 border-cream-200 bg-white text-navy-900 text-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        autoComplete="off"
      />
      <HintToggle hint={exercise.hint} />
      <Button onClick={checkAnswer} variant="teal" size="lg" className="w-full" disabled={!value.trim()}>
        Submit answer
      </Button>
    </div>
  );
}

// ─── Controlled Translation ─────────────────────────────────────────────────
// Translate a sentence, with key_words provided as helps

function TranslationRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const [value, setValue] = useState('');
  const sourceText = (meta.source_text as string) ?? '';
  const correctAnswer = (meta.correct_answer as string) ?? '';
  const alternatives = (meta.accept_alternatives as string[]) ?? [];
  const keyWords = (meta.key_words as string[]) ?? [];

  const checkAnswer = () => {
    const normalize = (s: string) => s.replace(/[。，！？、；：""''（）\s.,!?;:'"()\s]/g, '').toLowerCase();
    const trimmed = value.trim();
    const correct = normalize(trimmed) === normalize(correctAnswer) ||
      alternatives.some(alt => normalize(trimmed) === normalize(alt));
    onSubmit(correct, trimmed);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">{exercise.prompt || 'Translate the following sentence'}</p>

      {sourceText && (
        <div className="bg-cream-25 rounded-xl p-4 border border-cream-100">
          <p className="text-xs text-navy-400 uppercase tracking-wider mb-1">Texte source</p>
          <p className="text-base text-navy-800 font-medium leading-relaxed">{sourceText}</p>
        </div>
      )}

      {keyWords.length > 0 && (
        <div>
          <p className="text-xs text-navy-400 mb-2">Mots-cles utiles :</p>
          <div className="flex flex-wrap gap-2">
            {keyWords.map((word, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-sm font-medium border border-violet-200">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) checkAnswer(); }}
        placeholder="Your translation..."
        className="w-full px-4 py-3.5 rounded-xl border-2 border-cream-200 bg-white text-navy-900 text-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        autoFocus
        autoComplete="off"
      />
      <HintToggle hint={exercise.hint} />
      <Button onClick={checkAnswer} variant="teal" size="lg" className="w-full" disabled={!value.trim()}>
        Submit translation
      </Button>
    </div>
  );
}

// ─── Matching ───────────────────────────────────────────────────────────────

function MatchingRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const pairs = (meta.pairs as Array<{ left: string; right: string }>) ?? [];
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Map<number, number>>(new Map());
  const [shuffledRight] = useState(() => {
    const indices = pairs.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });

  const handleLeftClick = (idx: number) => {
    setSelectedLeft(selectedLeft === idx ? null : idx);
  };

  const handleRightClick = (rightIdx: number) => {
    if (selectedLeft === null) return;
    const newMatches = new Map(matches);
    // Remove existing matches for either side
    for (const [l, r] of newMatches) {
      if (l === selectedLeft || r === rightIdx) newMatches.delete(l);
    }
    newMatches.set(selectedLeft, rightIdx);
    setMatches(newMatches);
    setSelectedLeft(null);
  };

  const removeMatch = (leftIdx: number) => {
    const newMatches = new Map(matches);
    newMatches.delete(leftIdx);
    setMatches(newMatches);
  };

  const checkMatches = () => {
    let correct = 0;
    matches.forEach((rightIdx, leftIdx) => {
      if (leftIdx === rightIdx) correct++;
    });
    const allCorrect = correct === pairs.length;
    onSubmit(allCorrect, Object.fromEntries(matches));
  };

  const matchedLefts = new Set(matches.keys());
  const matchedRights = new Set(matches.values());

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">
        {exercise.prompt || 'Match the corresponding items'}
      </p>
      <p className="text-xs text-navy-400">Cliquez sur un element a gauche, puis sur son correspondant a droite.</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left column */}
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <button
              key={`l-${i}`}
              type="button"
              onClick={() => matchedLefts.has(i) ? removeMatch(i) : handleLeftClick(i)}
              className={cn(
                'w-full text-left px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                matchedLefts.has(i)
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : selectedLeft === i
                    ? 'border-teal-500 bg-teal-50 text-navy-900 shadow-sm'
                    : 'border-cream-200 bg-white text-navy-700 hover:border-cream-300'
              )}
            >
              {pair.left}
              {matchedLefts.has(i) && <span className="float-right text-emerald-400">&#x2713;</span>}
            </button>
          ))}
        </div>
        {/* Right column (shuffled) */}
        <div className="space-y-2">
          {shuffledRight.map((origIdx) => (
            <button
              key={`r-${origIdx}`}
              type="button"
              onClick={() => handleRightClick(origIdx)}
              disabled={matchedRights.has(origIdx) && selectedLeft === null}
              className={cn(
                'w-full text-left px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                matchedRights.has(origIdx)
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : selectedLeft !== null
                    ? 'border-sky-300 bg-sky-50 text-navy-700 hover:border-sky-400 cursor-pointer'
                    : 'border-cream-200 bg-white text-navy-700'
              )}
            >
              {pairs[origIdx].right}
              {matchedRights.has(origIdx) && <span className="float-right text-emerald-400">&#x2713;</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-navy-400">{matches.size}/{pairs.length} paires formees</span>
        <Button
          onClick={checkMatches}
          variant="teal" size="lg"
          disabled={matches.size < pairs.length}
        >
          Submit matches
        </Button>
      </div>
    </div>
  );
}

// ─── Reorder ────────────────────────────────────────────────────────────────

function ReorderRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const words = (meta.words as string[]) ?? [];
  const correctOrder = (meta.correct_order as number[]) ?? words.map((_, i) => i);
  const correctSentence = (meta.correct_sentence as string) ?? '';

  // Shuffle on mount
  const shuffled = useMemo(() => {
    const indices = words.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [words]);

  const [selected, setSelected] = useState<number[]>([]);

  const addWord = (idx: number) => {
    if (!selected.includes(idx)) setSelected([...selected, idx]);
  };

  const removeWord = (pos: number) => {
    setSelected(selected.filter((_, i) => i !== pos));
  };

  const clearAll = () => setSelected([]);

  const checkOrder = () => {
    const isCorrect = selected.length === correctOrder.length &&
      selected.every((idx, pos) => idx === correctOrder[pos]);
    onSubmit(isCorrect, selected.map(i => words[i]).join(''));
  };

  const unselected = shuffled.filter(i => !selected.includes(i));

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">{exercise.prompt}</p>

      {/* Answer area */}
      <div className="min-h-[3.5rem] px-4 py-3 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/30 flex flex-wrap gap-2 items-center">
        {selected.length === 0 ? (
          <span className="text-sm text-navy-300 italic">Cliquez sur les mots dans le bon ordre...</span>
        ) : (
          selected.map((idx, pos) => (
            <button
              key={`sel-${pos}`}
              type="button"
              onClick={() => removeWord(pos)}
              className="px-3 py-1.5 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-red-400 active:scale-95 transition-all"
              title="Cliquer pour retirer"
            >
              {words[idx]}
            </button>
          ))
        )}
        {selected.length > 0 && (
          <button type="button" onClick={clearAll} className="ml-auto text-xs text-navy-400 hover:text-red-500 transition-colors">
            Tout effacer
          </button>
        )}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap gap-2">
        {unselected.map(idx => (
          <button
            key={`avail-${idx}`}
            type="button"
            onClick={() => addWord(idx)}
            className="px-3 py-1.5 rounded-lg border-2 border-cream-200 bg-white text-navy-700 text-sm font-medium hover:border-teal-300 hover:bg-teal-50 active:scale-95 transition-all"
          >
            {words[idx]}
          </button>
        ))}
      </div>

      <HintToggle hint={exercise.hint} />
      <Button
        onClick={checkOrder}
        variant="teal" size="lg" className="w-full"
        disabled={selected.length < words.length}
      >
        Submit order
      </Button>
    </div>
  );
}

// ─── Flashcard ──────────────────────────────────────────────────────────────
// Data in metadata.interactive.{front, front_pinyin, back, audio_text}

function FlashcardRenderer({ exercise, meta, onSubmit, playAudio, playingId }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
  playAudio: (id: string, url: string | null, text: string) => void; playingId: string | null;
}) {
  const [flipped, setFlipped] = useState(false);

  // Extract from metadata.interactive (LLM enrichment format)
  const interactive = (meta.interactive as Record<string, unknown>) ?? {};
  const front = (interactive.front as string) || (meta.front as string) || '?';
  const frontPinyin = (interactive.front_pinyin as string) || (meta.front_pinyin as string) || '';
  const back = (interactive.back as string) || (meta.back as string) || '?';
  const audioText = (interactive.audio_text as string) || (meta.audio_text as string) || front;

  const isPlaying = playingId === `fc-${exercise.id}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-navy-400 italic">
        {exercise.instruction || "Retournez la carte puis evaluez-vous honnetement."}
      </p>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className={cn(
          'w-full min-h-[220px] rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 p-6',
          flipped
            ? 'border-teal-300 bg-gradient-to-b from-white to-teal-50'
            : 'border-cream-200 bg-white hover:shadow-md hover:border-cream-300'
        )}
      >
        {!flipped ? (
          <>
            <span className="text-6xl font-medium text-navy-900">{front}</span>
            {frontPinyin && <span className="text-lg text-teal-600 font-mono mt-1">{frontPinyin}</span>}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playAudio(`fc-${exercise.id}`, exercise.audio_url, audioText); }}
              className={cn('mt-3 p-3 rounded-full transition-all', isPlaying ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-500 hover:bg-teal-100')}
            >
              <Volume2 className={cn('h-5 w-5', isPlaying && 'animate-pulse')} />
            </button>
            <span className="text-xs text-navy-300 mt-3">Cliquez pour retourner</span>
          </>
        ) : (
          <>
            <span className="text-4xl font-medium text-navy-900">{front}</span>
            <span className="text-lg text-teal-600 font-mono">{frontPinyin}</span>
            <div className="border-t border-cream-200 w-2/3 my-3" />
            <span className="text-2xl text-navy-700 font-medium">{back}</span>
          </>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => onSubmit(false, 'didnt_know')}
            variant="ghost" size="lg"
            className="border-2 border-red-200 text-red-500 hover:bg-red-50"
          >
            <XCircle className="h-5 w-5" />
            I didn't know
          </Button>
          <Button
            onClick={() => onSubmit(true, 'knew')}
            variant="teal" size="lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            I knew it!
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Listening Comprehension ────────────────────────────────────────────────

function ListeningRenderer({ exercise, meta, onSubmit, playAudio, playingId }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
  playAudio: (id: string, url: string | null, text: string) => void; playingId: string | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const audioText = (meta.audio_text as string) ?? '';
  const options = (meta.options as string[]) ?? [];
  const correctIndex = (meta.correct_index as number) ?? 0;
  const isPlaying = playingId === `listen-${exercise.id}`;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-navy-900 leading-relaxed">
        {exercise.prompt?.replace(/^\[Audio\]\s*/i, '') || 'Listen and choose the correct answer'}
      </p>

      {/* Audio play button */}
      <button
        type="button"
        onClick={() => playAudio(`listen-${exercise.id}`, exercise.audio_url, audioText)}
        className={cn(
          'w-full flex items-center justify-center gap-3 px-6 py-5 rounded-xl border-2 transition-all',
          isPlaying
            ? 'border-teal-500 bg-teal-50 text-teal-700'
            : 'border-cream-200 bg-white text-navy-600 hover:border-teal-300 hover:bg-teal-50'
        )}
      >
        <Volume2 className={cn('h-7 w-7', isPlaying && 'animate-pulse')} />
        <span className="font-medium">{isPlaying ? 'Playing...' : 'Ecouter l\'audio'}</span>
      </button>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm',
              selected === i
                ? 'border-teal-500 bg-teal-50 text-navy-900 shadow-sm'
                : 'border-cream-200 bg-white text-navy-700 hover:border-cream-300'
            )}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-100 text-navy-500 text-xs font-bold mr-3">
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
          </button>
        ))}
      </div>

      <HintToggle hint={exercise.hint} />
      <Button
        onClick={() => onSubmit(selected === correctIndex, selected)}
        variant="teal" size="lg" className="w-full"
        disabled={selected === null}
      >
        Submit answer
      </Button>
    </div>
  );
}

// ─── Reading Comprehension ──────────────────────────────────────────────────

function ReadingRenderer({ exercise, meta, onSubmit }: {
  exercise: Exercise; meta: Record<string, unknown>; onSubmit: (correct: boolean, answer: unknown) => void;
}) {
  const passage = (meta.passage as string) ?? '';
  const questions = (meta.questions as Array<{
    question: string;
    options: string[];
    correct_index: number;
  }>) ?? [];

  const [answers, setAnswers] = useState<Map<number, number>>(new Map());

  const handleSelect = (qIdx: number, optIdx: number) => {
    const newAnswers = new Map(answers);
    newAnswers.set(qIdx, optIdx);
    setAnswers(newAnswers);
  };

  const checkAnswers = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers.get(i) === q.correct_index) correct++;
    });
    const allCorrect = correct === questions.length;
    onSubmit(allCorrect, Object.fromEntries(answers));
  };

  return (
    <div className="space-y-5">
      {/* Passage */}
      <div className="bg-cream-25 rounded-xl p-5 border border-cream-100">
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">
          <ArrowRight className="h-3 w-3 inline mr-1" />
          Texte a lire
        </p>
        <div className="text-base text-navy-900 whitespace-pre-line leading-relaxed font-medium">{passage}</div>
      </div>

      {/* Questions */}
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="space-y-2.5">
          <p className="text-sm font-semibold text-navy-800">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2">
              {qIdx + 1}
            </span>
            {q.question}
          </p>
          <div className="space-y-1.5 pl-7">
            {q.options.map((opt, optIdx) => (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelect(qIdx, optIdx)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-all',
                  answers.get(qIdx) === optIdx
                    ? 'border-teal-500 bg-teal-50 shadow-sm'
                    : 'border-cream-200 bg-white hover:border-cream-300'
                )}
              >
                <span className="font-mono text-xs text-navy-400 mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button
        onClick={checkAnswers}
        variant="teal" size="lg" className="w-full"
        disabled={answers.size < questions.length}
      >
        Submit answers ({answers.size}/{questions.length})
      </Button>
    </div>
  );
}
