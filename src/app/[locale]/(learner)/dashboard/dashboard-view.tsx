'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useGamificationStore } from '@/stores/gamification-store';
import { useTrainingModeStore } from '@/stores/training-mode-store';
import { levelTitle } from '@/lib/gamification/xp-config';
import { BADGES, RARITY_COLORS } from '@/lib/gamification/badges';
import { Link } from '@/i18n/navigation';
import {
  BookOpen, Target, Clock, Flame, ChevronRight, Brain,
  Zap, Star, Trophy, Award, TrendingUp, RefreshCw,
  Calendar, Sparkles, Rocket, BellRing, AlertCircle,
} from 'lucide-react';
import { useUserKnowledgeStore } from '@/stores/user-knowledge-store';
import { getReviewSummary } from '@/lib/gamification/knowledge-tracker';
import { HSK_VOCAB_COUNTS } from '@/stores/training-mode-store';
import { cn } from '@/lib/utils';
import { DailyPlan } from '@/components/gamification/daily-plan';
import { DailyChallengeWidget } from '@/components/gamification/daily-challenge';
import { CoachAutonomeBanner, CoachAutonomeView, useCoachAutoActivation } from '@/components/training-modes/coach-autonome';
import { ParcoursInverseView } from '@/components/training-modes/parcours-inverse-roadmap';
import { ParcoursInverseSetup } from '@/components/training-modes/parcours-inverse-config';

