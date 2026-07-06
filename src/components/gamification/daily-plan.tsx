'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore, type SessionHistoryEntry } from '@/stores/gamification-store';
import { Link } from '@/i18n/navigation';
import {
  BookOpen, Brain, Trophy, RefreshCw, Flame,
  CheckCircle2, ChevronRight, Zap, Target, Star,
  Clock, TrendingUp, Sparkles, GraduationCap, AlertCircle,
} from 'lucide-react';
import { getReviewSummary, type ReviewSummary } from '@/lib/gamification/knowledge-tracker';
import { useUserKnowledgeStore } from '@/stores/user-knowledge-store';

// ─── Types ──────────────────────────────────────────────────────────────

interface PlanItem {
  id: string;
  type: 'lesson' | 'revision' | 'mock_exam' | 'practice' | 'challenge';
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  xpEstimate: number;
  durationMinutes: number;
  priority: number; // lower = higher priority
  reason: string; // pedagogical reason
}

// ─── Plan Generation Engine ─────────────────────────────────────────────

function generateDailyPlan(state: {
  total_xp: number;
  level: number;
  streak_days: number;
  total_exercises: number;
  total_correct: number;
  daily_exercises: number;
  daily_xp: number;
  sessions_history: SessionHistoryEntry[];
  perfect_sessions: number;
  total_study_minutes: number;
  reviewSummary: ReviewSummary | null;
}): PlanItem[] {
  const items: PlanItem[] = [];
  const accuracy = state.total_exercises > 0
    ? Math.round((state.total_correct / state.total_exercises) * 100)
    : 0;

  // Recent performance analysis
  const recentSessions = state.sessions_history.slice(-7);
  const recentAvgAccuracy = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((s, e) => s + e.percentage, 0) / recentSessions.length)
    : 0;

  const hasStudiedToday = state.daily_exercises > 0;
  const isNewUser = state.total_exercises < 10;
  const isStruggling = recentAvgAccuracy > 0 && recentAvgAccuracy < 60;
  const isExcelling = recentAvgAccuracy > 85;

  // ── 1. Always suggest continuing lessons ──
  items.push({
    id: 'continue-lesson',
    type: 'lesson',
    title: isNewUser ? 'Start courses' : 'Continue courses',
    subtitle: isNewUser
      ? 'Discover your first HSK lesson'
      : 'Pick up where you left off',
    href: '/courses',
    icon: BookOpen,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    xpEstimate: 50,
    durationMinutes: 15,
    priority: hasStudiedToday ? 3 : 1,
    reason: isNewUser
      ? 'The best time to start is now!'
      : 'Consistency is the key to success',
  });

  // ── 2. SRS Revisions (connected to real Knowledge Map data) ──
  const rs = state.reviewSummary;
  const dueCount = rs?.due_count ?? 0;
  if (dueCount > 0 || state.total_exercises >= 5) {
    const urgentWords = rs?.urgent_items?.slice(0, 3).map(w => w.display).join(', ') ?? '';
    items.push({
      id: 'srs-review',
      type: 'revision',
      title: dueCount > 0 ? `SRS Review (${dueCount} words)` : 'SRS Review',
      subtitle: dueCount > 0
        ? urgentWords ? `To review: ${urgentWords}...` : `${dueCount} items due for review`
        : isStruggling ? 'Strengthen your weak points' : 'Consolidate what you know',
      href: '/revisions',
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      xpEstimate: Math.max(30, dueCount * 3),
      durationMinutes: Math.max(5, Math.ceil(dueCount * 0.5)),
      priority: dueCount >= 10 ? 0 : isStruggling ? 1 : 2,
      reason: dueCount > 0
        ? `${dueCount} words are waiting for SRS review - memory fades without practice`
        : 'Spaced repetition optimizes long-term memorization',
    });
  }

  // ── 3. Mock Exam (when ready) ──
  if (state.total_exercises >= 30 && !isStruggling) {
    items.push({
      id: 'mock-exam',
      type: 'mock_exam',
      title: 'Mock exam',
      subtitle: isExcelling
        ? 'Your level is excellent, try the exam!'
        : 'Test yourself in real conditions',
      href: '/mock-exams',
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      xpEstimate: 150,
      durationMinutes: 30,
      priority: isExcelling ? 2 : 4,
      reason: isExcelling
        ? 'With ' + recentAvgAccuracy + '% accuracy, you are ready for the test'
        : 'Mock exams effectively prepare you for the real HSK',
    });
  }

  // ── 4. Daily Challenge ──
  if (!hasStudiedToday) {
    items.push({
      id: 'daily-challenge',
      type: 'challenge',
      title: 'Daily challenge',
      subtitle: 'A quick mini-exercise to maintain your streak',
      href: '/daily-challenge',
      icon: Target,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      xpEstimate: 20,
      durationMinutes: 3,
      priority: state.streak_days > 0 ? 0 : 5, // Top priority if streak at risk!
      reason: state.streak_days > 0
        ? `Maintain your ${state.streak_days}-day streak!`
        : 'A quick exercise to get started',
    });
  }

  // ── 5. Focused Practice (when accuracy is inconsistent) ──
  if (state.total_exercises >= 20 && accuracy > 0 && accuracy < 80) {
    items.push({
      id: 'focused-practice',
      type: 'practice',
      title: 'Entrainement cible',
      subtitle: 'Work on areas where you struggle',
      href: '/courses',
      icon: Target,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      xpEstimate: 40,
      durationMinutes: 10,
      priority: 3,
      reason: `Current accuracy: ${accuracy}%. Target: 80%+`,
    });
  }

  // Sort by priority
  items.sort((a, b) => a.priority - b.priority);

  // Return max 4 items for a focused plan
  return items.slice(0, 4);
}

