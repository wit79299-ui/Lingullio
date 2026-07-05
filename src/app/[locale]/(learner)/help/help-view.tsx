'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import {
  HelpCircle, ChevronRight, ChevronDown, Search,
  BookOpen, Brain, Trophy, Flame, Target, RotateCcw,
  Settings, Star, Zap, Volume2, PenTool, Headphones,
  Clock, Award, Sparkles, ArrowRight, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── FAQ Data ───────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FAQ_ITEMS: FaqItem[] = [
  // General
  {
    id: 'what-is',
    question: 'Qu\'est-ce que Lingullio ?',
    answer: 'Lingullio est une plateforme d\'apprentissage du chinois mandarin specialisee dans la preparation aux examens HSK (niveaux 1 a 6). Elle combine des cours structures, des exercices interactifs, un systeme de repetition espacee (SRS) et de la gamification pour optimiser votre apprentissage.',
    category: 'general',
    icon: BookOpen,
  },
  {
    id: 'demo-mode',
    question: 'Le mode demo, c\'est quoi ?',
    answer: 'En mode demo, vos donnees sont sauvegardees localement dans votre navigateur (localStorage). Aucun compte n\'est necessaire. Attention : si vous videz le cache de votre navigateur, vos donnees seront perdues. Utilisez les Settings pour exporter vos donnees si besoin.',
    category: 'general',
    icon: Settings,
  },
  {
    id: 'data-loss',
    question: 'How to avoid losing my data?',
    answer: 'En mode demo, vos donnees sont dans le navigateur. Evitez de vider le cache, d\'utiliser la navigation privee, ou de changer de navigateur. All vos progressions (XP, badges, Living Memory, resultats d\'examens) sont dans le meme navigateur.',
    category: 'general',
    icon: HelpCircle,
  },
  // Knowledge Map
  {
    id: 'km-what',
    question: 'Qu\'est-ce que la Living Memory ?',
    answer: 'La Living Memory (Knowledge Map) est le systeme central qui trace chaque mot, caractere et point de grammaire que vous rencontrez. Elle utilise l\'algorithme SM-2 de repetition espacee pour planifier vos revisions au moment optimal, juste avant que vous oubliiez.',
    category: 'knowledge',
    icon: Brain,
  },
  {
    id: 'km-levels',
    question: 'What do mastery levels mean?',
    answer: 'Each word progresses through 5 levels: Unknown (never seen), Seen (encountered once), Learning (2+ encounters), Familiar (SRS interval >= 7 days, 70%+ accuracy), Mastered (long SRS interval, 80%+ accuracy). The system updates automatically based on your performance.',
    category: 'knowledge',
    icon: Star,
  },
  {
    id: 'km-srs',
    question: 'How does spaced repetition (SRS) work?',
    answer: 'L\'algorithme SM-2 calcule le moment ideal pour reviser chaque mot. Si vous repondez correctement, l\'intervalle augmente (1j -> 3j -> 7j -> 14j -> 30j...). Si vous faites une erreur, l\'intervalle se reduit. Rendez-vous dans l\'onglet Revisions pour voir vos cartes a reviser.',
    category: 'knowledge',
    icon: RotateCcw,
  },
  // Gamification
  {
    id: 'xp-system',
    question: 'How does the XP system work?',
    answer: 'Vous gagnez de l\'XP en completant des exercices (10-15 XP par exercice correct), des defis quotidiens (50 XP bonus), et des sessions parfaites (25 XP bonus). Les niveaux suivent une courbe exponentielle (100 * 1.4^(niveau-2)), jusqu\'au niveau 50 maximum.',
    category: 'gamification',
    icon: Zap,
  },
  {
    id: 'streak',
    question: 'How to maintain my streak?',
    answer: 'Complete at least one exercise per day to maintain your streak. The streak resets to 0 if you miss a day. The longer your streak, the more badges you unlock (7 days, 14 days, 30 days...).',
    category: 'gamification',
    icon: Flame,
  },
  {
    id: 'badges',
    question: 'How to unlock badges?',
    answer: 'Il y a 25+ badges repartis en 4 niveaux de rarete (Commun, Rare, Epique, Legendaire). Ils se debloquent automatiquement en atteignant certains jalons : nombre d\'exercices, precision, serie de jours, mots maitrises, etc. Consultez la page Progression pour les voir tous.',
    category: 'gamification',
    icon: Award,
  },
  // Features
  {
    id: 'placement-test',
    question: 'What is the placement test for?',
    answer: 'The placement test evaluates your current Chinese level through adaptive questions covering vocabulary, grammar, reading and listening. It determines your estimated HSK level and recommends an optimal starting point for your learning. It also feeds your Living Memory.',
    category: 'features',
    icon: Target,
  },
  {
    id: 'mock-exams',
    question: 'How do mock exams work?',
    answer: 'Mock exams reproduce the official HSK format: same duration, same question types (listening + reading), same scoring. You receive a detailed analysis of your results by section. Your answers are also recorded in the Living Memory.',
    category: 'features',
    icon: Trophy,
  },
  {
    id: 'daily-challenge',
    question: 'Qu\'est-ce que le defi quotidien ?',
    answer: 'The daily challenge automatically generates 10 adaptive questions based on your Living Memory: words to review, weak points, and random reviews. It offers XP bonuses and helps maintain your streak. If your Living Memory has fewer than 8 words, generic questions are used.',
    category: 'features',
    icon: Sparkles,
  },
  {
    id: 'coach-autonome',
    question: 'Qu\'est-ce que le Coach Autonome ?',
    answer: 'Le Coach Autonome s\'active automatiquement si vous etes inactif pendant 15+ jours. Il analyse votre courbe d\'oubli (formule d\'Ebbinghaus) et vous propose un plan de revision d\'urgence pour recuperer les mots en danger d\'etre oublies.',
    category: 'features',
    icon: Brain,
  },
  {
    id: 'parcours-inverse',
    question: 'Qu\'est-ce que le Parcours Inverse ?',
    answer: 'Le Parcours Inverse est un mode d\'entrainement qui part de votre objectif (ex: HSK 4 dans 3 mois) et construit un plan de travail a rebours. Il calcule le nombre de mots a apprendre par semaine et vous guide etape par etape.',
    category: 'features',
    icon: ArrowRight,
  },
  // Audio
  {
    id: 'audio-tts',
    question: 'Comment fonctionne l\'audio ?',
    answer: 'L\'audio est genere par Edge-TTS avec la voix zh-CN-XiaoxiaoNeural. Cliquez sur l\'icone haut-parleur a cote de n\'importe quel mot ou phrase chinoise pour ecouter la prononciation. La lecture automatique peut etre activee/desactivee dans les Settings.',
    category: 'features',
    icon: Volume2,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', count: FAQ_ITEMS.length },
  { id: 'general', label: 'General', count: FAQ_ITEMS.filter(f => f.category === 'general').length },
  { id: 'knowledge', label: 'Living Memory', count: FAQ_ITEMS.filter(f => f.category === 'knowledge').length },
  { id: 'gamification', label: 'XP & Badges', count: FAQ_ITEMS.filter(f => f.category === 'gamification').length },
  { id: 'features', label: 'Features', count: FAQ_ITEMS.filter(f => f.category === 'features').length },
];

// ─── Quick Links ────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { title: 'Start courses', href: '/courses', icon: BookOpen, color: 'bg-teal-50 text-teal-600' },
  { title: 'SRS Reviews', href: '/revisions', icon: RotateCcw, color: 'bg-blue-50 text-blue-600' },
  { title: 'Daily challenge', href: '/daily-challenge', icon: Sparkles, color: 'bg-amber-50 text-amber-600' },
  { title: 'Settings', href: '/settings', icon: Settings, color: 'bg-navy-50 text-navy-600' },
];

