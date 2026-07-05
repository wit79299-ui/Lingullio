'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGamificationStore, type SessionHistoryEntry } from '@/stores/gamification-store';
import { BADGES, RARITY_COLORS, type BadgeDefinition } from '@/lib/gamification/badges';
import { levelTitle, xpForLevel } from '@/lib/gamification/xp-config';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Calendar, Award, Zap, Flame, Target,
  Star, Clock, CheckCircle2, BarChart3, Trophy,
  Brain, BookOpen, AlertTriangle,
} from 'lucide-react';
import { useUserKnowledgeStore, type KnowledgeItem, type MasteryLevel, type ContentItemType } from '@/stores/user-knowledge-store';
import { HSK_VOCAB_COUNTS } from '@/stores/training-mode-store';

export default function ProgressPage() {
  const total_xp = useGamificationStore(s => s.total_xp);
  const level = useGamificationStore(s => s.level);
  const streak_days = useGamificationStore(s => s.streak_days);
  const longest_streak = useGamificationStore(s => s.longest_streak);
  const badges_unlocked = useGamificationStore(s => s.badges_unlocked);
  const perfect_sessions = useGamificationStore(s => s.perfect_sessions);
  const total_exercises = useGamificationStore(s => s.total_exercises);
  const total_correct = useGamificationStore(s => s.total_correct);
  const total_study_minutes = useGamificationStore(s => s.total_study_minutes);
  const sessions_history = useGamificationStore(s => s.sessions_history);

  const levelInfo = useMemo(() => useGamificationStore.getState().getLevelInfo(), [level, total_xp]);
  const accuracy = total_exercises > 0 ? Math.round((total_correct / total_exercises) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-teal-500" />
          My progress
        </h1>
        <p className="text-sm text-navy-400 mt-1">
          Track your progress over time
        </p>
      </header>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="XP Total"
          value={total_xp.toLocaleString()}
          color="emerald"
        />
        <StatCard
          icon={Star}
          label="Level"
          value={`${level}`}
          subtitle={levelTitle(level)}
          color="amber"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${streak_days}j`}
          subtitle={`Best: ${longest_streak}d`}
          color="orange"
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={`${accuracy}%`}
          subtitle={`${total_correct}/${total_exercises}`}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Calendar (30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-500" />
              Activity calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityCalendar sessions={sessions_history} />
          </CardContent>
        </Card>

        {/* XP Progression Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-500" />
              XP Progress (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <XpChart sessions={sessions_history} />
          </CardContent>
        </Card>
      </div>

      {/* Level Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Level progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LevelTimeline currentLevel={level} totalXp={total_xp} />
        </CardContent>
      </Card>

      {/* All Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-purple-500" />
            Badge collection ({badges_unlocked.length}/{BADGES.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGallery unlocked={badges_unlocked} />
        </CardContent>
      </Card>

      {/* Knowledge Map */}
      <KnowledgeMapSection />

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-teal-500" />
            Detailed statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <DetailStat label="Exercises done" value={total_exercises} icon="📝" />
            <DetailStat label="Correct answers" value={total_correct} icon="✅" />
            <DetailStat label="Perfect sessions" value={perfect_sessions} icon="✨" />
            <DetailStat label="Study time" value={`${Math.floor(total_study_minutes / 60)}h${(total_study_minutes % 60).toString().padStart(2, '0')}`} icon="⏱️" />
            <DetailStat label="Active days" value={new Set(sessions_history.map(s => s.date)).size} icon="📅" />
            <DetailStat label="Current streak" value={`${streak_days} days`} icon="🔥" />
            <DetailStat label="Longest streak" value={`${longest_streak} days`} icon="🏆" />
            <DetailStat label="Badges unlocked" value={badges_unlocked.length} icon="🏅" />
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
                title={`${day.date}: ${day.xp} XP, ${day.exercises} exercises`}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-[9px] text-navy-400">Less</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={cn('w-3 h-3 rounded-sm', [
            'bg-cream-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'
          ][i])} />
        ))}
        <span className="text-[9px] text-navy-400">More</span>
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
        <span>30 days ago</span>
        <span>Today</span>
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-navy-500"><strong className="text-navy-900">{totalXp}</strong> XP in 30d</span>
        <span className="text-navy-500"><strong className="text-navy-900">{activeDays}</strong> active days</span>
        <span className="text-navy-500"><strong className="text-navy-900">{activeDays > 0 ? Math.round(totalXp / activeDays) : 0}</strong> XP/active day</span>
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
    { key: 'streak', label: 'Streaks', icon: '🔥' },
    { key: 'practice', label: 'Practice', icon: '📝' },
    { key: 'mastery', label: 'Mastery', icon: '🎓' },
    { key: 'exam', label: 'Exams', icon: '📋' },
    { key: 'milestone', label: 'Milestones', icon: '⭐' },
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

// ─── Knowledge Map Section ─────────────────────────────────────────────────

function KnowledgeMapSection() {
  const knowledgeItems = useUserKnowledgeStore(s => s.items);
  const knowledgeLastUpdated = useUserKnowledgeStore(s => s.last_updated);
  const stats = useMemo(() => useUserKnowledgeStore.getState().getStats(), [knowledgeItems, knowledgeLastUpdated]);
  const weakest = useMemo(() => useUserKnowledgeStore.getState().getWeakestItems(8), [knowledgeItems, knowledgeLastUpdated]);

  if (stats.total_items === 0) {
    return (
      <Card className="border-dashed border-2 border-cream-200">
        <CardContent className="pt-5 text-center py-10">
          <Brain className="h-10 w-10 text-navy-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-navy-500">Living Memory</p>
          <p className="text-xs text-navy-400 mt-1 max-w-xs mx-auto">
            Start exercises to fill your knowledge map.
            Every word learned will be tracked here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const masteryColors: Record<MasteryLevel, { bg: string; text: string; label: string }> = {
    mastered: { bg: 'bg-emerald-400', text: 'text-emerald-700', label: 'Mastered' },
    familiar: { bg: 'bg-teal-400', text: 'text-teal-700', label: 'Familiar' },
    learning: { bg: 'bg-amber-400', text: 'text-amber-700', label: 'Learning' },
    seen: { bg: 'bg-cream-300', text: 'text-navy-500', label: 'Seen' },
    unknown: { bg: 'bg-cream-100', text: 'text-navy-300', label: 'Unknown' },
  };

  const totalSeen = stats.by_mastery.mastered + stats.by_mastery.familiar + stats.by_mastery.learning + stats.by_mastery.seen;

  return (
    <>
      {/* Knowledge overview stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-teal-500" />
            Living Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mastery bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-navy-500">{totalSeen} items encountered</span>
              <span className="font-bold text-emerald-600">{stats.by_mastery.mastered} mastered</span>
            </div>
            <div className="h-5 bg-cream-100 rounded-full overflow-hidden flex">
              {(['mastered', 'familiar', 'learning', 'seen'] as MasteryLevel[]).map((level) => {
                const count = stats.by_mastery[level];
                if (count === 0) return null;
                const pct = (count / Math.max(1, totalSeen)) * 100;
                return (
                  <div
                    key={level}
                    className={cn('h-full transition-all duration-500', masteryColors[level].bg)}
                    style={{ width: `${pct}%` }}
                    title={`${masteryColors[level].label}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {(['mastered', 'familiar', 'learning', 'seen'] as MasteryLevel[]).map((level) => {
                const count = stats.by_mastery[level];
                if (count === 0) return null;
                return (
                  <span key={level} className="flex items-center gap-1 text-[10px]">
                    <span className={cn('w-2.5 h-2.5 rounded-full', masteryColors[level].bg)} />
                    <span className={masteryColors[level].text}>{masteryColors[level].label}: {count}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* By type */}
          <div className="grid grid-cols-3 gap-3">
            {(['vocabulary', 'character', 'grammar'] as ContentItemType[]).map((type) => {
              const count = stats.by_type[type];
              const icons = { vocabulary: '📝', character: '字', grammar: '📐' };
              const labels = { vocabulary: 'Vocabulary', character: 'Characters', grammar: 'Grammar' };
              return (
                <div key={type} className="bg-cream-25 rounded-xl p-3 border border-cream-100 text-center">
                  <span className="text-lg">{icons[type]}</span>
                  <p className="text-lg font-bold text-navy-900 mt-1">{count}</p>
                  <p className="text-[10px] text-navy-400">{labels[type]}</p>
                </div>
              );
            })}
          </div>

          {/* HSK Heatmap */}
          <div>
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">Mastery by HSK level</p>
            <div className="space-y-2">
              {Object.entries(stats.by_hsk)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([hsk, data]) => {
                  const totalForHsk = HSK_VOCAB_COUNTS[parseInt(hsk)] ?? data.total;
                  const masteredPct = totalForHsk > 0 ? Math.round((data.mastered / totalForHsk) * 100) : 0;
                  const learningPct = totalForHsk > 0 ? Math.round((data.learning / totalForHsk) * 100) : 0;
                  return (
                    <div key={hsk}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-navy-700">HSK {hsk}</span>
                        <span className="text-navy-400">
                          {data.mastered}/{totalForHsk} mastered ({masteredPct}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-400 rounded-l-full"
                          style={{ width: `${masteredPct}%` }}
                        />
                        <div
                          className="h-full bg-amber-300"
                          style={{ width: `${learningPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* SRS status */}
          {stats.due_for_review > 0 && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-700">
                  {stats.due_for_review} item{stats.due_for_review > 1 ? 's' : ''} to review
                </p>
                <p className="text-[10px] text-blue-600">SRS review optimizes long-term memorization</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weakest Items */}
      {weakest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Weak points ({weakest.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weakest.map((item) => {
                const accuracy = Math.round((item.times_correct / item.times_seen) * 100);
                return (
                  <div key={item.item_id} className="bg-red-50 rounded-xl p-2.5 border border-red-200">
                    <p className="text-lg font-bold text-navy-900 leading-tight">{item.display}</p>
                    <p className="text-[10px] text-navy-500 truncate">{item.pinyin}</p>
                    <p className="text-[10px] text-navy-400 truncate">{item.meaning}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-red-600 font-bold">{accuracy}%</span>
                      <span className="text-[10px] text-navy-300">{item.times_correct}/{item.times_seen}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
