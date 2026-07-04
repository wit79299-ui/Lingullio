'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore } from '@/stores/gamification-store';
import {
  useTrainingModeStore,
  HSK_VOCAB_COUNTS,
  cumulativeWordsForHsk,
  type ParcoursInverseConfig,
} from '@/stores/training-mode-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Target, Calendar, ChevronRight, ChevronLeft,
  Rocket, AlertTriangle, CheckCircle2, Clock,
  BookOpen, Brain, Trophy, Zap, ArrowRight,
  GraduationCap, TrendingUp,
} from 'lucide-react';

// ─── Configuration Wizard ───────────────────────────────────────────────

export function ParcoursInverseSetup({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const [targetHsk, setTargetHsk] = useState(4);
  const [currentHsk, setCurrentHsk] = useState(1);
  const [deadlineMonths, setDeadlineMonths] = useState(6);
  const configureParcours = useTrainingModeStore(s => s.configureParcours);
  const { total_exercises, level } = useGamificationStore();

  // Estimate known words from level & exercises
  const estimatedKnownWords = Math.min(
    cumulativeWordsForHsk(currentHsk),
    Math.floor(total_exercises * 0.6) // rough estimate: 60% of exercises = unique words
  );

  const targetWords = cumulativeWordsForHsk(targetHsk);
  const wordsToLearn = targetWords - estimatedKnownWords;

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + deadlineMonths);
  const deadlineStr = deadline.toISOString().split('T')[0];

  const totalWeeks = Math.ceil(deadlineMonths * 4.33);
  const wordsPerWeek = Math.ceil(wordsToLearn / totalWeeks);
  const dailyMinutes = Math.max(10, Math.ceil((wordsPerWeek * 3) / 7));

  const handleConfirm = () => {
    const config: ParcoursInverseConfig = {
      target_hsk_level: targetHsk,
      deadline_date: deadlineStr,
      current_hsk_level: currentHsk,
      created_at: new Date().toISOString(),
      words_already_known: estimatedKnownWords,
    };
    configureParcours(config);
    onComplete?.();
  };

  const hskLevels = [
    { level: 1, label: 'HSK 1', words: 150, desc: 'Bases élémentaires' },
    { level: 2, label: 'HSK 2', words: 150, desc: 'Communication simple' },
    { level: 3, label: 'HSK 3', words: 300, desc: 'Conversations courantes' },
    { level: 4, label: 'HSK 4', words: 600, desc: 'Discussions variées' },
    { level: 5, label: 'HSK 5', words: 1300, desc: 'Lecture de journaux' },
    { level: 6, label: 'HSK 6', words: 2500, desc: 'Expression fluide' },
    { level: 7, label: 'HSK 7-9', words: 5000, desc: 'Niveau natif' },
  ];

  const deadlineOptions = [
    { months: 3, label: '3 mois', intensity: 'Intensif' },
    { months: 6, label: '6 mois', intensity: 'Soutenu' },
    { months: 9, label: '9 mois', intensity: 'Modéré' },
    { months: 12, label: '12 mois', intensity: 'Détendu' },
    { months: 18, label: '18 mois', intensity: 'Tranquille' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl mx-auto mb-4">
          <Rocket className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-navy-900">Parcours Inversé</h2>
        <p className="text-sm text-navy-400 mt-1">
          Déclare ton objectif, l'application calcule ta feuille de route
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              step >= s
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md'
                : 'bg-cream-100 text-navy-400'
            )}>
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={cn(
                'w-12 h-0.5 rounded-full',
                step > s ? 'bg-violet-400' : 'bg-cream-200'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Current Level */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-navy-900 mb-1">
              Quel est ton niveau actuel ?
            </h3>
            <p className="text-sm text-navy-400 mb-4">
              Sélectionne le niveau HSK que tu maîtrises déjà (même partiellement)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {hskLevels.slice(0, 6).map(hsk => (
                <button
                  key={hsk.level}
                  onClick={() => setCurrentHsk(hsk.level)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                    currentHsk === hsk.level
                      ? 'border-violet-400 bg-violet-50 shadow-md'
                      : 'border-cream-200 hover:border-cream-300 hover:bg-cream-25'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shrink-0',
                    currentHsk === hsk.level
                      ? 'bg-violet-500 text-white'
                      : 'bg-cream-100 text-navy-600'
                  )}>
                    {hsk.level}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-800">{hsk.label}</p>
                    <p className="text-[11px] text-navy-400">{hsk.desc} · {hsk.words} mots</p>
                  </div>
                </button>
              ))}
              {/* "Débutant complet" option */}
              <button
                onClick={() => setCurrentHsk(0)}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left sm:col-span-2',
                  currentHsk === 0
                    ? 'border-violet-400 bg-violet-50 shadow-md'
                    : 'border-cream-200 hover:border-cream-300 hover:bg-cream-25'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shrink-0',
                  currentHsk === 0 ? 'bg-violet-500 text-white' : 'bg-cream-100 text-navy-600'
                )}>
                  0
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-800">Débutant complet</p>
                  <p className="text-[11px] text-navy-400">Je pars de zéro</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} className="bg-violet-500 hover:bg-violet-600">
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Target Level */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-navy-900 mb-1">
              Quel HSK veux-tu obtenir ?
            </h3>
            <p className="text-sm text-navy-400 mb-4">
              Choisis ton objectif final
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {hskLevels.filter(h => h.level > currentHsk).map(hsk => {
                const wordsNeeded = cumulativeWordsForHsk(hsk.level) - cumulativeWordsForHsk(currentHsk);
                return (
                  <button
                    key={hsk.level}
                    onClick={() => setTargetHsk(hsk.level)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                      targetHsk === hsk.level
                        ? 'border-violet-400 bg-violet-50 shadow-md'
                        : 'border-cream-200 hover:border-cream-300 hover:bg-cream-25'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shrink-0',
                      targetHsk === hsk.level
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                        : 'bg-cream-100 text-navy-600'
                    )}>
                      {hsk.level}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-800">{hsk.label}</p>
                      <p className="text-[11px] text-navy-400">{hsk.desc} · +{wordsNeeded} mots à apprendre</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <Button onClick={() => setStep(3)} className="bg-violet-500 hover:bg-violet-600">
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Deadline + Summary */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-navy-900 mb-1">
                En combien de temps ?
              </h3>
              <p className="text-sm text-navy-400 mb-4">
                Choisis ton échéance — l'application calcule le rythme nécessaire
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {deadlineOptions.map(opt => {
                  const weeks = Math.ceil(opt.months * 4.33);
                  const wpw = Math.ceil(wordsToLearn / weeks);
                  const isFeasible = wpw <= 100; // more than 100 words/week is unrealistic
                  return (
                    <button
                      key={opt.months}
                      onClick={() => setDeadlineMonths(opt.months)}
                      disabled={!isFeasible}
                      className={cn(
                        'p-3 rounded-xl border-2 transition-all text-center',
                        deadlineMonths === opt.months
                          ? 'border-violet-400 bg-violet-50 shadow-md'
                          : isFeasible
                            ? 'border-cream-200 hover:border-cream-300'
                            : 'border-cream-100 opacity-50 cursor-not-allowed',
                      )}
                    >
                      <p className="text-lg font-bold text-navy-900">{opt.label}</p>
                      <p className="text-[11px] text-navy-400">{opt.intensity}</p>
                      <p className="text-[10px] mt-1 font-medium text-violet-600">
                        ~{wpw} mots/sem
                      </p>
                      {!isFeasible && (
                        <p className="text-[10px] text-red-500 mt-0.5">Trop intense</p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Preview */}
          <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden !py-0">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-500" />
                Aperçu de ta feuille de route
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <SummaryCard
                  icon={Target}
                  label="Objectif"
                  value={`HSK ${targetHsk}`}
                  color="violet"
                />
                <SummaryCard
                  icon={BookOpen}
                  label="Mots à apprendre"
                  value={wordsToLearn.toLocaleString()}
                  color="teal"
                />
                <SummaryCard
                  icon={Calendar}
                  label="Rythme"
                  value={`${wordsPerWeek}/sem`}
                  color="amber"
                />
                <SummaryCard
                  icon={Clock}
                  label="Par jour"
                  value={`~${dailyMinutes} min`}
                  color="blue"
                />
              </div>

              {/* Feasibility check */}
              {wordsPerWeek > 50 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-100 border border-amber-300 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>Rythme soutenu :</strong> {wordsPerWeek} mots par semaine est ambitieux. 
                    Assure-toi de pouvoir consacrer ~{dailyMinutes} min/jour à l'apprentissage.
                  </p>
                </div>
              )}

              <Button
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold shadow-lg py-3"
                size="lg"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Lancer mon Parcours Inversé
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: 'violet' | 'teal' | 'amber' | 'blue';
}) {
  const colors = {
    violet: 'bg-violet-100 text-violet-700',
    teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="text-center p-3 rounded-xl bg-white/70 border border-white/50">
      <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg mx-auto mb-1.5', colors[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-base font-bold text-navy-900">{value}</p>
      <p className="text-[10px] text-navy-400">{label}</p>
    </div>
  );
}