// ─── Main Component ─────────────────────────────────────────────────────

export function HelpView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = FAQ_ITEMS.filter(faq => {
    if (activeCategory !== 'all' && faq.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <HelpCircle className="h-5 w-5 text-navy-700" />
          </div>
          Help
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">
          FAQ and user guide for Lingullio
        </p>
      </header>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_LINKS.map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="!py-0 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-3 flex flex-col items-center text-center gap-1.5">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', link.color)}>
                  <link.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-navy-700">{link.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
        <input
          type="text"
          placeholder="Search the FAQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
              activeCategory === cat.id
                ? 'bg-teal-500 text-white border-teal-500'
                : 'bg-white text-navy-500 border-cream-200 hover:border-teal-300'
            )}
          >
            {cat.label}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              activeCategory === cat.id ? 'bg-white/20' : 'bg-cream-100'
            )}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* FAQ items */}
      <div className="space-y-2">
        {filtered.map(faq => {
          const isExpanded = expandedFaq === faq.id;
          return (
            <Card key={faq.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                className="w-full text-left"
              >
                <CardContent className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cream-50 shrink-0">
                      <faq.icon className="h-4 w-4 text-navy-500" />
                    </div>
                    <p className="flex-1 text-sm font-medium text-navy-900">{faq.question}</p>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-navy-300 shrink-0 transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </CardContent>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-0">
                  <div className="ml-11 text-sm text-navy-600 leading-relaxed border-t border-cream-50 pt-3">
                    {faq.answer}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-navy-200 mx-auto mb-3" />
          <p className="text-navy-400">No results for &quot;{search}&quot;</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-4 pb-8">
        <p className="text-sm text-navy-400">
          Can't find the answer to your question?
        </p>
        <p className="text-xs text-navy-300 mt-1">
          Lingullio is in beta — new features are coming regularly
        </p>
      </div>
    </div>
  );
}