export function DashboardView() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  const {
    total_xp, level, streak_days, longest_streak,
    badges_unlocked, perfect_sessions, total_exercises,
    total_correct, total_study_minutes, daily_xp,
    daily_exercises, daily_correct, sessions_history,
  } = useGamificationStore();

  const activeMode = useTrainingModeStore(s => s.active_mode);
  const parcoursConfig = useTrainingModeStore(s => s.parcours_config);
  const setMode = useTrainingModeStore(s => s.setMode);
  const [showParcoursSetup, setShowParcoursSetup] = useState(false);

  // Auto-activate Coach Autonome after 15 days inactivity
  useCoachAutoActivation();

  const levelInfo = useMemo(() => useGamificationStore.getState().getLevelInfo(), [level, total_xp]);
  const accuracy = total_exercises > 0 ? Math.round((total_correct / total_exercises) * 100) : 0;

  // Recent activity (last 7 days)
  const last7Days = getLastNDaysActivity(sessions_history, 7);
  const weeklyXp = last7Days.reduce((s, d) => s + d.xp, 0);
  const weeklyExercises = last7Days.reduce((s, d) => s + d.exercises, 0);

  // ─── Parcours Inversé Setup Screen ──────────────────────────────────
  if (showParcoursSetup) {
    return (
      <div className="space-y-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowParcoursSetup(false)}
          className="mb-2"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Retour au dashboard
        </Button>
        <ParcoursInverseSetup onComplete={() => setShowParcoursSetup(false)} />
      </div>
    );
  }

  // ─── Parcours Inversé Active → Show Roadmap ────────────────────────
  if (activeMode === 'parcours_inverse' && parcoursConfig) {
    return <ParcoursInverseView />;
  }

  // ─── Coach Autonome Active → Show Coach View ──────────────────────
  if (activeMode === 'coach_autonome') {
    return <CoachAutonomeView />;
  }

  // ─── Standard Dashboard ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {t('welcome', { name: 'Apprenant' })}
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            {levelTitle(level)} &middot; Niveau {level} &middot; {total_xp} XP
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Flame className="h-5 w-5 text-orange-500 animate-streak-fire" />
            <span className="font-bold text-navy-900">{streak_days}</span>
            <span className="text-navy-400">jours</span>
          </div>
          {daily_xp > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Zap className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-emerald-600">+{daily_xp}</span>
              <span className="text-navy-400">aujourd&apos;hui</span>
            </div>
          )}
        </div>
      </header>

      {/* Coach Autonome Banner (shows when auto-triggered in standard mode) */}
      <CoachAutonomeBanner />

      {/* Training Mode Selector */}
      <TrainingModeSelector
        onStartParcours={() => setShowParcoursSetup(true)}
      />

      {/* Daily Plan */}
      <Card>
        <CardContent className="p-5">
          <DailyPlan />
        </CardContent>
      </Card>

      {/* Knowledge Map Summary */}
      <KnowledgeMapWidget />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Level & XP Card */}
        <Card className="!py-0 overflow-hidden">
          <div className="bg-gradient-to-br from-navy-800 to-navy-900 px-6 py-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-black shadow-lg">
                  {level}
                  <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-navy-800 shadow">
                    <Star className="h-3 w-3 text-amber-400" />
                  </div>
                </div>
                <div>
                  <p className="font-bold">{levelTitle(level)}</p>
                  <p className="text-xs text-white/60">Niveau {level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{total_xp}</p>
                <p className="text-[10px] text-white/50">XP total</p>
              </div>
            </div>

            {/* XP Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-white/60">
                <span>Niveau {level}</span>
                <span>Niveau {level + 1}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
              <p className="text-center text-[11px] text-white/50">
                {levelInfo.currentXp} / {levelInfo.nextLevelXp} XP ({levelInfo.progress}%)
              </p>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-navy-900">{total_exercises}</p>
                <p className="text-[10px] text-navy-400">Exercices</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{accuracy}%</p>
                <p className="text-[10px] text-navy-400">Precision</p>
              </div>
              <div>
                <p className="text-lg font-bold text-navy-900">{Math.floor(total_study_minutes / 60)}h{total_study_minutes % 60 > 0 ? total_study_minutes % 60 : ''}</p>
                <p className="text-[10px] text-navy-400">Etude</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-500" />
                Cette semaine
              </CardTitle>
              <span className="text-sm font-bold text-emerald-600">+{weeklyXp} XP</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Activity heatmap (last 7 days) */}
            <div className="flex items-end gap-1.5 h-24 mb-4">
              {last7Days.map((day, i) => {
                const maxXp = Math.max(...last7Days.map(d => d.xp), 1);
                const height = day.xp > 0 ? Math.max(12, (day.xp / maxXp) * 100) : 4;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all duration-500',
                        day.xp > 0
                          ? 'bg-gradient-to-t from-teal-500 to-emerald-400'
                          : 'bg-cream-100'
                      )}
                      style={{ height: `${height}%` }}
                      title={`${day.label}: ${day.xp} XP, ${day.exercises} exercices`}
                    />
                    <span className="text-[9px] text-navy-400">{day.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream-25 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-navy-900">{weeklyExercises}</p>
                <p className="text-[10px] text-navy-400">Exercices</p>
              </div>
              <div className="bg-cream-25 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-navy-900">{perfect_sessions}</p>
                <p className="text-[10px] text-navy-400">Sessions parfaites</p>
              </div>
            </div>

            <Link href="/progress">
              <Button variant="ghost" size="sm" className="w-full mt-3 text-teal-600 hover:text-teal-700">
                Voir toute la progression
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-teal-500" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/daily-challenge">
              <DailyChallengeWidget />
            </Link>
            <Link href="/courses">
              <QuickActionCard
                icon={BookOpen}
                title="Continuer les cours"
                subtitle="Reprendre la ou vous en etes"
                color="teal"
              />
            </Link>
            <Link href="/revisions">
              <QuickActionCard
                icon={RefreshCw}
                title="Revisions SRS"
                subtitle="Cartes a reviser avec la repetition espacee"
                color="blue"
              />
            </Link>
            <Link href="/mock-exams">
              <QuickActionCard
                icon={Trophy}
                title="Examen blanc"
                subtitle="Testez vos connaissances en conditions reelles"
                color="purple"
              />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Streak & Badges Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Streak Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Serie d&apos;apprentissage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white mb-2 shadow-lg">
                  <span className="text-2xl font-black">{streak_days}</span>
                </div>
                <p className="text-xs text-navy-400">Actuel</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-cream-50 border border-cream-200 text-navy-700 mb-2">
                  <span className="text-2xl font-bold">{longest_streak}</span>
                </div>
                <p className="text-xs text-navy-400">Record</p>
              </div>
              <div className="flex-1">
                <StreakCalendar sessions={sessions_history} />
              </div>
            </div>
            {streak_days > 0 && (
              <p className="text-xs text-navy-400 text-center">
                {streak_days >= longest_streak
                  ? '🎉 Vous etes a votre record !'
                  : `Plus que ${longest_streak - streak_days} jour${longest_streak - streak_days > 1 ? 's' : ''} pour battre votre record !`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Badges Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Badges ({badges_unlocked.length}/{BADGES.length})
              </CardTitle>
              <Link href="/progress" className="text-xs text-teal-500 hover:text-teal-600">
                Tout voir
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {badges_unlocked.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="h-10 w-10 text-navy-200 mx-auto mb-2" />
                <p className="text-sm text-navy-400">Completez des exercices pour debloquer vos premiers badges !</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {badges_unlocked.slice(-10).map(badgeId => {
                  const badge = BADGES.find(b => b.id === badgeId);
                  if (!badge) return null;
                  const colors = RARITY_COLORS[badge.rarity];
                  return (
                    <div
                      key={badgeId}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border text-center',
                        colors.bg, colors.border
                      )}
                      title={`${badge.name_fr} — ${badge.description_fr}`}
                    >
                      <span className="text-2xl">{badge.icon}</span>
                      <span className={cn('text-[9px] font-medium leading-tight', colors.text)}>
                        {badge.name_fr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next badges to unlock */}
            <NextBadgesHint
              currentBadges={badges_unlocked}
              stats={useGamificationStore.getState().getStats()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────

function QuickActionCard({ icon: Icon, title, subtitle, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: 'teal' | 'blue' | 'purple';
}) {
  const bgColors = {
    teal: 'bg-teal-50 hover:bg-teal-100',
    blue: 'bg-blue-50 hover:bg-blue-100',
    purple: 'bg-purple-50 hover:bg-purple-100',
  };
  const iconColors = {
    teal: 'text-teal-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border border-transparent transition-all cursor-pointer group',
      bgColors[color]
    )}>
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm shrink-0">
        <Icon className={cn('h-5 w-5', iconColors[color])} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        <p className="text-[11px] text-navy-400 truncate">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-navy-500 shrink-0 transition-colors" />
    </div>
  );
}

// ─── Streak Calendar (mini GitHub-style) ─────────────────────────────────

function StreakCalendar({ sessions }: { sessions: Array<{ date: string }> }) {
  const dates = new Set(sessions.map(s => s.date));
  const today = new Date();
  const cells = [];

  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const active = dates.has(dateStr);
    cells.push(
      <div
        key={dateStr}
        className={cn(
          'w-3 h-3 rounded-sm transition-colors',
          active ? 'bg-emerald-400' : 'bg-cream-100'
        )}
        title={`${dateStr}${active ? ' — Actif' : ''}`}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {cells}
    </div>
  );
}

// ─── Next Badges to unlock hint ──────────────────────────────────────────

function NextBadgesHint({ currentBadges, stats }: {
  currentBadges: string[];
  stats: import('@/lib/gamification/badges').UserBadgeStats;
}) {
  const unlockedSet = new Set(currentBadges);
  const nextBadges = BADGES
    .filter(b => !unlockedSet.has(b.id) && !b.condition(stats))
    .slice(0, 2);

  if (nextBadges.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-cream-100">
      <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wider mb-2">
        Prochains badges a debloquer
      </p>
      <div className="space-y-2">
        {nextBadges.map(badge => (
          <div key={badge.id} className="flex items-center gap-2.5 text-xs">
            <span className="text-lg opacity-30">{badge.icon}</span>
            <div className="flex-1">
              <span className="font-medium text-navy-600">{badge.name_fr}</span>
              <span className="text-navy-400 ml-1">— {badge.description_fr}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Utility: Get last N days activity ──────────────────────────────────

function getLastNDaysActivity(sessions: Array<{ date: string; xp_earned: number; exercises_done: number }>, n: number) {
  const today = new Date();
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const result = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = sessions.filter(s => s.date === dateStr);
    const xp = dayData.reduce((s, e) => s + e.xp_earned, 0);
    const exercises = dayData.reduce((s, e) => s + e.exercises_done, 0);

    result.push({
      date: dateStr,
      label: dayLabels[d.getDay()],
      xp,
      exercises,
    });
  }

  return result;
}

// ─── Training Mode Selector ─────────────────────────────────────────────

function TrainingModeSelector({ onStartParcours }: { onStartParcours: () => void }) {
  const activeMode = useTrainingModeStore(s => s.active_mode);
  
  // Only show in standard mode
  if (activeMode !== 'standard') return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[11px] text-navy-400 shrink-0 font-medium">Modes :</span>
      <button
        onClick={onStartParcours}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium',
          'border border-violet-200 bg-violet-50 text-violet-700',
          'hover:bg-violet-100 hover:border-violet-300 transition-all',
        )}
      >
        <Rocket className="h-3 w-3" />
        Parcours Inverse
      </button>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-cream-200 bg-cream-25 text-navy-400">
        <BellRing className="h-3 w-3" />
        Coach Autonome
        <span className="text-[9px] text-navy-300">(auto)</span>
      </div>
    </div>
  );
}

// ─── Knowledge Map Dashboard Widget ────────────────────────────────────

function KnowledgeMapWidget() {
  const knowledgeLastUpdated = useUserKnowledgeStore(s => s.last_updated);
  const knowledgeItems = useUserKnowledgeStore(s => s.items);
  const stats = useMemo(() => useUserKnowledgeStore.getState().getStats(), [knowledgeItems, knowledgeLastUpdated]);
  const reviewSummary = useMemo(() => getReviewSummary(), [knowledgeLastUpdated]);

  if (stats.total_items === 0) return null;

  const masteredPct = stats.total_items > 0 ? Math.round((stats.mastered_count / stats.total_items) * 100) : 0;

  return (
    <Card className="!py-0 overflow-hidden">
      <div className="flex items-stretch">
        {/* Left: stats */}
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-navy-900">Memoire Vivante</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold text-navy-900">{stats.total_items}</p>
              <p className="text-[10px] text-navy-400">mots rencontres</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.mastered_count}</p>
              <p className="text-[10px] text-navy-400">maitrises ({masteredPct}%)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.due_for_review}</p>
              <p className="text-[10px] text-navy-400">a reviser</p>
            </div>
          </div>
          {/* Mastery bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-cream-100">
            {stats.by_mastery.mastered > 0 && <div className="bg-emerald-400" style={{ width: `${(stats.by_mastery.mastered / stats.total_items) * 100}%` }} />}
            {stats.by_mastery.familiar > 0 && <div className="bg-teal-400" style={{ width: `${(stats.by_mastery.familiar / stats.total_items) * 100}%` }} />}
            {stats.by_mastery.learning > 0 && <div className="bg-amber-400" style={{ width: `${(stats.by_mastery.learning / stats.total_items) * 100}%` }} />}
            {stats.by_mastery.seen > 0 && <div className="bg-sky-300" style={{ width: `${(stats.by_mastery.seen / stats.total_items) * 100}%` }} />}
          </div>
        </div>
        {/* Right: SRS alert */}
        {reviewSummary.due_count > 0 && (
          <Link href="/revisions" className="flex items-center justify-center w-32 bg-gradient-to-br from-blue-50 to-teal-50 border-l border-cream-100 hover:from-blue-100 hover:to-teal-100 transition-colors">
            <div className="text-center px-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-600">{reviewSummary.due_count}</p>
              <p className="text-[10px] text-navy-400">mots a reviser</p>
            </div>
          </Link>
        )}
      </div>
    </Card>
  );
}