// ─── Daily Plan Component ────────────────────────────────────────────────

export function DailyPlan({ className }: { className?: string }) {
  // Use individual selectors to avoid re-renders from unrelated store changes
  const total_xp = useGamificationStore(s => s.total_xp);
  const level = useGamificationStore(s => s.level);
  const streak_days = useGamificationStore(s => s.streak_days);
  const total_exercises = useGamificationStore(s => s.total_exercises);
  const total_correct = useGamificationStore(s => s.total_correct);
  const daily_exercises = useGamificationStore(s => s.daily_exercises);
  const daily_xp = useGamificationStore(s => s.daily_xp);
  const sessions_history = useGamificationStore(s => s.sessions_history);
  const perfect_sessions = useGamificationStore(s => s.perfect_sessions);
  const total_study_minutes = useGamificationStore(s => s.total_study_minutes);

  // Get Knowledge Map review data
  const knowledgeLastUpdated = useUserKnowledgeStore(s => s.last_updated);
  const reviewSummary = useMemo(() => {
    try { return getReviewSummary(); } catch { return null; }
  }, [knowledgeLastUpdated]); // eslint-disable-line react-hooks/exhaustive-deps

  const planItems = useMemo(() => generateDailyPlan({
    total_xp,
    level,
    streak_days,
    total_exercises,
    total_correct,
    daily_exercises,
    daily_xp,
    sessions_history,
    perfect_sessions,
    total_study_minutes,
    reviewSummary,
  }), [
    total_xp, level, streak_days,
    total_exercises, total_correct,
    daily_exercises, daily_xp,
    sessions_history, perfect_sessions, total_study_minutes,
    reviewSummary,
  ]);

  const totalXpEstimate = planItems.reduce((s, i) => s + i.xpEstimate, 0);
  const totalMinutes = planItems.reduce((s, i) => s + i.durationMinutes, 0);
  const completedToday = daily_exercises;

  // Motivational message
  const motivMessage = getMotivationalMessage(streak_days, daily_xp, level);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-900">Plan du jour</h3>
            <p className="text-[10px] text-navy-400">
              ~{totalMinutes} min &middot; ~{totalXpEstimate} XP potentiels
            </p>
          </div>
        </div>
        {completedToday > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" />
            {completedToday} fait{completedToday > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Motivational message */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl p-3 border border-sky-100">
        <p className="text-xs text-navy-600 leading-relaxed">
          <Sparkles className="h-3.5 w-3.5 inline text-sky-500 mr-1" />
          {motivMessage}
        </p>
      </div>

      {/* Plan items */}
      <div className="space-y-2.5">
        {planItems.map((item, index) => (
          <Link key={item.id} href={item.href}>
            <PlanItemCard item={item} index={index} />
          </Link>
        ))}
      </div>

      {/* SRS due alert */}
      {reviewSummary && reviewSummary.due_count > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-700">
              {reviewSummary.due_count} word{reviewSummary.due_count > 1 ? 's' : ''} to review
            </p>
            <p className="text-[10px] text-blue-600">
              {reviewSummary.urgent_items.slice(0, 3).map(w => w.display).join(' · ')}
              {reviewSummary.due_count > 3 ? ` +${reviewSummary.due_count - 3} autres` : ''}
            </p>
          </div>
          <Link href="/revisions">
            <ChevronRight className="h-4 w-4 text-blue-400" />
          </Link>
        </div>
      )}

      {/* Streak protection reminder */}
      {streak_days > 0 && daily_exercises === 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-orange-50 border border-orange-200">
          <Flame className="h-5 w-5 text-orange-500 animate-streak-fire shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-orange-700">
              Serie en danger !
            </p>
            <p className="text-[10px] text-orange-600">
              Complete at least 1 exercise to maintain your {streak_days}-day streak
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plan Item Card ──────────────────────────────────────────────────────

function PlanItemCard({ item, index }: { item: PlanItem; index: number }) {
  const Icon = item.icon;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group',
      'hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
      item.bgColor, item.borderColor,
    )}>
      {/* Step number */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold text-navy-300">{index + 1}</span>
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm shrink-0',
        )}>
          <Icon className={cn('h-5 w-5', item.color)} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900">{item.title}</p>
        <p className="text-[11px] text-navy-400 truncate">{item.subtitle}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
            <Zap className="h-2.5 w-2.5" />
            ~{item.xpEstimate} XP
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-navy-400">
            <Clock className="h-2.5 w-2.5" />
            ~{item.durationMinutes} min
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-navy-500 shrink-0 transition-colors" />
    </div>
  );
}

