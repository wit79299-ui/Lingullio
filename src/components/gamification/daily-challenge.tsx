'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore } from '@/stores/gamification-store';
import { useUserKnowledgeStore, type KnowledgeItem } from '@/stores/user-knowledge-store';
import { recordFlashcardReview } from '@/lib/gamification/knowledge-tracker';
import { XP_CONFIG } from '@/lib/gamification/xp-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target, Zap, CheckCircle2, XCircle, ChevronRight,
  Star, Brain,
} from 'lucide-react';

// ─── Challenge Types ─────────────────────────────────────────────────────

interface ChallengeQuestion {
  id: string;
  type: 'translate_to_chinese' | 'translate_to_french' | 'pinyin_match' | 'character_meaning' | 'fill_blank';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
  hskLevel: number;
  // Knowledge Map link (set when generated from KM)
  km_item_id?: string;
  km_item_type?: 'vocabulary' | 'character' | 'grammar';
}

type ChallengePhase = 'preview' | 'active' | 'answered' | 'completed';

// ─── Challenge Question Bank (fallback for empty Knowledge Map) ──────────

const CHALLENGE_BANK: ChallengeQuestion[] = [
  { id: 'dc-1', type: 'translate_to_french', prompt: '\u4f60\u597d', options: ['Bonjour', 'Au revoir', 'Merci', 'Excusez-moi'], correctIndex: 0, explanation: '\u4f60\u597d (n\u01d0 h\u01ceo) est la salutation la plus courante en chinois.', difficulty: 1, hskLevel: 1 },
  { id: 'dc-2', type: 'pinyin_match', prompt: 'Quel est le pinyin de \u8c22\u8c22 ?', options: ['xi\u00e8 xie', 'x\u01d0 huan', 'xi\u01ceo x\u012bn', 'xu\u00e9 x\u00ed'], correctIndex: 0, explanation: '\u8c22\u8c22 (xi\u00e8 xie) signifie "merci".', difficulty: 1, hskLevel: 1 },
  { id: 'dc-3', type: 'character_meaning', prompt: 'Que signifie le caractere \u5927 ?', options: ['Grand', 'Petit', 'Moyen', 'Haut'], correctIndex: 0, explanation: '\u5927 (d\u00e0) signifie "grand". Son oppose est \u5c0f (xi\u01ceo) "petit".', difficulty: 1, hskLevel: 1 },
  { id: 'dc-4', type: 'translate_to_chinese', prompt: 'Comment dit-on "je" en chinois ?', options: ['\u6211', '\u4f60', '\u4ed6', '\u5979'], correctIndex: 0, explanation: '\u6211 (w\u01d2) = je/moi. \u4f60 (n\u01d0) = tu. \u4ed6/\u5979 (t\u0101) = il/elle.', difficulty: 1, hskLevel: 1 },
  { id: 'dc-5', type: 'fill_blank', prompt: '\u6211___\u5b66\u751f\u3002 (Je suis etudiant)', options: ['\u662f', '\u6709', '\u5728', '\u8981'], correctIndex: 0, explanation: '\u662f (sh\u00ec) = etre. Structure : Sujet + \u662f + Nom', difficulty: 1, hskLevel: 1 },
  { id: 'dc-6', type: 'translate_to_french', prompt: '\u6211\u559c\u6b22\u5403\u4e2d\u56fd\u83dc', options: ['J\'aime manger la cuisine chinoise', 'Je veux acheter des vetements', 'J\'etudie le chinois', 'Je vais en Chine'], correctIndex: 0, explanation: '\u559c\u6b22 (x\u01d0 huan) = aimer. \u5403 (ch\u012b) = manger. \u4e2d\u56fd\u83dc (zh\u014dng gu\u00f3 c\u00e0i) = cuisine chinoise.', difficulty: 2, hskLevel: 1 },
  { id: 'dc-7', type: 'pinyin_match', prompt: 'Comment prononcer \u5b66\u6821 (ecole) ?', options: ['xu\u00e9 xi\u00e0o', 'xu\u00e9 sh\u0113ng', 'xi\u01ceo xu\u00e9', 'x\u01d0 huan'], correctIndex: 0, explanation: '\u5b66\u6821 (xu\u00e9 xi\u00e0o) = ecole.', difficulty: 2, hskLevel: 1 },
  { id: 'dc-8', type: 'fill_blank', prompt: '\u4ed6___\u5728\u770b\u4e66\u3002 (Il est en train de lire)', options: ['\u6b63', '\u5df2\u7ecf', '\u8fd8', '\u5c31'], correctIndex: 0, explanation: '\u6b63\u5728 (zh\u00e8ng z\u00e0i) indique une action en cours.', difficulty: 2, hskLevel: 2 },
  { id: 'dc-9', type: 'translate_to_french', prompt: '\u867d\u7136\u5f88\u7d2f\uff0c\u4f46\u662f\u5f88\u5f00\u5fc3', options: ['Bien que fatigue, je suis content', 'Parce que je suis fatigue, je dors', 'Si je suis fatigue, je me repose', 'Quand je suis fatigue, je suis triste'], correctIndex: 0, explanation: '\u867d\u7136...\u4f46\u662f... (su\u012b r\u00e1n...d\u00e0n sh\u00ec...) = bien que...mais...', difficulty: 2, hskLevel: 2 },
  { id: 'dc-10', type: 'character_meaning', prompt: 'Que signifie \u5feb ?', options: ['Rapide', 'Lent', 'Facile', 'Difficile'], correctIndex: 0, explanation: '\u5feb (ku\u00e0i) = rapide. Son oppose est \u6162 (m\u00e0n) = lent.', difficulty: 1, hskLevel: 2 },
  { id: 'dc-11', type: 'fill_blank', prompt: '\u4f60___\u53bb\u8fc7\u4e2d\u56fd\u5417\uff1f (Es-tu deja alle en Chine ?)', options: ['\u6709\u6ca1\u6709', '\u662f\u4e0d\u662f', '\u4f1a\u4e0d\u4f1a', '\u8981\u4e0d\u8981'], correctIndex: 0, explanation: '\u6709\u6ca1\u6709 + V + \u8fc7 = forme interrogative pour "avoir deja fait".', difficulty: 3, hskLevel: 3 },
  { id: 'dc-12', type: 'translate_to_french', prompt: '\u4ed6\u628a\u4e66\u653e\u5728\u684c\u5b50\u4e0a\u4e86', options: ['Il a pose le livre sur la table', 'Il a pris le livre de la table', 'Il lit un livre a table', 'Le livre est sous la table'], correctIndex: 0, explanation: '\u628a (b\u01ce) : structure ba. \u653e = poser, \u684c\u5b50 = table.', difficulty: 3, hskLevel: 3 },
  { id: 'dc-13', type: 'translate_to_french', prompt: '\u8fd9\u4ef6\u4e8b\u503c\u5f97\u6211\u4eec\u8ba4\u771f\u8003\u8651', options: ['Cette affaire merite qu\'on y reflechisse serieusement', 'Cette affaire n\'est pas importante', 'On a deja reflechi a cette affaire', 'Cette affaire est trop compliquee'], correctIndex: 0, explanation: '\u503c\u5f97 (zh\u00ed de) = meriter. \u8ba4\u771f (r\u00e8n zh\u0113n) = serieux. \u8003\u8651 (k\u01ceo l\u01dc) = reflechir.', difficulty: 3, hskLevel: 4 },
  { id: 'dc-14', type: 'character_meaning', prompt: 'Que signifie \u5f71\u54cd ?', options: ['Influence', 'Image', 'Ombre', 'Emotion'], correctIndex: 0, explanation: '\u5f71\u54cd (y\u01d0ng xi\u01ceng) = influence/impact.', difficulty: 3, hskLevel: 4 },
  { id: 'dc-15', type: 'fill_blank', prompt: '___\u4f60\u4e0d\u6765\uff0c\u6211\u5c31\u4e00\u4e2a\u4eba\u53bb\u3002 (Si tu ne viens pas, j\'irai seul)', options: ['\u8981\u662f', '\u867d\u7136', '\u56e0\u4e3a', '\u800c\u4e14'], correctIndex: 0, explanation: '\u8981\u662f (y\u00e0o sh\u00ec) = si (conditionnel). Structure : \u8981\u662f A\uff0c\u5c31 B.', difficulty: 2, hskLevel: 3 },
];

