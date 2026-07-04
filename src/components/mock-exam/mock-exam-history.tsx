'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Trophy, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────────────────

export function MockExamHistory() {
  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      setHistory(data.reverse()); // most recent first
    } catch {}
    setLoaded(true);
  }, []);

  if (!loaded || history.length === 0) return null;

  // Stats summary
  const totalExams = history.length;
  const passedExams = history.filter(h => h.passed).length;
  const avgPercent = Math.round(history.reduce((s, h) => s + h.percent, 0) / totalExams);
  const bestPercent = Math.max(...history.map(h => h.percent));
  const totalXp = history.reduce((s, h) => s + (h.xpEarned ?? 0), 0);

  // Trend: last 3 vs previous 3
  const recent3 = history.slice(0, 3);
  const prev3 = history.slice(3, 6);
  const recentAvg = recent3.length > 0 ? Math.round(recent3.reduce((s, h) => s + h.percent, 0) / recent3.length) : 0;
  const prevAvg = prev3.length > 0 ? Math.round(prev3.reduce((s, h) => s + h.percent, 0) / prev3.length) : 0;
  const trend = prev3.length > 0 ? recentAvg - prevAvg : 0;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <Card className="!py-0 overflow-hidden">
        <div className="bg-gradient-to-r from-navy-50 via-cream-50 to-teal-50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-navy-900">Historique des examens blancs</h2>
              <p className="text-xs text-navy-400">{totalExams} examen{totalExams > 1 ? 's' : ''} passe{totalExams > 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-navy-900">{passedExams}/{totalExams}</p>
              <p className="text-[10px] text-navy-400">reussis</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-navy-900">{avgPercent}%</p>
              <p className="text-[10px] text-navy-400">moyenne</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">{bestPercent}%</p>
              <p className="text-[10px] text-navy-400">meilleur</p>
            </div>
            <div className="text-center">
              <p className={cn('text-xl font-bold', trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-navy-500')}>
                {trend > 0 ? '+' : ''}{trend}%
              </p>
              <p className="text-[10px] text-navy-400">tendance</p>
            </div>
          </div>
        </div>
      </Card>

      {/* History entries */}
      <div className="space-y-2">
        {history.map((entry, i) => {
          const isExpanded = expanded === i;
          const date = new Date(entry.completedAt);
          const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const level = entry.courseSlug?.replace('hsk-', '').toUpperCase() ?? '?';

          return (
            <div key={i} className="rounded-xl border border-cream-100 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cream-25 transition-colors"
              >
                {/* Pass/fail indicator */}
                {entry.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                )}

                {/* Level badge */}
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-navy-50 text-navy-700 shrink-0">
                  HSK {level}
                </span>

                {/* Score */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{entry.examTitle}</p>
                  <p className="text-xs text-navy-400">{dateStr} a {timeStr}</p>
                </div>

                {/* Score percent */}
                <span className={cn(
                  'text-lg font-bold shrink-0',
                  entry.percent >= 60 ? 'text-emerald-600' : entry.percent >= 40 ? 'text-amber-600' : 'text-red-500'
                )}>
                  {entry.percent}%
                </span>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-navy-300 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-navy-300 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-cream-100 pt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-sm font-bold text-navy-900">{entry.totalCorrect}/{entry.totalQuestions}</p>
                      <p className="text-[10px] text-navy-400">bonnes reponses</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-900">{formatTime(entry.timeSpent)}</p>
                      <p className="text-[10px] text-navy-400">duree</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-teal-600">+{entry.xpEarned ?? 0} XP</p>
                      <p className="text-[10px] text-navy-400">gagnes</p>
                    </div>
                  </div>

                  {/* Section breakdown */}
                  {entry.sectionResults && entry.sectionResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider">Par section</p>
                      {entry.sectionResults.map((sr, j) => {
                        const pct = sr.max > 0 ? Math.round((sr.earned / sr.max) * 100) : 0;
                        return (
                          <div key={j} className="flex items-center gap-3">
                            <span className="text-xs text-navy-500 w-20 shrink-0 truncate">{sr.sectionTitle}</span>
                            <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-300'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-navy-400 w-12 text-right">{sr.correct}/{sr.total}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
