'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserKnowledgeStore } from '@/stores/user-knowledge-store';
import { useGamificationStore } from '@/stores/gamification-store';
import { HSK_VOCAB_COUNTS } from '@/stores/training-mode-store';
import { Link } from '@/i18n/navigation';
import {
  Target, Calendar, TrendingUp, ChevronRight, Check,
  Clock, BookOpen, Brain, Flame, Award, Zap, AlertCircle,
  ArrowRight, Trophy, Star, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface ObjectiveData {
  targetExam: string;       // "hsk-1" ... "hsk-6"
  targetDate: string;       // ISO date
  targetScore: number;      // 0-100
  weeklyHours: number;      // 1-20
  createdAt: string;
}

const STORAGE_KEY = 'lingullio_objectives';

const HSK_LABELS: Record<string, string> = {
  'hsk-1': 'HSK 1', 'hsk-2': 'HSK 2', 'hsk-3': 'HSK 3',
  'hsk-4': 'HSK 4', 'hsk-5': 'HSK 5', 'hsk-6': 'HSK 6',
};

const HSK_OPTIONS = ['hsk-1', 'hsk-2', 'hsk-3', 'hsk-4', 'hsk-5', 'hsk-6'];

// ─── Main Component ─────────────────────────────────────────────────────

export function ObjectivesView() {
  const [objective, setObjective] = useState<ObjectiveData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formExam, setFormExam] = useState('hsk-2');
  const [formDate, setFormDate] = useState('');
  const [formScore, setFormScore] = useState(70);
  const [formHours, setFormHours] = useState(5);

  // Stores (use individual selectors to avoid infinite re-renders)
  const knowledgeItems = useUserKnowledgeStore(s => s.items);
  const knowledgeLastUpdated = useUserKnowledgeStore(s => s.last_updated);
  const knowledgeStats = useMemo(() => useUserKnowledgeStore.getState().getStats(), [knowledgeItems, knowledgeLastUpdated]);

  const gamification_total_exercises = useGamificationStore(s => s.total_exercises);
  const gamification_total_study_minutes = useGamificationStore(s => s.total_study_minutes);
  const gamification_streak_days = useGamificationStore(s => s.streak_days);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as ObjectiveData;
        setObjective(data);
        setFormExam(data.targetExam);
        setFormDate(data.targetDate);
        setFormScore(data.targetScore);
        setFormHours(data.weeklyHours);
      }
    } catch {}
  }, []);

  // Default date: 3 months from now
  useEffect(() => {
    if (!formDate) {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setFormDate(d.toISOString().split('T')[0]);
    }
  }, [formDate]);

  const handleSave = () => {
    const data: ObjectiveData = {
      targetExam: formExam,
      targetDate: formDate,
      targetScore: formScore,
      weeklyHours: formHours,
      createdAt: objective?.createdAt ?? new Date().toISOString(),
    };
    setObjective(data);
    setIsEditing(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  };

  // ── Computed stats
  const analysis = useMemo(() => {
    if (!objective) return null;
    const hskNum = parseInt(objective.targetExam.replace('hsk-', ''));
    const targetVocab = Object.entries(HSK_VOCAB_COUNTS)
      .filter(([k]) => parseInt(k) <= hskNum)
      .reduce((sum, [, v]) => sum + v, 0);

    const masteredCount = knowledgeStats.mastered_count;
    const totalKnown = knowledgeStats.total_items;
    const vocabProgress = targetVocab > 0 ? Math.min(100, Math.round((masteredCount / targetVocab) * 100)) : 0;
    const vocabRemaining = Math.max(0, targetVocab - masteredCount);

    const now = new Date();
    const target = new Date(objective.targetDate);
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));

    const wordsPerWeek = vocabRemaining > 0 ? Math.ceil(vocabRemaining / weeksLeft) : 0;
    const minutesPerDay = Math.round((objective.weeklyHours * 60) / 7);

    // Readiness score (simplified)
    const readiness = Math.min(100, Math.round(
      (vocabProgress * 0.5) +
      (Math.min(100, (gamification_total_exercises / Math.max(1, targetVocab * 2)) * 100) * 0.3) +
      (Math.min(100, (gamification_total_study_minutes / Math.max(1, daysLeft * minutesPerDay)) * 100) * 0.2)
    ));

    return {
      targetVocab, masteredCount, totalKnown, vocabProgress, vocabRemaining,
      daysLeft, weeksLeft, wordsPerWeek, minutesPerDay, readiness, hskNum,
    };
  }, [objective, knowledgeStats, gamification_total_exercises, gamification_total_study_minutes]);

  // ── Editing / Setup form
  if (!objective || isEditing) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
              <Target className="h-5 w-5 text-navy-700" />
            </div>
            {objective ? 'Modifier mon objectif' : 'Definir mon objectif'}
          </h1>
          <p className="text-navy-400 mt-2 ml-[52px]">
            {objective ? 'Ajustez votre plan de preparation' : 'Definissez votre examen cible et Lingullio adaptera votre parcours'}
          </p>
        </header>

        <Card>
          <CardContent className="py-6 space-y-6">
            {/* Target exam */}
            <div>
              <label className="text-sm font-medium text-navy-900 mb-2 block">Examen cible</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {HSK_OPTIONS.map(hsk => (
                  <button
                    key={hsk}
                    type="button"
                    onClick={() => setFormExam(hsk)}
                    className={cn(
                      'px-3 py-3 rounded-xl text-sm font-bold transition-all border',
                      formExam === hsk
                        ? 'bg-teal-500 text-white border-teal-500 shadow-md'
                        : 'bg-cream-25 text-navy-600 border-cream-200 hover:border-teal-300'
                    )}
                  >
                    {HSK_LABELS[hsk]}
                  </button>
                ))}
              </div>
            </div>

            {/* Target date */}
            <div>
              <label className="text-sm font-medium text-navy-900 mb-2 block">Date d&apos;examen prevue</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>

            {/* Target score */}
            <div>
              <label className="text-sm font-medium text-navy-900 mb-2 block">
                Score vise : <span className="text-teal-600">{formScore}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={formScore}
                onChange={(e) => setFormScore(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-navy-400 mt-1">
                <span>50% (passer)</span>
                <span>70% (bien)</span>
                <span>100% (parfait)</span>
              </div>
            </div>

            {/* Weekly hours */}
            <div>
              <label className="text-sm font-medium text-navy-900 mb-2 block">
                Temps d&apos;etude hebdomadaire : <span className="text-teal-600">{formHours}h/semaine</span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={formHours}
                onChange={(e) => setFormHours(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-navy-400 mt-1">
                <span>1h (leger)</span>
                <span>7h (regulier)</span>
                <span>20h (intensif)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {objective && (
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
              )}
              <Button variant="teal" size="sm" className="flex-1" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                {objective ? 'Enregistrer' : 'Definir mon objectif'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Dashboard with objective set
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
              <Target className="h-5 w-5 text-navy-700" />
            </div>
            Mon objectif
          </h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
          Modifier
        </Button>
      </header>

      {/* Hero card */}
      <Card className="!py-0 overflow-hidden">
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 px-6 py-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Examen cible</p>
              <p className="text-3xl font-black">{HSK_LABELS[objective.targetExam]}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-wider">Jour J</p>
              <p className="text-2xl font-bold">{analysis!.daysLeft}<span className="text-sm font-normal text-white/60"> jours</span></p>
            </div>
          </div>

          {/* Readiness gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-white/60">
              <span>Pret a {objective.targetScore}%</span>
              <span>{analysis!.readiness}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-1000',
                  analysis!.readiness >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                  analysis!.readiness >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  'bg-gradient-to-r from-red-400 to-red-500'
                )}
                style={{ width: `${analysis!.readiness}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Vocabulaire" value={`${analysis!.masteredCount}/${analysis!.targetVocab}`} sub={`${analysis!.vocabProgress}%`} color="teal" />
        <StatCard icon={Calendar} label="Semaines restantes" value={String(analysis!.weeksLeft)} sub={`${analysis!.daysLeft}j`} color="blue" />
        <StatCard icon={TrendingUp} label="Mots/semaine" value={String(analysis!.wordsPerWeek)} sub="rythme necessaire" color="amber" />
        <StatCard icon={Clock} label="Minutes/jour" value={String(analysis!.minutesPerDay)} sub={`${objective.weeklyHours}h/sem`} color="purple" />
      </div>

      {/* Vocabulary progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-teal-500" />
            Progression vocabulaire {HSK_LABELS[objective.targetExam]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: analysis!.hskNum }, (_, i) => {
              const level = String(i + 1);
              const target = HSK_VOCAB_COUNTS[i + 1] ?? 0;
              const hskData = knowledgeStats.by_hsk[level];
              const mastered = hskData?.mastered ?? 0;
              const learning = hskData?.learning ?? 0;
              const pct = target > 0 ? Math.round((mastered / target) * 100) : 0;
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-navy-700">HSK {level}</span>
                    <span className="text-navy-400">{mastered}/{target} maitrises ({pct}%)</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-cream-100">
                    {mastered > 0 && <div className="bg-emerald-400" style={{ width: `${(mastered / target) * 100}%` }} />}
                    {learning > 0 && <div className="bg-amber-300" style={{ width: `${(learning / target) * 100}%` }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-teal-500" />
            Plan d&apos;action
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PlanItem
            icon={BookOpen}
            title="Etudier le vocabulaire"
            description={`Apprendre ${analysis!.wordsPerWeek} nouveaux mots par semaine`}
            href="/courses"
            urgent={analysis!.vocabProgress < 50}
          />
          <PlanItem
            icon={Brain}
            title="Revisions SRS quotidiennes"
            description={`${knowledgeStats.due_for_review} mots a reviser maintenant`}
            href="/revisions"
            urgent={knowledgeStats.due_for_review > 10}
          />
          <PlanItem
            icon={Trophy}
            title="Examens blancs"
            description="Tester ses connaissances en conditions reelles"
            href="/mock-exams"
            urgent={false}
          />
          <PlanItem
            icon={Flame}
            title="Maintenir la serie"
            description={`Serie actuelle : ${gamification_streak_days} jours`}
            href="/daily-challenge"
            urgent={gamification_streak_days === 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Reusable Components ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub: string;
  color: 'teal' | 'blue' | 'amber' | 'purple';
}) {
  const colors = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card className="!py-0">
      <CardContent className="py-3 text-center">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1', colors[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-lg font-bold text-navy-900">{value}</p>
        <p className="text-[10px] text-navy-400">{label}</p>
        <p className="text-[10px] text-navy-300">{sub}</p>
      </CardContent>
    </Card>
  );
}

function PlanItem({ icon: Icon, title, description, href, urgent }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; description: string; href: string; urgent: boolean;
}) {
  return (
    <Link href={href}>
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm',
        urgent ? 'border-amber-200 bg-amber-50/50' : 'border-cream-100 bg-white hover:bg-cream-25'
      )}>
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
          urgent ? 'bg-amber-100' : 'bg-teal-50'
        )}>
          <Icon className={cn('h-5 w-5', urgent ? 'text-amber-600' : 'text-teal-600')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900">{title}</p>
          <p className="text-xs text-navy-400">{description}</p>
        </div>
        {urgent && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
        <ChevronRight className="h-4 w-4 text-navy-300 shrink-0" />
      </div>
    </Link>
  );
}
