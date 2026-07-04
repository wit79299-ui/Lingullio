'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGamificationStore } from '@/stores/gamification-store';
import { useUserKnowledgeStore } from '@/stores/user-knowledge-store';
import { useTrainingModeStore } from '@/stores/training-mode-store';
import {
  Settings, Trash2, RotateCcw, Globe, Bell, Brain,
  BookOpen, Shield, ChevronRight, AlertTriangle, Check,
  Moon, Sun, Volume2, VolumeX, Eye, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface ConfirmAction {
  id: string;
  title: string;
  description: string;
  onConfirm: () => void;
}

// ─── Main Component ─────────────────────────────────────────────────────

export function SettingsView() {
  const t = useTranslations('nav');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // ── Stores
  const gamificationReset = useGamificationStore(s => s.reset);
  const knowledgeReset = useUserKnowledgeStore(s => s.reset);
  const trainingReset = useTrainingModeStore(s => s.resetToStandard);
  const knowledgeStats = useUserKnowledgeStore(s => s.getStats());
  const gamification = useGamificationStore();

  // ── Preferences (localStorage)
  const [preferences, setPreferences] = useState(() => {
    if (typeof window === 'undefined') return { autoPlayAudio: true, showPinyin: true, dailyGoal: 20, theme: 'light' as const };
    try {
      const saved = localStorage.getItem('lingullio_preferences');
      return saved ? JSON.parse(saved) : { autoPlayAudio: true, showPinyin: true, dailyGoal: 20, theme: 'light' };
    } catch {
      return { autoPlayAudio: true, showPinyin: true, dailyGoal: 20, theme: 'light' };
    }
  });

  const updatePreference = (key: string, value: unknown) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try { localStorage.setItem('lingullio_preferences', JSON.stringify(updated)); } catch {}
  };

  // ── Action Handlers
  const handleConfirm = () => {
    if (!confirmAction) return;
    confirmAction.onConfirm();
    setCompletedActions(prev => new Set(prev).add(confirmAction.id));
    setShowSuccess(confirmAction.id);
    setConfirmAction(null);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const resetActions = [
    {
      id: 'reset_knowledge',
      icon: Brain,
      title: 'Reinitialiser la Memoire Vivante',
      description: `Supprimer les ${knowledgeStats.total_items} mots enregistres, les niveaux de maitrise et la file de revision SRS.`,
      danger: true,
      onConfirm: () => knowledgeReset(),
    },
    {
      id: 'reset_gamification',
      icon: Gauge,
      title: 'Reinitialiser XP et badges',
      description: `Remettre a zero les ${gamification.total_xp} XP, le niveau ${gamification.level}, la serie de ${gamification.streak_days} jours et tous les badges.`,
      danger: true,
      onConfirm: () => gamificationReset(),
    },
    {
      id: 'reset_training',
      icon: RotateCcw,
      title: 'Reinitialiser les modes d\'entrainement',
      description: 'Quitter le Parcours Inverse ou le Coach Autonome et revenir au mode standard.',
      danger: false,
      onConfirm: () => trainingReset(),
    },
    {
      id: 'reset_placement',
      icon: AlertTriangle,
      title: 'Effacer le resultat du test de placement',
      description: 'Supprimer le resultat du test de placement pour pouvoir le repasser.',
      danger: true,
      onConfirm: () => {
        try { localStorage.removeItem('lingullio_placement_result'); } catch {}
      },
    },
    {
      id: 'reset_all',
      icon: Trash2,
      title: 'Reinitialisation complete',
      description: 'Tout effacer : Memoire Vivante, XP, badges, modes, preferences. Retour a l\'etat initial.',
      danger: true,
      onConfirm: () => {
        knowledgeReset();
        gamificationReset();
        trainingReset();
        try {
          localStorage.removeItem('lingullio_placement_result');
          localStorage.removeItem('lingullio_preferences');
          localStorage.removeItem('lingullio_objectives');
          localStorage.removeItem('lingullio_mock_exam_history');
        } catch {}
      },
    },
  ];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <Settings className="h-5 w-5 text-navy-700" />
          </div>
          {t('settings')}
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">
          Gerez vos preferences, donnees et compte
        </p>
      </header>

      {/* ── Preferences d'apprentissage ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-teal-500" />
            Preferences d&apos;apprentissage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio auto-play */}
          <ToggleRow
            icon={preferences.autoPlayAudio ? Volume2 : VolumeX}
            title="Lecture audio automatique"
            description="Lire automatiquement l'audio quand une carte est affichee"
            checked={preferences.autoPlayAudio}
            onChange={(v) => updatePreference('autoPlayAudio', v)}
          />

          {/* Show pinyin */}
          <ToggleRow
            icon={Eye}
            title="Afficher le pinyin"
            description="Montrer les transcriptions pinyin sous les caracteres"
            checked={preferences.showPinyin}
            onChange={(v) => updatePreference('showPinyin', v)}
          />

          {/* Daily goal */}
          <div className="flex items-center justify-between py-3 border-t border-cream-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50">
                <Gauge className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy-900">Objectif quotidien</p>
                <p className="text-xs text-navy-400">Nombre d&apos;exercices par jour</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[10, 20, 30, 50].map(n => (
                <button
                  key={n}
                  onClick={() => updatePreference('dailyGoal', n)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    preferences.dailyGoal === n
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-cream-50 text-navy-500 hover:bg-cream-100'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Application ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-teal-500" />
            Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow
            icon={Globe}
            title="Langue de l'interface"
            value="Francais"
            note="Geree automatiquement par votre navigateur"
          />
          <InfoRow
            icon={Shield}
            title="Mode"
            value="Demo (donnees locales)"
            note="Vos donnees sont sauvegardees dans votre navigateur"
          />
        </CardContent>
      </Card>

      {/* ── Donnees & Reinitialisation ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-red-400" />
            Donnees et reinitialisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {resetActions.map(action => (
            <button
              key={action.id}
              type="button"
              onClick={() => setConfirmAction({
                id: action.id,
                title: action.title,
                description: action.description,
                onConfirm: action.onConfirm,
              })}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-25 transition-colors text-left group"
            >
              <div className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
                action.danger ? 'bg-red-50' : 'bg-cream-50'
              )}>
                <action.icon className={cn('h-4 w-4', action.danger ? 'text-red-500' : 'text-navy-500')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', action.danger ? 'text-red-700' : 'text-navy-900')}>
                  {action.title}
                </p>
                <p className="text-xs text-navy-400 truncate">{action.description}</p>
              </div>
              {showSuccess === action.id ? (
                <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : completedActions.has(action.id) ? (
                <Check className="h-4 w-4 text-navy-300 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-navy-500 shrink-0" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ── Confirmation Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-navy-900">Confirmer</h3>
            </div>
            <p className="text-sm text-navy-600">{confirmAction.description}</p>
            <p className="text-xs text-red-500 font-medium">Cette action est irreversible.</p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmAction(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleConfirm}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Components ────────────────────────────────────────────────

function ToggleRow({ icon: Icon, title, description, checked, onChange }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-cream-100 first:border-0 first:pt-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50">
          <Icon className="h-4 w-4 text-teal-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-navy-900">{title}</p>
          <p className="text-xs text-navy-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
          checked ? 'bg-teal-500' : 'bg-cream-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, title, value, note }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cream-50 shrink-0">
        <Icon className="h-4 w-4 text-navy-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy-900">{title}</p>
        <p className="text-xs text-navy-400">{note}</p>
      </div>
      <span className="text-sm font-medium text-navy-600 shrink-0">{value}</span>
    </div>
  );
}
