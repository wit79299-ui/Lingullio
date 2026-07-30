'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  diagQuestions,
  ceItems,
  coItems,
  eeItems,
  eeGrille,
  eoItems,
  lexique,
  trapSections,
  bareme,
  type QuizItem,
  type QuizChoice,
} from './tef-data';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Target,
  Award,
  FileText,
  Headphones,
  PenTool,
  MessageCircle,
  BookMarked,
  AlertTriangle,
  BarChart3,
  Home,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

// ── Navigation sections ──
type Section =
  | 'accueil'
  | 'referentiel'
  | 'lexique'
  | 'pieges'
  | 'ce'
  | 'co'
  | 'ee'
  | 'eo'
  | 'diagnostic'
  | 'bareme';

interface NavItem {
  id: Section;
  label: string;
  num: string;
  icon: React.ReactNode;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Fondations',
    items: [
      { id: 'accueil', label: 'Accueil', num: '00', icon: <Home className="w-4 h-4" /> },
      { id: 'referentiel', label: 'Référentiel NCLC', num: '01', icon: <BookMarked className="w-4 h-4" /> },
      { id: 'lexique', label: 'Banque lexicale', num: '02', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'pieges', label: 'Guide des pièges', num: '03', icon: <AlertTriangle className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Les 4 épreuves',
    items: [
      { id: 'ce', label: 'Compréhension écrite', num: 'CE', icon: <FileText className="w-4 h-4" /> },
      { id: 'co', label: 'Compréhension orale', num: 'CO', icon: <Headphones className="w-4 h-4" /> },
      { id: 'ee', label: 'Expression écrite', num: 'EE', icon: <PenTool className="w-4 h-4" /> },
      { id: 'eo', label: 'Expression orale', num: 'EO', icon: <MessageCircle className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Entraînement',
    items: [
      { id: 'diagnostic', label: 'Diagnostic de placement', num: '→', icon: <Target className="w-4 h-4" /> },
      { id: 'bareme', label: 'Barème officiel', num: '→', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

// ── Main component ──
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
        <p className="text-navy-400 mt-2 ml-[52px]">
          Parcours calibré NCLC — diagnostic, exercices, vocabulaire et pièges
        </p>
      </header>

      {/* Mobile nav toggle */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-navy-50 text-navy-700 font-medium text-sm"
      >
        <span>Navigation — {navGroups.flatMap(g => g.items).find(i => i.id === activeSection)?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar navigation */}
        <nav className={`lg:w-64 shrink-0 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="lg:sticky lg:top-24 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-navy-300 px-3 mb-1.5">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${activeSection === item.id
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-navy-500 hover:bg-cream-50 hover:text-navy-700'
                        }`}
                    >
                      <span className={`font-mono text-[11px] w-5 text-center ${activeSection === item.id ? 'text-blue-600' : 'text-navy-300'}`}>
                        {item.num}
                      </span>
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'accueil' && <AccueilPanel onNavigate={navigate} />}
          {activeSection === 'referentiel' && <ReferentielPanel />}
          {activeSection === 'lexique' && <LexiquePanel />}
          {activeSection === 'pieges' && <PiegesPanel />}
          {activeSection === 'ce' && <QuizPanel title="Compréhension écrite" kicker="Épreuve" description="4 familles de documents. Répondez, puis lisez systématiquement l'explication — même sur les bonnes réponses." items={ceItems} />}
          {activeSection === 'co' && <QuizPanel title="Compréhension orale" kicker="Épreuve" description="Scripts calibrés. QCM à 3 choix, conforme à la réforme de septembre 2025." items={coItems} />}
          {activeSection === 'ee' && <EEPanel />}
          {activeSection === 'eo' && <EOPanel />}
          {activeSection === 'diagnostic' && <DiagnosticPanel />}
          {activeSection === 'bareme' && <BaremePanel />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ACCUEIL
// ============================================================
function AccueilPanel({ onNavigate }: { onNavigate: (s: Section) => void }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Programme complet</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Votre préparation au TEF Canada</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          Un parcours calibré niveau par niveau (NCLC), fidèle au format réel de l&apos;examen, conçu pour vous apprendre à déjouer les pièges — pas seulement à connaître le format.
        </p>
      </div>

      {/* Exam structure */}
      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <h3 className="text-base font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Structure de l&apos;examen
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-200">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Épreuve</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Durée</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Format</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Barème</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              <tr><td className="py-2.5 px-3 font-medium">Compréhension orale (CO)</td><td className="py-2.5 px-3 text-navy-500">40 min</td><td className="py-2.5 px-3 text-navy-500">QCM 3 choix, 4 sections</td><td className="py-2.5 px-3 font-mono text-navy-600">/360</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">Compréhension écrite (CE)</td><td className="py-2.5 px-3 text-navy-500">60 min</td><td className="py-2.5 px-3 text-navy-500">QCM, 4 familles de documents</td><td className="py-2.5 px-3 font-mono text-navy-600">/300</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">Expression écrite (EE)</td><td className="py-2.5 px-3 text-navy-500">60 min</td><td className="py-2.5 px-3 text-navy-500">Fait divers + argumentation</td><td className="py-2.5 px-3 font-mono text-navy-600">/450</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">Expression orale (EO)</td><td className="py-2.5 px-3 text-navy-500">15 min</td><td className="py-2.5 px-3 text-navy-500">Face à un examinateur, interactif</td><td className="py-2.5 px-3 font-mono text-navy-600">/450</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-navy-400 mt-3 italic">
          Règle essentielle : votre NCLC final = votre score le plus bas parmi les 4 épreuves, jamais une moyenne. Ce principe guide tout ce programme.
        </p>
      </div>

      {/* How to use */}
      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <h3 className="text-base font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Comment utiliser ce programme
        </h3>
        <ol className="space-y-3 text-sm text-navy-600">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
            <span><strong className="text-navy-800">Commencez</strong> par le diagnostic de placement pour identifier votre stade actuel</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
            <span><strong className="text-navy-800">Consultez</strong> le guide des pièges avant de vous entraîner — c&apos;est ce qui fait vraiment progresser un score</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
            <span><strong className="text-navy-800">Entraînez-vous</strong> épreuve par épreuve, en lisant systématiquement les explications de vos erreurs</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">4</span>
            <span><strong className="text-navy-800">Validez</strong> avec le barème officiel une fois les 4 épreuves travaillées</span>
          </li>
        </ol>
      </div>

      {/* Quick access CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => onNavigate('diagnostic')} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg transition-shadow">
          <Target className="w-5 h-5" />
          <div className="text-left">
            <div className="font-semibold text-sm">Diagnostic de placement</div>
            <div className="text-[11px] text-white/70">8 questions · ~3 min</div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
        <button onClick={() => onNavigate('pieges')} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:shadow-lg transition-shadow">
          <AlertTriangle className="w-5 h-5" />
          <div className="text-left">
            <div className="font-semibold text-sm">Guide des pièges</div>
            <div className="text-[11px] text-white/70">23 pièges par section</div>
          </div>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// REFERENTIEL NCLC
// ============================================================
function ReferentielPanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">01 — Fondation</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Référentiel NCLC</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          12 niveaux, 3 stades. Le NCLC 7 est le seuil pivot visé par la majorité des candidats (Entrée Express, catégorie French-language).
        </p>
      </div>

      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-navy-100">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Stade</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Niveaux</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">CECR</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              <tr><td className="py-2.5 px-3 font-medium">I — Basique</td><td className="py-2.5 px-3">1 à 4</td><td className="py-2.5 px-3 font-mono text-xs">A1 → A2</td><td className="py-2.5 px-3 text-navy-500">Communication de survie</td></tr>
              <tr className="bg-blue-50/50"><td className="py-2.5 px-3 font-medium">II — Intermédiaire</td><td className="py-2.5 px-3">5 à 8</td><td className="py-2.5 px-3 font-mono text-xs">A2/B1 → B2</td><td className="py-2.5 px-3 text-navy-500">Autonomie croissante</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">III — Avancé</td><td className="py-2.5 px-3">9 à 12</td><td className="py-2.5 px-3 font-mono text-xs">C1 → C2</td><td className="py-2.5 px-3 text-navy-500">Maîtrise fine, nuance</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <h3 className="text-base font-semibold text-navy-900 mb-4">
          Descripteurs — Stade II <span className="text-xs text-navy-400 font-normal">(zone prioritaire, NCLC 5-8)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-navy-100">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">NCLC</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">CE</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">CO</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">EE</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">EO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              <tr><td className="py-2.5 px-3 font-mono font-bold">5</td><td className="py-2.5 px-3 text-navy-500">Textes factuels courts</td><td className="py-2.5 px-3 text-navy-500">Conversation simple</td><td className="py-2.5 px-3 text-navy-500">Messages courts</td><td className="py-2.5 px-3 text-navy-500">Sujets familiers</td></tr>
              <tr><td className="py-2.5 px-3 font-mono font-bold">6</td><td className="py-2.5 px-3 text-navy-500">Essentiel d&apos;un article</td><td className="py-2.5 px-3 text-navy-500">Idée principale</td><td className="py-2.5 px-3 text-navy-500">Texte court argumenté</td><td className="py-2.5 px-3 text-navy-500">Décrit, opine simplement</td></tr>
              <tr className="bg-yellow-50/50 font-medium"><td className="py-2.5 px-3 font-mono font-bold text-amber-700">7 ⭐</td><td className="py-2.5 px-3">Implicite simple</td><td className="py-2.5 px-3">Nuances d&apos;intonation</td><td className="py-2.5 px-3">Articulation logique</td><td className="py-2.5 px-3">Argumente, nuance</td></tr>
              <tr><td className="py-2.5 px-3 font-mono font-bold">8</td><td className="py-2.5 px-3 text-navy-500">Faits vs opinions</td><td className="py-2.5 px-3 text-navy-500">Débat à plusieurs</td><td className="py-2.5 px-3 text-navy-500">Connecteurs variés</td><td className="py-2.5 px-3 text-navy-500">Défend une position</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BANQUE LEXICALE
// ============================================================
function LexiquePanel() {
  const [openDomains, setOpenDomains] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setOpenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">02 — Fondation</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Banque lexicale par domaine</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          20 domaines thématiques, chacun décliné sur 3 stades. Cliquez pour développer.
        </p>
      </div>

      <div className="space-y-2">
        {lexique.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cream-50 transition-colors"
            >
              <span className="text-sm font-semibold text-navy-800">{item.domaine}</span>
              <ChevronDown className={`w-4 h-4 text-navy-300 transition-transform ${openDomains.has(idx) ? 'rotate-180' : ''}`} />
            </button>
            {openDomains.has(idx) && (
              <div className="px-4 pb-4 border-t border-cream-100">
                <table className="w-full text-sm mt-3">
                  <tbody className="divide-y divide-cream-100">
                    <tr>
                      <td className="py-2 pr-3 text-[11px] font-bold tracking-wider uppercase text-navy-300 w-20 align-top">Stade I</td>
                      <td className="py-2 text-navy-600">{item.stadeI}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-[11px] font-bold tracking-wider uppercase text-blue-500 w-20 align-top">Stade II</td>
                      <td className="py-2 text-navy-600">{item.stadeII} — <em className="text-blue-600">{item.exII}</em></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-[11px] font-bold tracking-wider uppercase text-amber-600 w-20 align-top">Stade III</td>
                      <td className="py-2 text-navy-600">{item.stadeIII} — <em className="text-amber-700">{item.exIII}</em></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// GUIDE DES PIEGES
// ============================================================
function PiegesPanel() {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));

  const toggle = (idx: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const tagColors: Record<string, string> = {
    CE: 'bg-red-100 text-red-700',
    CO: 'bg-blue-100 text-blue-700',
    EE: 'bg-emerald-100 text-emerald-700',
    EO: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">03 — Fondation</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Guide des pièges</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          Ce qui fait vraiment progresser un score : reconnaître le piège au moment où il apparaît, pas seulement connaître le format.
        </p>
      </div>

      <div className="space-y-3">
        {trapSections.map((section, idx) => (
          <div key={idx} className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-cream-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${tagColors[section.tag] || 'bg-gray-100 text-gray-700'}`}>
                  {section.tag}
                </span>
                <span className="text-sm font-semibold text-navy-800">{section.title}</span>
                <span className="text-xs text-navy-300">{section.traps.length} pièges</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-navy-300 transition-transform ${openSections.has(idx) ? 'rotate-180' : ''}`} />
            </button>
            {openSections.has(idx) && (
              <div className="px-4 pb-4 border-t border-cream-100 space-y-3 pt-3">
                {section.traps.map((trap, ti) => (
                  <div key={ti} className="flex gap-3">
                    <div className="shrink-0 w-1 rounded-full bg-red-200" />
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-0.5">{trap.name}</p>
                      <p className="text-sm text-navy-500 leading-relaxed">{trap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// QUIZ PANEL (CE & CO)
// ============================================================
function QuizPanel({ title, kicker, description, items }: { title: string; kicker: string; description: string; items: QuizItem[] }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">{kicker}</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">{title}</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">{description}</p>
      </div>

      <div className="space-y-5">
        {items.map((item, idx) => (
          <QuizCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

function QuizCard({ item }: { item: QuizItem }) {
  // Track answered state per question: { [qIdx]: chosenIdx }
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const handleAnswer = (qIdx: number, choiceIdx: number) => {
    if (answers[qIdx] !== undefined) return; // already answered
    setAnswers((prev) => ({ ...prev, [qIdx]: choiceIdx }));
  };

  return (
    <div className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
      <p className="text-xs font-medium text-navy-400">{item.meta}</p>
      {item.text && (
        <div className="bg-cream-50 border-l-3 border-navy-300 px-4 py-3 text-sm text-navy-700 leading-relaxed italic whitespace-pre-line">
          {item.text}
        </div>
      )}

      {item.questions.map((q, qIdx) => {
        const answered = answers[qIdx] !== undefined;
        const chosenIdx = answers[qIdx];
        const isCorrect = chosenIdx === q.correct;

        return (
          <div key={qIdx} className="space-y-2">
            <p className="text-sm font-semibold text-navy-800">{q.q}</p>
            <div className="space-y-1.5">
              {q.choices.map((c: QuizChoice, ci: number) => {
                let btnClass = 'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ';
                if (!answered) {
                  btnClass += 'border-cream-200 bg-white hover:border-navy-300 hover:bg-cream-50 cursor-pointer';
                } else if (ci === q.correct) {
                  btnClass += 'border-emerald-300 bg-emerald-50 text-emerald-800 font-medium';
                } else if (ci === chosenIdx) {
                  btnClass += 'border-red-300 bg-red-50 text-red-700';
                } else {
                  btnClass += 'border-cream-100 bg-cream-50/50 text-navy-300';
                }

                return (
                  <button
                    key={ci}
                    onClick={() => handleAnswer(qIdx, ci)}
                    disabled={answered}
                    className={btnClass}
                  >
                    <div className="flex items-center gap-2">
                      {answered && ci === q.correct && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {answered && ci === chosenIdx && ci !== q.correct && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span>{c.t}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {answered && (
              <div className={`px-4 py-3 rounded-lg text-sm ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                {isCorrect ? (
                  <p className="text-emerald-700">
                    <strong>Bonne réponse !</strong> {q.choices[q.correct].exp || ''}
                  </p>
                ) : (
                  <div>
                    {q.choices[chosenIdx!].piege && (
                      <p className="font-mono text-xs font-bold text-red-600 mb-1">{q.choices[chosenIdx!].piege}</p>
                    )}
                    <p className="text-red-700">{q.choices[chosenIdx!].exp || "Ce n'est pas la bonne réponse."}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// EE (Expression écrite)
// ============================================================
function EEPanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Épreuve</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Expression écrite</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          Section A (fait divers, 80 mots min) et Section B (argumentation, 200 mots min). Grille à 5 critères — votre note = le critère le plus faible.
        </p>
      </div>

      {/* Grading grid */}
      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <h3 className="text-base font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          Grille de correction — 5 critères
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-navy-100">
                {eeGrille.headers.map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {eeGrille.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`py-2.5 px-3 ${ci === 0 ? 'font-medium text-navy-800' : 'text-navy-500'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model texts */}
      {eeItems.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-800">{item.sujet}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
              <span className="inline-block font-mono text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded mb-2">
                Copie NCLC 6
              </span>
              <p className="text-sm text-navy-600 leading-relaxed">{item.n6}</p>
            </div>
            <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
              <span className="inline-block font-mono text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded mb-2">
                Copie NCLC 9
              </span>
              <p className="text-sm text-navy-600 leading-relaxed">{item.n9}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// EO (Expression orale)
// ============================================================
function EOPanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Épreuve</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Expression orale</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          Épreuve interactive de 15 min. Chaque scénario a plusieurs trajectoires possibles — ne mémorisez pas un script, entraînez votre réaction.
        </p>
      </div>

      {eoItems.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-cream-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-800">{item.titre}</h3>
          <p className="text-sm text-navy-400 italic">{item.base}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy-100">
                  <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Variante</th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Réaction examinateur</th>
                  <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Ce que ça teste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {item.variantes.map((v, vi) => (
                  <tr key={vi}>
                    <td className="py-2.5 px-3 font-medium text-navy-800">{v[0]}</td>
                    <td className="py-2.5 px-3 text-navy-500 italic">{v[1]}</td>
                    <td className="py-2.5 px-3 text-navy-500">{v[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// DIAGNOSTIC DE PLACEMENT
// ============================================================
function DiagnosticPanel() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (qIdx: number, choiceIdx: number) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: choiceIdx }));
  };

  const score = useMemo(() => {
    return Object.entries(answers).reduce((acc, [qIdx, chosen]) => {
      return acc + (diagQuestions[Number(qIdx)].correct === chosen ? 1 : 0);
    }, 0);
  }, [answers]);

  const allAnswered = Object.keys(answers).length === diagQuestions.length;

  const getResult = () => {
    if (score <= 3) return { stade: 'Stade I (NCLC 1-4)', action: 'Démarrez par la banque lexicale de base avant tout exercice d\'examen.', color: 'bg-orange-50 border-orange-200 text-orange-800' };
    if (score <= 5) return { stade: 'Stade II bas (NCLC 5-6)', action: 'Démarrez sur les exercices calibrés NCLC 5-6.', color: 'bg-blue-50 border-blue-200 text-blue-800' };
    if (score <= 7) return { stade: 'Stade II haut (NCLC 7)', action: 'Démarrez directement sur le palier pivot NCLC 7.', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    return { stade: 'Stade III (NCLC 8-9)', action: 'Démarrez sur les exercices avancés, confirmez avec un test blanc NCLC 7.', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Entraînement</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Diagnostic de placement</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          8 questions d&apos;échantillon (version complète : 20 questions), environ 3 minutes. Détermine votre stade de départ.
        </p>
      </div>

      <div className="space-y-4">
        {diagQuestions.map((q, qIdx) => {
          const answered = answers[qIdx] !== undefined;
          const chosenIdx = answers[qIdx];

          return (
            <div key={qIdx} className="rounded-xl border border-cream-200 bg-white p-5">
              <p className="text-sm font-semibold text-navy-800 mb-3">
                <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold text-center leading-6 mr-2">
                  {qIdx + 1}
                </span>
                {q.q}
              </p>
              <div className="space-y-1.5">
                {q.choices.map((c, ci) => {
                  let btnClass = 'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ';
                  if (!answered) {
                    btnClass += 'border-cream-200 bg-white hover:border-navy-300 hover:bg-cream-50 cursor-pointer';
                  } else if (ci === q.correct) {
                    btnClass += 'border-emerald-300 bg-emerald-50 text-emerald-800 font-medium';
                  } else if (ci === chosenIdx) {
                    btnClass += 'border-red-300 bg-red-50 text-red-700';
                  } else {
                    btnClass += 'border-cream-100 bg-cream-50/50 text-navy-300';
                  }

                  return (
                    <button key={ci} onClick={() => handleAnswer(qIdx, ci)} disabled={answered} className={btnClass}>
                      <div className="flex items-center gap-2">
                        {answered && ci === q.correct && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {answered && ci === chosenIdx && ci !== q.correct && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        <span>{c}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit / Result */}
      {allAnswered && !showResult && (
        <button
          onClick={() => setShowResult(true)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-navy-800 text-white font-semibold text-sm hover:bg-navy-700 transition-colors"
        >
          Voir mon résultat
        </button>
      )}

      {showResult && (() => {
        const result = getResult();
        return (
          <div className={`rounded-xl border p-6 ${result.color} space-y-2`}>
            <p className="text-lg font-bold">Résultat : {score} / {diagQuestions.length}</p>
            <p><strong>Stade estimé :</strong> {result.stade}</p>
            <p><strong>Recommandation :</strong> {result.action}</p>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================
// BAREME OFFICIEL
// ============================================================
function BaremePanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-[11px] font-semibold tracking-wider uppercase text-navy-300 mb-1">Validation</p>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Barème officiel &amp; test blanc</h2>
        <p className="text-sm text-navy-400 leading-relaxed max-w-2xl">
          Barème validé (recoupement de deux sources indépendantes). Rappel : votre NCLC final = le plus bas des 4 scores.
        </p>
      </div>

      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-navy-100">
                {bareme.headers.map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {bareme.rows.map((row, ri) => (
                <tr key={ri} className={row[0].includes('7') ? 'bg-yellow-50/50 font-semibold' : ''}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`py-2.5 px-3 font-mono text-sm ${ci === 0 ? 'font-bold' : 'text-navy-600'} ${row[0].includes('7') && ci === 0 ? 'text-amber-700' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score sheet template */}
      <div className="rounded-xl border border-cream-200 bg-white p-5">
        <h3 className="text-base font-semibold text-navy-900 mb-4">Feuille de résultats — modèle</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-navy-100">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Épreuve</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">Score</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold tracking-wider uppercase text-navy-400">NCLC estimé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              <tr><td className="py-2.5 px-3 font-medium">CE</td><td className="py-2.5 px-3 text-navy-400">___ / 300</td><td className="py-2.5 px-3 text-navy-400">___</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">CO</td><td className="py-2.5 px-3 text-navy-400">___ / 360</td><td className="py-2.5 px-3 text-navy-400">___</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">EE</td><td className="py-2.5 px-3 text-navy-400">___ / 450</td><td className="py-2.5 px-3 text-navy-400">___</td></tr>
              <tr><td className="py-2.5 px-3 font-medium">EO</td><td className="py-2.5 px-3 text-navy-400">___ / 450</td><td className="py-2.5 px-3 text-navy-400">___</td></tr>
              <tr className="font-bold bg-navy-50"><td className="py-2.5 px-3">NCLC final</td><td className="py-2.5 px-3" colSpan={2}>= le plus bas des 4</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
