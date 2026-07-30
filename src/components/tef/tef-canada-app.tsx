'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  lexique, trapSections, bareme, eeGrille,
} from './tef-data';
import { lexiqueDomains, LEXIQUE_STATS } from './tef-lexique-data';
import type { LexiqueDomain, VocabEntry, QuizQuestion } from './tef-lexique-data';
import {
  ceExercises, coExercises, eeExercises, eoExercises, diagnosticExercises,
} from './tef-exercises';
import type {
  TEFQCMExercise, TEFWritingExercise, TEFSpeakingExercise,
  TEFSection, TEFChoice, TEFExerciseAnswer,
} from './tef-types';
import { TEF_XP_CONFIG, SECTION_CONFIG, estimateNCLC } from './tef-types';
import { useFrenchTTS, useSpeechRecognition, analyzeText, analyzeSpeech, useAIEvaluation } from './use-tef-audio';
import type { AIWritingEvaluation, AISpeakingEvaluation } from './use-tef-audio';
import { useGamificationStore } from '@/stores/gamification-store';
import {
  BookOpen, ChevronRight, ChevronDown, Target, Award, FileText,
  Headphones, PenTool, MessageCircle, BookMarked, AlertTriangle,
  BarChart3, Home, CheckCircle2, XCircle, Info, Volume2, VolumeX,
  Mic, MicOff, Play, Square, RotateCcw, Zap, Trophy, Star, Eye, EyeOff,
  Send, Clock, TrendingUp, Shuffle, Layers, GraduationCap, Sparkles,
  ArrowLeft, ArrowRight, ThumbsUp, ThumbsDown, Pen,
} from 'lucide-react';

// ── Navigation ──
type Section =
  | 'accueil' | 'referentiel' | 'lexique' | 'pieges'
  | 'ce' | 'co' | 'ee' | 'eo'
  | 'diagnostic' | 'bareme';

interface NavItem { id: Section; label: string; num: string; icon: React.ReactNode; }

const navGroups: { title: string; items: NavItem[] }[] = [
  { title: 'Fondations', items: [
    { id: 'accueil', label: 'Accueil', num: '00', icon: <Home className="w-4 h-4" /> },
    { id: 'referentiel', label: 'Référentiel NCLC', num: '01', icon: <BookMarked className="w-4 h-4" /> },
    { id: 'lexique', label: 'Banque lexicale', num: '02', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'pieges', label: 'Guide des pièges', num: '03', icon: <AlertTriangle className="w-4 h-4" /> },
  ]},
  { title: 'Les 4 épreuves', items: [
    { id: 'ce', label: 'Compréhension écrite', num: 'CE', icon: <FileText className="w-4 h-4" /> },
    { id: 'co', label: 'Compréhension orale', num: 'CO', icon: <Headphones className="w-4 h-4" /> },
    { id: 'ee', label: 'Expression écrite', num: 'EE', icon: <PenTool className="w-4 h-4" /> },
    { id: 'eo', label: 'Expression orale', num: 'EO', icon: <MessageCircle className="w-4 h-4" /> },
  ]},
  { title: 'Entraînement', items: [
    { id: 'diagnostic', label: 'Diagnostic de placement', num: '→', icon: <Target className="w-4 h-4" /> },
    { id: 'bareme', label: 'Barème officiel', num: '→', icon: <BarChart3 className="w-4 h-4" /> },
  ]},
];

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════

