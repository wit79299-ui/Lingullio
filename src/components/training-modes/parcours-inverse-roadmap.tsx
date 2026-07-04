'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore } from '@/stores/gamification-store';
import {
  useTrainingModeStore,
  cumulativeWordsForHsk,
  HSK_VOCAB_COUNTS,
  type ParcoursInverseRoadmap,
  type WeeklyMilestone,
} from '@/stores/training-mode-store';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Target, Calendar, ChevronRight, BookOpen, Brain,
  Trophy, Zap, Clock, ArrowRight, AlertTriangle,
  CheckCircle2, Flame, Rocket, TrendingUp, TrendingDown,
  BarChart3, X, RefreshCw, Star, GraduationCap,
  ChevronDown, ChevronUp, MapPin,
} from 'lucide-react';
import { useState } from 'react';

// ─── Parcours Inversé Roadmap Dashboard ─────────────────────────────────

export function ParcoursInverseView({ className }: { className?: string }) {
  const { parcours_config, parcours_words_learned_snapshot, calculateRoadmap, resetToStandard } = useTrainingModeStore();
  const {
    total_xp, level, streak_days, daily_xp, daily_exercises,
    total_exercises, total_correct, sessions_history,
  } = useGamificationStore();

  const roadmap = useMemo(() => calculateRoadmap(), [
    parcours_config, parcours_words_learned_snapshot,
  ]);

  if (!parcours_config || !roadmap) {
    return null;
  }

  const wordsLearned = parcours_config.words_already_known + parcours_words_learned_snapshot;
  const overallProgress = Math.min(100, Math.round((wordsLearned / roadmap.total_words_needed) * 100));
  const daysUntilDeadline = Math.max(0, Math.ceil(
    (new Date(parcours_config.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  const riskConfig = {
    on_track: { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-300', label: 'En bonne voie', icon: CheckCircle2 },
    slight_delay: { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', label: 'Léger retard', icon: Clock },
    at_risk: { color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300', label: 'Risque de retard', icon: AlertTriangle },
    critical: { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: 'Retard critique', icon: TrendingDown },
  };
  const risk = riskConfig[roadmap.delay_risk];
  const RiskIcon = risk.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <Rocket className="h-5 w-5" />
            </div>
            Parcours Inversé
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            Objectif HSK {parcours_config.target_hsk_level} avant le{' '}
            {new Date(parcours_config.deadline_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-navy-900">{streak_days}</span>
            <span className="text-navy-400">jours</span>
          </div>
          <Button variant="secondary" size="sm" onClick={resetToStandard}>
            <X className="h-4 w-4 mr-1" />
            Quitter le parcours
          </Button>
        </div>
      </header>

      {/* Main Progress Card */}
      <Card className="!py-0 overflow-hidden border-2 border-violet-200">
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Progression globale</p>
              <p className="text-3xl font-black mt-1">{overallProgress}%</p>
            </div>
            <div className="text-right">
              <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold', risk.bg, risk.color)}>
                <RiskIcon className="h-3.5 w-3.5" />
                {risk.label}
              </div>
              <p className="text-xs text-white/50 mt-1">{daysUntilDeadline} jours restants</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-4 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${overallProgress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md" />
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-white/50">
              <span>HSK {parcours_config.current_hsk_level || 'Début'}</span>
              <span>{wordsLearned} / {roadmap.total_words_needed} mots</span>
              <span>HSK {parcours_config.target_hsk_level}</span>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBox icon={BookOpen} label="Mots / semaine" value={roadmap.words_per_week.toString()} color="teal" />
            <StatBox icon={GraduationCap} label="Leçons / semaine" value={roadmap.lessons_per_week.toString()} color="violet" />
            <StatBox icon={Brain} label="Révisions / semaine" value={roadmap.revisions_per_week.toString()} color="blue" />
            <StatBox icon={Clock} label="Étude / jour" value={`${roadmap.daily_study_minutes} min`} color="amber" />
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Actions du jour
          </h2>

          <TodaysActions roadmap={roadmap} />

          {/* Delay Risk Alert */}
          {(roadmap.delay_risk === 'at_risk' || roadmap.delay_risk === 'critical') && (
            <div className={cn(
              'flex items-start gap-3 p-4 rounded-xl border-2',
              risk.bg, risk.border,
            )}>
              <RiskIcon className={cn('h-5 w-5 shrink-0 mt-0.5', risk.color)} />
              <div>
                <p className={cn('text-sm font-bold', risk.color)}>
                  {roadmap.delay_risk === 'critical' ? 'Retard critique détecté' : 'Attention — retard en formation'}
                </p>
                <p className="text-xs text-navy-600 mt-1 leading-relaxed">
                  {roadmap.delay_risk === 'critical'
                    ? `Tu es significativement en dessous de ton objectif. Il reste ${roadmap.words_remaining} mots à apprendre en ${daysUntilDeadline} jours. Augmente ton rythme ou ajuste ton échéance.`
                    : `Tu prends un léger retard. Essaie d'ajouter ${Math.ceil(roadmap.words_per_week * 0.2)} mots de plus cette semaine pour rattraper.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Roadmap Timeline */}
        <div>
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-violet-500" />
            Feuille de route
          </h2>
          <RoadmapTimeline roadmap={roadmap} currentWeek={roadmap.weeks_elapsed} />
        </div>
      </div>

      {/* HSK Level Checkpoints */}
      <HskCheckpoints
        currentHsk={parcours_config.current_hsk_level}
        targetHsk={parcours_config.target_hsk_level}
        wordsLearned={wordsLearned}
        wordsKnownAtStart={parcours_config.words_already_known}
      />
    </div>
  );
}

// ─── Today's Actions ────────────────────────────────────────────────────

function TodaysActions({ roadmap }: { roadmap: ParcoursInverseRoadmap }) {
  const dailyExercises = useGamificationStore(s => s.daily_exercises);
  const hasStudiedToday = dailyExercises > 0;

  const actions = [
    {
      id: 'lesson',
      icon: BookOpen,
      title: 'Leçon du jour',
      subtitle: `Apprends ~${Math.ceil(roadmap.words_per_week / 7)} nouveaux mots`,
      href: '/courses',
      color: 'teal',
      duration: Math.ceil(roadmap.daily_study_minutes * 0.6),
      xp: 50,
    },
    {
      id: 'revision',
      icon: Brain,
      title: 'Révision SRS',
      subtitle: 'Consolide les mots appris récemment',
      href: '/revisions',
      color: 'blue',
      duration: Math.ceil(roadmap.daily_study_minutes * 0.3),
      xp: 30,
    },
    ...(roadmap.mock_exams_schedule.includes(roadmap.weeks_elapsed + 1) ? [{
      id: 'mock',
      icon: Trophy,
      title: 'Examen blanc cette semaine',
      subtitle: 'Évalue ton niveau avant de continuer',
      href: '/mock-exams',
      color: 'purple' as const,
      duration: 25,
      xp: 150,
    }] : []),
  ];

  const colorMap = {
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', iconBg: 'bg-teal-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', iconBg: 'bg-purple-100' },
  };

  return (
    <div className="space-y-2.5">
      {actions.map(action => {
        const colors = colorMap[action.color];
        const Icon = action.icon;
        return (
          <Link key={action.id} href={action.href}>
            <div className={cn(
              'flex items-center gap-3.5 p-4 rounded-xl border transition-all cursor-pointer group',
              'hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
              colors.bg, colors.border,
            )}>
              <div className={cn('flex items-center justify-center w-11 h-11 rounded-xl shadow-sm shrink-0', colors.iconBg)}>
                <Icon className={cn('h-5 w-5', colors.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">{action.title}</p>
                <p className="text-[11px] text-navy-400">{action.subtitle}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                    <Zap className="h-2.5 w-2.5" />~{action.xp} XP
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-navy-400">
                    <Clock className="h-2.5 w-2.5" />~{action.duration} min
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-navy-500 shrink-0 transition-colors" />
            </div>
          </Link>
        );
      })}

      {hasStudiedToday && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className="text-xs text-emerald-700 font-medium">
            Tu as déjà fait {dailyExercises} exercice{dailyExercises > 1 ? 's' : ''} aujourd'hui. Continue !
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Roadmap Timeline ───────────────────────────────────────────────────

function RoadmapTimeline({ roadmap, currentWeek }: {
  roadmap: ParcoursInverseRoadmap;
  currentWeek: number;
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Show weeks around current position
  const visibleWeeks = expanded
    ? roadmap.weekly_progress
    : roadmap.weekly_progress.filter(w =>
        w.week_number >= Math.max(1, currentWeek - 1) &&
        w.week_number <= currentWeek + 5
      );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-cream-200" />

          <div className="space-y-3">
            {visibleWeeks.map(week => {
              const isPast = week.week_number <= currentWeek;
              const isCurrent = week.week_number === currentWeek + 1;
              const isFuture = week.week_number > currentWeek + 1;

              return (
                <div key={week.week_number} className="relative flex items-start gap-3 pl-1">
                  {/* Dot */}
                  <div className={cn(
                    'relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0',
                    isPast
                      ? 'bg-emerald-100 border-emerald-400'
                      : isCurrent
                        ? 'bg-violet-100 border-violet-500 ring-4 ring-violet-100'
                        : 'bg-white border-cream-300',
                    week.target_hsk_checkpoint && 'bg-amber-100 border-amber-500',
                    week.has_mock_exam && !week.target_hsk_checkpoint && isPast ? '' : '',
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : week.target_hsk_checkpoint ? (
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                    ) : week.has_mock_exam ? (
                      <Trophy className="h-3 w-3 text-purple-500" />
                    ) : isCurrent ? (
                      <ArrowRight className="h-3 w-3 text-violet-600" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-cream-300" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    'flex-1 min-w-0 pb-2',
                    isCurrent && 'bg-violet-50 -mx-1 px-2 py-1.5 rounded-lg border border-violet-200',
                  )}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs font-bold',
                        isPast ? 'text-emerald-600' : isCurrent ? 'text-violet-700' : 'text-navy-400',
                      )}>
                        S{week.week_number}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full uppercase">
                          Maintenant
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-[11px] leading-tight mt-0.5',
                      isPast ? 'text-navy-400' : 'text-navy-500',
                    )}>
                      {week.description}
                    </p>
                    <p className="text-[10px] text-navy-300 mt-0.5">
                      {week.target_words_cumulative} mots cumulés
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {roadmap.weekly_progress.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 w-full mt-3 pt-2 border-t border-cream-100 text-[11px] text-navy-400 hover:text-navy-600 transition-colors"
          >
            {expanded ? (
              <>Réduire <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Voir tout ({roadmap.total_weeks} semaines) <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── HSK Level Checkpoints ──────────────────────────────────────────────

function HskCheckpoints({ currentHsk, targetHsk, wordsLearned, wordsKnownAtStart }: {
  currentHsk: number;
  targetHsk: number;
  wordsLearned: number;
  wordsKnownAtStart: number;
}) {
  const levels = [];
  for (let l = Math.max(1, currentHsk); l <= targetHsk; l++) {
    const needed = cumulativeWordsForHsk(l);
    const progress = Math.min(100, Math.round((wordsLearned / needed) * 100));
    const completed = wordsLearned >= needed;
    levels.push({ level: l, words: HSK_VOCAB_COUNTS[l] || 0, cumulative: needed, progress, completed });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-violet-500" />
          Étapes HSK
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {levels.map((lev, i) => (
            <div key={lev.level} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex-1 relative h-3 rounded-full overflow-hidden',
                lev.completed ? 'bg-emerald-100' : 'bg-cream-100',
              )}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    lev.completed
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                      : 'bg-gradient-to-r from-violet-400 to-purple-400',
                  )}
                  style={{ width: `${lev.progress}%` }}
                />
              </div>
              <div className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold shrink-0 border-2',
                lev.completed
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                  : lev.progress > 0
                    ? 'bg-violet-100 border-violet-400 text-violet-700'
                    : 'bg-cream-50 border-cream-200 text-navy-400',
              )}>
                {lev.completed ? <CheckCircle2 className="h-4 w-4" /> : `H${lev.level}`}
              </div>
              {i < levels.length - 1 && (
                <ChevronRight className="h-3 w-3 text-cream-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-navy-400 text-center mt-2">
          {wordsLearned} mots appris sur {cumulativeWordsForHsk(targetHsk)} nécessaires
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Stat Box ───────────────────────────────────────────────────────────

function StatBox({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: 'violet' | 'teal' | 'blue' | 'amber';
}) {
  const colorMap = {
    violet: 'text-violet-600 bg-violet-100',
    teal: 'text-teal-600 bg-teal-100',
    blue: 'text-blue-600 bg-blue-100',
    amber: 'text-amber-600 bg-amber-100',
  };

  return (
    <div className="text-center">
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg mx-auto mb-1.5', colorMap[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-lg font-bold text-navy-900">{value}</p>
      <p className="text-[10px] text-navy-400">{label}</p>
    </div>
  );
}
