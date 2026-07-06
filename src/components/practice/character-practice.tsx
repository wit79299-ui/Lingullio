'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { recordFlashcardReview } from '@/lib/gamification/knowledge-tracker';
import {
  HanziWriterPad,
  type PadMode,
  type QuizResult,
  type StrokeResult,
} from './hanzi-writer-pad';
import {
  Play,
  RotateCcw,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Volume2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Star,
} from 'lucide-react';

interface CharacterData {
  id: string;
  character: string;
  pinyin: string;
  meaning: string;
  audio_url?: string | null;
  stroke_count?: number;
}

interface CharacterPracticeProps {
  characters: CharacterData[];
  hskLevel: string;
  courseTitle: string;
}

interface AttemptRecord {
  character: string;
  score: number;
  mistakes: number;
  timestamp: number;
}

export function CharacterPractice({
  characters,
  hskLevel,
  courseTitle,
}: CharacterPracticeProps) {
  const t = useTranslations('practice');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PadMode>('learn');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastStroke, setLastStroke] = useState<StrokeResult | null>(null);
  const [quizKey, setQuizKey] = useState(0); // Force re-mount on retry
  const [startTime, setStartTime] = useState<number | null>(null);

  const char = characters[currentIndex];
  if (!char) return null;

  const totalChars = characters.length;
  const progress = ((currentIndex + 1) / totalChars) * 100;

  // Attempts for current character
  const charAttempts = useMemo(
    () => attempts.filter((a) => a.character === char.character),
    [attempts, char.character]
  );
  const bestScore = charAttempts.length
    ? Math.max(...charAttempts.map((a) => a.score))
    : null;

  // Overall session stats
  const sessionStats = useMemo(() => {
    if (attempts.length === 0) return null;
    const avgScore =
      attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
    const perfectCount = attempts.filter((a) => a.score === 100).length;
    return { avgScore, perfectCount, totalAttempts: attempts.length };
  }, [attempts]);

  // Audio playback
  const playAudio = useCallback(() => {
    if (char.audio_url) {
      const audio = new Audio(char.audio_url);
      audio.play().catch(() => {});
    }
  }, [char.audio_url]);

  // Navigation
  const goNext = useCallback(() => {
    if (currentIndex < totalChars - 1) {
      setCurrentIndex((i) => i + 1);
      setMode('learn');
      setQuizResult(null);
      setShowResult(false);
      setLastStroke(null);
      setQuizKey((k) => k + 1);
    }
  }, [currentIndex, totalChars]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setMode('learn');
      setQuizResult(null);
      setShowResult(false);
      setLastStroke(null);
      setQuizKey((k) => k + 1);
    }
  }, [currentIndex]);

  // Mode switches
  const startQuiz = useCallback(() => {
    setMode('quiz');
    setQuizResult(null);
    setShowResult(false);
    setLastStroke(null);
    setQuizKey((k) => k + 1);
    setStartTime(Date.now());
  }, []);

  const startLearn = useCallback(() => {
    setMode('learn');
    setQuizResult(null);
    setShowResult(false);
    setQuizKey((k) => k + 1);
  }, []);

  const retry = useCallback(() => {
    setQuizResult(null);
    setShowResult(false);
    setLastStroke(null);
    setQuizKey((k) => k + 1);
  }, []);

  // Quiz callbacks
  const handleQuizComplete = useCallback(
    (result: QuizResult) => {
      setQuizResult(result);
      setShowResult(true);
      setAttempts((prev) => [
        ...prev,
        {
          character: result.character,
          score: result.score,
          mistakes: result.totalMistakes,
          timestamp: Date.now(),
        },
      ]);

      // ── Record in Knowledge Map ──
      const isCorrect = result.score >= 70; // 70%+ counts as "correct" for SRS
      recordFlashcardReview(
        char.id,
        'character',
        hskLevel,
        char.character,
        char.pinyin,
        char.meaning,
        isCorrect,
        Math.round((Date.now() - (startTime ?? Date.now())) / 1000),
        char.audio_url,
      );
    },
    [char, hskLevel]
  );

  const handleStrokeComplete = useCallback((result: StrokeResult) => {
    setLastStroke(result);
  }, []);

  // Score display helpers
  function getScoreColor(score: number) {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-teal-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-500';
  }

  function getScoreLabel(score: number) {
    if (score === 100) return t('perfect');
    if (score >= 90) return t('excellent');
    if (score >= 70) return t('good');
    if (score >= 50) return t('keepPracticing');
    return t('tryAgain');
  }

  function getScoreStars(score: number) {
    if (score >= 90) return 3;
    if (score >= 70) return 2;
    if (score >= 40) return 1;
    return 0;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 text-teal-600">
              <Pencil className="h-5 w-5" />
            </div>
            {t('title')} - HSK {hskLevel}
          </h1>
          <p className="text-sm text-navy-400 mt-1 ml-[52px]">
            {t('subtitle', { course: courseTitle })}
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-navy-400">
          <span>
            {t('characterProgress', {
              current: currentIndex + 1,
              total: totalChars,
            })}
          </span>
          {sessionStats && (
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              {t('avgScore', {
                score: Math.round(sessionStats.avgScore),
              })}
            </span>
          )}
        </div>
        <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left: Character info card */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              {/* Large character display */}
              <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-cream-50 to-cream-100 border border-cream-200 shrink-0">
                <span className="text-5xl font-medium text-navy-900">
                  {char.character}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-teal-600">
                    {char.pinyin}
                  </span>
                  {char.audio_url && (
                    <button
                      onClick={playAudio}
                      className="p-1.5 rounded-full hover:bg-cream-50 text-teal-500 hover:text-teal-600 transition-colors"
                      aria-label={t('playAudio')}
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <p className="text-navy-600">{char.meaning}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="new">HSK {hskLevel}</Badge>
                  {char.stroke_count && (
                    <Badge variant="inProgress">
                      {t('strokes', { count: char.stroke_count })}
                    </Badge>
                  )}
                  {bestScore !== null && (
                    <Badge
                      variant={bestScore >= 70 ? 'new' : 'inProgress'}
                      className="flex items-center gap-1"
                    >
                      <Trophy className="h-3 w-3" />
                      {bestScore}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={startLearn}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === 'learn'
                    ? 'bg-navy-900 text-white'
                    : 'bg-cream-50 text-navy-500 hover:bg-cream-100'
                }`}
              >
                <Eye className="h-4 w-4" />
                {t('learnMode')}
              </button>
              <button
                onClick={startQuiz}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === 'quiz'
                    ? 'bg-navy-900 text-white'
                    : 'bg-cream-50 text-navy-500 hover:bg-cream-100'
                }`}
              >
                <Pencil className="h-4 w-4" />
                {t('quizMode')}
              </button>
              <button
                onClick={() => {
                  setMode('free');
                  setQuizKey((k) => k + 1);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === 'free'
                    ? 'bg-navy-900 text-white'
                    : 'bg-cream-50 text-navy-500 hover:bg-cream-100'
                }`}
              >
                <Play className="h-4 w-4" />
                {t('freeMode')}
              </button>
            </div>

            {/* Tips */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-800">
                {mode === 'learn' && t('learnTip')}
                {mode === 'quiz' && t('quizTip')}
                {mode === 'free' && t('freeTip')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Writing pad + controls */}
        <div className="flex flex-col items-center gap-4">
          <HanziWriterPad
            key={`${char.character}-${mode}-${quizKey}`}
            character={char.character}
            mode={mode}
            size={300}
            onQuizComplete={handleQuizComplete}
            onStrokeComplete={handleStrokeComplete}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {mode === 'learn' && (
              <Button variant="teal" size="sm" onClick={startLearn}>
                <Play className="h-4 w-4" />
                {t('replay')}
              </Button>
            )}
            {(mode === 'quiz' || mode === 'free') && (
              <Button variant="secondary" size="sm" onClick={retry}>
                <RotateCcw className="h-4 w-4" />
                {t('reset')}
              </Button>
            )}
            {mode !== 'quiz' && (
              <Button variant="teal" size="sm" onClick={startQuiz}>
                <Pencil className="h-4 w-4" />
                {t('startQuiz')}
              </Button>
            )}
          </div>

          {/* Quiz result card */}
          {showResult && quizResult && (
            <Card className="w-full max-w-[320px] border-2 border-emerald-100">
              <CardContent className="text-center space-y-3">
                {/* Stars */}
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`h-8 w-8 ${
                        star <= getScoreStars(quizResult.score)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-cream-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Score */}
                <div>
                  <p
                    className={`text-4xl font-bold ${getScoreColor(
                      quizResult.score
                    )}`}
                  >
                    {quizResult.score}%
                  </p>
                  <p className="text-sm text-navy-500 mt-1">
                    {getScoreLabel(quizResult.score)}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {quizResult.strokeCount - quizResult.totalMistakes}{' '}
                    {t('correctStrokes')}
                  </span>
                  {quizResult.totalMistakes > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-4 w-4" />
                      {quizResult.totalMistakes} {t('mistakes')}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={retry}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('retry')}
                  </Button>
                  {currentIndex < totalChars - 1 && (
                    <Button
                      variant="teal"
                      size="sm"
                      className="flex-1"
                      onClick={goNext}
                    >
                      {t('next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentIndex === 0}
              onClick={goPrev}
              aria-label={t('previous')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-navy-400 min-w-[80px] text-center">
              {currentIndex + 1} / {totalChars}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={currentIndex >= totalChars - 1}
              onClick={goNext}
              aria-label={t('next')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
