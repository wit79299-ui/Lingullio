'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trophy, Clock, Target, TrendingUp, ChevronDown, ChevronUp,
  Check, X, Calendar, BarChart3, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface ExamHistoryEntry {
  examId: string;
  examTitle: string;
  courseSlug: string;
  totalEarned: number;
  totalPoints: number;
  totalCorrect: number;
  totalQuestions: number;
  percent: number;
  passed: boolean;
  timeSpent: number;
  completedAt: string;
  xpEarned: number;
  sectionResults: Array<{
    sectionTitle: string;
    earned: number;
    max: number;
    correct: number;
    total: number;
  }>;
}

const STORAGE_KEY = 'lingullio_mock_exam_history';

// ─── Main Component ─────────────────────────────────────────────────────

export function MockExamHistory() {
  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as ExamHistoryEntry[];
        setHistory(data.reverse()); // Most recent first
      }
    } catch {}
  }, []);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const totalAttempts = history.length;
    const passCount = history.filter(h => h.passed).length;
    const avgPercent = Math.round(history.reduce((s, h) => s + h.percent, 0) / totalAttempts);
    const bestScore = Math.max(...history.map(h => h.percent));
    const totalXp = history.reduce((s, h) => s + (h.xpEarned ?? 0), 0);
    // Trend: compare last 3 vs first 3
    const recent = history.slice(0, Math.min(3, history.length));
    const older = history.slice(Math.max(0, history.length - 3));
    const recentAvg = recent.reduce((s, h) => s + h.percent, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.percent, 0) / older.length;
    const trend = history.length >= 2 ? recentAvg - olderAvg : 0;
    return { totalAttempts, passCount, avgPercent, bestScore, totalXp, trend };
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-teal-500" />
        Historique des examens
      </h2>

      {/* Global stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat
            icon={Trophy}
            value={`${stats.passCount}/${stats.totalAttempts}`}
            label="Reussis"
            color={stats.passCount > 0 ? 'text-emerald-600' : 'text-navy-600'}
          />
          <MiniStat
            icon={Target}
            value={`${stats.avgPercent}%`}
            label="Score moyen"
            color="text-navy-600"
          />
          <MiniStat
            icon={Award}
            value={`${stats.bestScore}%`}
            label="Meilleur score"
            color="text-teal-600"
          />
          <MiniStat
            icon={TrendingUp}
            value={`${stats.trend >= 0 ? '+' : ''}${Math.round(stats.trend)}%`}
            label="Tendance"
            color={stats.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}
          />
        </div>
      )}

      {/* History entries */}
      <div className="space-y-2">
        {history.map((entry, idx) => {
          const isExpanded = expandedEntry === idx;
          const date = new Date(entry.completedAt);
          const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const level = entry.courseSlug.replace('hsk-', '').toUpperCase();

          return (
            <Card key={idx} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedEntry(isExpanded ? null : idx)}
                className="w-full text-left"
              >
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                      entry.passed ? 'bg-emerald-50' : 'bg-red-50'
                    )}>
                      {entry.passed ? (
                        <Check className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">{level}</span>
                        <span className="text-sm font-medium text-navy-900 truncate">{entry.examTitle}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-navy-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateStr} {timeStr}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(entry.timeSpent / 60)}min
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        'text-lg font-bold',
                        entry.passed ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {entry.percent}%
                      </p>
                      <p className="text-[10px] text-navy-400">
                        {entry.totalEarned}/{entry.totalPoints}
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-navy-300 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-navy-300 shrink-0" />
                    )}
                  </div>
                </CardContent>
              </button>

              {isExpanded && entry.sectionResults && (
                <div className="px-5 pb-4 border-t border-cream-50 pt-3 space-y-2">
                  {entry.sectionResults.map((sr, i) => {
                    const srPct = sr.max > 0 ? Math.round((sr.earned / sr.max) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-navy-500 w-24 shrink-0 truncate">{sr.sectionTitle}</span>
                        <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              srPct >= 70 ? 'bg-emerald-400' : srPct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                            )}
                            style={{ width: `${srPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-navy-400 w-16 text-right">{sr.earned}/{sr.max}</span>
                      </div>
                    );
                  })}
                  {entry.xpEarned > 0 && (
                    <p className="text-xs text-teal-600 mt-2">+{entry.xpEarned} XP gagnes</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini Stat Card ─────────────────────────────────────────────────────

function MiniStat({ icon: Icon, value, label, color }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <Card className="!py-0">
      <CardContent className="py-2.5 flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cream-50 shrink-0">
          <Icon className="h-4 w-4 text-navy-500" />
        </div>
        <div>
          <p className={cn('text-sm font-bold', color)}>{value}</p>
          <p className="text-[10px] text-navy-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