// ─── Generate questions from Knowledge Map ──────────────────────────────
// Builds adaptive questions from items the user has seen or needs to review.

function generateKMQuestion(item: KnowledgeItem, type: ChallengeQuestion['type'], allItems: KnowledgeItem[]): ChallengeQuestion | null {
  // Get 3 distractors from same type + hsk level (or any if not enough)
  const peers = allItems
    .filter(p => p.item_id !== item.item_id && p.item_type === item.item_type)
    .sort(() => Math.random() - 0.5);

  if (type === 'translate_to_french') {
    const distractors = peers.slice(0, 3).map(p => p.meaning);
    if (distractors.length < 3) return null;
    const correctIdx = Math.floor(Math.random() * 4);
    const options = [...distractors];
    options.splice(correctIdx, 0, item.meaning);
    return {
      id: `km-${item.item_id}-fr`,
      type: 'translate_to_french',
      prompt: item.display,
      options: options.slice(0, 4),
      correctIndex: correctIdx,
      explanation: `${item.display} (${item.pinyin}) = ${item.meaning}`,
      difficulty: (item.mastery === 'mastered' ? 1 : item.mastery === 'familiar' ? 2 : 3) as 1 | 2 | 3,
      hskLevel: parseInt(item.level) || 1,
      km_item_id: item.item_id,
      km_item_type: item.item_type,
    };
  }

  if (type === 'pinyin_match') {
    const distractors = peers.filter(p => p.pinyin).slice(0, 3).map(p => p.pinyin);
    if (distractors.length < 3) return null;
    const correctIdx = Math.floor(Math.random() * 4);
    const options = [...distractors];
    options.splice(correctIdx, 0, item.pinyin);
    return {
      id: `km-${item.item_id}-py`,
      type: 'pinyin_match',
      prompt: `Quel est le pinyin de ${item.display} ?`,
      options: options.slice(0, 4),
      correctIndex: correctIdx,
      explanation: `${item.display} (${item.pinyin}) = ${item.meaning}`,
      difficulty: (item.mastery === 'mastered' ? 1 : item.mastery === 'familiar' ? 2 : 3) as 1 | 2 | 3,
      hskLevel: parseInt(item.level) || 1,
      km_item_id: item.item_id,
      km_item_type: item.item_type,
    };
  }

  if (type === 'character_meaning') {
    const distractors = peers.slice(0, 3).map(p => p.meaning);
    if (distractors.length < 3) return null;
    const correctIdx = Math.floor(Math.random() * 4);
    const options = [...distractors];
    options.splice(correctIdx, 0, item.meaning);
    return {
      id: `km-${item.item_id}-cm`,
      type: 'character_meaning',
      prompt: `Que signifie ${item.display} ?`,
      options: options.slice(0, 4),
      correctIndex: correctIdx,
      explanation: `${item.display} (${item.pinyin}) = ${item.meaning}`,
      difficulty: (item.mastery === 'mastered' ? 1 : item.mastery === 'familiar' ? 2 : 3) as 1 | 2 | 3,
      hskLevel: parseInt(item.level) || 1,
      km_item_id: item.item_id,
      km_item_type: item.item_type,
    };
  }

  return null;
}

