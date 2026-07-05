'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGamificationStore } from '@/stores/gamification-store';
import { useUserKnowledgeStore, type KnowledgeItem } from '@/stores/user-knowledge-store';
import { recordFlashcardReview } from '@/lib/gamification/knowledge-tracker';
import { XP_CONFIG } from '@/lib/gamification/xp-config';
import { cn } from '@/lib/utils';
import {
  RefreshCw, Brain, Zap, CheckCircle2, XCircle, Volume2,
  ChevronRight, RotateCcw, Lightbulb, Star, Clock,
  BookOpen, Layers, Sparkles, AlertTriangle, TrendingUp,
  Target, Flame,
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/use-audio-player';

// ─── Types ──────────────────────────────────────────────────────────────

interface FlashcardItem {
  id: string;
  type: 'vocabulary' | 'character' | 'grammar';
  front: string;
  front_sub?: string;
  back: string;
  back_sub?: string;
  audio_url?: string | null;
  difficulty: number;
  level: string;
  mastery?: string;
  srs_interval?: number;
  is_overdue?: boolean;
}

type ReviewPhase = 'idle' | 'reviewing' | 'results';
type ReviewMode = 'srs' | 'weak' | 'all' | 'hsk';

interface ReviewStats {
  total: number;
  correct: number;
  incorrect: number;
  xp_earned: number;
  time_seconds: number;
}

// ─── Fallback data for users with empty knowledge map ───────────────────

const STARTER_CARDS: FlashcardItem[] = [
  { id: 'starter-v1', type: 'vocabulary', front: '你好', front_sub: 'nǐ hǎo', back: 'Hello', difficulty: 1, level: '1' },
  { id: 'starter-v2', type: 'vocabulary', front: '谢谢', front_sub: 'xiè xie', back: 'Thank you', difficulty: 1, level: '1' },
  { id: 'starter-c1', type: 'character', front: '人', front_sub: 'rén', back: 'Person, human being', difficulty: 1, level: '1' },
  { id: 'starter-v3', type: 'vocabulary', front: '学生', front_sub: 'xué shēng', back: 'Student', difficulty: 1, level: '1' },
  { id: 'starter-c2', type: 'character', front: '大', front_sub: 'dà', back: 'Big', difficulty: 1, level: '1' },
  { id: 'starter-v4', type: 'vocabulary', front: '准备', front_sub: 'zhǔn bèi', back: 'To prepare', difficulty: 2, level: '2' },
  { id: 'starter-v5', type: 'vocabulary', front: '已经', front_sub: 'yǐ jīng', back: 'Already', difficulty: 2, level: '2' },
  { id: 'starter-g1', type: 'grammar', front: '虽然…但是…', front_sub: 'suī rán...dàn shì...', back: 'Although... but...', back_sub: 'Concession', difficulty: 2, level: '2' },
  { id: 'starter-v6', type: 'vocabulary', front: '环境', front_sub: 'huán jìng', back: 'Environment', difficulty: 3, level: '3' },
  { id: 'starter-v7', type: 'vocabulary', front: '经验', front_sub: 'jīng yàn', back: 'Experience', difficulty: 3, level: '3' },
  { id: 'starter-c3', type: 'character', front: '爱', front_sub: 'ài', back: 'To love, love', difficulty: 2, level: '2' },
  { id: 'starter-v8', type: 'vocabulary', front: '影响', front_sub: 'yǐng xiǎng', back: 'Influence, to affect', difficulty: 3, level: '3' },
  { id: 'starter-v9', type: 'vocabulary', front: '积极', front_sub: 'jī jí', back: 'Positive, active', difficulty: 3, level: '4' },
  { id: 'starter-g2', type: 'grammar', front: '不但…而且…', front_sub: 'bù dàn...ér qiě...', back: 'Not only... but also...', back_sub: 'Addition', difficulty: 3, level: '4' },
  { id: 'starter-v10', type: 'vocabulary', front: '竞争', front_sub: 'jìng zhēng', back: 'Competition', difficulty: 4, level: '4' },
];

// ─── Convert knowledge item to flashcard ────────────────────────────────

function knowledgeToFlashcard(item: KnowledgeItem): FlashcardItem {
  const now = new Date();
  const isOverdue = new Date(item.srs.next_review_at) <= now;

  return {
    id: item.item_id,
    type: item.item_type,
    front: item.display,
    front_sub: item.pinyin || undefined,
    back: item.meaning,
    back_sub: item.item_type === 'grammar' ? 'Grammar' : undefined,
    audio_url: item.audio_url,
    difficulty: Math.min(5, Math.max(1, Math.round(6 - item.srs.ease_factor * 2))),
    level: item.level,
    mastery: item.mastery,
    srs_interval: item.srs.interval_days,
    is_overdue: isOverdue,
  };
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [phase, setPhase] = useState<ReviewPhase>('idle');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('srs');
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Array<{ card: FlashcardItem; correct: boolean; timeSpent: number }>>([]);
  const [startTime, setStartTime] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(0);
  const [filter, setFilter] = useState<'all' | 'vocabulary' | 'character' | 'grammar'>('all');
  const [hskFilter, setHskFilter] = useState<string>('all');

  const finishSessionLocal = useGamificationStore(s => s.finishSessionLocal);
  const knowledgeStore = useUserKnowledgeStore();
  const { playingId, play: playAudio } = useAudioPlayer();
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);

  // ─── Knowledge Map Stats ──────────────────────────────────────────────

  const knowledgeStats = useMemo(() => knowledgeStore.getStats(), [knowledgeStore.items]);
  const reviewQueue = useMemo(
    () => knowledgeStore.getReviewQueue({ limit: 50 }),
    [knowledgeStore.items],
  );
  const weakItems = useMemo(
    () => knowledgeStore.getWeakestItems(20),
    [knowledgeStore.items],
  );

  const hasKnowledgeData = knowledgeStats.total_items > 0;
  const hasDueItems = reviewQueue.due_today_count > 0;

  // HSK levels present in knowledge map
  const knownHskLevels = useMemo(() => {
    const levels = new Set<string>();
    Object.values(knowledgeStore.items).forEach(i => levels.add(i.level));
    return [...levels].sort();
  }, [knowledgeStore.items]);

  // Counts from knowledge map
  const kmCounts = useMemo(() => {
    const items = Object.values(knowledgeStore.items);
    return {
      total: items.length,
      vocab: items.filter(i => i.item_type === 'vocabulary').length,
      chars: items.filter(i => i.item_type === 'character').length,
      grammar: items.filter(i => i.item_type === 'grammar').length,
      due: reviewQueue.due_today_count,
      weak: weakItems.length,
      mastered: knowledgeStats.by_mastery.mastered,
      learning: knowledgeStats.by_mastery.learning + knowledgeStats.by_mastery.familiar,
    };
  }, [knowledgeStore.items, reviewQueue, weakItems, knowledgeStats]);

  // ─── Build review cards based on mode ─────────────────────────────────

  const startReview = useCallback(() => {
    let flashcards: FlashcardItem[] = [];

    if (!hasKnowledgeData) {
      // Use starter cards for new users
      flashcards = [...STARTER_CARDS];
    } else if (reviewMode === 'srs') {
      // SRS due items — the core review mode
      let queueItems = reviewQueue.items;
      if (filter !== 'all') queueItems = queueItems.filter(i => i.item_type === filter);
      if (hskFilter !== 'all') queueItems = queueItems.filter(i => i.level === hskFilter);
      flashcards = queueItems.map(knowledgeToFlashcard);

      // If no SRS items due, fall back to all items sorted by priority
      if (flashcards.length === 0) {
        let allItems = Object.values(knowledgeStore.items).filter(i => i.times_seen > 0);
        if (filter !== 'all') allItems = allItems.filter(i => i.item_type === filter);
        if (hskFilter !== 'all') allItems = allItems.filter(i => i.level === hskFilter);
        allItems.sort((a, b) => {
          // Prioritize lower mastery and older last_seen
          const masteryOrder = { unknown: 0, seen: 1, learning: 2, familiar: 3, mastered: 4 };
          return (masteryOrder[a.mastery] - masteryOrder[b.mastery]) ||
            ((a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? ''));
        });
        flashcards = allItems.slice(0, 20).map(knowledgeToFlashcard);
      }
    } else if (reviewMode === 'weak') {
      // Weakest items — lowest accuracy
      let items = [...weakItems];
      if (filter !== 'all') items = items.filter(i => i.item_type === filter);
      if (hskFilter !== 'all') items = items.filter(i => i.level === hskFilter);
      flashcards = items.map(knowledgeToFlashcard);
    } else if (reviewMode === 'all' || reviewMode === 'hsk') {
      // All known items (or filtered by HSK)
      let items = Object.values(knowledgeStore.items).filter(i => i.times_seen > 0);
      if (filter !== 'all') items = items.filter(i => i.item_type === filter);
      if (hskFilter !== 'all') items = items.filter(i => i.level === hskFilter);
      // Shuffle
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      flashcards = items.slice(0, 20).map(knowledgeToFlashcard);
    }

    // Shuffle final cards
    for (let i = flashcards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
    }

    setCards(flashcards.slice(0, 20));
    setCurrentIndex(0);
    setFlipped(false);
    setResults([]);
    setStartTime(Date.now());
    setCardStartTime(Date.now());
    setPhase('reviewing');
    setReviewStats(null);
  }, [filter, hskFilter, reviewMode, hasKnowledgeData, reviewQueue, weakItems, knowledgeStore.items]);

  // ─── Answer handler (records in both gamification AND knowledge map) ──

  const handleAnswer = useCallback((correct: boolean) => {
    const card = cards[currentIndex];
    const cardTime = Math.round((Date.now() - cardStartTime) / 1000);
    const newResults = [...results, { card, correct, timeSpent: cardTime }];
    setResults(newResults);

    // ── Record in Knowledge Map (SRS update) ──
    if (!card.id.startsWith('starter-')) {
      recordFlashcardReview(
        card.id,
        card.type,
        card.level,
        card.front,
        card.front_sub ?? '',
        card.back,
        correct,
        cardTime,
        card.audio_url,
      );
    } else {
      // For starter cards, register them in the knowledge map
      knowledgeStore.recordAttempt({
        item_id: card.id,
        item_type: card.type,
        level: card.level,
        display: card.front,
        pinyin: card.front_sub ?? '',
        meaning: card.back,
        audio_url: card.audio_url,
        is_correct: correct,
        time_spent_seconds: cardTime,
      });
    }

    if (currentIndex + 1 >= cards.length) {
      // Session complete
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const correctCount = newResults.filter(r => r.correct).length;

      // Record in gamification store
      const attempts = newResults.map(r => ({
        exercise_id: `srs-${r.card.id}`,
        is_correct: r.correct,
        score: r.correct ? 1 : 0,
        max_score: 1,
        time_spent_seconds: r.timeSpent,
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
      setCardStartTime(Date.now());
    }
  }, [cards, currentIndex, results, startTime, cardStartTime, finishSessionLocal, knowledgeStore]);

  // ═══ IDLE PHASE ═══
  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-teal-500" />
            Reviews
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            Spaced repetition — strengthen your memory with smart flashcards
          </p>
        </header>

        {/* SRS Alert: Items due */}
        {hasDueItems && (
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                {reviewQueue.due_today_count} carte{reviewQueue.due_today_count > 1 ? 's' : ''} to review now
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                The SM-2 algorithm has calculated the optimal time for each card.
                {reviewQueue.upcoming_count > 0 && ` +${reviewQueue.upcoming_count} coming in the next 24h.`}
              </p>
            </div>
            <Button
              variant="teal" size="sm"
              onClick={() => { setReviewMode('srs'); startReview(); }}
              className="shrink-0"
            >
              <Brain className="h-4 w-4 mr-1" />
              Review
            </Button>
          </div>
        )}

        {/* Knowledge Map Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center">
            <CardContent className="py-3">
              <Layers className="h-4 w-4 text-teal-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-navy-900">{kmCounts.total || STARTER_CARDS.length}</p>
              <p className="text-[10px] text-navy-400">Known words</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-3">
              <Clock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-600">{kmCounts.due}</p>
              <p className="text-[10px] text-navy-400">To review</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-3">
              <Target className="h-4 w-4 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-500">{kmCounts.weak}</p>
              <p className="text-[10px] text-navy-400">Weak points</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-3">
              <Star className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-emerald-600">{kmCounts.mastered}</p>
              <p className="text-[10px] text-navy-400">Mastered</p>
            </CardContent>
          </Card>
        </div>

        {/* Mastery breakdown bar */}
        {hasKnowledgeData && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-navy-400">
              <span>Vocabulary progress</span>
              <span>{kmCounts.mastered} mastered / {kmCounts.total} total</span>
            </div>
            <div className="h-3 bg-cream-100 rounded-full overflow-hidden flex">
              {knowledgeStats.by_mastery.mastered > 0 && (
                <div className="h-full bg-emerald-400" style={{ width: `${(knowledgeStats.by_mastery.mastered / kmCounts.total) * 100}%` }} title={`Mastered: ${knowledgeStats.by_mastery.mastered}`} />
              )}
              {knowledgeStats.by_mastery.familiar > 0 && (
                <div className="h-full bg-teal-300" style={{ width: `${(knowledgeStats.by_mastery.familiar / kmCounts.total) * 100}%` }} title={`Familiar: ${knowledgeStats.by_mastery.familiar}`} />
              )}
              {knowledgeStats.by_mastery.learning > 0 && (
                <div className="h-full bg-amber-300" style={{ width: `${(knowledgeStats.by_mastery.learning / kmCounts.total) * 100}%` }} title={`Learning: ${knowledgeStats.by_mastery.learning}`} />
              )}
              {(knowledgeStats.by_mastery.seen + knowledgeStats.by_mastery.unknown) > 0 && (
                <div className="h-full bg-cream-200" style={{ width: `${((knowledgeStats.by_mastery.seen + knowledgeStats.by_mastery.unknown) / kmCounts.total) * 100}%` }} title={`Seen/Inconnu: ${knowledgeStats.by_mastery.seen + knowledgeStats.by_mastery.unknown}`} />
              )}
            </div>
            <div className="flex items-center gap-3 text-[9px] text-navy-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Mastered</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-300" /> Familiar</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-300" /> Learning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cream-200" /> New</span>
            </div>
          </div>
        )}

        {/* Review Mode Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Review mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <ReviewModeButton
                active={reviewMode === 'srs'}
                onClick={() => setReviewMode('srs')}
                icon={Brain}
                title="Smart SRS"
                subtitle={hasDueItems ? `${reviewQueue.due_today_count} cards due` : 'No cards due'}
                color="teal"
                badge={hasDueItems ? reviewQueue.due_today_count : undefined}
              />
              <ReviewModeButton
                active={reviewMode === 'weak'}
                onClick={() => setReviewMode('weak')}
                icon={Target}
                title="Weak points"
                subtitle={`${kmCounts.weak} words in difficulty`}
                color="red"
                badge={kmCounts.weak > 0 ? kmCounts.weak : undefined}
              />
              <ReviewModeButton
                active={reviewMode === 'all'}
                onClick={() => setReviewMode('all')}
                icon={Layers}
                title="Review all"
                subtitle={`${kmCounts.total || STARTER_CARDS.length} cards`}
                color="blue"
              />
              <ReviewModeButton
                active={reviewMode === 'hsk'}
                onClick={() => setReviewMode('hsk')}
                icon={BookOpen}
                title="By HSK level"
                subtitle="Filter by level"
                color="purple"
              />
            </div>

            {/* Type filter */}
            <div>
              <p className="text-xs text-navy-400 mb-2">Content type</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All', count: kmCounts.total || STARTER_CARDS.length },
                  { value: 'vocabulary', label: 'Vocabulary', count: kmCounts.vocab },
                  { value: 'character', label: 'Characters', count: kmCounts.chars },
                  { value: 'grammar', label: 'Grammar', count: kmCounts.grammar },
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

            {/* HSK filter */}
            {(reviewMode === 'hsk' || knownHskLevels.length > 1) && (
              <div>
                <p className="text-xs text-navy-400 mb-2">HSK Level</p>
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
                    All
                  </button>
                  {(hasKnowledgeData ? knownHskLevels : ['1', '2', '3', '4']).map(lvl => (
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
                      {hasKnowledgeData && knowledgeStats.by_hsk[lvl] && (
                        <span className="ml-1 text-navy-400">({knowledgeStats.by_hsk[lvl].total})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={startReview} variant="teal" size="lg" className="w-full">
              <Sparkles className="h-5 w-5" />
              Start review
            </Button>
          </CardContent>
        </Card>

        {/* Urgent review preview — show actual words to review */}
        {hasDueItems && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Preview of words to review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reviewQueue.items.slice(0, 9).map(item => (
                  <div
                    key={item.item_id}
                    className={cn(
                      'p-2.5 rounded-xl border text-center',
                      item.mastery === 'learning' ? 'bg-amber-50 border-amber-200' :
                      item.mastery === 'seen' ? 'bg-red-50 border-red-200' :
                      'bg-cream-25 border-cream-200'
                    )}
                  >
                    <p className="text-lg font-chinese font-medium text-navy-900">{item.display}</p>
                    <p className="text-[10px] text-teal-600 font-mono">{item.pinyin}</p>
                    <p className="text-[10px] text-navy-400 truncate">{item.meaning}</p>
                  </div>
                ))}
              </div>
              {reviewQueue.due_today_count > 9 && (
                <p className="text-[10px] text-navy-400 text-center mt-2">
                  +{reviewQueue.due_today_count - 9} autres cards to review
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              How does it work?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-navy-600">
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">1</span>
                <p>Each word you learn is tracked by the SM-2 algorithm that calculates the ideal time to review.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">2</span>
                <p>Les cards due sont priorisees : les mots que vous oubliez le plus vite apparaissent en premier.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">3</span>
                <p>Each answer adjusts the interval: correct = interval x2, incorrect = back to 1 day.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">4</span>
                <p>Gagnez <strong>{XP_CONFIG.srs_review_correct} XP</strong> per correct answer and <strong>{XP_CONFIG.srs_review_incorrect} XP</strong> for participation!</p>
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

        {/* Card type badge + mastery indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium',
              card.type === 'vocabulary' ? 'bg-teal-100 text-teal-700' :
              card.type === 'character' ? 'bg-purple-100 text-purple-700' :
              'bg-amber-100 text-amber-700'
            )}>
              {card.type === 'vocabulary' ? 'Vocabulary' : card.type === 'character' ? 'Character' : 'Grammar'}
            </span>
            {card.mastery && card.mastery !== 'unknown' && (
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                card.mastery === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
                card.mastery === 'familiar' ? 'bg-teal-100 text-teal-700' :
                card.mastery === 'learning' ? 'bg-amber-100 text-amber-700' :
                'bg-cream-100 text-navy-500'
              )}>
                {card.mastery === 'mastered' ? 'Mastered' :
                 card.mastery === 'familiar' ? 'Familiar' :
                 card.mastery === 'learning' ? 'Learning' : 'Seen'}
              </span>
            )}
            {card.is_overdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                Overdue
              </span>
            )}
          </div>
          <span className="text-xs text-navy-400">HSK {card.level}</span>
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
              <span className="text-xs text-navy-300 mt-4">Click to flip</span>
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

        {/* Answer buttons */}
        {flipped && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAnswer(false)}
              variant="ghost" size="lg"
              className="border-2 border-red-200 text-red-500 hover:bg-red-50"
            >
              <XCircle className="h-5 w-5" />
              I didn't know
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
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
              {percentage >= 80 ? 'Excellent!' : percentage >= 50 ? 'Good job!' : 'Keep it up!'}
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
                <p className="text-[10px] text-emerald-600/70">Correct</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-lg font-bold text-red-500">{reviewStats.incorrect}</p>
                <p className="text-[10px] text-red-500/70">To review</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3">
                <p className="text-lg font-bold text-navy-900">{formatTime(reviewStats.time_seconds)}</p>
                <p className="text-[10px] text-navy-400">Time</p>
              </div>
            </div>

            {/* Items that need more work */}
            {results.filter(r => !r.correct).length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                  To review en priorite
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
                <p className="text-[10px] text-red-500 mt-2 italic">
                  These words will return in your next SRS session
                </p>
              </div>
            )}

            {/* SRS feedback */}
            <div className="bg-teal-50 rounded-xl p-3 border border-teal-200">
              <p className="text-xs text-teal-700">
                <Brain className="h-3.5 w-3.5 inline mr-1" />
                The SM-2 algorithm has updated the review intervals for each card.
                Correct words will be reviewed later, incorrect ones will be reviewed tomorrow.
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={startReview} variant="teal" size="lg" className="flex-1">
                <RotateCcw className="h-4 w-4" />
                Continue
              </Button>
              <Button onClick={() => setPhase('idle')} variant="ghost" size="lg" className="flex-1 border border-cream-200">
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// ─── Review Mode Button ─────────────────────────────────────────────────

function ReviewModeButton({ active, onClick, icon: Icon, title, subtitle, color, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: 'teal' | 'red' | 'blue' | 'purple';
  badge?: number;
}) {
  const colorMap = {
    teal: { border: 'border-teal-400', bg: 'bg-teal-50', text: 'text-teal-700', iconBg: 'bg-teal-100' },
    red: { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
    blue: { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    purple: { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  };
  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left',
        active ? `${c.border} ${c.bg} shadow-sm` : 'border-cream-200 hover:border-cream-300 bg-white'
      )}
    >
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', active ? c.iconBg : 'bg-cream-100')}>
        <Icon className={cn('h-4 w-4', active ? c.text : 'text-navy-500')} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold', active ? c.text : 'text-navy-700')}>{title}</p>
        <p className="text-[10px] text-navy-400 truncate">{subtitle}</p>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold text-white',
          color === 'red' ? 'bg-red-500' : 'bg-amber-500'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}
