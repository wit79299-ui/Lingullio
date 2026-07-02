'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import {
  BookOpen,
  Target,
  Clock,
  Flame,
  ChevronRight,
  Headphones,
  PenTool,
  Brain,
} from 'lucide-react';

// Mock data -- will be replaced by Supabase queries
const mockData = {
  name: 'Lisa',
  level: 'HSK 4',
  examDate: '20 decembre 2026',
  targetScore: 250,
  estimatedScore: 236,
  maxScore: 300,
  confidence: 'high' as const,
  scoreChange: 28,
  overallProgress: 68,
  streak: 12,
  skills: {
    vocabulary: 72,
    grammar: 64,
    reading: 71,
    listening: 63,
    writing: 58,
    speaking: 60,
  },
  todayPlan: [
    {
      id: '1',
      title: 'Reviser les classificateurs',
      type: 'revision',
      duration: 15,
      icon: Brain,
    },
    {
      id: '2',
      title: '10 questions ciblees',
      type: 'exercise',
      duration: 10,
      icon: Target,
    },
    {
      id: '3',
      title: 'Lecon 8 (le) - aspect accompli',
      type: 'lesson',
      duration: 12,
      icon: BookOpen,
    },
  ],
  recommendations: [
    {
      id: 'r1',
      title: 'Revision intelligente',
      subtitle: '15 cartes a reviser',
      icon: Brain,
      badge: 'toReview' as const,
    },
    {
      id: 'r2',
      title: 'Examen blanc 2 - Lecture',
      subtitle: 'Entrainement recommande - 30 min',
      icon: Headphones,
      badge: 'new' as const,
    },
    {
      id: 'r3',
      title: 'Points faibles a travailler',
      subtitle: 'Grammaire - 3 fiches',
      icon: PenTool,
      badge: 'inProgress' as const,
    },
  ],
};

const confidenceLabels = {
  low: 'confidenceLow',
  medium: 'confidenceMedium',
  high: 'confidenceHigh',
} as const;

const skillKeys = [
  'vocabulary',
  'grammar',
  'reading',
  'listening',
  'writing',
  'speaking',
] as const;

export function DashboardView() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {t('welcome', { name: mockData.name })}
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            {mockData.level} &middot; {t('targetExam', { date: mockData.examDate })} &middot; {t('targetScore', { score: mockData.targetScore })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Flame className="h-5 w-5 text-gold-500" />
          <span className="font-semibold text-navy-900">
            {t('streak')}
          </span>
          <span className="text-navy-700">
            {t('streakDays', { count: mockData.streak })}
          </span>
        </div>
      </header>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score estime */}
        <Card>
          <CardHeader>
            <CardTitle>{t('estimatedScore')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ScoreRing
              score={mockData.estimatedScore}
              maxScore={mockData.maxScore}
              label={mockData.level}
              confidence={t('confidence', {
                level: t(confidenceLabels[mockData.confidence]),
              })}
              change={mockData.scoreChange}
            />
            <p className="mt-2 text-xs text-navy-400">
              {t('vsLastWeek')}
            </p>
          </CardContent>
        </Card>

        {/* Progression globale */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('overallProgress')}</CardTitle>
              <span className="text-2xl font-bold text-navy-900">
                {mockData.overallProgress}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ProgressBar
              value={mockData.overallProgress}
              size="md"
              className="mb-5"
            />
            <p className="text-xs font-medium text-navy-500 mb-3">
              {t('bySkill')}
            </p>
            <div className="space-y-3">
              {skillKeys.map((skill) => (
                <ProgressBar
                  key={skill}
                  label={t(skill)}
                  value={mockData.skills[skill]}
                  showValue
                  size="sm"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plan du jour */}
        <Card>
          <CardHeader>
            <CardTitle>{t('todayPlan')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-5">
              {mockData.todayPlan.map((task) => {
                const Icon = task.icon;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-cream-25 border border-cream-100"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy-50">
                      <Icon className="h-4 w-4 text-navy-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-navy-400">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {task.duration} {tc('minutes')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="w-full" size="lg">
              {t('startSession')} (15 min)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recommandations */}
      <section>
        <h2 className="text-lg font-semibold text-navy-900 mb-4">
          {t('recommendations')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockData.recommendations.map((rec) => {
            const Icon = rec.icon;
            return (
              <Card
                key={rec.id}
                className="cursor-pointer hover:shadow-md transition-shadow duration-150 group"
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cream-50 shrink-0">
                    <Icon className="h-5 w-5 text-navy-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-navy-900 truncate">
                        {rec.title}
                      </p>
                      <Badge variant={rec.badge} />
                    </div>
                    <p className="text-xs text-navy-400 truncate">
                      {rec.subtitle}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-navy-500 shrink-0 transition-colors" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
