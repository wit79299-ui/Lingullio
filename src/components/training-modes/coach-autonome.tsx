'use client';

import { useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore } from '@/stores/gamification-store';
import {
  useTrainingModeStore,
  estimateMemoryDecay,
  type PrescribedSession,
} from '@/stores/training-mode-store';
import { Link } from '@/i18n/navigation';
import {
  Brain, BookOpen, Trophy, RefreshCw, AlertTriangle,
  ChevronRight, Clock, Zap, Shield, X, BellRing,
  Flame, TrendingDown, Calendar, ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Constants ───────────────────────────────────────────────────────────

const INACTIVITY_THRESHOLD_DAYS = 15;
const COACH_AUTO_ACTIVATE_DAYS = 15;

// ─── Inactivity Detection Hook ──────────────────────────────────────────

/** Returns the number of days since last activity, or null if no activity ever */
export function useDaysSinceLastActivity(): number | null {
  const lastActivityDate = useGamificationStore(s => s.last_activity_date);
  
  return useMemo(() => {
    if (!lastActivityDate) return null;
    const last = new Date(lastActivityDate);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [lastActivityDate]);
}

/** Hook that auto-activates Coach Autonome after 15 days of inactivity */
export function useCoachAutoActivation() {
  const daysSinceActivity = useDaysSinceLastActivity();
  const activeMode = useTrainingModeStore(s => s.active_mode);
  const coachState = useTrainingModeStore(s => s.coach_state);
  const activateCoachAutonome = useTrainingModeStore(s => s.activateCoachAutonome);
  const lastActivityDate = useGamificationStore(s => s.last_activity_date);

  useEffect(() => {
    // Only auto-activate if:
    // 1. User is in standard mode (don't interrupt Parcours Inversé)
    // 2. Has been inactive for >= 15 days
    // 3. Coach is not already activated
    // 4. Coach is not dismissed for today
    if (activeMode !== 'standard') return;
    if (daysSinceActivity === null) return; // no activity at all — could be new user
    if (daysSinceActivity < COACH_AUTO_ACTIVATE_DAYS) return;
    if (coachState.auto_activated) return;
    
    // Check if dismissed for today
    if (coachState.dismissed_until) {
      const today = new Date().toISOString().split('T')[0];
      if (coachState.dismissed_until > today) return;
    }

    // Auto-activate!
    activateCoachAutonome();
  }, [daysSinceActivity, activeMode, coachState.auto_activated, coachState.dismissed_until, activateCoachAutonome, lastActivityDate]);
}

// ─── Session Prescription Engine ────────────────────────────────────────

function generatePrescribedSessions(
  daysSinceActivity: number,
  totalExercises: number,
  totalCorrect: number,
  level: number,
  streakDays: number,
  totalStudyMinutes: number,
): PrescribedSession[] {
  const sessions: PrescribedSession[] = [];
  const accuracy = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;
  const decayPercent = estimateMemoryDecay(daysSinceActivity);

  // 1. URGENT — SRS Revision to combat memory decay
  if (totalExercises >= 5) {
    sessions.push({
      id: 'coach-srs-urgent',
      type: 'revision',
      title: 'Révision d\'urgence',
      description: `Tu as oublié environ ${decayPercent}% de ton vocabulaire récent. Cette session rapide va réactiver ta mémoire.`,
      href: '/revisions',
      duration_minutes: 7,
      xp_estimate: 40,
      reason: `${daysSinceActivity} jours sans révision = ~${decayPercent}% d'oubli (courbe d'Ebbinghaus)`,
      urgency: 'critical',
      memory_decay_percent: decayPercent,
    });
  }

  // 2. HIGH — Quick lesson to rebuild momentum
  sessions.push({
    id: 'coach-lesson-restart',
    type: 'lesson',
    title: 'Micro-leçon de reprise',
    description: 'Reprends doucement avec une leçon courte. L\'important c\'est de revenir.',
    href: '/courses',
    duration_minutes: 10,
    xp_estimate: 50,
    reason: 'Reprendre un rythme d\'apprentissage régulier',
    urgency: 'high',
    memory_decay_percent: 0,
  });

  // 3. MEDIUM — Practice to rebuild accuracy (if enough history)
  if (totalExercises >= 20 && accuracy < 80) {
    sessions.push({
      id: 'coach-practice',
      type: 'practice',
      title: 'Entraînement ciblé',
      description: `Ta précision était de ${accuracy}% avant la pause. Renforce tes points faibles.`,
      href: '/courses',
      duration_minutes: 10,
      xp_estimate: 35,
      reason: `Précision à ${accuracy}% — objectif 80%+`,
      urgency: 'medium',
      memory_decay_percent: 0,
    });
  }

  // 4. MEDIUM — Mock exam if advanced enough and long inactivity
  if (totalExercises >= 50 && daysSinceActivity >= 20) {
    sessions.push({
      id: 'coach-mock-diagnostic',
      type: 'mock_exam',
      title: 'Test diagnostique',
      description: 'Un examen blanc rapide pour évaluer ton niveau réel après cette pause.',
      href: '/mock-exams',
      duration_minutes: 20,
      xp_estimate: 100,
      reason: `Après ${daysSinceActivity} jours d'absence, un diagnostic est recommandé`,
      urgency: 'medium',
      memory_decay_percent: 0,
    });
  }

  return sessions;
}

// ─── Coach Autonome Banner ──────────────────────────────────────────────
// This banner appears at the top of the dashboard when coach is auto-activated

export function CoachAutonomeBanner({ className }: { className?: string }) {
  const daysSinceActivity = useDaysSinceLastActivity();
  const coachState = useTrainingModeStore(s => s.coach_state);
  const dismissCoach = useTrainingModeStore(s => s.dismissCoach);
  const deactivateCoach = useTrainingModeStore(s => s.deactivateCoach);

  if (!coachState.auto_activated) return null;
  if (daysSinceActivity === null) return null;

  // Check if dismissed for today
  if (coachState.dismissed_until) {
    const today = new Date().toISOString().split('T')[0];
    if (coachState.dismissed_until > today) return null;
  }

  const decayPercent = estimateMemoryDecay(daysSinceActivity);

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50',
      className,
    )}>
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl" />
      
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                Coach Autonome
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                  Urgent
                </span>
              </h3>
              <p className="text-xs text-navy-500 mt-0.5">
                Activé automatiquement — {daysSinceActivity} jours sans activité
              </p>
            </div>
          </div>
          <button
            onClick={dismissCoach}
            className="p-1.5 rounded-lg hover:bg-white/60 text-navy-400 hover:text-navy-600 transition-colors"
            title="Reporter à demain"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alert message */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 border border-amber-200 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-navy-800 leading-relaxed">
              Tu n'as pas révisé depuis <strong>{daysSinceActivity} jours</strong>. 
              D'après la courbe d'Ebbinghaus, tu as oublié environ{' '}
              <strong className="text-red-600">{decayPercent}%</strong>{' '}
              de ton vocabulaire récent. 
              <span className="text-amber-700 font-medium"> Fais cette séance de 7 minutes maintenant.</span>
            </p>
          </div>
        </div>

        {/* Memory decay visualization */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-navy-500 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Rétention mémoire estimée
            </span>
            <span className={cn(
              'font-bold',
              decayPercent > 50 ? 'text-red-600' : decayPercent > 30 ? 'text-amber-600' : 'text-emerald-600'
            )}>
              {100 - decayPercent}%
            </span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden border border-cream-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                decayPercent > 50
                  ? 'bg-gradient-to-r from-red-400 to-red-500'
                  : decayPercent > 30
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-emerald-400 to-teal-400'
              )}
              style={{ width: `${100 - decayPercent}%` }}
            />
          </div>
        </div>

        {/* Quick action button */}
        <Link href="/revisions">
          <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg">
            <Brain className="h-4 w-4 mr-2" />
            Commencer la révision d'urgence — 7 min
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>

        {/* Dismiss / Deactivate */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={dismissCoach}
            className="text-[11px] text-navy-400 hover:text-navy-600 transition-colors underline underline-offset-2"
          >
            Rappelle-moi demain
          </button>
          <span className="text-navy-200">·</span>
          <button
            onClick={deactivateCoach}
            className="text-[11px] text-navy-400 hover:text-navy-600 transition-colors underline underline-offset-2"
          >
            Désactiver le coach
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coach Autonome Full View ───────────────────────────────────────────
// Full takeover dashboard when coach is active

export function CoachAutonomeView({ className }: { className?: string }) {
  const daysSinceActivity = useDaysSinceLastActivity();
  const {
    total_exercises, total_correct, level, streak_days,
    total_study_minutes, total_xp, sessions_history,
  } = useGamificationStore();
  const deactivateCoach = useTrainingModeStore(s => s.deactivateCoach);

  const days = daysSinceActivity ?? 0;
  const decayPercent = estimateMemoryDecay(days);

  const prescribedSessions = useMemo(
    () => generatePrescribedSessions(
      days, total_exercises, total_correct, level, streak_days, total_study_minutes,
    ),
    [days, total_exercises, total_correct, level, streak_days, total_study_minutes],
  );

  const totalMinutes = prescribedSessions.reduce((s, p) => s + p.duration_minutes, 0);
  const totalXpEstimate = prescribedSessions.reduce((s, p) => s + p.xp_estimate, 0);

  const urgencyColors = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    high: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    medium: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  };

  const urgencyIcons = {
    critical: AlertTriangle,
    high: Flame,
    medium: Shield,
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
              <BellRing className="h-5 w-5" />
            </div>
            Coach Autonome
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            Programme de reprise personnalisé — {days} jours d'absence détectés
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={deactivateCoach}>
          <X className="h-4 w-4 mr-1" />
          Retour au dashboard standard
        </Button>
      </header>

      {/* Alert Card */}
      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden !py-0">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-md shrink-0">
              <TrendingDown className="h-7 w-7 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-navy-900 mb-1">Diagnostic de mémoire</h3>
              <p className="text-sm text-navy-600 leading-relaxed mb-3">
                Après <strong>{days} jours</strong> sans révision, la courbe d'oubli d'Ebbinghaus 
                estime que tu as perdu environ <strong className="text-red-600">{decayPercent}%</strong> de 
                la rétention de ton vocabulaire récent. La bonne nouvelle : quelques sessions ciblées 
                peuvent restaurer ta mémoire rapidement.
              </p>

              {/* Memory bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-navy-400">Mémoire estimée</span>
                  <span className={cn(
                    'font-bold',
                    decayPercent > 50 ? 'text-red-600' : 'text-amber-600'
                  )}>{100 - decayPercent}% retenu</span>
                </div>
                <div className="h-4 bg-white rounded-full overflow-hidden border border-cream-200">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 relative',
                      decayPercent > 50
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    )}
                    style={{ width: `${100 - decayPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescribed Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            Programme de reprise prescrit
          </h2>
          <span className="text-xs text-navy-400">
            ~{totalMinutes} min · ~{totalXpEstimate} XP
          </span>
        </div>

        <div className="space-y-3">
          {prescribedSessions.map((session, index) => {
            const colors = urgencyColors[session.urgency];
            const UrgencyIcon = urgencyIcons[session.urgency];
            const SessionIcon = session.type === 'revision' ? Brain
              : session.type === 'lesson' ? BookOpen
                : session.type === 'mock_exam' ? Trophy
                  : RefreshCw;

            return (
              <Link key={session.id} href={session.href}>
                <div className={cn(
                  'flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all cursor-pointer group',
                  'hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]',
                  colors.bg, colors.border,
                )}>
                  {/* Step number + Icon */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full', colors.badge)}>
                      {session.urgency === 'critical' ? 'urgent' : session.urgency === 'high' ? 'important' : 'conseil'}
                    </span>
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white shadow-sm">
                      <SessionIcon className={cn('h-5 w-5', colors.text)} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-navy-900">{session.title}</p>
                      {session.memory_decay_percent > 0 && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                          -{session.memory_decay_percent}% mémoire
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-navy-500 leading-relaxed mb-1.5">
                      {session.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                        <Zap className="h-2.5 w-2.5" />
                        ~{session.xp_estimate} XP
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-navy-400">
                        <Clock className="h-2.5 w-2.5" />
                        ~{session.duration_minutes} min
                      </span>
                    </div>
                    <p className="text-[10px] text-navy-400 italic mt-1">
                      💡 {session.reason}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-navy-300 group-hover:text-navy-500 shrink-0 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-navy-800 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-500" />
            Conseil du coach
          </h3>
          <p className="text-xs text-navy-600 leading-relaxed">
            Après une pause prolongée, ne cherche pas à tout rattraper en un jour. 
            Commence par la <strong>révision d'urgence</strong> (7 min), puis fais une leçon courte. 
            L'important, c'est de reconstruire l'habitude. La mémoire revient vite avec la pratique régulière.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
