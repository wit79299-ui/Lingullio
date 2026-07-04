'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  HelpCircle, ChevronDown, ChevronUp, BookOpen, Brain,
  Zap, Trophy, Calendar, RefreshCw, Target, Flame,
  Settings, PenTool, Headphones, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Data ───────────────────────────────────────────────────────────────

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // Getting started
  {
    category: 'Demarrage',
    question: 'Comment commencer a apprendre le chinois sur Lingullio ?',
    answer: 'Passez d\'abord le test de placement pour evaluer votre niveau. Lingullio vous recommandera le cours HSK adapte. Suivez ensuite les lecons dans l\'ordre, faites les exercices et revisez quotidiennement avec le SRS.',
  },
  {
    category: 'Demarrage',
    question: 'Qu\'est-ce que le test de placement ?',
    answer: 'Le test de placement est un questionnaire adaptatif de 30 questions qui evalue votre niveau en vocabulaire, grammaire, lecture et ecoute. Il determine votre niveau HSK estime et vous recommande le cours adapte.',
  },
  {
    category: 'Demarrage',
    question: 'Mes donnees sont-elles sauvegardees ?',
    answer: 'En mode demo, toutes vos donnees (progression, XP, Memoire Vivante) sont sauvegardees dans le stockage local de votre navigateur. Elles persistent tant que vous ne videz pas le cache du navigateur.',
  },
  // Knowledge Map
  {
    category: 'Memoire Vivante',
    question: 'Qu\'est-ce que la Memoire Vivante ?',
    answer: 'La Memoire Vivante (Knowledge Map) est le systeme qui trace tous les mots, caracteres et points de grammaire que vous avez rencontres. Chaque item a un niveau de maitrise (vu, en cours, familier, maitrise) et un calendrier de revision SRS.',
  },
  {
    category: 'Memoire Vivante',
    question: 'Comment fonctionne le systeme de revision SRS ?',
    answer: 'Le SRS (Spaced Repetition System) utilise l\'algorithme SM-2 pour planifier les revisions. Un mot bien retenu est revise de moins en moins souvent (1j, 3j, 7j, 14j...). Un mot oublie est re-presente rapidement. Consultez la page Revisions pour voir votre file d\'attente.',
  },
  {
    category: 'Memoire Vivante',
    question: 'Comment un mot passe-t-il de "vu" a "maitrise" ?',
    answer: 'Le niveau de maitrise evolue automatiquement : Vu (1ere rencontre) > En cours (2+ interactions) > Familier (interval SRS ≥ 7 jours et ≥ 70% de reussite) > Maitrise (interval SRS ≥ 21 jours et ≥ 80% de reussite).',
  },
  // Gamification
  {
    category: 'XP et Progression',
    question: 'Comment gagne-t-on de l\'XP ?',
    answer: 'Vous gagnez de l\'XP en completant des exercices (10-25 XP par bonne reponse selon la difficulte), en finissant des sessions, en maintenant votre serie de jours, et en relevant le defi quotidien. L\'XP permet de monter de niveau.',
  },
  {
    category: 'XP et Progression',
    question: 'Comment fonctionnent les niveaux ?',
    answer: 'Il y a 50 niveaux avec une courbe exponentielle (100 XP pour le niveau 2, puis +40% par niveau). Chaque niveau debloque un titre : Debutant curieux (1-4), Apprenti sinophone (5-9), Explorateur HSK (10-14), etc.',
  },
  {
    category: 'XP et Progression',
    question: 'Comment debloquer des badges ?',
    answer: 'Les badges sont debloques automatiquement quand vous atteignez certains objectifs : premiers exercices, series de jours, nombre de mots maitrises, examens blancs reussis, etc. Il y a 25+ badges repartis en 4 niveaux de rarete.',
  },
  // Exams
  {
    category: 'Examens',
    question: 'Que contient un examen blanc ?',
    answer: 'Les examens blancs reproduisent le format officiel HSK 2026 : duree chronometree, sections ecoute + lecture, score calcule sur le meme bareme. A la fin, vous obtenez une analyse detaillee de vos performances.',
  },
  {
    category: 'Examens',
    question: 'Comment se prepare-t-on a l\'examen HSK ?',
    answer: 'Definissez votre objectif dans la page Objectifs, suivez le plan genere, faites les lecons et revisions quotidiennes, puis testez-vous avec les examens blancs regulierement pour mesurer vos progres.',
  },
  // Training modes
  {
    category: 'Modes d\'entrainement',
    question: 'Qu\'est-ce que le Parcours Inverse ?',
    answer: 'Le Parcours Inverse est un mode d\'entrainement accelere qui part des mots difficiles pour remonter vers les plus simples. Ideal pour les apprenants qui veulent se concentrer sur leurs lacunes.',
  },
  {
    category: 'Modes d\'entrainement',
    question: 'Qu\'est-ce que le Coach Autonome ?',
    answer: 'Le Coach Autonome s\'active automatiquement apres 15 jours d\'inactivite. Il analyse les mots que vous etes en train d\'oublier (courbe d\'Ebbinghaus) et vous propose un programme de revision cible.',
  },
  {
    category: 'Modes d\'entrainement',
    question: 'Qu\'est-ce que le Defi Quotidien ?',
    answer: 'Chaque jour, 10 questions sont generees depuis votre Memoire Vivante : mots a reviser, points faibles, et quelques decouvertes. Completez le defi pour gagner des XP bonus et maintenir votre serie.',
  },
  // Technical
  {
    category: 'Technique',
    question: 'L\'audio des mots chinois ne fonctionne pas',
    answer: 'L\'audio utilise Edge-TTS. Verifiez que votre navigateur autorise la lecture audio. Sur mobile, touchez une fois l\'icone son — certains navigateurs bloquent la lecture auto.',
  },
  {
    category: 'Technique',
    question: 'Comment reinitialiser mes donnees ?',
    answer: 'Allez dans Parametres > Donnees et reinitialisation. Vous pouvez reinitialiser separement la Memoire Vivante, les XP/badges, les modes d\'entrainement, ou tout d\'un coup.',
  },
];