// ─── Motivational Message Generator ──────────────────────────────────────

function getMotivationalMessage(streakDays: number, dailyXp: number, level: number): string {
  if (dailyXp > 100) {
    return 'Exceptional day! You have already earned over 100 XP. Keep it up!';
  }
  if (dailyXp > 50) {
    return 'Great work today! Just a little more effort for a perfect day.';
  }
  if (streakDays >= 30) {
    return `${streakDays} days in a row! Your discipline is remarkable. Your Chinese is progressing fast.`;
  }
  if (streakDays >= 7) {
    return `Great job on your ${streakDays}-day streak! Consistency pays off: your brain forms new connections every day.`;
  }
  if (streakDays > 0 && dailyXp === 0) {
    return `Don't forget your daily session to keep your ${streakDays}-day streak! Even 5 minutes count.`;
  }
  if (level <= 2) {
    return 'Every expert was once a beginner. Start with the basics and progress at your own pace!';
  }
  return 'A little every day is better than a lot rarely. Chinese is learned word by word, character by character.';
}

// ─── Compact variant for sidebar ─────────────────────────────────────────

export function DailyPlanCompact({ className }: { className?: string }) {
  const daily_exercises_compact = useGamificationStore(s => s.daily_exercises);
  const daily_xp_compact = useGamificationStore(s => s.daily_xp);
  const hasStudiedToday = daily_exercises_compact > 0;

  return (
    <div className={cn('rounded-xl p-3', className)}>
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="h-4 w-4 text-teal-500" />
        <span className="text-xs font-bold text-navy-700">Aujourd&apos;hui</span>
      </div>

      {hasStudiedToday ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-500">{daily_exercises_compact} exercices</span>
            <span className="text-emerald-600 font-bold">+{daily_xp_compact} XP</span>
          </div>
          <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (daily_xp_compact / 100) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-navy-400 text-center">
            {daily_xp_compact >= 100 ? 'Goal reached!' : `${100 - daily_xp_compact} XP to goal`}
          </p>
        </div>
      ) : (
        <Link href="/courses">
          <div className="flex items-center gap-2 text-[11px] text-navy-500 hover:text-teal-600 transition-colors cursor-pointer">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Start your daily session</span>
            <ChevronRight className="h-3 w-3 ml-auto" />
          </div>
        </Link>
      )}
    </div>
  );
}
