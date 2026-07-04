'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGamificationStore } from '@/stores/gamification-store';
import { XP_CONFIG } from '@/lib/gamification/xp-config';
import { cn } from '@/lib/utils';
import {
  RefreshCw, Brain, Zap, CheckCircle2, XCircle, Volume2,
  ChevronRight, RotateCcw, Lightbulb, Star, Clock,
  BookOpen, Layers, Sparkles,
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/use-audio-player';

// ─── Types ──────────────────────────────────────────────────────────────

interface FlashcardItem {
  id: string;
  type: 'vocabulary' | 'character' | 'grammar';
  front: string;
  front_sub?: string; // pinyin, pattern, etc.
  back: string;
  back_sub?: string;
  audio_url?: string | null;
  difficulty: number; // 1-5
  hsk_level: string;
}

type ReviewPhase = 'idle' | 'reviewing' | 'results';

interface ReviewStats {
  total: number;
  correct: number;
  incorrect: number;
  xp_earned: number;
  time_seconds: number;
}

// ─── Demo flashcard data ────────────────────────────────────────────────

const DEMO_CARDS: FlashcardItem[] = [
  // HSK1
  { id: 'v1', type: 'vocabulary', front: '你好', front_sub: 'nǐ hǎo', back: 'Bonjour', difficulty: 1, hsk_level: '1' },
  { id: 'v2', type: 'vocabulary', front: '谢谢', front_sub: 'xiè xie', back: 'Merci', difficulty: 1, hsk_level: '1' },
  { id: 'c1', type: 'character', front: '人', front_sub: 'rén', back: 'Personne, etre humain', difficulty: 1, hsk_level: '1' },
  { id: 'v3', type: 'vocabulary', front: '学生', front_sub: 'xué shēng', back: 'Etudiant', difficulty: 1, hsk_level: '1' },
  { id: 'c2', type: 'character', front: '大', front_sub: 'dà', back: 'Grand', difficulty: 1, hsk_level: '1' },
  // HSK2
  { id: 'v4', type: 'vocabulary', front: '准备', front_sub: 'zhǔn bèi', back: 'Preparer', difficulty: 2, hsk_level: '2' },
  { id: 'v5', type: 'vocabulary', front: '已经', front_sub: 'yǐ jīng', back: 'Deja', difficulty: 2, hsk_level: '2' },
  { id: 'g1', type: 'grammar', front: '虽然…但是…', front_sub: 'suī rán...dàn shì...', back: 'Bien que... mais...', back_sub: 'Concession', difficulty: 2, hsk_level: '2' },
  // HSK3
  { id: 'v6', type: 'vocabulary', front: '环境', front_sub: 'huán jìng', back: 'Environnement', difficulty: 3, hsk_level: '3' },
  { id: 'v7', type: 'vocabulary', front: '经验', front_sub: 'jīng yàn', back: 'Experience', difficulty: 3, hsk_level: '3' },
  { id: 'c3', type: 'character', front: '爱', front_sub: 'ài', back: 'Aimer, amour', difficulty: 2, hsk_level: '2' },
  { id: 'v8', type: 'vocabulary', front: '影响', front_sub: 'yǐng xiǎng', back: 'Influence, affecter', difficulty: 3, hsk_level: '3' },
  // HSK4
  { id: 'v9', type: 'vocabulary', front: '积极', front_sub: 'jī jí', back: 'Positif, actif', difficulty: 3, hsk_level: '4' },
  { id: 'g2', type: 'grammar', front: '不但…而且…', front_sub: 'bù dàn...ér qiě...', back: 'Non seulement... mais aussi...', back_sub: 'Addition', difficulty: 3, hsk_level: '4' },
  { id: 'v10', type: 'vocabulary', front: '竞争', front_sub: 'jìng zhēng', back: 'Competition', difficulty: 4, hsk_level: '4' },
];

// ─── Main Component ──────────────────────────────────────────────────────

export default function RevisionsPage() {
  const [phase, setPhase] = useState<ReviewPhase>('idle');
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Array<{ card: FlashcardItem; correct: boolean }>>([]);
  const [startTime, setStartTime] = useState(0);
  const [filter, setFilter] = useState<'all' | 'vocabulary' | 'character' | 'grammar'>('all');
  const [hskFilter, setHskFilter] = useState<string>('all');

  const finishSessionLocal = useGamificationStore(s => s.finishSessionLocal);
  const { playingId, play: playAudio } = useAudioPlayer();
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);

  // ─── Start review ──────────────────────────────────────────────────────

  const startReview = useCallback(() => {
    let filtered = [...DEMO_CARDS];
    if (filter !== 'all') filtered = filtered.filter(c => c.type === filter);
    if (hskFilter !== 'all') filtered = filtered.filter(c => c.hsk_level === hskFilter);

    // Shuffle
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    // Take max 15 cards
    setCards(filtered.slice(0, 15));
    setCurrentIndex(0);
    setFlipped(false);
    setResults([]);
    setStartTime(Date.now());
    setPhase('reviewing');
    setReviewStats(null);
  }, [filter, hskFilter]);

  // ─── Answer handlers ───────────────────────────────────────────────────

  const handleAnswer = useCallback((correct: boolean) => {
    const card = cards[currentIndex];
    const newResults = [...results, { card, correct }];
    setResults(newResults);

    if (currentIndex + 1 >= cards.length) {
      // Session complete
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const correctCount = newResults.filter(r => r.correct).length;

      // Record in gamification
      const attempts = newResults.map(r => ({
        exercise_id: `srs-${r.card.id}`,
        is_correct: r.correct,
        score: r.correct ? 1 : 0,
        max_score: 1,
        time_spent_seconds: Math.round(elapsed / newResults.length),
        user_answer: r.correct ? 'knew' : 'didnt_know',
        exercise_type: 'flashcard' as const,
        skill_tags: [r.card.type === 'vocabulary' ? 'vocabulary' : r.card.type === 'character' ? 'characters' : 'grammar'],
      }));

      const summary = finishSessionLocal(attempts, elapsed);

      setReviewStats({
        total: newResults.length,
        correct: correctCount,
        incorrect: newResults.length - correctCount,
        xp_earned: summary.xp_earned,
        time_seconds: elapsed,
      });

      setPhase('results');
    } else {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  }, [cards, currentIndex, results, startTime, finishSessionLocal]);

  // ─── Filtered card counts ──────────────────────────────────────────────

  const counts = useMemo(() => {
    const all = DEMO_CARDS.length;
    const vocab = DEMO_CARDS.filter(c => c.type === 'vocabulary').length;
    const chars = DEMO_CARDS.filter(c => c.type === 'character').length;
    const grammar = DEMO_CARDS.filter(c => c.type === 'grammar').length;
    return { all, vocab, chars, grammar };
  }, []);

  const hskLevels = useMemo(() => {
    return [...new Set(DEMO_CARDS.map(c => c.hsk_level))].sort();
  }, []);

  // ═══ IDLE PHASE ═══
  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-teal-500" />
            Revisions
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            Repetition espacee — renforcez votre memoire avec des flashcards intelligentes
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="py-4">
              <Layers className="h-5 w-5 text-teal-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-navy-900">{counts.all}</p>
              <p className="text-xs text-navy-400">Cartes disponibles</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-4">
              <Brain className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-navy-900">{counts.vocab}</p>
              <p className="text-xs text-navy-400">Vocabulaire</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-4">
              <BookOpen className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-navy-900">{counts.chars + counts.grammar}</p>
              <p className="text-xs text-navy-400">Caracteres & Grammaire</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Personnaliser votre session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-navy-400 mb-2">Type de contenu</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tout', count: counts.all },
                  { value: 'vocabulary', label: 'Vocabulaire', count: counts.vocab },
                  { value: 'character', label: 'Caracteres', count: counts.chars },
                  { value: 'grammar', label: 'Grammaire', count: counts.grammar },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value as typeof filter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all',
                      filter === opt.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-cream-200 bg-white text-navy-600 hover:border-cream-300'
                    )}
                  >
                    {opt.label} ({opt.count})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-navy-400 mb-2">Niveau HSK</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setHskFilter('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all',
                    hskFilter === 'all'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-cream-200 bg-white text-navy-600 hover:border-cream-300'
                  )}
                >
                  Tous
                </button>
                {hskLevels.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setHskFilter(lvl)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all',
                      hskFilter === lvl
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-cream-200 bg-white text-navy-600 hover:border-cream-300'
                    )}
                  >
                    HSK {lvl}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={startReview} variant="teal" size="lg" className="w-full">
              <Sparkles className="h-5 w-5" />
              Commencer la revision
            </Button>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Comment ca marche ?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-navy-600">
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">1</span>
                <p>Une carte s&apos;affiche avec un caractere ou un mot en chinois.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">2</span>
                <p>Essayez de vous rappeler la traduction, puis retournez la carte.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">3</span>
                <p>Indiquez honnetement si vous connaissiez la reponse. L&apos;algorithme SM-2 adaptera les prochaines revisions.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">4</span>
                <p>Gagnez <strong>{XP_CONFIG.flashcard_correct} XP</strong> par bonne reponse et <strong>{XP_CONFIG.flashcard_incorrect} XP</strong> par participation !</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ REVIEWING PHASE ═══
  if (phase === 'reviewing' && cards.length > 0) {
    const card = cards[currentIndex];
    const progress = ((currentIndex) / cards.length) * 100;

    return (
      <div className="max-w-lg mx-auto space-y-4">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-navy-500">
            <span className="font-medium">Carte {currentIndex + 1}/{cards.length}</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {results.filter(r => r.correct).length}
              <span className="text-navy-300 mx-1">/</span>
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              {results.filter(r => !r.correct).length}
            </span>
          </div>
          <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card type badge */}
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-xs px-2.5 py-1 rounded-full font-medium',
            card.type === 'vocabulary' ? 'bg-teal-100 text-teal-700' :
            card.type === 'character' ? 'bg-purple-100 text-purple-700' :
            'bg-amber-100 text-amber-700'
          )}>
            {card.type === 'vocabulary' ? 'Vocabulaire' : card.type === 'character' ? 'Caractere' : 'Grammaire'}
          </span>
          <span className="text-xs text-navy-400">HSK {card.hsk_level}</span>
        </div>

        {/* Flashcard */}
        <button
          type="button"
          onClick={() => setFlipped(!flipped)}
          className={cn(
            'w-full min-h-[280px] rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 p-8',
            flipped
              ? 'border-teal-300 bg-gradient-to-b from-white to-teal-50'
              : 'border-cream-200 bg-white hover:shadow-lg hover:border-cream-300'
          )}
        >
          {!flipped ? (
            <>
              <span className="text-6xl font-medium text-navy-900 font-chinese">{card.front}</span>
              {card.front_sub && (
                <span className="text-lg text-teal-600 font-mono">{card.front_sub}</span>
              )}
              {card.audio_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(`srs-${card.id}`, card.audio_url ?? null, card.front);
                  }}
                  className={cn(
                    'mt-2 p-3 rounded-full transition-all',
                    playingId === `srs-${card.id}` ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-500 hover:bg-teal-100'
                  )}
                >
                  <Volume2 className={cn('h-5 w-5', playingId === `srs-${card.id}` && 'animate-pulse')} />
                </button>
              )}
              <span className="text-xs text-navy-300 mt-4">Cliquez pour retourner</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-medium text-navy-700 font-chinese">{card.front}</span>
              {card.front_sub && (
                <span className="text-sm text-teal-500 font-mono">{card.front_sub}</span>
              )}
              <div className="border-t border-cream-200 w-2/3 my-2" />
              <span className="text-2xl font-medium text-navy-900">{card.back}</span>
              {card.back_sub && (
                <span className="text-sm text-navy-400">{card.back_sub}</span>
              )}
            </>
          )}
        </button>

        {/* Answer buttons (only when flipped) */}
        {flipped && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAnswer(false)}
              variant="ghost" size="lg"
              className="border-2 border-red-200 text-red-500 hover:bg-red-50"
            >
              <XCircle className="h-5 w-5" />
              Je ne savais pas
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              variant="teal" size="lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              Je savais !
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ═══ RESULTS PHASE ═══
  if (phase === 'results' && reviewStats) {
    const percentage = reviewStats.total > 0 ? Math.round((reviewStats.correct / reviewStats.total) * 100) : 0;
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="!py-0 overflow-hidden">
          <div className={cn(
            'px-6 py-10 text-center text-white',
            percentage >= 80
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : percentage >= 50
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gradient-to-br from-orange-400 to-red-500'
          )}>
            <Brain className="h-12 w-12 mx-auto mb-3 drop-shadow-lg" />
            <p className="text-5xl font-extrabold">{percentage}%</p>
            <p className="text-xl font-semibold mt-2">
              {percentage >= 80 ? 'Excellent !' : percentage >= 50 ? 'Bon travail !' : 'Continuez vos efforts !'}
            </p>
            <div className="mt-3 animate-xp-count">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold">
                <Zap className="h-4 w-4" />
                +{reviewStats.xp_earned} XP
              </span>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-lg font-bold text-emerald-600">{reviewStats.correct}</p>
                <p className="text-[10px] text-emerald-600/70">Correctes</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-lg font-bold text-red-500">{reviewStats.incorrect}</p>
                <p className="text-[10px] text-red-500/70">A revoir</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-lg font-bold text-navy-900">{formatTime(reviewStats.time_seconds)}</p>
                <p className="text-[10px] text-navy-400">Temps</p>
              </div>
            </div>

            {/* Review errors */}
            {results.filter(r => !r.correct).length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                  A revoir en priorite
                </p>
                <div className="space-y-2">
                  {results.filter(r => !r.correct).map(r => (
                    <div key={r.card.id} className="flex items-center gap-2 text-sm">
                      <span className="text-lg font-chinese">{r.card.front}</span>
                      <span className="text-navy-400">→</span>
                      <span className="text-navy-600">{r.card.back}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={startReview} variant="teal" size="lg" className="flex-1">
                <RotateCcw className="h-4 w-4" />
                Recommencer
              </Button>
              <Button onClick={() => setPhase('idle')} variant="ghost" size="lg" className="flex-1 border border-cream-200">
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
