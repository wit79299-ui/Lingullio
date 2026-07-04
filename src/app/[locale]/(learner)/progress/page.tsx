'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGamificationStore, type SessionHistoryEntry } from '@/stores/gamification-store';
import { BADGES, RARITY_COLORS, type BadgeDefinition } from '@/lib/gamification/badges';
import { levelTitle, xpForLevel } from '@/lib/gamification/xp-config';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Calendar, Award, Zap, Flame, Target,
  Star, Clock, CheckCircle2, BarChart3, Trophy,
} from 'lucide-react';

export default function ProgressPage() {
  const store = useGamificationStore();
  const levelInfo = store.getLevelInfo();
  const accuracy = store.total_exercises > 0 ? Math.round((store.total_correct / store.total_exercises) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-teal-500" />
          Ma progression
        </h1>
        <p className="text-sm text-navy-400 mt-1">
          Suivez votre evolution dans le temps
        </p>
      </header>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="XP Total"
          value={store.total_xp.toLocaleString()}
          color="emerald"
        />
        <StatCard
          icon={Star}
          label="Niveau"
          value={`${store.level}`}
          subtitle={levelTitle(store.level)}
          color="amber"
        />
        <StatCard
          icon={Flame}
          label="Serie"
          value={`${store.streak_days}j`}
          subtitle={`Record: ${store.longest_streak}j`}
          color="orange"
        />
        <StatCard
          icon={Target}
          label="Precision"
          value={`${accuracy}%`}
          subtitle={`${store.total_correct}/${store.total_exercises}`}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Calendar (30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-500" />
              Calendrier d&apos;activite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityCalendar sessions={store.sessions_history} />
          </CardContent>
        </Card>

        {/* XP Progression Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-500" />
              Progression XP (30 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <XpChart sessions={store.sessions_history} />
          </CardContent>
        </Card>
      </div>

      {/* Level Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Progression de niveau
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LevelTimeline currentLevel={store.level} totalXp={store.total_xp} />
        </CardContent>
      </Card>

      {/* All Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-purple-500" />
            Collection de badges ({store.badges_unlocked.length}/{BADGES.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGallery unlocked={store.badges_unlocked} />
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-teal-500" />
            Statistiques detaillees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <DetailStat label="Exercices faits" value={store.total_exercises} icon="📝" />
            <DetailStat label="Reponses correctes" value={store.total_correct} icon="✅" />
            <DetailStat label="Sessions parfaites" value={store.perfect_sessions} icon="✨" />
            <DetailStat label="Temps d'etude" value={`${Math.floor(store.total_study_minutes / 60)}h${(store.total_study_minutes % 60).toString().padStart(2, '0')}`} icon="⏱️" />
            <DetailStat label="Jours actifs" value={new Set(store.sessions_history.map(s => s.date)).size} icon="📅" />
            <DetailStat label="Serie actuelle" value={`${store.streak_days} jours`} icon="🔥" />
            <DetailStat label="Plus longue serie" value={`${store.longest_streak} jours`} icon="🏆" />
            <DetailStat label="Badges debloques" value={store.badges_unlocked.length} icon="🏅" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtitle, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  color: 'emerald' | 'amber' | 'orange' | 'blue';
}) {
  const bgColors = {
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    orange: 'bg-orange-50 border-orange-100',
    blue: 'bg-blue-50 border-blue-100',
  };
  const iconColors = {
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    orange: 'text-orange-500',
    blue: 'text-blue-500',
  };

  return (
    <div className={cn('rounded-xl border p-4', bgColors[color])}>
      <Icon className={cn('h-5 w-5 mb-2', iconColors[color])} />
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-xs text-navy-500">{label}</p>
      {subtitle && <p className="text-[10px] text-navy-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Activity Calendar ──────────────────────────────────────────────────

function ActivityCalendar({ sessions }: { sessions: SessionHistoryEntry[] }) {
  const today = new Date();
  const sessionMap = new Map<string, { xp: number; exercises: number }>();

  sessions.forEach(s => {
    const existing = sessionMap.get(s.date) ?? { xp: 0, exercises: 0 };
    sessionMap.set(s.date, {
      xp: existing.xp + s.xp_earned,
      exercises: existing.exercises + s.exercises_done,
    });
  });

  const weeks: Array<Array<{ date: string; xp: number; exercises: number; isToday: boolean }>> = [];
  let currentWeek: typeof weeks[0] = [];

  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const data = sessionMap.get(dateStr) ?? { xp: 0, exercises: 0 };
    const isToday = i === 0;

    currentWeek.push({ date: dateStr, ...data, isToday });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const maxXp = Math.max(...Array.from(sessionMap.values()).map(v => v.xp), 1);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 justify-center">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="w-6 text-[9px] text-navy-400 text-center">{d}</span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-1.5 justify-center">
          {week.map(day => {
            const intensity = day.xp > 0 ? Math.min(4, Math.ceil((day.xp / maxXp) * 4)) : 0;
            const colors = [
              'bg-cream-100',
              'bg-emerald-200',
              'bg-emerald-300',
              'bg-emerald-400',
              'bg-emerald-500',
            ];
            return (
              <div
                key={day.date}
                className={cn(
                  'w-6 h-6 rounded-md transition-colors',
                  colors[intensity],
                  day.isToday && 'ring-2 ring-teal-500 ring-offset-1'
                )}
                title={`${day.date}: ${day.xp} XP, ${day.exercises} exercices`}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-[9px] text-navy-400">Moins</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={cn('w-3 h-3 rounded-sm', [
            'bg-cream-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'
          ][i])} />
        ))}
        <span className="text-[9px] text-navy-400">Plus</span>
      </div>
    </div>
  );
}

// ─── XP Chart (Bar chart, last 30 days) ─────────────────────────────────

function XpChart({ sessions }: { sessions: SessionHistoryEntry[] }) {
  const today = new Date();
  const days: Array<{ date: string; xp: number; label: string }> = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayXp = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.xp_earned, 0);
    days.push({ date: dateStr, xp: dayXp, label: d.getDate().toString() });
  }

  const maxXp = Math.max(...days.map(d => d.xp), 1);
  const totalXp = days.reduce((s, d) => s + d.xp, 0);
  const activeDays = days.filter(d => d.xp > 0).length;

  return (
    <div>
      <div className="flex items-end gap-px h-32 mb-3">
        {days.map((day, i) => {
          const height = day.xp > 0 ? Math.max(4, (day.xp / maxXp) * 100) : 2;
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end"
              title={`${day.date}: ${day.xp} XP`}
            >
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all',
                  day.xp > 0 ? 'bg-teal-400 hover:bg-teal-500' : 'bg-cream-100'
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-navy-400 mb-3">
        <span>Il y a 30j</span>
        <span>Aujourd&apos;hui</span>
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-navy-500"><strong className="text-navy-900">{totalXp}</strong> XP sur 30j</span>
        <span className="text-navy-500"><strong className="text-navy-900">{activeDays}</strong> jours actifs</span>
        <span className="text-navy-500"><strong className="text-navy-900">{activeDays > 0 ? Math.round(totalXp / activeDays) : 0}</strong> XP/jour actif</span>
      </div>
    </div>
  );
}

// ─── Level Timeline ─────────────────────────────────────────────────────

function LevelTimeline({ currentLevel, totalXp }: { currentLevel: number; totalXp: number }) {
  const levels = [];
  for (let l = 1; l <= Math.min(currentLevel + 3, 15); l++) {
    levels.push({
      level: l,
      xp: xpForLevel(l),
      title: levelTitle(l),
      reached: l <= currentLevel,
      current: l === currentLevel,
    });
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {levels.map((l, i) => (
        <div key={l.level} className="flex items-center">
          <div className={cn(
            'flex flex-col items-center gap-1 shrink-0',
            l.current ? 'scale-110' : ''
          )}>
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all',
              l.reached
                ? l.current
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-2 ring-amber-300 ring-offset-2'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-cream-100 text-navy-300 border border-cream-200'
            )}>
              {l.level}
            </div>
            <span className={cn(
              'text-[9px] whitespace-nowrap',
              l.current ? 'text-amber-600 font-bold' : l.reached ? 'text-navy-500' : 'text-navy-300'
            )}>
              {l.title}
            </span>
          </div>
          {i < levels.length - 1 && (
            <div className={cn(
              'w-6 h-0.5 mx-1',
              l.reached ? 'bg-emerald-300' : 'bg-cream-200'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Badge Gallery ──────────────────────────────────────────────────────

function BadgeGallery({ unlocked }: { unlocked: string[] }) {
  const unlockedSet = new Set(unlocked);

  const categories = [
    { key: 'streak', label: 'Series', icon: '🔥' },
    { key: 'practice', label: 'Pratique', icon: '📝' },
    { key: 'mastery', label: 'Maitrise', icon: '🎓' },
    { key: 'exam', label: 'Examens', icon: '📋' },
    { key: 'milestone', label: 'Jalons', icon: '⭐' },
  ];

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const badges = BADGES.filter(b => b.category === cat.key);
        if (badges.length === 0) return null;

        return (
          <div key={cat.key}>
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>{cat.icon}</span> {cat.label}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {badges.map(badge => {
                const isUnlocked = unlockedSet.has(badge.id);
                const colors = RARITY_COLORS[badge.rarity];
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                      isUnlocked
                        ? `${colors.bg} ${colors.border} shadow-sm`
                        : 'bg-cream-25 border-cream-100 opacity-40 grayscale'
                    )}
                  >
                    <span className={cn('text-3xl', !isUnlocked && 'opacity-50')}>
                      {badge.icon}
                    </span>
                    <div>
                      <p className={cn('text-[10px] font-bold leading-tight', isUnlocked ? colors.text : 'text-navy-400')}>
                        {badge.name_fr}
                      </p>
                      <p className="text-[8px] text-navy-400 mt-0.5 leading-tight">
                        {badge.description_fr}
                      </p>
                    </div>
                    {isUnlocked && (
                      <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> +{badge.xp_reward} XP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Stat ────────────────────────────────────────────────────────

function DetailStat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-cream-25 rounded-xl p-3 border border-cream-100">
      <span className="text-lg mb-1 block">{icon}</span>
      <p className="text-lg font-bold text-navy-900">{value}</p>
      <p className="text-[10px] text-navy-400">{label}</p>
    </div>
  );
}
