'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore } from '@/stores/gamification-store';
import { XP_CONFIG } from '@/lib/gamification/xp-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target, Zap, CheckCircle2, XCircle, ChevronRight,
  Flame, Star, Trophy, Sparkles, Volume2, RotateCcw,
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
}

type ChallengePhase = 'preview' | 'active' | 'answered' | 'completed';

// ─── Challenge Question Bank ─────────────────────────────────────────────
// Hardcoded for DEMO mode — in production, these come from the DB

const CHALLENGE_BANK: ChallengeQuestion[] = [
  // HSK1 — Easy
  {
    id: 'dc-1', type: 'translate_to_french',
    prompt: '你好', options: ['Bonjour', 'Au revoir', 'Merci', 'Excusez-moi'],
    correctIndex: 0, explanation: '你好 (nǐ hǎo) est la salutation la plus courante en chinois.',
    difficulty: 1, hskLevel: 1,
  },
  {
    id: 'dc-2', type: 'pinyin_match',
    prompt: 'Quel est le pinyin de 谢谢 ?',
    options: ['xiè xie', 'xǐ huan', 'xiǎo xīn', 'xué xí'],
    correctIndex: 0, explanation: '谢谢 (xiè xie) signifie "merci".',
    difficulty: 1, hskLevel: 1,
  },
  {
    id: 'dc-3', type: 'character_meaning',
    prompt: 'Que signifie le caractere 大 ?',
    options: ['Grand', 'Petit', 'Moyen', 'Haut'],
    correctIndex: 0, explanation: '大 (dà) signifie "grand". Son oppose est 小 (xiǎo) "petit".',
    difficulty: 1, hskLevel: 1,
  },
  {
    id: 'dc-4', type: 'translate_to_chinese',
    prompt: 'Comment dit-on "je" en chinois ?',
    options: ['我', '你', '他', '她'],
    correctIndex: 0, explanation: '我 (wǒ) = je/moi. 你 (nǐ) = tu. 他/她 (tā) = il/elle.',
    difficulty: 1, hskLevel: 1,
  },
  {
    id: 'dc-5', type: 'fill_blank',
    prompt: '我___学生。 (Je suis etudiant)',
    options: ['是', '有', '在', '要'],
    correctIndex: 0, explanation: '是 (shì) = etre. Structure : Sujet + 是 + Nom',
    difficulty: 1, hskLevel: 1,
  },
  // HSK1 — Medium
  {
    id: 'dc-6', type: 'translate_to_french',
    prompt: '我喜欢吃中国菜',
    options: ['J\'aime manger la cuisine chinoise', 'Je veux acheter des vetements', 'J\'etudie le chinois', 'Je vais en Chine'],
    correctIndex: 0, explanation: '喜欢 (xǐ huan) = aimer. 吃 (chī) = manger. 中国菜 (zhōng guó cài) = cuisine chinoise.',
    difficulty: 2, hskLevel: 1,
  },
  {
    id: 'dc-7', type: 'pinyin_match',
    prompt: 'Comment prononcer 学校 (ecole) ?',
    options: ['xué xiào', 'xué shēng', 'xiǎo xué', 'xǐ huan'],
    correctIndex: 0, explanation: '学校 (xué xiào) = ecole. 学 = apprendre, 校 = ecole.',
    difficulty: 2, hskLevel: 1,
  },
  // HSK2
  {
    id: 'dc-8', type: 'fill_blank',
    prompt: '他___在看书。 (Il est en train de lire)',
    options: ['正', '已经', '还', '就'],
    correctIndex: 0, explanation: '正在 (zhèng zài) indique une action en cours, comme le present progressif.',
    difficulty: 2, hskLevel: 2,
  },
  {
    id: 'dc-9', type: 'translate_to_french',
    prompt: '虽然很累，但是很开心',
    options: ['Bien que fatigue, je suis content', 'Parce que je suis fatigue, je dors', 'Si je suis fatigue, je me repose', 'Quand je suis fatigue, je suis triste'],
    correctIndex: 0, explanation: '虽然...但是... (suī rán...dàn shì...) = bien que...mais... Structure concessoire tres courante.',
    difficulty: 2, hskLevel: 2,
  },
  {
    id: 'dc-10', type: 'character_meaning',
    prompt: 'Que signifie 快 ?',
    options: ['Rapide', 'Lent', 'Facile', 'Difficile'],
    correctIndex: 0, explanation: '快 (kuài) = rapide. Son oppose est 慢 (màn) = lent.',
    difficulty: 1, hskLevel: 2,
  },
  // HSK3
  {
    id: 'dc-11', type: 'fill_blank',
    prompt: '你___去过中国吗？ (Es-tu deja alle en Chine ?)',
    options: ['有没有', '是不是', '会不会', '要不要'],
    correctIndex: 0, explanation: '有没有 + V + 过 = la forme interrogative pour demander si on a deja fait quelque chose.',
    difficulty: 3, hskLevel: 3,
  },
  {
    id: 'dc-12', type: 'translate_to_french',
    prompt: '他把书放在桌子上了',
    options: ['Il a pose le livre sur la table', 'Il a pris le livre de la table', 'Il lit un livre a table', 'Le livre est sous la table'],
    correctIndex: 0, explanation: '把 (bǎ) : structure ba, indique qu\'on fait quelque chose avec un objet specifique. 放 = poser, 桌子 = table.',
    difficulty: 3, hskLevel: 3,
  },
  // HSK4
  {
    id: 'dc-13', type: 'translate_to_french',
    prompt: '这件事值得我们认真考虑',
    options: ['Cette affaire merite qu\'on y reflechisse serieusement', 'Cette affaire n\'est pas importante', 'On a deja reflechi a cette affaire', 'Cette affaire est trop compliquee'],
    correctIndex: 0, explanation: '值得 (zhí de) = meriter, valoir la peine. 认真 (rèn zhēn) = serieux. 考虑 (kǎo lǜ) = reflechir.',
    difficulty: 3, hskLevel: 4,
  },
  {
    id: 'dc-14', type: 'character_meaning',
    prompt: 'Que signifie 影响 ?',
    options: ['Influence', 'Image', 'Ombre', 'Emotion'],
    correctIndex: 0, explanation: '影响 (yǐng xiǎng) = influence/impact. Tres utilise dans les contextes formels et academiques.',
    difficulty: 3, hskLevel: 4,
  },
  {
    id: 'dc-15', type: 'fill_blank',
    prompt: '___你不来，我就一个人去。 (Si tu ne viens pas, j\'irai seul)',
    options: ['要是', '虽然', '因为', '而且'],
    correctIndex: 0, explanation: '要是 (yào shì) = si (conditionnel). Structure : 要是 A，就 B.',
    difficulty: 2, hskLevel: 3,
  },
];