export function TEFCanadaApp() {
  const [activeSection, setActiveSection] = useState<Section>('accueil');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigate = useCallback((s: Section) => {
    setActiveSection(s);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-xs font-medium text-navy-400 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">🇫🇷 TEF Canada</span>
        </div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
            <Award className="h-5 w-5 text-blue-700" />
          </div>
          Préparation TEF Canada
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">Parcours calibré NCLC : diagnostic, exercices, vocabulaire et pièges</p>
      </header>

      {/* Mobile nav */}
      <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-navy-50 text-navy-700 font-medium text-sm">
        <span>Navigation · {navGroups.flatMap(g => g.items).find(i => i.id === activeSection)?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className={`lg:w-64 shrink-0 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="lg:sticky lg:top-24 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-navy-300 px-3 mb-1.5">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button key={item.id} onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${activeSection === item.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-navy-500 hover:bg-cream-50 hover:text-navy-700'}`}>
                      <span className={`font-mono text-[11px] w-5 text-center ${activeSection === item.id ? 'text-blue-600' : 'text-navy-300'}`}>{item.num}</span>
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'accueil' && <AccueilPanel onNavigate={navigate} />}
          {activeSection === 'referentiel' && <ReferentielPanel />}
          {activeSection === 'lexique' && <LexiquePanel />}
          {activeSection === 'pieges' && <PiegesPanel />}
          {activeSection === 'ce' && <CETrainingPanel />}
          {activeSection === 'co' && <COTrainingPanel />}
          {activeSection === 'ee' && <EETrainingPanel />}
          {activeSection === 'eo' && <EOTrainingPanel />}
          {activeSection === 'diagnostic' && <DiagnosticPanel />}
          {activeSection === 'bareme' && <BaremePanel />}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ACCUEIL
// ══════════════════════════════════════════════════════════════════════════
function AccueilPanel({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Programme complet</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Votre préparation au TEF Canada</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">Un parcours calibré NCLC, fidèle au format réel, conçu pour vous apprendre à déjouer les pièges.</p>
      </div>
      {/* Exam structure */}
      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <h3 className="text-base font-semibold text-navy-900 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" />Structure de l&apos;examen</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b border-cream-200"><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Épreuve</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Durée</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Format</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Barème</th></tr></thead>
          <tbody className="divide-y divide-cream-100">
            <tr><td className="py-2 px-3 font-medium">CO</td><td className="py-2 px-3 text-navy-500">40 min</td><td className="py-2 px-3 text-navy-500">QCM 3 choix, 4 sections</td><td className="py-2 px-3 font-mono">/360</td></tr>
            <tr><td className="py-2 px-3 font-medium">CE</td><td className="py-2 px-3 text-navy-500">60 min</td><td className="py-2 px-3 text-navy-500">QCM, 4 familles</td><td className="py-2 px-3 font-mono">/300</td></tr>
            <tr><td className="py-2 px-3 font-medium">EE</td><td className="py-2 px-3 text-navy-500">60 min</td><td className="py-2 px-3 text-navy-500">Fait divers + argumentation</td><td className="py-2 px-3 font-mono">/450</td></tr>
            <tr><td className="py-2 px-3 font-medium">EO</td><td className="py-2 px-3 text-navy-500">15 min</td><td className="py-2 px-3 text-navy-500">Face à un examinateur</td><td className="py-2 px-3 font-mono">/450</td></tr>
          </tbody></table>
        </div>
        <p className="text-xs text-navy-400 mt-3 italic">NCLC final = le plus bas des 4 épreuves, jamais une moyenne.</p>
      </div>
      {/* Quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { s: 'diagnostic' as Section, icon: <Target className="w-5 h-5" />, label: 'Diagnostic de placement', sub: '8 questions · ~3 min', from: 'from-blue-500', to: 'to-indigo-600' },
          { s: 'pieges' as Section, icon: <AlertTriangle className="w-5 h-5" />, label: 'Guide des pièges', sub: '23 pièges par section', from: 'from-amber-500', to: 'to-orange-600' },
          { s: 'ce' as Section, icon: <FileText className="w-5 h-5" />, label: 'Entraînement CE', sub: '5 exercices gamifiés', from: 'from-red-500', to: 'to-pink-600' },
          { s: 'co' as Section, icon: <Headphones className="w-5 h-5" />, label: 'Entraînement CO', sub: '4 exercices avec audio', from: 'from-sky-500', to: 'to-blue-600' },
        ]).map(({ s, icon, label, sub, from, to }) => (
          <button key={s} onClick={() => onNavigate(s)} className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${from} ${to} text-white shadow-md hover:shadow-lg transition-shadow`}>
            {icon}
            <div className="text-left"><div className="font-semibold text-sm">{label}</div><div className="text-[11px] text-white/70">{sub}</div></div>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REFERENTIEL NCLC
// ══════════════════════════════════════════════════════════════════════════
function ReferentielPanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">01 · Fondation</p><h2 className="text-xl font-bold text-navy-900 mb-2">Référentiel NCLC</h2><p className="text-sm text-navy-400 leading-relaxed max-w-2xl">12 niveaux, 3 stades. NCLC 7 = seuil pivot (Entrée Express).</p></div>
      <div className="rounded-xl border border-cream-200 bg-white p-5"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-navy-100"><th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Stade</th><th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Niveaux</th><th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">CECR</th><th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Profil</th></tr></thead><tbody className="divide-y divide-cream-100"><tr><td className="py-2.5 px-3 font-medium">I · Basique</td><td className="py-2.5 px-3">1 à 4</td><td className="py-2.5 px-3 font-mono text-xs">A1 → A2</td><td className="py-2.5 px-3 text-navy-500">Communication de survie</td></tr><tr className="bg-blue-50/50"><td className="py-2.5 px-3 font-medium">II · Intermédiaire</td><td className="py-2.5 px-3">5 à 8</td><td className="py-2.5 px-3 font-mono text-xs">A2/B1 → B2</td><td className="py-2.5 px-3 text-navy-500">Autonomie croissante</td></tr><tr><td className="py-2.5 px-3 font-medium">III · Avancé</td><td className="py-2.5 px-3">9 à 12</td><td className="py-2.5 px-3 font-mono text-xs">C1 → C2</td><td className="py-2.5 px-3 text-navy-500">Maîtrise fine, nuance</td></tr></tbody></table></div></div>
      <div className="rounded-xl border border-cream-200 bg-white p-5"><h3 className="text-base font-semibold text-navy-900 mb-4">Descripteurs · Stade II <span className="text-xs text-navy-400 font-normal">(zone prioritaire)</span></h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-navy-100"><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">NCLC</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">CE</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">CO</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">EE</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">EO</th></tr></thead><tbody className="divide-y divide-cream-100"><tr><td className="py-2 px-3 font-mono font-bold">5</td><td className="py-2 px-3 text-navy-500">Textes factuels courts</td><td className="py-2 px-3 text-navy-500">Conversation simple</td><td className="py-2 px-3 text-navy-500">Messages courts</td><td className="py-2 px-3 text-navy-500">Sujets familiers</td></tr><tr><td className="py-2 px-3 font-mono font-bold">6</td><td className="py-2 px-3 text-navy-500">Essentiel d&apos;un article</td><td className="py-2 px-3 text-navy-500">Idée principale</td><td className="py-2 px-3 text-navy-500">Texte court argumenté</td><td className="py-2 px-3 text-navy-500">Décrit, opine</td></tr><tr className="bg-yellow-50/50 font-medium"><td className="py-2 px-3 font-mono font-bold text-amber-700">7 ⭐</td><td className="py-2 px-3">Implicite simple</td><td className="py-2 px-3">Nuances d&apos;intonation</td><td className="py-2 px-3">Articulation logique</td><td className="py-2 px-3">Argumente, nuance</td></tr><tr><td className="py-2 px-3 font-mono font-bold">8</td><td className="py-2 px-3 text-navy-500">Faits vs opinions</td><td className="py-2 px-3 text-navy-500">Débat à plusieurs</td><td className="py-2 px-3 text-navy-500">Connecteurs variés</td><td className="py-2 px-3 text-navy-500">Défend une position</td></tr></tbody></table></div></div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BANQUE LEXICALE
// ══════════════════════════════════════════════════════════════════════════
function LexiquePanel() {
  const [selectedDomain, setSelectedDomain] = useState<LexiqueDomain | null>(null);
  const [mode, setMode] = useState<'browse' | 'flashcard' | 'quiz' | 'dictee'>('browse');

  if (selectedDomain) {
    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        <button onClick={() => { setSelectedDomain(null); setMode('browse'); }} className="text-sm text-navy-400 hover:text-navy-700 flex items-center gap-1">
          <ChevronDown className="w-4 h-4 rotate-90" /> Retour aux domaines
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{selectedDomain.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-navy-900">{selectedDomain.domaine}</h2>
            <p className="text-xs text-navy-400">{selectedDomain.entries.length} termes · {selectedDomain.quizQuestions.length} questions</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'browse' as const, label: 'Explorer', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { key: 'flashcard' as const, label: 'Flashcards', icon: <Layers className="w-3.5 h-3.5" /> },
            { key: 'quiz' as const, label: 'Quiz', icon: <Target className="w-3.5 h-3.5" /> },
            { key: 'dictee' as const, label: 'Dictée', icon: <Headphones className="w-3.5 h-3.5" /> },
          ]).map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mode === m.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-cream-50 text-navy-500 border border-cream-200 hover:bg-cream-100'}`}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        {mode === 'browse' && <LexiqueBrowse domain={selectedDomain} />}
        {mode === 'flashcard' && <LexiqueFlashcards domain={selectedDomain} />}
        {mode === 'quiz' && <LexiqueQuiz domain={selectedDomain} />}
        {mode === 'dictee' && <LexiqueDictee domain={selectedDomain} />}
      </div>
    );
  }

  // Domain selection grid
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">02 · Fondation</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Banque lexicale interactive</h2>
        <p className="text-sm text-navy-400 max-w-2xl">
          {LEXIQUE_STATS.totalDomains} domaines · {LEXIQUE_STATS.totalEntries} termes · {LEXIQUE_STATS.totalQuestions} questions de quiz.
          Choisissez un domaine pour explorer, réviser en flashcards, ou tester vos connaissances.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Stade I (NCLC 1-4)', count: LEXIQUE_STATS.byStage[1], color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Stade II (NCLC 5-7)', count: LEXIQUE_STATS.byStage[2], color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Stade III (NCLC 8-12)', count: LEXIQUE_STATS.byStage[3], color: 'bg-amber-50 text-amber-700 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg border p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">{s.count}</p>
            <p className="text-[10px] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Domain cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lexiqueDomains.map(d => (
          <button key={d.id} onClick={() => setSelectedDomain(d)}
            className="rounded-xl border border-cream-200 bg-white p-4 text-left hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{d.icon}</span>
              <span className="text-sm font-semibold text-navy-800 group-hover:text-blue-700 transition-colors">{d.domaine}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-navy-400">
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{d.entries.length} termes</span>
              <span className="flex items-center gap-1"><Target className="w-3 h-3" />{d.quizQuestions.length} quiz</span>
              <span className="flex items-center gap-1 ml-auto text-navy-300"><ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BROWSE MODE ──
function LexiqueBrowse({ domain }: { domain: LexiqueDomain }) {
  const [filterStage, setFilterStage] = useState<0 | 1 | 2 | 3>(0);
  const tts = useFrenchTTS();
  const filtered = filterStage === 0 ? domain.entries : domain.entries.filter(e => e.stage === filterStage);
  const stageLabels = { 1: 'Stade I', 2: 'Stade II', 3: 'Stade III' };
  const stageColors = { 1: 'bg-emerald-100 text-emerald-700', 2: 'bg-blue-100 text-blue-700', 3: 'bg-amber-100 text-amber-700' };
  const registerColors = { familier: 'text-orange-600', courant: 'text-navy-500', soutenu: 'text-purple-600' };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {([0, 1, 2, 3] as const).map(s => (
          <button key={s} onClick={() => setFilterStage(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStage === s ? 'bg-navy-800 text-white' : 'bg-cream-50 text-navy-500 border border-cream-200'}`}>
            {s === 0 ? `Tous (${domain.entries.length})` : `${stageLabels[s]} (${domain.entries.filter(e => e.stage === s).length})`}
          </button>
        ))}
      </div>
      {filtered.map((entry, idx) => (
        <div key={idx} className="rounded-xl border border-cream-200 bg-white p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-navy-900">{entry.term}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stageColors[entry.stage]}`}>{stageLabels[entry.stage]}</span>
              <span className={`text-[10px] italic ${registerColors[entry.register]}`}>{entry.register}</span>
            </div>
            <button onClick={() => tts.speak(entry.term, `lex-${idx}`, 0.85)}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${tts.speakingId === `lex-${idx}` ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-navy-600">{entry.definition}</p>
          <p className="text-sm text-navy-400 italic" dangerouslySetInnerHTML={{ __html: entry.example.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-blue-700 not-italic">$1</strong>') }} />
          {entry.synonyms.length > 0 && (
            <p className="text-xs text-navy-400">Synonymes : <span className="font-medium text-navy-600">{entry.synonyms.join(', ')}</span></p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── FLASHCARD MODE ──
function LexiqueFlashcards({ domain }: { domain: LexiqueDomain }) {
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [toReview, setToReview] = useState<Set<number>>(new Set());
  const [shuffled, setShuffled] = useState<VocabEntry[]>([]);
  const tts = useFrenchTTS();
  const addXp = useGamificationStore(s => s.addXp);

  useEffect(() => {
    setShuffled([...domain.entries].sort(() => Math.random() - 0.5));
    setCardIdx(0); setFlipped(false); setKnown(new Set()); setToReview(new Set());
  }, [domain]);

  const card = shuffled[cardIdx];
  const total = shuffled.length;
  const progress = total > 0 ? Math.round(((known.size + toReview.size) / total) * 100) : 0;

  const markAndNext = (isKnown: boolean) => {
    if (isKnown) {
      setKnown(p => new Set(p).add(cardIdx));
      addXp(TEF_XP_CONFIG.qcm_correct, 'TEF Lexique flashcard');
    } else {
      setToReview(p => new Set(p).add(cardIdx));
    }
    setFlipped(false);
    if (cardIdx < total - 1) {
      setCardIdx(cardIdx + 1);
    }
  };

  const reshuffle = () => {
    setShuffled([...domain.entries].sort(() => Math.random() - 0.5));
    setCardIdx(0); setFlipped(false); setKnown(new Set()); setToReview(new Set());
  };

  const allDone = known.size + toReview.size >= total;
  const stageColors = { 1: 'bg-emerald-100 text-emerald-700', 2: 'bg-blue-100 text-blue-700', 3: 'bg-amber-100 text-amber-700' };
  const stageLabels = { 1: 'Stade I', 2: 'Stade II', 3: 'Stade III' };

  if (!card || allDone) {
    return (
      <div className="rounded-xl border border-cream-200 bg-white p-6 text-center space-y-4">
        <Trophy className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-navy-900">Session terminée !</h3>
        <div className="flex justify-center gap-6 text-sm">
          <span className="text-emerald-600 font-bold"><ThumbsUp className="w-4 h-4 inline mr-1" />{known.size} maîtrisés</span>
          <span className="text-amber-600 font-bold"><ThumbsDown className="w-4 h-4 inline mr-1" />{toReview.size} à revoir</span>
        </div>
        <p className="text-xs text-navy-400">+{known.size * TEF_XP_CONFIG.qcm_correct} XP gagnés</p>
        <button onClick={reshuffle} className="px-5 py-2.5 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 inline-flex items-center gap-2">
          <Shuffle className="w-4 h-4" />Recommencer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-navy-400">
        <span>{cardIdx + 1}/{total}</span>
        <div className="flex-1 bg-cream-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-emerald-600 font-bold">{known.size} ✓</span>
        <span className="text-amber-600 font-bold">{toReview.size} ↻</span>
      </div>

      {/* Card */}
      <div onClick={() => setFlipped(!flipped)}
        className="rounded-2xl border-2 border-cream-200 bg-white min-h-[250px] p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow relative">

        {!flipped ? (
          <div className="text-center space-y-4">
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${stageColors[card.stage]}`}>{stageLabels[card.stage]}</span>
            <p className="text-2xl font-bold text-navy-900">{card.term}</p>
            <button onClick={(e) => { e.stopPropagation(); tts.speak(card.term, `fc-${cardIdx}`, 0.85); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100">
              <Volume2 className="w-3.5 h-3.5" />Écouter
            </button>
            <p className="text-xs text-navy-300 mt-4">Tapez pour retourner</p>
          </div>
        ) : (
          <div className="text-center space-y-3 animate-in fade-in duration-200">
            <p className="text-lg font-bold text-navy-900">{card.term}</p>
            <p className="text-sm text-navy-600">{card.definition}</p>
            <p className="text-sm text-navy-400 italic" dangerouslySetInnerHTML={{ __html: card.example.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-blue-700 not-italic">$1</strong>') }} />
            {card.synonyms.length > 0 && <p className="text-xs text-navy-400">≈ {card.synonyms.join(', ')}</p>}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {flipped && (
        <div className="flex gap-3">
          <button onClick={() => markAndNext(false)}
            className="flex-1 py-3 rounded-xl bg-amber-50 text-amber-700 font-semibold text-sm border border-amber-200 hover:bg-amber-100 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />À revoir
          </button>
          <button onClick={() => markAndNext(true)}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />Je sais !
          </button>
        </div>
      )}
    </div>
  );
}

// ── QUIZ MODE ──
function LexiqueQuiz({ domain }: { domain: LexiqueDomain }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const addXp = useGamificationStore(s => s.addXp);

  const QUIZ_SIZE = 10;

  useEffect(() => {
    const shuffled = [...domain.quizQuestions].sort(() => Math.random() - 0.5).slice(0, QUIZ_SIZE);
    setQuestions(shuffled);
    setCurrentIdx(0); setSelected(null); setScore(0); setAnswered(0); setShowResult(false);
  }, [domain]);

  const q = questions[currentIdx];
  const isFinished = answered >= questions.length && questions.length > 0;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === q.correctIndex;
    if (correct) {
      setScore(s => s + 1);
      addXp(TEF_XP_CONFIG.qcm_correct, 'TEF Lexique quiz');
    }
    setAnswered(a => a + 1);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      setShowResult(true);
    }
  };

  const restart = () => {
    const shuffled = [...domain.quizQuestions].sort(() => Math.random() - 0.5).slice(0, QUIZ_SIZE);
    setQuestions(shuffled);
    setCurrentIdx(0); setSelected(null); setScore(0); setAnswered(0); setShowResult(false);
  };

  if (questions.length === 0) {
    return <p className="text-sm text-navy-400 py-8 text-center">Pas assez de questions pour ce domaine.</p>;
  }

  if (showResult || isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    const nclc = pct >= 85 ? 9 : pct >= 70 ? 8 : pct >= 55 ? 7 : pct >= 40 ? 6 : 5;
    return (
      <div className="rounded-xl border border-cream-200 bg-white p-6 text-center space-y-4">
        <div className={`rounded-xl p-5 text-white ${pct >= 70 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
          <p className="text-3xl font-extrabold">{score}/{questions.length}</p>
          <p className="text-sm opacity-80 mt-1">{pct}% · Niveau estimé NCLC {nclc}</p>
          <div className="mt-2"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm font-bold"><Zap className="h-3.5 w-3.5" />+{score * TEF_XP_CONFIG.qcm_correct} XP</span></div>
        </div>
        <button onClick={restart} className="px-5 py-2.5 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 inline-flex items-center gap-2">
          <Shuffle className="w-4 h-4" />Nouveau quiz
        </button>
      </div>
    );
  }

  const typeLabels: Record<string, string> = { synonym: 'Synonyme', definition: 'Définition', fill_blank: 'Complétez', register: 'Registre' };
  const typeColors: Record<string, string> = { synonym: 'bg-purple-100 text-purple-700', definition: 'bg-blue-100 text-blue-700', fill_blank: 'bg-emerald-100 text-emerald-700', register: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-navy-400">
        <span>Q{currentIdx + 1}/{questions.length}</span>
        <div className="flex-1 bg-cream-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${((currentIdx + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
        <span className="text-emerald-600 font-bold">{score} ✓</span>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeColors[q.type] || 'bg-gray-100'}`}>{typeLabels[q.type]}</span>
        </div>
        <p className="text-sm font-semibold text-navy-800">{q.question}</p>

        <div className="space-y-2">
          {q.choices.map((choice, idx) => {
            let style = 'border-cream-200 bg-cream-50 text-navy-700 hover:bg-cream-100';
            if (selected !== null) {
              if (idx === q.correctIndex) style = 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400';
              else if (idx === selected && idx !== q.correctIndex) style = 'border-red-400 bg-red-50 text-red-700';
              else style = 'border-cream-200 bg-cream-50 text-navy-400';
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={selected !== null}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${style}`}>
                <span className="font-mono text-[11px] mr-2 text-navy-300">{String.fromCharCode(65 + idx)}</span>
                {choice}
                {selected !== null && idx === q.correctIndex && <CheckCircle2 className="w-4 h-4 inline ml-2 text-emerald-600" />}
                {selected !== null && idx === selected && idx !== q.correctIndex && <XCircle className="w-4 h-4 inline ml-2 text-red-500" />}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <button onClick={nextQuestion}
            className="w-full py-2.5 rounded-lg bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 flex items-center justify-center gap-2">
            {currentIdx < questions.length - 1 ? <><ArrowRight className="w-4 h-4" />Question suivante</> : <><Trophy className="w-4 h-4" />Voir résultat</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── DICTÉE MODE ──
function LexiqueDictee({ domain }: { domain: LexiqueDomain }) {
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const tts = useFrenchTTS();
  const addXp = useGamificationStore(s => s.addXp);
  const inputRef = useRef<HTMLInputElement>(null);

  const DICTEE_SIZE = 8;

  useEffect(() => {
    const shuffled = [...domain.entries].sort(() => Math.random() - 0.5).slice(0, DICTEE_SIZE);
    setEntries(shuffled);
    setCurrentIdx(0); setUserInput(''); setChecked(false); setScore(0); setTotal(0); setShowResult(false);
  }, [domain]);

  const entry = entries[currentIdx];

  useEffect(() => {
    if (entry && !checked) {
      // Auto-play TTS after a short delay
      const t = setTimeout(() => tts.speak(entry.term, `dict-${currentIdx}`, 0.8), 500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, checked, entry]);

  if (!entry || showResult) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="rounded-xl border border-cream-200 bg-white p-6 text-center space-y-4">
        <Pen className="w-10 h-10 text-blue-500 mx-auto" />
        <h3 className="text-lg font-bold text-navy-900">Dictée terminée !</h3>
        <p className="text-2xl font-extrabold text-navy-900">{score}/{total} <span className="text-sm font-normal text-navy-400">({pct}%)</span></p>
        <p className="text-xs text-navy-400">+{score * TEF_XP_CONFIG.qcm_correct} XP gagnés</p>
        <button onClick={() => {
          const shuffled = [...domain.entries].sort(() => Math.random() - 0.5).slice(0, DICTEE_SIZE);
          setEntries(shuffled); setCurrentIdx(0); setUserInput(''); setChecked(false); setScore(0); setTotal(0); setShowResult(false);
        }} className="px-5 py-2.5 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 inline-flex items-center gap-2">
          <Shuffle className="w-4 h-4" />Nouvelle dictée
        </button>
      </div>
    );
  }

  const normalize = (s: string) => s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/['']/g, "'").replace(/\s+/g, ' ');

  const checkAnswer = () => {
    const normalizedUser = normalize(userInput);
    const normalizedTerm = normalize(entry.term);
    // Accept with or without accents
    const correct = normalizedUser === normalizedTerm ||
      userInput.toLowerCase().trim() === entry.term.toLowerCase().trim();
    setIsCorrect(correct);
    setChecked(true);
    setTotal(t => t + 1);
    if (correct) {
      setScore(s => s + 1);
      addXp(TEF_XP_CONFIG.qcm_correct, 'TEF Lexique dictée');
    }
  };

  const nextWord = () => {
    if (currentIdx < entries.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setUserInput(''); setChecked(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setShowResult(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3 text-xs text-navy-400">
        <span>{currentIdx + 1}/{entries.length}</span>
        <div className="flex-1 bg-cream-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${((currentIdx + (checked ? 1 : 0)) / entries.length) * 100}%` }} />
        </div>
        <span className="text-emerald-600 font-bold">{score} ✓</span>
      </div>

      <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
        <p className="text-sm text-navy-500 text-center">Écoutez le mot ou l&apos;expression, puis écrivez-le.</p>

        {/* TTS buttons */}
        <div className="flex justify-center gap-3">
          <button onClick={() => tts.speak(entry.term, `dict-${currentIdx}`, 0.8)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${tts.speakingId === `dict-${currentIdx}` ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}>
            <Volume2 className="w-4 h-4" />Écouter
          </button>
          <button onClick={() => tts.speak(entry.term, `dict-slow-${currentIdx}`, 0.55)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${tts.speakingId === `dict-slow-${currentIdx}` ? 'bg-blue-600 text-white' : 'bg-cream-50 text-navy-600 border border-cream-200 hover:bg-cream-100'}`}>
            <Volume2 className="w-4 h-4" />Lent
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <input ref={inputRef} type="text" value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !checked && userInput.trim()) checkAnswer(); if (e.key === 'Enter' && checked) nextWord(); }}
            disabled={checked} placeholder="Écrivez ce que vous entendez..."
            className={`w-full px-4 py-3 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 ${checked ? (isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-emerald-400' : 'border-red-400 bg-red-50 text-red-700 ring-red-400') : 'border-cream-200 bg-white text-navy-800 focus:ring-blue-400 focus:border-blue-400'}`}
            autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} />
        </div>

        {/* Check / Result */}
        {!checked ? (
          <button onClick={checkAnswer} disabled={!userInput.trim()}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />Vérifier
          </button>
        ) : (
          <div className="space-y-3">
            {isCorrect ? (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2">
                <CheckCircle2 className="w-5 h-5" /><span className="text-sm font-bold">Correct !</span>
                <span className="ml-auto text-xs font-bold"><Zap className="w-3.5 h-3.5 inline" /> +{TEF_XP_CONFIG.qcm_correct} XP</span>
              </div>
            ) : (
              <div className="bg-red-50 rounded-lg px-4 py-2 space-y-1">
                <div className="flex items-center gap-2 text-red-700"><XCircle className="w-5 h-5" /><span className="text-sm font-bold">Incorrect</span></div>
                <p className="text-sm text-red-600">Réponse : <strong>{entry.term}</strong></p>
              </div>
            )}
            <p className="text-xs text-navy-400"><em>{entry.definition}</em></p>
            <button onClick={nextWord}
              className="w-full py-2.5 rounded-lg bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 flex items-center justify-center gap-2">
              {currentIdx < entries.length - 1 ? <><ArrowRight className="w-4 h-4" />Suivant</> : <><Trophy className="w-4 h-4" />Résultat</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// GUIDE DES PIEGES
// ══════════════════════════════════════════════════════════════════════════
function PiegesPanel() {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));
  const toggle = (i: number) => setOpenSections(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const tagColors: Record<string, string> = { CE: 'bg-red-100 text-red-700', CO: 'bg-blue-100 text-blue-700', EE: 'bg-emerald-100 text-emerald-700', EO: 'bg-amber-100 text-amber-700' };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">03 · Fondation</p><h2 className="text-xl font-bold text-navy-900 mb-2">Guide des pièges</h2><p className="text-sm text-navy-400 max-w-2xl">Reconnaître le piège au moment où il apparaît, c&apos;est ça qui fait progresser un score.</p></div>
      <div className="space-y-3">
        {trapSections.map((section, idx) => (
          <div key={idx} className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            <button onClick={() => toggle(idx)} className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-cream-50 transition-colors">
              <div className="flex items-center gap-2.5"><span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${tagColors[section.tag] || 'bg-gray-100 text-gray-700'}`}>{section.tag}</span><span className="text-sm font-semibold text-navy-800">{section.title}</span><span className="text-xs text-navy-300">{section.traps.length} pièges</span></div>
              <ChevronDown className={`w-4 h-4 text-navy-300 transition-transform ${openSections.has(idx) ? 'rotate-180' : ''}`} />
            </button>
            {openSections.has(idx) && (
              <div className="px-4 pb-4 border-t border-cream-100 space-y-3 pt-3">
                {section.traps.map((trap, ti) => (
                  <div key={ti} className="flex gap-3"><div className="shrink-0 w-1 rounded-full bg-red-200" /><div><p className="text-sm font-bold text-red-700 mb-0.5">{trap.name}</p><p className="text-sm text-navy-500 leading-relaxed">{trap.description}</p></div></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CE TRAINING (Gamified QCM + XP)
// ══════════════════════════════════════════════════════════════════════════
function CETrainingPanel() {
  return <GamifiedQCMSession exercises={ceExercises} section="CE" title="Compréhension écrite" description="4 familles de documents. Répondez et lisez les explications de pièges." />;
}

// ══════════════════════════════════════════════════════════════════════════
// CO TRAINING (TTS + Gamified QCM)
// ══════════════════════════════════════════════════════════════════════════
function COTrainingPanel() {
  return <GamifiedQCMSession exercises={coExercises} section="CO" title="Compréhension orale" description="Écoutez l'audio puis répondez. QCM 3 choix, format réel." withTTS />;
}

// ══════════════════════════════════════════════════════════════════════════
// GAMIFIED QCM SESSION (used by CE and CO)
// ══════════════════════════════════════════════════════════════════════════
function GamifiedQCMSession({ exercises, section, title, description, withTTS = false }: {
  exercises: TEFQCMExercise[]; section: TEFSection; title: string; description: string; withTTS?: boolean;
}) {
  const [phase, setPhase] = useState<'intro' | 'exercise' | 'review' | 'results'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<TEFExerciseAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<Record<number, number>>({});
  const [streak, setStreak] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const addXp = useGamificationStore(s => s.addXp);
  const tts = useFrenchTTS();
  const config = SECTION_CONFIG[section];

  const current = exercises[currentIdx];
  const totalQuestions = exercises.reduce((s, e) => s + e.questions.length, 0);

  const start = () => { setPhase('exercise'); setCurrentIdx(0); setAnswers([]); setCurrentAnswer({}); setStreak(0); setSessionXP(0); setStartedAt(Date.now()); };
  const restart = () => { setPhase('intro'); setCurrentIdx(0); setAnswers([]); setCurrentAnswer({}); setStreak(0); setSessionXP(0); };

  const handleQCMAnswer = (qIdx: number, choiceIdx: number) => {
    if (currentAnswer[qIdx] !== undefined) return;
    setCurrentAnswer(prev => ({ ...prev, [qIdx]: choiceIdx }));

    const q = current.questions[qIdx];
    const isCorrect = choiceIdx === q.correctIndex;
    const trapTriggered = !isCorrect ? q.choices[choiceIdx]?.piege : undefined;
    let xp = isCorrect ? (withTTS ? TEF_XP_CONFIG.listening_correct : TEF_XP_CONFIG.qcm_correct) : (withTTS ? TEF_XP_CONFIG.listening_incorrect : TEF_XP_CONFIG.qcm_incorrect);
    if (isCorrect && streak >= 2) xp += TEF_XP_CONFIG.qcm_streak_bonus;
    if (isCorrect && !trapTriggered) xp += TEF_XP_CONFIG.trap_avoided;

    setSessionXP(prev => prev + xp);
    if (isCorrect) setStreak(prev => prev + 1);
    else setStreak(0);

    setAnswers(prev => [...prev, {
      exerciseId: current.id, section, isCorrect, pointsEarned: isCorrect ? current.points : 0,
      pointsMax: current.points, userAnswer: choiceIdx, timeSpent: 0, trapTriggered,
    }]);
  };

  const nextExercise = () => {
    setCurrentAnswer({});
    if (currentIdx + 1 >= exercises.length) {
      addXp(sessionXP + TEF_XP_CONFIG.session_complete, `TEF ${section} session`);
      setPhase('results');
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const allCurrentAnswered = current ? Object.keys(currentAnswer).length >= current.questions.length : false;

  // Intro
  if (phase === 'intro') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Épreuve</p><h2 className="text-xl font-bold text-navy-900 mb-2">{title}</h2><p className="text-sm text-navy-400 max-w-2xl">{description}</p></div>
        <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-6 text-center`}>
          <div className="text-4xl mb-3">{config.icon}</div>
          <h3 className="text-lg font-bold text-navy-900 mb-1">{config.fullLabel}</h3>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div><span className="text-2xl font-bold text-navy-900">{exercises.length}</span><p className="text-navy-400 text-xs">exercices</p></div>
            <div><span className="text-2xl font-bold text-navy-900">{totalQuestions}</span><p className="text-navy-400 text-xs">questions</p></div>
            <div><span className="text-2xl font-bold text-teal-600">{exercises.reduce((s, e) => s + e.points * e.questions.length, 0)}</span><p className="text-navy-400 text-xs">XP max</p></div>
          </div>
          {withTTS && <p className="text-xs text-navy-400 mt-3 flex items-center justify-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Audio TTS français activé</p>}
          <button onClick={start} className="mt-6 px-8 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 transition-colors inline-flex items-center gap-2">
            <Zap className="w-4 h-4" /> Commencer l&apos;entraînement
          </button>
        </div>
      </div>
    );
  }

  // Results
  if (phase === 'results') {
    const correct = answers.filter(a => a.isCorrect).length;
    const total = answers.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const nclc = estimateNCLC(section, pct);
    const trapsTriggered = answers.filter(a => a.trapTriggered).map(a => a.trapTriggered!);
    const trapCounts = new Map<string, number>();
    trapsTriggered.forEach(t => trapCounts.set(t, (trapCounts.get(t) || 0) + 1));
    const elapsed = Math.round((Date.now() - startedAt) / 1000);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className={`rounded-xl overflow-hidden ${pct >= 60 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-400 to-red-500'} px-6 py-10 text-white text-center`}>
          {pct >= 60 ? <Trophy className="h-14 w-14 mx-auto mb-3" /> : <Target className="h-14 w-14 mx-auto mb-3" />}
          <p className="text-5xl font-extrabold">{correct}<span className="text-2xl opacity-70">/{total}</span></p>
          <p className="text-xl font-semibold mt-2">NCLC estimé : {nclc}</p>
          <p className="text-sm opacity-80 mt-1">{pct}% · {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</p>
          <div className="mt-3"><span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold"><Zap className="h-4 w-4" />+{sessionXP + TEF_XP_CONFIG.session_complete} XP</span></div>
        </div>
        {/* Traps analysis */}
        {trapCounts.size > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">Pièges déclenchés</p>
            <div className="space-y-2">{Array.from(trapCounts.entries()).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-red-100">
                <span className="text-sm font-mono font-bold text-red-700">{name}</span>
                <span className="text-xs text-navy-500">{count}×</span>
              </div>
            ))}</div>
          </div>
        )}
        <button onClick={restart} className="w-full px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 transition-colors flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Recommencer
        </button>
      </div>
    );
  }

  // Exercise / Review
  if (!current) return null;
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-cream-100 rounded-full h-2 overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / exercises.length) * 100}%` }} /></div>
        <span className="text-xs font-medium text-navy-400">{currentIdx + 1}/{exercises.length}</span>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200"><Zap className="w-3 h-3 text-amber-600" /><span className="text-xs font-bold text-amber-700">{sessionXP}</span></div>
        {streak >= 2 && <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 border border-orange-200"><span className="text-xs font-bold text-orange-600">🔥 {streak}</span></div>}
      </div>

      <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
        <p className="text-xs font-medium text-navy-400">{current.meta}</p>

        {/* CO: TTS audio button */}
        {withTTS && current.ttsText && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <button onClick={() => tts.speak(current.ttsText!, current.id, current.ttsSpeed)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${tts.speakingId === current.id ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-100'}`}>
              {tts.speakingId === current.id ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div><p className="text-sm font-medium text-blue-800">Écouter le passage audio</p><p className="text-xs text-blue-600">Cliquez pour écouter · Vitesse : {current.ttsSpeed}x</p></div>
          </div>
        )}

        {/* Stimulus text (CE: always visible, CO: hidden until listened) */}
        {current.stimulus && !withTTS && (
          <div className="bg-cream-50 border-l-[3px] border-navy-300 px-4 py-3 text-sm text-navy-700 leading-relaxed italic whitespace-pre-line">{current.stimulus}</div>
        )}

        {/* Questions */}
        {current.questions.map((q, qIdx) => {
          const answered = currentAnswer[qIdx] !== undefined;
          const chosenIdx = currentAnswer[qIdx];
          const isCorrect = chosenIdx === q.correctIndex;

          return (
            <div key={qIdx} className="space-y-2">
              <p className="text-sm font-semibold text-navy-800">{q.prompt}</p>
              <div className="space-y-1.5">
                {q.choices.map((c: TEFChoice, ci: number) => {
                  let cls = 'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ';
                  if (!answered) cls += 'border-cream-200 bg-white hover:border-navy-300 hover:bg-cream-50 cursor-pointer';
                  else if (ci === q.correctIndex) cls += 'border-emerald-300 bg-emerald-50 text-emerald-800 font-medium';
                  else if (ci === chosenIdx) cls += 'border-red-300 bg-red-50 text-red-700';
                  else cls += 'border-cream-100 bg-cream-50/50 text-navy-300';
                  return (
                    <button key={ci} onClick={() => handleQCMAnswer(qIdx, ci)} disabled={answered} className={cls}>
                      <div className="flex items-center gap-2">
                        {answered && ci === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {answered && ci === chosenIdx && ci !== q.correctIndex && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        <span>{c.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {answered && (
                <div className={`px-4 py-3 rounded-lg text-sm ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  {isCorrect ? (
                    <p className="text-emerald-700"><strong>Bonne réponse !</strong> {q.choices[q.correctIndex].explanation || ''}</p>
                  ) : (
                    <div>
                      {q.choices[chosenIdx!]?.piege && <p className="font-mono text-xs font-bold text-red-600 mb-1">{q.choices[chosenIdx!].piege}</p>}
                      <p className="text-red-700">{q.choices[chosenIdx!]?.explanation || "Ce n'est pas la bonne réponse."}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {allCurrentAnswered && (
          <button onClick={nextExercise} className="w-full px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 transition-colors flex items-center justify-center gap-2">
            {currentIdx + 1 >= exercises.length ? 'Voir les résultats' : 'Exercice suivant'}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EE TRAINING (Writing with AI evaluation)
// ══════════════════════════════════════════════════════════════════════════
function EETrainingPanel() {
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [userText, setUserText] = useState('');
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeText> | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const addXp = useGamificationStore(s => s.addXp);
  const aiEval = useAIEvaluation();

  const exercise = selectedExercise !== null ? eeExercises[selectedExercise] : null;

  const submitText = async () => {
    if (!exercise) return;
    // Instant local analysis
    const result = analyzeText(userText, exercise.minWords, exercise.maxWords);
    setAnalysis(result);
    const xp = TEF_XP_CONFIG.writing_submit + Object.values(result.criteriaScores).filter(s => s >= 14).length * TEF_XP_CONFIG.writing_criteria_bonus;
    setSessionXP(xp);
    addXp(xp, 'TEF EE exercise');
    // Launch AI evaluation in background
    const section = selectedExercise === 0 ? 'A' : 'B';
    aiEval.evaluateWriting(userText, exercise.sujet, section as 'A' | 'B', exercise.minWords, exercise.maxWords);
  };

  const reset = () => { setSelectedExercise(null); setUserText(''); setAnalysis(null); setShowModel(false); setSessionXP(0); aiEval.resetEvaluation(); };

  if (selectedExercise === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Épreuve</p><h2 className="text-xl font-bold text-navy-900 mb-2">Expression écrite</h2><p className="text-sm text-navy-400 max-w-2xl">Section A (fait divers, 80 mots min) et Section B (argumentation, 200 mots min). Grille à 5 critères. Évaluation IA incluse.</p></div>
        {/* Grading grid */}
        <div className="rounded-xl border border-cream-200 bg-white p-5">
          <h3 className="text-base font-semibold text-navy-900 mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-emerald-600" />Grille de correction · 5 critères</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-navy-100">{eeGrille.headers.map((h, i) => <th key={i} className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-cream-100">{eeGrille.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} className={`py-2 px-3 ${ci === 0 ? 'font-medium text-navy-800' : 'text-navy-500'} text-sm`}>{cell}</td>)}</tr>)}</tbody></table></div>
        </div>
        {eeExercises.map((ex, idx) => (
          <button key={idx} onClick={() => setSelectedExercise(idx)} className="w-full rounded-xl border border-cream-200 bg-white p-5 text-left hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-emerald-100 text-emerald-700">EE</span>
              <span className="text-sm font-semibold text-navy-800">{ex.meta}</span>
            </div>
            <p className="text-sm text-navy-500 line-clamp-2">{ex.sujet}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-navy-400"><PenTool className="w-3.5 h-3.5" />{ex.minWords}-{ex.maxWords} mots · 5 critères · Évaluation IA · +{TEF_XP_CONFIG.writing_submit} XP</div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={reset} className="text-sm text-navy-400 hover:text-navy-700 flex items-center gap-1"><ChevronDown className="w-4 h-4 rotate-90" /> Retour aux sujets</button>
      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <p className="text-xs font-medium text-navy-400 mb-2">{exercise!.meta}</p>
        <h3 className="text-sm font-semibold text-navy-800 mb-4">{exercise!.sujet}</h3>
        <textarea value={userText} onChange={e => setUserText(e.target.value)} placeholder="Rédigez votre texte ici…" className="w-full min-h-[200px] p-4 rounded-lg border border-cream-200 text-sm text-navy-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-y" disabled={!!analysis} />
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-medium ${userText.split(/\s+/).filter(w => w).length < exercise!.minWords ? 'text-red-500' : 'text-emerald-600'}`}>
            {userText.split(/\s+/).filter(w => w).length} / {exercise!.minWords} mots min
          </span>
          {!analysis && <button onClick={submitText} disabled={userText.split(/\s+/).filter(w => w).length < 10} className="px-5 py-2 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><Send className="w-4 h-4" />Soumettre</button>}
        </div>
      </div>

      {analysis && (
        <div className="space-y-4">
          {/* Score banner (uses AI eval if available, local otherwise) */}
          {(() => {
            const nclc = aiEval.writingEval?.estimatedNCLC ?? analysis.estimatedNCLC;
            const total = aiEval.writingEval?.totalScore ?? Object.values(analysis.criteriaScores).reduce((a, b) => a + b, 0);
            return (
              <div className={`rounded-xl p-6 text-center text-white ${nclc >= 7 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                <p className="text-4xl font-extrabold">NCLC {nclc}</p>
                <p className="text-sm opacity-80 mt-1">{analysis.wordCount} mots · {total}/100 pts · Connecteurs : {analysis.connectorsLevel}</p>
                <div className="mt-3"><span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 text-sm font-bold"><Zap className="h-4 w-4" />+{sessionXP} XP</span></div>
              </div>
            );
          })()}

          {/* AI evaluation loading */}
          {aiEval.isEvaluating && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-700 font-medium">Évaluation IA en cours (examinateur certifié TEF)…</p>
            </div>
          )}

          {/* AI evaluation results */}
          {aiEval.writingEval && (
            <div className="space-y-4">
              {/* AI criteria scores */}
              <div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-3">
                <h4 className="text-sm font-semibold text-navy-800 flex items-center gap-2"><Award className="w-4 h-4 text-indigo-600" />Évaluation IA · 5 critères officiels TEF</h4>
                {[
                  { key: 'respectTache', label: 'Respect de la tâche' },
                  { key: 'organisation', label: 'Organisation' },
                  { key: 'richesseLexicale', label: 'Richesse lexicale' },
                  { key: 'grammaire', label: 'Grammaire' },
                  { key: 'cinquiemeCritere', label: selectedExercise === 0 ? 'Qualité narrative' : 'Qualité argumentative' },
                ].map(({ key, label }) => {
                  const s = aiEval.writingEval!.scores[key as keyof typeof aiEval.writingEval.scores];
                  const pct = Math.round((s.score / s.max) * 100);
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="font-medium text-navy-700">{label}</span><span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.score}/{s.max}</span></div>
                      <div className="bg-cream-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} /></div>
                      <p className="text-xs text-navy-500 italic">{s.feedback}</p>
                    </div>
                  );
                })}
              </div>

              {/* AI global feedback */}
              <div className="rounded-xl border border-cream-200 bg-cream-50 p-5 space-y-3">
                <p className="text-sm text-navy-700">{aiEval.writingEval.globalFeedback}</p>
                {aiEval.writingEval.strengths.length > 0 && (
                  <div><p className="text-xs font-semibold text-emerald-700 mb-1">Points forts</p><ul className="space-y-1">{aiEval.writingEval.strengths.map((s, i) => <li key={i} className="text-sm text-navy-600 flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{s}</li>)}</ul></div>
                )}
                {aiEval.writingEval.improvements.length > 0 && (
                  <div><p className="text-xs font-semibold text-amber-700 mb-1">Axes d&apos;amélioration</p><ul className="space-y-1">{aiEval.writingEval.improvements.map((s, i) => <li key={i} className="text-sm text-navy-600 flex gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />{s}</li>)}</ul></div>
                )}
              </div>

              {/* Corrected excerpts */}
              {aiEval.writingEval.correctedExcerpts.length > 0 && (
                <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-navy-800">Corrections suggérées</h4>
                  {aiEval.writingEval.correctedExcerpts.map((c, i) => (
                    <div key={i} className="bg-cream-50 rounded-lg p-3 space-y-1 border border-cream-100">
                      <p className="text-xs text-red-600 line-through">{c.original}</p>
                      <p className="text-xs text-emerald-700 font-medium">{c.corrected}</p>
                      <p className="text-xs text-navy-500 italic">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI error fallback : show local analysis */}
          {aiEval.evalError && (
            <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-3">
              <h4 className="text-sm font-semibold text-navy-800">Évaluation locale (estimation)</h4>
              {exercise!.criteria.map((c, i) => {
                const score = Object.values(analysis.criteriaScores)[i] ?? 0;
                const pct = Math.round((score / c.maxPoints) * 100);
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="font-medium text-navy-700">{c.label}</span><span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score}/{c.maxPoints}</span></div>
                    <div className="bg-cream-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connectors */}
          {analysis.connectorsUsed.length > 0 && (
            <div className="rounded-xl border border-cream-200 bg-white p-4">
              <p className="text-xs font-semibold text-navy-500 mb-2">Connecteurs détectés</p>
              <div className="flex flex-wrap gap-1.5">{analysis.connectorsUsed.map((c, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">{c}</span>)}</div>
            </div>
          )}

          {/* Model texts */}
          <button onClick={() => setShowModel(!showModel)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-cream-200 bg-white text-sm font-medium text-navy-700 hover:bg-cream-50">
            <span className="flex items-center gap-2">{showModel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}Voir les copies modèles NCLC 6 et NCLC 9</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showModel ? 'rotate-180' : ''}`} />
          </button>
          {showModel && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-cream-50 rounded-lg p-4 border border-cream-200"><span className="inline-block font-mono text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded mb-2">Copie NCLC 6</span><p className="text-sm text-navy-600 leading-relaxed">{exercise!.modelTexts.nclc6}</p></div>
              <div className="bg-cream-50 rounded-lg p-4 border border-cream-200"><span className="inline-block font-mono text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded mb-2">Copie NCLC 9</span><p className="text-sm text-navy-600 leading-relaxed">{exercise!.modelTexts.nclc9}</p></div>
            </div>
          )}
          <button onClick={reset} className="w-full px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" />Nouvel exercice</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EO TRAINING (Speech Recognition + Natural TTS + AI Evaluation)
// ══════════════════════════════════════════════════════════════════════════
function EOTrainingPanel() {
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const [accent, setAccent] = useState<'france' | 'quebec'>('france');
  const [phase, setPhase] = useState<'listen' | 'speak' | 'results'>('listen');
  const [recordingStart, setRecordingStart] = useState(0);
  const [speechResult, setSpeechResult] = useState<ReturnType<typeof analyzeSpeech> | null>(null);
  const [sessionXP, setSessionXP] = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const tts = useFrenchTTS();
  const sr = useSpeechRecognition();
  const aiEval = useAIEvaluation();
  const addXp = useGamificationStore(s => s.addXp);
  const transcriptRef = useRef(sr.transcript);
  const confidenceRef = useRef(sr.confidence);

  useEffect(() => { transcriptRef.current = sr.transcript; }, [sr.transcript]);
  useEffect(() => { confidenceRef.current = sr.confidence; }, [sr.confidence]);

  const exercise = selectedExercise !== null ? eoExercises[selectedExercise] : null;

  const startRecording = () => {
    sr.resetTranscript();
    sr.startListening();
    setRecordingStart(Date.now());
    setPhase('speak');
  };

  const stopAndAnalyze = () => {
    sr.stopListening();
    setPendingAnalysis(true);
  };

  useEffect(() => {
    if (!pendingAnalysis) return;
    const timer = setTimeout(() => {
      const duration = Math.max(1, Math.round((Date.now() - recordingStart) / 1000));
      const result = analyzeSpeech(transcriptRef.current, confidenceRef.current, duration);
      setSpeechResult(result);
      const xp = TEF_XP_CONFIG.speaking_submit + (result.fluencyScore >= 14 ? TEF_XP_CONFIG.speaking_fluency_bonus : 0);
      setSessionXP(xp);
      addXp(xp, 'TEF EO exercise');
      setPhase('results');
      setPendingAnalysis(false);
      // Launch AI evaluation in background
      if (exercise) {
        const variant = exercise.variants[selectedVariant];
        aiEval.evaluateSpeaking(
          transcriptRef.current,
          exercise.scenario,
          duration,
          { type: variant.type, examinerLine: variant.examinerLine, expectedSkill: variant.expectedSkill },
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnalysis]);

  const reset = () => {
    setSelectedExercise(null); setSelectedVariant(0); setPhase('listen');
    setSpeechResult(null); setSessionXP(0); sr.resetTranscript(); setPendingAnalysis(false);
    aiEval.resetEvaluation();
  };

  if (selectedExercise === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Épreuve</p><h2 className="text-xl font-bold text-navy-900 mb-2">Expression orale</h2><p className="text-sm text-navy-400 max-w-2xl">Épreuve interactive de 15 min. Voix naturelle (France et Québec). Évaluation IA incluse.</p></div>
        {!sr.isSupported && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div><p className="text-sm font-medium text-amber-800">Reconnaissance vocale non disponible</p><p className="text-xs text-amber-600 mt-1">Votre navigateur ne supporte pas la Web Speech API. Utilisez Chrome ou Edge pour l&apos;entraînement oral.</p></div>
          </div>
        )}
        {eoExercises.map((ex, idx) => (
          <button key={idx} onClick={() => { setSelectedExercise(idx); setPhase('listen'); }} className="w-full rounded-xl border border-cream-200 bg-white p-5 text-left hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-100 text-amber-700">EO</span>
              <span className="text-sm font-semibold text-navy-800">{ex.scenario}</span>
            </div>
            <p className="text-sm text-navy-500 italic">{ex.ttsPrompt}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-navy-400"><Mic className="w-3.5 h-3.5" />{ex.variants.length} variantes · Évaluation IA · +{TEF_XP_CONFIG.speaking_submit} XP</div>
          </button>
        ))}
      </div>
    );
  }

  const variant = exercise!.variants[selectedVariant];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={reset} className="text-sm text-navy-400 hover:text-navy-700 flex items-center gap-1"><ChevronDown className="w-4 h-4 rotate-90" /> Retour aux scénarios</button>

      <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
        <p className="text-xs font-medium text-navy-400">{exercise!.meta}</p>
        <h3 className="text-sm font-semibold text-navy-800">{exercise!.scenario}</h3>

        {/* Variant + Accent selectors */}
        <div className="flex flex-wrap gap-2 items-center">
          {exercise!.variants.map((v, i) => (
            <button key={i} onClick={() => setSelectedVariant(i)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === selectedVariant ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-cream-50 text-navy-500 border border-cream-200 hover:bg-cream-100'}`}>{v.type}</button>
          ))}
          <span className="text-cream-300 mx-1">|</span>
          <button onClick={() => setAccent('france')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${accent === 'france' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-cream-50 text-navy-500 border border-cream-200 hover:bg-cream-100'}`}>🇫🇷 France</button>
          <button onClick={() => setAccent('quebec')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${accent === 'quebec' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-cream-50 text-navy-500 border border-cream-200 hover:bg-cream-100'}`}>🇨🇦 Québec</button>
        </div>

        {/* Examiner prompt */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">L&apos;examinateur dit :</p>
          <p className="text-sm text-navy-700 italic mb-3">{variant.examinerLine}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => tts.speak(variant.examinerLine.replace(/[«»]/g, ''), `eo-${selectedVariant}`, exercise!.ttsSpeed ?? 1.0, accent)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tts.speakingId === `eo-${selectedVariant}` ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'}`}>
              {tts.speakingId === `eo-${selectedVariant}` ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              Écouter {accent === 'france' ? '🇫🇷' : '🇨🇦'}
            </button>
            {tts.isSpeaking && <span className="text-xs text-amber-600 animate-pulse">Lecture en cours…</span>}
          </div>
          <p className="text-xs text-amber-600 mt-2">Compétence testée : {variant.expectedSkill}</p>
        </div>

        {/* Listen phase */}
        {phase === 'listen' && (
          <div className="text-center py-4">
            <p className="text-sm text-navy-500 mb-4">Écoutez l&apos;examinateur, puis cliquez pour enregistrer votre réponse</p>
            <button onClick={startRecording} disabled={!sr.isSupported} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
              <Mic className="w-5 h-5" /> Commencer à parler
            </button>
          </div>
        )}

        {/* Speaking phase */}
        {phase === 'speak' && (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-700">Enregistrement en cours…</span>
            </div>
            {sr.interimTranscript && <p className="text-sm text-navy-400 italic">{sr.interimTranscript}</p>}
            {sr.transcript && <p className="text-sm text-navy-600">{sr.transcript}</p>}
            <button onClick={stopAndAnalyze} className="px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 inline-flex items-center gap-2">
              <Square className="w-4 h-4" /> Terminer et analyser
            </button>
          </div>
        )}

        {/* Results phase */}
        {phase === 'results' && speechResult && (
          <div className="space-y-4">
            {/* Score banner (AI or local) */}
            {(() => {
              const nclc = aiEval.speakingEval?.estimatedNCLC ?? speechResult.estimatedNCLC;
              return (
                <div className={`rounded-xl p-5 text-center text-white ${nclc >= 7 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                  <p className="text-3xl font-extrabold">NCLC {nclc}</p>
                  <p className="text-sm opacity-80 mt-1">{speechResult.wordCount} mots · {speechResult.wordsPerMinute} mots/min · Confiance : {Math.round(speechResult.confidence * 100)}%</p>
                  <div className="mt-2"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm font-bold"><Zap className="h-3.5 w-3.5" />+{sessionXP} XP</span></div>
                </div>
              );
            })()}

            {sr.transcript && (
              <div className="rounded-xl border border-cream-200 bg-cream-50 p-4"><p className="text-xs font-semibold text-navy-500 mb-2">Votre transcription :</p><p className="text-sm text-navy-700">{sr.transcript}</p></div>
            )}

            {/* AI evaluation loading */}
            {aiEval.isEvaluating && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-blue-700 font-medium">Évaluation IA en cours…</p>
              </div>
            )}

            {/* AI evaluation results */}
            {aiEval.speakingEval && (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-navy-800 flex items-center gap-2"><Award className="w-4 h-4 text-indigo-600" />Évaluation IA · 5 critères EO</h4>
                  {[
                    { key: 'fluidite', label: 'Fluidité et aisance' },
                    { key: 'richesseLexicale', label: 'Richesse du vocabulaire' },
                    { key: 'interaction', label: 'Capacité d\'interaction' },
                    { key: 'connecteurs', label: 'Utilisation de connecteurs' },
                    { key: 'registre', label: 'Registre de langue' },
                  ].map(({ key, label }) => {
                    const s = aiEval.speakingEval!.scores[key as keyof typeof aiEval.speakingEval.scores];
                    const pct = Math.round((s.score / s.max) * 100);
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="font-medium text-navy-700">{label}</span><span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.score}/{s.max}</span></div>
                        <div className="bg-cream-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} /></div>
                        <p className="text-xs text-navy-500 italic">{s.feedback}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-cream-200 bg-cream-50 p-5 space-y-3">
                  <p className="text-sm text-navy-700">{aiEval.speakingEval.globalFeedback}</p>
                  {aiEval.speakingEval.strengths.length > 0 && (
                    <div><p className="text-xs font-semibold text-emerald-700 mb-1">Points forts</p><ul className="space-y-1">{aiEval.speakingEval.strengths.map((s, i) => <li key={i} className="text-sm text-navy-600 flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{s}</li>)}</ul></div>
                  )}
                  {aiEval.speakingEval.improvements.length > 0 && (
                    <div><p className="text-xs font-semibold text-amber-700 mb-1">Axes d&apos;amélioration</p><ul className="space-y-1">{aiEval.speakingEval.improvements.map((s, i) => <li key={i} className="text-sm text-navy-600 flex gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />{s}</li>)}</ul></div>
                  )}
                </div>

                {aiEval.speakingEval.suggestedRephrasing.length > 0 && (
                  <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-3">
                    <h4 className="text-sm font-semibold text-navy-800">Reformulations suggérées</h4>
                    {aiEval.speakingEval.suggestedRephrasing.map((r, i) => (
                      <div key={i} className="bg-cream-50 rounded-lg p-3 space-y-1 border border-cream-100">
                        <p className="text-xs text-navy-500">{r.original}</p>
                        <p className="text-xs text-emerald-700 font-medium">→ {r.improved}</p>
                        <p className="text-xs text-navy-400 italic">{r.why}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local scores fallback (always visible as secondary info) */}
            {!aiEval.speakingEval && !aiEval.isEvaluating && (
              <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-3">
                <h4 className="text-sm font-semibold text-navy-800">Scores détaillés (estimation locale)</h4>
                {[
                  { label: 'Fluidité', score: speechResult.fluencyScore, max: 20 },
                  { label: 'Contenu', score: speechResult.contentScore, max: 20 },
                  { label: 'Interaction', score: speechResult.interactionScore, max: 20 },
                ].map(({ label, score, max }) => {
                  const pct = Math.round((score / max) * 100);
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="font-medium text-navy-700">{label}</span><span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score}/{max}</span></div>
                      <div className="bg-cream-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tips */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">Conseils pour NCLC 7</p>
              <ul className="space-y-1">{exercise!.tipsForNCLC7.map((tip, i) => <li key={i} className="text-sm text-navy-600 flex gap-2"><Star className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />{tip}</li>)}</ul>
            </div>
            <button onClick={reset} className="w-full px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" />Nouvel exercice</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC
// ══════════════════════════════════════════════════════════════════════════
function DiagnosticPanel() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const addXp = useGamificationStore(s => s.addXp);

  const handleAnswer = (qIdx: number, choiceIdx: number) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers(prev => ({ ...prev, [qIdx]: choiceIdx }));
  };

  const score = useMemo(() => Object.entries(answers).reduce((acc, [qIdx, chosen]) =>
    acc + (diagnosticExercises[Number(qIdx)].questions[0].correctIndex === chosen ? 1 : 0), 0
  ), [answers]);

  const allAnswered = Object.keys(answers).length === diagnosticExercises.length;

  const submitResult = () => {
    setShowResult(true);
    addXp(score * TEF_XP_CONFIG.qcm_correct + TEF_XP_CONFIG.session_complete, 'TEF Diagnostic');
  };

  const getResult = () => {
    if (score <= 3) return { stade: 'Stade I (NCLC 1-4)', action: 'Démarrez par la banque lexicale de base.', color: 'bg-orange-50 border-orange-200 text-orange-800', nclc: 4 };
    if (score <= 5) return { stade: 'Stade II bas (NCLC 5-6)', action: 'Démarrez sur les exercices NCLC 5-6.', color: 'bg-blue-50 border-blue-200 text-blue-800', nclc: 6 };
    if (score <= 7) return { stade: 'Stade II haut (NCLC 7)', action: 'Démarrez sur le palier pivot NCLC 7.', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', nclc: 7 };
    return { stade: 'Stade III (NCLC 8-9)', action: 'Exercices avancés, confirmez avec un test blanc.', color: 'bg-indigo-50 border-indigo-200 text-indigo-800', nclc: 9 };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Entraînement</p><h2 className="text-xl font-bold text-navy-900 mb-2">Diagnostic de placement</h2><p className="text-sm text-navy-400 max-w-2xl">8 questions, ~3 min. Détermine votre stade NCLC de départ.</p></div>
      <div className="space-y-4">
        {diagnosticExercises.map((ex, qIdx) => {
          const q = ex.questions[0];
          const answered = answers[qIdx] !== undefined;
          const chosenIdx = answers[qIdx];
          return (
            <div key={qIdx} className="rounded-xl border border-cream-200 bg-white p-5">
              <p className="text-sm font-semibold text-navy-800 mb-3"><span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold text-center leading-6 mr-2">{qIdx + 1}</span>{q.prompt}</p>
              <div className="space-y-1.5">
                {q.choices.map((c, ci) => {
                  let cls = 'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ';
                  if (!answered) cls += 'border-cream-200 bg-white hover:border-navy-300 hover:bg-cream-50 cursor-pointer';
                  else if (ci === q.correctIndex) cls += 'border-emerald-300 bg-emerald-50 text-emerald-800 font-medium';
                  else if (ci === chosenIdx) cls += 'border-red-300 bg-red-50 text-red-700';
                  else cls += 'border-cream-100 bg-cream-50/50 text-navy-300';
                  return (
                    <button key={ci} onClick={() => handleAnswer(qIdx, ci)} disabled={answered} className={cls}>
                      <div className="flex items-center gap-2">
                        {answered && ci === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {answered && ci === chosenIdx && ci !== q.correctIndex && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        <span>{c.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {allAnswered && !showResult && (
        <button onClick={submitResult} className="w-full px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 flex items-center justify-center gap-2"><Target className="w-4 h-4" />Voir mon résultat</button>
      )}
      {showResult && (() => {
        const result = getResult();
        return (
          <div className={`rounded-xl border p-6 ${result.color} space-y-2`}>
            <div className="flex items-center justify-between"><p className="text-lg font-bold">Résultat : {score}/{diagnosticExercises.length}</p><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 text-sm font-bold"><Zap className="h-3.5 w-3.5" />+{score * TEF_XP_CONFIG.qcm_correct + TEF_XP_CONFIG.session_complete} XP</span></div>
            <p><strong>Stade estimé :</strong> {result.stade}</p>
            <p><strong>Recommandation :</strong> {result.action}</p>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BAREME OFFICIEL
// ══════════════════════════════════════════════════════════════════════════
function BaremePanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div><p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Validation</p><h2 className="text-xl font-bold text-navy-900 mb-2">Barème officiel</h2><p className="text-sm text-navy-400 max-w-2xl">NCLC final = le plus bas des 4 scores.</p></div>
      <div className="rounded-xl border border-cream-200 bg-white p-5"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-navy-100">{bareme.headers.map((h, i) => <th key={i} className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-cream-100">{bareme.rows.map((row, ri) => <tr key={ri} className={row[0].includes('7') ? 'bg-yellow-50/50 font-semibold' : ''}>{row.map((cell, ci) => <td key={ci} className={`py-2.5 px-3 font-mono text-sm ${ci === 0 ? 'font-bold' : 'text-navy-600'} ${row[0].includes('7') && ci === 0 ? 'text-amber-700' : ''}`}>{cell}</td>)}</tr>)}</tbody></table></div></div>
      <div className="rounded-xl border border-cream-200 bg-white p-5"><h3 className="text-base font-semibold text-navy-900 mb-4">Feuille de résultats</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-navy-100"><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Épreuve</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Score</th><th className="text-left py-2 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">NCLC</th></tr></thead><tbody className="divide-y divide-cream-100"><tr><td className="py-2 px-3 font-medium">CE</td><td className="py-2 px-3 text-navy-400">___ / 300</td><td className="py-2 px-3 text-navy-400">___</td></tr><tr><td className="py-2 px-3 font-medium">CO</td><td className="py-2 px-3 text-navy-400">___ / 360</td><td className="py-2 px-3 text-navy-400">___</td></tr><tr><td className="py-2 px-3 font-medium">EE</td><td className="py-2 px-3 text-navy-400">___ / 450</td><td className="py-2 px-3 text-navy-400">___</td></tr><tr><td className="py-2 px-3 font-medium">EO</td><td className="py-2 px-3 text-navy-400">___ / 450</td><td className="py-2 px-3 text-navy-400">___</td></tr><tr className="font-bold bg-navy-50"><td className="py-2 px-3">NCLC final</td><td className="py-2 px-3" colSpan={2}>= le plus bas des 4</td></tr></tbody></table></div></div>
    </div>
  );
}
