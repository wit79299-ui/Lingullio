'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Clock, Target, TrendingUp, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  sectionResults?: Array<{
    sectionTitle: string;
    earned: number;
    max: number;
    correct: number;
    total: number;
  }>;
}

const HISTORY_KEY = 'lingullio_mock_exam_history';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function getLevelColor(courseSlug: string): string {
  const colors: Record<string, string> = {
    'hsk-1': 'bg-emerald-500',
    'hsk-2': 'bg-sky-500',
    'hsk-3': 'bg-violet-500',
    'hsk-4': 'bg-amber-500',
    'hsk-5': 'bg-rose-500',
    'hsk-6': 'bg-indigo-500',
    'hsk-7-9': 'bg-pink-500',
  };
  return colors[courseSlug] ?? 'bg-gray-500';
}

export function MockExamHistory() {
  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ExamHistoryEntry[];
        // Most recent first
        setHistory(parsed.reverse());
      }
    } catch {
      // ignore
    }
  }, []);

  const handleClear = () => {
    if (confirm('Clear all exam history?')) {
      localStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    }
  };

  if (history.length === 0) return null;

  const displayed = showAll ? history : history.slice(0, 5);

  // Aggregate stats
  const totalExams = history.length;
  const passCount = history.filter(h => h.passed).length;
  const avgPercent = Math.round(history.reduce((s, h) => s + h.percent, 0) / totalExams);
  const bestScore = Math.max(...history.map(h => h.percent));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-500" />
          Your History
        </h2>
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-navy-300 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-xl bg-cream-50 border border-cream-100">
          <p className="text-2xl font-bold text-navy-900">{totalExams}</p>
          <p className="text-xs text-navy-400">Exams taken</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cream-50 border border-cream-100">
          <p className="text-2xl font-bold text-emerald-600">{passCount}</p>
          <p className="text-xs text-navy-400">Passed</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cream-50 border border-cream-100">
          <p className="text-2xl font-bold text-teal-600">{avgPercent}%</p>
          <p className="text-xs text-navy-400">Avg score</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cream-50 border border-cream-100">
          <p className="text-2xl font-bold text-gold-600">{bestScore}%</p>
          <p className="text-xs text-navy-400">Best</p>
        </div>
      </div>

      {/* History list */}
      <div className="space-y-2">
        {displayed.map((entry, idx) => {
          const key = `${entry.examId}-${entry.completedAt}-${idx}`;
          const isExpanded = expanded === key;
          const level = entry.courseSlug.replace('hsk-', '').toUpperCase();

          return (
            <Card key={key} className="overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setExpanded(isExpanded ? null : key)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {/* Level badge */}
                    <span className={`w-9 h-9 rounded-lg ${getLevelColor(entry.courseSlug)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                      {level}
                    </span>

                    {/* Title + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{entry.examTitle}</p>
                      <p className="text-xs text-navy-400">{formatDate(entry.completedAt)}</p>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className={`text-lg font-bold ${entry.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                          {entry.percent}%
                        </p>
                        <p className="text-[10px] text-navy-400">
                          {entry.totalEarned}/{entry.totalPoints}
                        </p>
                      </div>
                      {entry.passed ? (
                        <Trophy className="h-4 w-4 text-gold-500" />
                      ) : null}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-navy-300" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-navy-300" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-cream-100 space-y-3">
                      {/* Meta row */}
                      <div className="flex items-center gap-4 text-xs text-navy-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(entry.timeSpent)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {entry.totalCorrect}/{entry.totalQuestions} correct
                        </span>
                        {entry.xpEarned > 0 && (
                          <span className="flex items-center gap-1 text-gold-600">
                            +{entry.xpEarned} XP
                          </span>
                        )}
                      </div>

                      {/* Section breakdown */}
                      {entry.sectionResults && entry.sectionResults.length > 0 && (
                        <div className="space-y-2">
                          {entry.sectionResults.map((sr, i) => {
                            const pct = sr.max > 0 ? Math.round((sr.earned / sr.max) * 100) : 0;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-navy-500 w-20 shrink-0 capitalize">{sr.sectionTitle}</span>
                                <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 60 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-navy-400 w-16 text-right">{sr.earned}/{sr.max}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>

      {/* Show more / less */}
      {history.length > 5 && (
        <button
          className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium py-2"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show all ${history.length} results`}
        </button>
      )}
    </div>
  );
}