// ─── Challenge Generation ────────────────────────────────────────────────

function getDailyChallengeQuestions(count: number = 3): ChallengeQuestion[] {
  // Use today's date as seed for reproducible daily selection
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Fisher-Yates shuffle with seed
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
    // Check if we already completed today's challenge
    const today = new Date().toISOString().split('T')[0];
    return s.sessions_history.some(h => h.date === today && h.exercises_done > 0);
  });

  const questions = useMemo(() => getDailyChallengeQuestions(3), []);
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
      const attemptPayloads = answers.map((a, i) => ({
        exercise_id: questions[i]?.id ?? `challenge-${i}`,
        is_correct: a.isCorrect,
        score: a.isCorrect ? 10 : 0,
        max_score: 10,
        time_spent_seconds: Math.round(totalTime / questions.length),
        user_answer: null as unknown,
        exercise_type: 'daily_challenge',
        skill_tags: ['daily_challenge'],
      }));

      // Add the last answer too
      const lastIsCorrect = selectedIdx === currentQ?.correctIndex;
      attemptPayloads.push({
        exercise_id: currentQ?.id ?? 'challenge-last',
        is_correct: lastIsCorrect,
        score: lastIsCorrect ? 10 : 0,
        max_score: 10,
        time_spent_seconds: Math.round(totalTime / questions.length),
        user_answer: null as unknown,
        exercise_type: 'daily_challenge',
        skill_tags: ['daily_challenge'],
      });

      const summary = finishSessionLocal(attemptPayloads, totalTime);
      setXpEarned(summary.xp_earned);
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
              <p className="text-[11px] text-white/80">{questions.length} questions rapides</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-bold">+{XP_CONFIG.daily_goal_complete} XP</p>
              <p className="text-[10px] text-white/60">bonus possible</p>
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-cream-25 rounded-xl p-2.5 border border-cream-100">
                <p className="text-lg">{['🎯', '🧠', '⭐'][i]}</p>
                <p className="text-[10px] text-navy-400 mt-1">
                  HSK{q.hskLevel} · {['★', '★★', '★★★'][q.difficulty - 1]}
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
          <div className="text-4xl mb-2">{isPerfect ? '🎉' : pct >= 60 ? '👏' : '💪'}</div>
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

  // Map type to display label
  const typeLabels: Record<string, string> = {
    translate_to_chinese: '🇨🇳 Traduire en chinois',
    translate_to_french: '🇫🇷 Traduire en francais',
    pinyin_match: '📖 Pinyin',
    character_meaning: '✍️ Caractere',
    fill_blank: '📝 Completez',
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
        {/* Mini progress */}
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
        {/* Type badge */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-cream-50 text-xs text-navy-600 font-medium border border-cream-200">
          {typeLabels[currentQ.type] ?? currentQ.type}
        </span>

        {/* Prompt */}
        <p className="text-lg font-medium text-navy-900 leading-relaxed">
          {currentQ.prompt}
        </p>

        {/* Options */}
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
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                disabled={isAnswered}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm flex items-center gap-3',
                  isAnswered ? 'cursor-default' : '',
                  optClass
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
                  isAnswered && i === currentQ.correctIndex
                    ? 'bg-emerald-500 text-white'
                    : isAnswered && selectedIdx === i
                      ? 'bg-red-500 text-white'
                      : selectedIdx === i
                        ? 'bg-teal-500 text-white'
                        : 'bg-cream-100 text-navy-500'
                )}>
                  {isAnswered ? (
                    i === currentQ.correctIndex
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : selectedIdx === i
                        ? <XCircle className="h-3.5 w-3.5" />
                        : String.fromCharCode(65 + i)
                  ) : String.fromCharCode(65 + i)}
                </span>
                <span className={cn(
                  isAnswered && i === currentQ.correctIndex ? 'text-emerald-800 font-medium' :
                  isAnswered && selectedIdx === i ? 'text-red-800' : 'text-navy-700'
                )}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation after answering */}
        {isAnswered && (
          <div className={cn(
            'rounded-xl p-3.5 border',
            isCorrectAnswer ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'
          )}>
            <p className={cn('text-xs font-semibold mb-1', isCorrectAnswer ? 'text-emerald-700' : 'text-sky-700')}>
              {isCorrectAnswer ? 'Correct !' : 'Explication'}
            </p>
            <p className="text-sm text-navy-700 leading-relaxed">
              {currentQ.explanation}
            </p>
          </div>
        )}

        {/* Action button */}
        {!isAnswered ? (
          <Button
            onClick={handleConfirm}
            variant="teal"
            size="lg"
            className="w-full"
            disabled={selectedIdx === null}
          >
            Valider
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="teal"
            size="lg"
            className="w-full"
          >
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

  // Quick check if challenge was likely completed today
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
