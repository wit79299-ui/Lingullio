'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserKnowledgeStore } from '@/stores/user-knowledge-store';
import { useGamificationStore } from '@/stores/gamification-store';
import { HSK_VOCAB_COUNTS } from '@/stores/training-mode-store';
import { Link } from '@/i18n/navigation';
import {
  Target, Calendar, Trophy, TrendingUp, ChevronRight,
  Check, Clock, Flame, BookOpen, Brain, Zap, Edit3,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface ObjectivesData {
  targetExam: string;         // "hsk1" .. "hsk6"
  targetDate: string;         // ISO date
  dailyMinutes: number;       // 15 | 30 | 45 | 60
  priority: 'listening' | 'reading' | 'vocabulary' | 'balanced';
  createdAt: string;
}

const STORAGE_KEY = 'lingullio_objectives';

const HSK_LEVELS = [
  { id: 'hsk1', label: 'HSK 1', vocab: 150, description: '150 mots — Debutant' },
  { id: 'hsk2', label: 'HSK 2', vocab: 300, description: '300 mots — Elementaire' },
  { id: 'hsk3', label: 'HSK 3', vocab: 600, description: '600 mots — Intermediaire' },
  { id: 'hsk4', label: 'HSK 4', vocab: 1200, description: '1200 mots — Intermediaire+' },
  { id: 'hsk5', label: 'HSK 5', vocab: 2500, description: '2500 mots — Avance' },
  { id: 'hsk6', label: 'HSK 6', vocab: 5000, description: '5000 mots — Superieur' },
];

const PRIORITIES = [
  { id: 'balanced', label: 'Equilibre', icon: Target },
  { id: 'vocabulary', label: 'Vocabulaire', icon: BookOpen },
  { id: 'listening', label: 'Ecoute', icon: Clock },
  { id: 'reading', label: 'Lecture', icon: BookOpen },
] as const;

// ─── Main Component ─────────────────────────────────────────────────────

export function ObjectivesView() {
  const [objectives, setObjectives] = useState<ObjectivesData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setObjectives(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  const save = (data: ObjectivesData) => {
    setObjectives(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    setEditing(false);
  };

  if (!loaded) return null;

  if (!objectives || editing) {
    return <ObjectivesSetup initial={objectives} onSave={save} onCancel={objectives ? () => setEditing(false) : undefined} />;
  }

  return <ObjectivesDashboard objectives={objectives} onEdit={() => setEditing(true)} />;
}

// ─── Setup Form ─────────────────────────────────────────────────────────

function ObjectivesSetup({ initial, onSave, onCancel }: {
  initial: ObjectivesData | null;
  onSave: (data: ObjectivesData) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [targetExam, setTargetExam] = useState(initial?.targetExam ?? 'hsk1');
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? getDefaultDate());
  const [dailyMinutes, setDailyMinutes] = useState(initial?.dailyMinutes ?? 30);
  const [priority, setPriority] = useState<ObjectivesData['priority']>(initial?.priority ?? 'balanced');

  function getDefaultDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }

  const steps = [
    // Step 0: Choose exam
    <div key="exam" className="space-y-4">
      <h2 className="text-lg font-semibold text-navy-900">Quel examen preparez-vous ?</h2>
      <div className="grid grid-cols-2 gap-3">
        {HSK_LEVELS.map(level => (
          <button
            key={level.id}
            type="button"
            onClick={() => setTargetExam(level.id)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              targetExam === level.id
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-cream-200 bg-white hover:border-cream-300'
            )}
          >
            <p className="font-bold text-navy-900">{level.label}</p>
            <p className="text-xs text-navy-400 mt-1">{level.description}</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Choose date
    <div key="date" className="space-y-4">
      <h2 className="text-lg font-semibold text-navy-900">Quand passez-vous l&apos;examen ?</h2>
      <input
        type="date"
        value={targetDate}
        min={new Date().toISOString().split('T')[0]}
        onChange={(e) => setTargetDate(e.target.value)}
        className="w-full p-3 rounded-xl border border-cream-200 text-navy-900 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
      />
      <DaysRemaining targetDate={targetDate} />
    </div>,

    // Step 2: Daily time
    <div key="time" className="space-y-4">
      <h2 className="text-lg font-semibold text-navy-900">Temps quotidien disponible ?</h2>
      <div className="grid grid-cols-2 gap-3">
        {[15, 30, 45, 60].map(mins => (
          <button
            key={mins}
            type="button"
            onClick={() => setDailyMinutes(mins)}
            className={cn(
              'p-4 rounded-xl border-2 text-center transition-all',
              dailyMinutes === mins
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-cream-200 bg-white hover:border-cream-300'
            )}
          >
            <p className="text-2xl font-bold text-navy-900">{mins}</p>
            <p className="text-xs text-navy-400">min / jour</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Priority
    <div key="priority" className="space-y-4">
      <h2 className="text-lg font-semibold text-navy-900">Sur quoi voulez-vous insister ?</h2>
      <div className="grid grid-cols-2 gap-3">
        {PRIORITIES.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPriority(p.id as ObjectivesData['priority'])}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              priority === p.id
                ? 'border-teal-500 bg-teal-50 shadow-sm'
                : 'border-cream-200 bg-white hover:border-cream-300'
            )}
          >
            <p.icon className="h-5 w-5 text-teal-500 mb-2" />
            <p className="font-medium text-navy-900">{p.label}</p>
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <header className="text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 mx-auto mb-4">
          <Target className="h-7 w-7 text-teal-500" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900">
          {initial ? 'Modifier mes objectifs' : 'Definir mes objectifs'}
        </h1>
        <p className="text-sm text-navy-400 mt-2">Etape {step + 1} sur {steps.length}</p>
      </header>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-teal-500' : 'bg-cream-200')} />
        ))}
      </div>

      {steps[step]}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
            Retour
          </Button>
        ) : onCancel ? (
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button variant="teal" onClick={() => setStep(s => s + 1)} className="flex-1">
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            variant="teal"
            onClick={() => onSave({ targetExam, targetDate, dailyMinutes, priority, createdAt: new Date().toISOString() })}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" /> Valider
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────

function ObjectivesDashboard({ objectives, onEdit }: {
  objectives: ObjectivesData;
  onEdit: () => void;
}) {
  const stats = useUserKnowledgeStore(s => s.getStats());
  const gamification = useGamificationStore();

  const hskInfo = HSK_LEVELS.find(l => l.id === objectives.targetExam) ?? HSK_LEVELS[0];
  const hskNum = objectives.targetExam.replace('hsk', '');

  // Calculate progress
  const hskLevelStats = stats.by_hsk[hskNum] ?? { total: 0, mastered: 0, learning: 0, unknown: 0 };
  const masteredForLevel = hskLevelStats.mastered;
  const vocabTarget = hskInfo.vocab;
  const vocabProgress = Math.min(100, Math.round((masteredForLevel / vocabTarget) * 100));

  // Days remaining
  const daysRemaining = Math.max(0, Math.ceil((new Date(objectives.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.ceil(daysRemaining / 7);

  // Estimated pace needed
  const vocabRemaining = Math.max(0, vocabTarget - masteredForLevel);
  const wordsPerDay = daysRemaining > 0 ? Math.ceil(vocabRemaining / daysRemaining) : vocabRemaining;

  // Study plan
  const studyPlan = useMemo(() => generateStudyPlan(objectives, daysRemaining, vocabRemaining), [objectives, daysRemaining, vocabRemaining]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
              <Target className="h-5 w-5 text-navy-700" />
            </div>
            Mes objectifs
          </h1>
          <p className="text-navy-400 mt-2 ml-[52px]">
            Preparation {hskInfo.label}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Edit3 className="h-4 w-4 mr-1" /> Modifier
        </Button>
      </header>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Trophy} label="Objectif" value={hskInfo.label} color="bg-gold-50 text-gold-600" />
        <MetricCard icon={Calendar} label="Jours restants" value={String(daysRemaining)} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={Brain} label="Mots maitrises" value={`${masteredForLevel}/${vocabTarget}`} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={Zap} label="Rythme necessaire" value={`${wordsPerDay} mots/j`} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-teal-500" />
            Progression vers {hskInfo.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vocab bar */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-navy-500">Vocabulaire maitrise</span>
              <span className="font-bold text-navy-900">{vocabProgress}%</span>
            </div>
            <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${vocabProgress}%` }}
              />
            </div>
            <p className="text-xs text-navy-400 mt-1">
              {masteredForLevel} mots maitrises sur {vocabTarget} requis
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-cream-100">
            <div className="text-center">
              <p className="text-lg font-bold text-navy-900">{gamification.total_study_minutes}</p>
              <p className="text-[10px] text-navy-400">minutes etudiees</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy-900">{gamification.streak_days}</p>
              <p className="text-[10px] text-navy-400">jours de serie</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy-900">{stats.total_items}</p>
              <p className="text-[10px] text-navy-400">mots rencontres</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Study Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-teal-500" />
            Plan d&apos;action ({weeksRemaining} semaines)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studyPlan.map((phase, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                    i === 0 ? 'bg-teal-500 text-white' : 'bg-cream-100 text-navy-500'
                  )}>
                    {i + 1}
                  </div>
                  {i < studyPlan.length - 1 && <div className="w-0.5 flex-1 bg-cream-200 mt-1" />}
                </div>
                <div className="pb-4 flex-1">
                  <p className="text-sm font-medium text-navy-900">{phase.title}</p>
                  <p className="text-xs text-navy-400 mt-1">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <BookOpen className="h-5 w-5 text-teal-500" />
              <span className="text-sm font-medium text-navy-900">Continuer les cours</span>
              <ChevronRight className="h-4 w-4 text-navy-300 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/revisions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <Brain className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-navy-900">Revisions SRS</span>
              <ChevronRight className="h-4 w-4 text-navy-300 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="!py-0">
      <CardContent className="flex items-center gap-3 py-3">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold text-navy-900">{value}</p>
          <p className="text-[10px] text-navy-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DaysRemaining({ targetDate }: { targetDate: string }) {
  const days = Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  return (
    <p className="text-sm text-navy-500">
      {days > 0 ? (
        <>Il reste <span className="font-bold text-teal-600">{days} jours</span> ({Math.ceil(days / 7)} semaines)</>
      ) : (
        <span className="text-red-500 font-medium">Date passee — choisissez une date future</span>
      )}
    </p>
  );
}

function generateStudyPlan(objectives: ObjectivesData, daysRemaining: number, vocabRemaining: number) {
  const weeks = Math.ceil(daysRemaining / 7);
  const phases = [];

  if (weeks <= 2) {
    phases.push(
      { title: 'Revision intensive', description: `Revoir les ${vocabRemaining} mots restants. Priorite aux exercices types et examens blancs.` },
      { title: 'Simulation d\'examen', description: 'Faire 1 examen blanc par jour les derniers jours. Analyser les erreurs.' },
    );
  } else if (weeks <= 8) {
    const half = Math.ceil(weeks / 2);
    phases.push(
      { title: `Semaines 1-${half} : Apprentissage`, description: `Apprendre ${Math.ceil(vocabRemaining / 2)} nouveaux mots. ${objectives.dailyMinutes} min/jour de cours + exercices.` },
      { title: `Semaines ${half + 1}-${weeks - 1} : Consolidation`, description: 'Revisions SRS quotidiennes + exercices de grammaire. Commencer les examens blancs.' },
      { title: `Semaine ${weeks} : Sprint final`, description: 'Examens blancs quotidiens + revision des points faibles identifies.' },
    );
  } else {
    const third = Math.ceil(weeks / 3);
    phases.push(
      { title: `Semaines 1-${third} : Fondations`, description: `Apprendre les bases : ${Math.ceil(vocabRemaining * 0.4)} mots. Grammaire essentielle et caracteres.` },
      { title: `Semaines ${third + 1}-${third * 2} : Approfondissement`, description: `${Math.ceil(vocabRemaining * 0.4)} mots supplementaires. Exercices d'ecoute et lecture.` },
      { title: `Semaines ${third * 2 + 1}-${weeks - 2} : Maitrise`, description: 'Consolider tout le vocabulaire. Revisions SRS intensives.' },
      { title: `2 dernieres semaines : Preparation finale`, description: 'Examens blancs quotidiens. Revoir les erreurs. Se concentrer sur les faiblesses.' },
    );
  }

  return phases;
}