const CATEGORIES = [...new Set(FAQ_ITEMS.map(item => item.category))];

const GUIDES = [
  { title: 'Suivre les cours HSK', icon: BookOpen, description: 'Lecons structurees du HSK 1 au HSK 6 avec vocabulaire, grammaire, caracteres et exercices interactifs.', link: '/courses' },
  { title: 'Revisions espacees (SRS)', icon: RefreshCw, description: 'Revisez les mots au moment optimal avec l\'algorithme SM-2 pour une memorisation durable.', link: '/revisions' },
  { title: 'Defi quotidien', icon: Zap, description: '10 questions par jour personnalisees depuis votre Memoire Vivante.', link: '/daily-challenge' },
  { title: 'Examens blancs', icon: Trophy, description: 'Simulez l\'examen HSK dans les conditions reelles.', link: '/mock-exams' },
  { title: 'Objectifs', icon: Target, description: 'Definissez votre examen cible et suivez un plan d\'action personnalise.', link: '/objectives' },
  { title: 'Parametres', icon: Settings, description: 'Gerez vos preferences et reinitialiser vos donnees.', link: '/settings' },
];

// ─── Main Component ─────────────────────────────────────────────────────

export function HelpView() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const filteredFAQ = FAQ_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <HelpCircle className="h-5 w-5 text-navy-700" />
          </div>
          Aide
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">
          FAQ, guides d&apos;utilisation et fonctionnalites
        </p>
      </header>

      {/* Quick Guide */}
      <section>
        <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-teal-500" />
          Guide rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GUIDES.map((guide) => (
            <a key={guide.title} href={guide.link} className="block group">
              <Card className="h-full transition-all hover:shadow-md hover:border-teal-200">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50 shrink-0">
                      <guide.icon className="h-4 w-4 text-teal-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-navy-900 group-hover:text-teal-600 transition-colors">
                      {guide.title}
                    </h3>
                  </div>
                  <p className="text-xs text-navy-400 pl-12">{guide.description}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-teal-500" />
          Questions frequentes
        </h2>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => { setActiveCategory(cat); setExpandedItems(new Set()); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeCategory === cat
                  ? 'bg-teal-500 text-white'
                  : 'bg-cream-50 text-navy-500 hover:bg-cream-100'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="space-y-2">
          {filteredFAQ.map((item, globalIndex) => {
            const index = FAQ_ITEMS.indexOf(item);
            const isExpanded = expandedItems.has(index);
            return (
              <div key={index} className="rounded-xl border border-cream-100 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-cream-25 transition-colors"
                >
                  <HelpCircle className="h-4 w-4 text-teal-500 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-navy-900">{item.question}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-navy-300 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-navy-300 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="pl-7 text-sm text-navy-600 leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Support */}
      <Card>
        <CardContent className="py-6 text-center">
          <MessageCircle className="h-8 w-8 text-teal-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-navy-900 mb-1">Vous n&apos;avez pas trouve votre reponse ?</h3>
          <p className="text-xs text-navy-400 max-w-sm mx-auto">
            Lingullio est en version demo. De nouvelles fonctionnalites et un support
            complet seront disponibles lors du lancement officiel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