function getDailyChallengeQuestions(count: number = 3): ChallengeQuestion[] {
  const store = useUserKnowledgeStore.getState();
  const allItems = Object.values(store.items);

  // Need at least 8 items in KM to generate varied questions with distractors
  if (allItems.length >= 8) {
    // Priority: items due for review > weak items > random known items
    const reviewQueue = store.getReviewQueue({ limit: 10 });
    const weakItems = store.getWeakestItems(10);

    // Collect candidate items (deduplicated)
    const seen = new Set<string>();
    const candidates: KnowledgeItem[] = [];
    for (const item of [...reviewQueue.items, ...weakItems, ...allItems.sort(() => Math.random() - 0.5)]) {
      if (!seen.has(item.item_id) && item.pinyin && item.meaning) {
        seen.add(item.item_id);
        candidates.push(item);
      }
      if (candidates.length >= count * 2) break;
    }

    const questionTypes: ChallengeQuestion['type'][] = ['translate_to_french', 'pinyin_match', 'character_meaning'];
    const questions: ChallengeQuestion[] = [];

    for (let i = 0; i < candidates.length && questions.length < count; i++) {
      const item = candidates[i];
      const qType = questionTypes[i % questionTypes.length];
      const q = generateKMQuestion(item, qType, allItems);
      if (q) questions.push(q);
    }

    if (questions.length >= count) return questions.slice(0, count);
  }

  // Fallback to hardcoded bank
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffled = [...CHALLENGE_BANK];
  let currentSeed = seed;
  const pseudoRandom = () => {
    currentSeed = (currentSeed * 16807) % 2147483647;
    return (currentSeed - 1) / 2147483646;
  };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// ─── Main Daily Challenge Component ──────────────────────────────────────

export function DailyChallenge({ className }: { className?: string }) {
  const finishSessionLocal = useGamificationStore(s => s.finishSessionLocal);
  const dailyChallengeCompleted = useGamificationStore(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.sessions_history.some(h => h.date === today && h.exercises_done > 0);
  });

  // Trigger reactivity when KM changes
  const knowledgeLastUpdated = useUserKnowledgeStore(s => s.last_updated);
  const questions = useMemo(() => getDailyChallengeQuestions(3), [knowledgeLastUpdated]);

  const isAdaptive = questions.some(q => q.km_item_id);

  const [phase, setPhase] = useState<ChallengePhase>(dailyChallengeCompleted ? 'completed' : 'preview');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ isCorrect: boolean; questionId: string }>>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const startTime = useRef(Date.now());

  const currentQ = questions[currentIdx];

  const handleStart = () => {
    setPhase('active');
    startTime.current = Date.now();
  };

  const handleSelect = (idx: number) => {
    if (phase !== 'active') return;
    setSelectedIdx(idx);
  };

  const handleConfirm = useCallback(() => {
    if (selectedIdx === null || !currentQ) return;
    const isCorrect = selectedIdx === currentQ.correctIndex;
    const newAnswers = [...answers, { isCorrect, questionId: currentQ.id }];
    setAnswers(newAnswers);
    setPhase('answered');
  }, [selectedIdx, currentQ, answers]);

  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedIdx(null);
      setPhase('active');
    } else {
      // Challenge complete — process gamification
      const totalTime = Math.round((Date.now() - startTime.current) / 1000);
      const allAnswers = [...answers];
      const lastIsCorrect = selectedIdx === currentQ?.correctIndex;
      allAnswers.push({ isCorrect: lastIsCorrect, questionId: currentQ?.id ?? '' });

      const attemptPayloads = allAnswers.map((a, i) => ({
        exercise_id: questions[i]?.id ?? `challenge-${i}`,
        is_correct: a.isCorrect,
        score: a.isCorrect ? 10 : 0,
        max_score: 10,
        time_spent_seconds: Math.round(totalTime / questions.length),
        user_answer: null as unknown,
        exercise_type: 'daily_challenge',
        skill_tags: ['daily_challenge'] as string[],
      }));

      const summary = finishSessionLocal(attemptPayloads, totalTime);
      setXpEarned(summary.xp_earned);

      // ── Record each answer in the Knowledge Map ──
      allAnswers.forEach((a, i) => {
        const q = questions[i];
        if (!q) return;
        if (q.km_item_id && q.km_item_type) {
          // Question was from Knowledge Map — record via flashcard review
          const kmStore = useUserKnowledgeStore.getState();
          const item = kmStore.items[q.km_item_id];
          if (item) {
            recordFlashcardReview(
              item.item_id, item.item_type, item.level,
              item.display, item.pinyin, item.meaning,
              a.isCorrect, Math.round(totalTime / questions.length),
              item.audio_url,
            );
          }
        } else {
          // Fallback question — still record as synthetic vocab items
          recordFlashcardReview(
            `dc-synth-${q.id}`, 'vocabulary', String(q.hskLevel),
            q.prompt, '', q.explanation,
            a.isCorrect, Math.round(totalTime / questions.length),
          );
        }
      });

      setPhase('completed');
    }
  }, [currentIdx, questions, answers, selectedIdx, currentQ, finishSessionLocal]);

  const correctCount = answers.filter(a => a.isCorrect).length +
    (phase === 'completed' && selectedIdx === currentQ?.correctIndex ? 1 : 0);

  // ── Preview Phase ──
  if (phase === 'preview') {
    return (
      <Card className={cn('!py-0 overflow-hidden', className)}>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Defi du jour</h3>
              <p className="text-[11px] text-white/80">
                {questions.length} questions rapides
                {isAdaptive && <span className="ml-1 opacity-80">· adapte a ton niveau</span>}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-bold">+{XP_CONFIG.daily_goal_complete} XP</p>
              <p className="text-[10px] text-white/60">bonus possible</p>
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          {isAdaptive && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-100 mb-3">
              <Brain className="h-4 w-4 text-teal-600 shrink-0" />
              <p className="text-[11px] text-teal-700">Questions generees depuis ta Memoire Vivante</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-cream-25 rounded-xl p-2.5 border border-cream-100">
                <p className="text-lg">{['\ud83c\udfaf', '\ud83e\udde0', '\u2b50'][i]}</p>
                <p className="text-[10px] text-navy-400 mt-1">
                  HSK{q.hskLevel} · {['\u2605', '\u2605\u2605', '\u2605\u2605\u2605'][q.difficulty - 1]}
                </p>
              </div>
            ))}
          </div>
          <Button onClick={handleStart} variant="teal" size="lg" className="w-full">
            <Zap className="h-4 w-4" />
            Relever le defi
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Completed Phase ──
  if (phase === 'completed' && answers.length >= questions.length) {
    const totalQ = questions.length;
    const pct = Math.round((correctCount / totalQ) * 100);
    const isPerfect = correctCount === totalQ;

    return (
      <Card className={cn('!py-0 overflow-hidden', className)}>
        <div className={cn(
          'px-5 py-6 text-center text-white',
          isPerfect
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : pct >= 60
              ? 'bg-gradient-to-br from-amber-500 to-orange-500'
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
        )}>
          <div className="text-4xl mb-2">{isPerfect ? '\ud83c\udf89' : pct >= 60 ? '\ud83d\udc4f' : '\ud83d\udcaa'}</div>
          <p className="text-2xl font-black">{correctCount}/{totalQ}</p>
          <p className="text-sm font-semibold mt-1">
            {isPerfect ? 'Defi parfait !' : pct >= 60 ? 'Bien joue !' : 'Continuez a vous entrainer !'}
          </p>
          {xpEarned > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
              <Zap className="h-3.5 w-3.5" />
              +{xpEarned} XP
            </div>
          )}
        </div>
        <CardContent className="p-4 text-center">
          <p className="text-xs text-navy-400">
            {isPerfect
              ? 'Revenez demain pour un nouveau defi !'
              : 'Continuez vos revisions pour vous ameliorer.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Already completed today ──
  if (phase === 'completed') {
    return (
      <Card className={cn('!py-0 overflow-hidden', className)}>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Defi du jour termine !</h3>
              <p className="text-[11px] text-white/80">Revenez demain pour un nouveau defi</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── Active / Answered Phase ──
  if (!currentQ) return null;

  const isAnswered = phase === 'answered';
  const isCorrectAnswer = isAnswered && selectedIdx === currentQ.correctIndex;

  const typeLabels: Record<string, string> = {
    translate_to_chinese: '\ud83c\udde8\ud83c\uddf3 Traduire en chinois',
    translate_to_french: '\ud83c\uddeb\ud83c\uddf7 Traduire en francais',
    pinyin_match: '\ud83d\udcd6 Pinyin',
    character_meaning: '\u270d\ufe0f Caractere',
    fill_blank: '\ud83d\udcdd Completez',
  };

  return (
    <Card className={cn('!py-0 overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-xs font-bold">Defi du jour</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/70">HSK{currentQ.hskLevel}</span>
            <span className="text-xs font-bold">{currentIdx + 1}/{questions.length}</span>
          </div>
        </div>
        <div className="flex gap-1 mt-2">
          {questions.map((_, i) => (
            <div key={i} className={cn(
              'flex-1 h-1 rounded-full transition-all',
              i < currentIdx ? 'bg-white' :
              i === currentIdx ? 'bg-white/60' : 'bg-white/20'
            )} />
          ))}
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-cream-50 text-xs text-navy-600 font-medium border border-cream-200">
          {typeLabels[currentQ.type] ?? currentQ.type}
        </span>

        <p className="text-lg font-medium text-navy-900 leading-relaxed">
          {currentQ.prompt}
        </p>

        <div className="space-y-2">
          {currentQ.options.map((opt, i) => {
            let optClass = 'border-cream-200 bg-white hover:border-teal-300 hover:bg-teal-50/30 cursor-pointer';
            if (selectedIdx === i && !isAnswered) {
              optClass = 'border-teal-500 bg-teal-50 ring-1 ring-teal-200 shadow-sm cursor-pointer';
            }
            if (isAnswered && i === currentQ.correctIndex) {
              optClass = 'border-emerald-400 bg-emerald-50';
            }
            if (isAnswered && selectedIdx === i && i !== currentQ.correctIndex) {
              optClass = 'border-red-400 bg-red-50';
            }
            return (
              <button key={i} type="button" onClick={() => handleSelect(i)} disabled={isAnswered}
                className={cn('w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm flex items-center gap-3', isAnswered ? 'cursor-default' : '', optClass)}>
                <span className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
                  isAnswered && i === currentQ.correctIndex ? 'bg-emerald-500 text-white'
                    : isAnswered && selectedIdx === i ? 'bg-red-500 text-white'
                    : selectedIdx === i ? 'bg-teal-500 text-white' : 'bg-cream-100 text-navy-500'
                )}>
                  {isAnswered ? (
                    i === currentQ.correctIndex ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : selectedIdx === i ? <XCircle className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)
                  ) : String.fromCharCode(65 + i)}
                </span>
                <span className={cn(
                  isAnswered && i === currentQ.correctIndex ? 'text-emerald-800 font-medium' :
                  isAnswered && selectedIdx === i ? 'text-red-800' : 'text-navy-700'
                )}>{opt}</span>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={cn('rounded-xl p-3.5 border', isCorrectAnswer ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200')}>
            <p className={cn('text-xs font-semibold mb-1', isCorrectAnswer ? 'text-emerald-700' : 'text-sky-700')}>
              {isCorrectAnswer ? 'Correct !' : 'Explication'}
            </p>
            <p className="text-sm text-navy-700 leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}

        {!isAnswered ? (
          <Button onClick={handleConfirm} variant="teal" size="lg" className="w-full" disabled={selectedIdx === null}>
            Valider
          </Button>
        ) : (
          <Button onClick={handleNext} variant="teal" size="lg" className="w-full">
            {currentIdx < questions.length - 1 ? (
              <>Suivant <ChevronRight className="h-4 w-4" /></>
            ) : (
              <>Voir les resultats <Star className="h-4 w-4" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Mini Daily Challenge Widget (for dashboard) ─────────────────────────

export function DailyChallengeWidget({ className }: { className?: string }) {
  const dailyExercises = useGamificationStore(s => s.daily_exercises);
  const streakDays = useGamificationStore(s => s.streak_days);
  const hasActivity = dailyExercises > 0;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
      hasActivity
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:shadow-md cursor-pointer'
    )}>
      <div className={cn(
        'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
        hasActivity ? 'bg-emerald-100' : 'bg-white shadow-sm'
      )}>
        {hasActivity ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Target className="h-5 w-5 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900">
          {hasActivity ? 'Defi complete !' : 'Defi du jour'}
        </p>
        <p className="text-[11px] text-navy-400">
          {hasActivity
            ? 'Revenez demain pour un nouveau defi'
            : streakDays > 0
              ? `Maintenez votre serie de ${streakDays}j !`
              : '3 questions rapides pour gagner des XP'
          }
        </p>
      </div>
      {!hasActivity && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0">
          <Zap className="h-3 w-3" />
          +30 XP
        </div>
      )}
    </div>
  );
}
