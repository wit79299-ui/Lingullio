'use client';

import { cn } from '@/lib/utils';
import { useGamificationStore } from '@/stores/gamification-store';
import { Flame, Star, Zap } from 'lucide-react';

// ─── Compact XP Bar (for topbar / mobile) ──────────────────────────────

export function XpBarCompact({ className }: { className?: string }) {
  const { total_xp, level, streak_days } = useGamificationStore();
  const levelInfo = useGamificationStore(s => s.getLevelInfo());

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Streak */}
      {streak_days > 0 && (
        <div className="flex items-center gap-1 text-xs">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="font-bold text-navy-700">{streak_days}</span>
        </div>
      )}

      {/* Level badge + XP bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-black shadow-sm">
          {level}
        </div>
        <div className="w-20 h-2 bg-cream-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
        <span className="text-[10px] text-navy-400 font-mono tabular-nums">
          {total_xp}
        </span>
      </div>
    </div>
  );
}

// ─── Expanded XP Card (for sidebar / dashboard) ────────────────────────

export function XpCardExpanded({ className }: { className?: string }) {
  const { total_xp, level, streak_days, longest_streak, daily_xp } = useGamificationStore();
  const levelInfo = useGamificationStore(s => s.getLevelInfo());

  return (
    <div className={cn('rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 p-4 text-white', className)}>
      <div className="flex items-center justify-between mb-3">
        {/* Level orb */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-black shadow-lg">
            {level}
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-navy-800">
              <Star className="h-3 w-3 text-amber-400" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">{levelInfo.title}</p>
            <p className="text-[11px] text-white/60">Niveau {level}</p>
          </div>
        </div>

        {/* Streak */}
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-lg font-bold">{streak_days}</span>
          </div>
          <p className="text-[10px] text-white/50">jours</p>
        </div>
      </div>

      {/* XP Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/70">
            <Zap className="h-3 w-3 inline mr-0.5 text-teal-400" />
            {total_xp} XP total
          </span>
          <span className="text-white/50">{levelInfo.currentXp}/{levelInfo.nextLevelXp} XP</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-700 ease-out animate-pulse-glow"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>

      {/* Daily stats */}
      {daily_xp > 0 && (
        <p className="text-[10px] text-white/40 mt-2 text-center">
          +{daily_xp} XP aujourd&apos;hui
        </p>
      )}
    </div>
  );
}

// ─── Inline XP Badge (for session results, etc.) ───────────────────────

export function XpBadgeInline({ xp, className }: { xp: number; className?: string }) {
  if (xp <= 0) return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold',
      className
    )}>
      <Zap className="h-3 w-3" />
      +{xp} XP
    </span>
  );
}
