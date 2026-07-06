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
    question: 'What is Lingullio?',
    answer: 'Lingullio is a Mandarin Chinese learning platform specialized in HSK exam preparation (levels 1 to 6). It combines structured courses, interactive exercises, a spaced repetition system (SRS), and gamification to optimize your learning.',
    category: 'general',
    icon: BookOpen,
  },
  {
    id: 'demo-mode',
    question: 'What is demo mode?',
    answer: 'In demo mode, your data is saved locally in your browser (localStorage). No account is needed. Warning: if you clear your browser cache, your data will be lost. Use the Settings page to export your data if needed.',
    category: 'general',
    icon: Settings,
  },
  {
    id: 'data-loss',
    question: 'How to avoid losing my data?',
    answer: 'In demo mode, your data is stored in the browser. Avoid clearing the cache, using private browsing, or switching browsers. All your progress (XP, badges, Living Memory, exam results) is in the same browser.',
    category: 'general',
    icon: HelpCircle,
  },
  // Knowledge Map
  {
    id: 'km-what',
    question: 'What is the Living Memory?',
    answer: 'The Living Memory (Knowledge Map) is the central system that tracks every word, character, and grammar point you encounter. It uses the SM-2 spaced repetition algorithm to schedule your reviews at the optimal time, just before you forget.',
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
    answer: 'The SM-2 algorithm calculates the ideal time to review each word. If you answer correctly, the interval increases (1d -> 3d -> 7d -> 14d -> 30d...). If you make a mistake, the interval decreases. Go to the Reviews tab to see your cards due for review.',
    category: 'knowledge',
    icon: RotateCcw,
  },
  // Gamification
  {
    id: 'xp-system',
    question: 'How does the XP system work?',
    answer: 'You earn XP by completing exercises (10-15 XP per correct exercise), daily challenges (50 XP bonus), and perfect sessions (25 XP bonus). Levels follow an exponential curve (100 * 1.4^(level-2)), up to level 50 maximum.',
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
    answer: 'There are 25+ badges across 4 rarity levels (Common, Rare, Epic, Legendary). They unlock automatically when you reach certain milestones: number of exercises, accuracy, day streaks, mastered words, etc. Check the Progress page to see them all.',
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
    answer: 'Mock exams reproduce the standard HSK format: same duration, same question types (listening + reading), same scoring. You receive a detailed analysis of your results by section. Your answers are also recorded in the Living Memory.',
    category: 'features',
    icon: Trophy,
  },
  {
    id: 'daily-challenge',
    question: 'What is the daily challenge?',
    answer: 'The daily challenge automatically generates 10 adaptive questions based on your Living Memory: words to review, weak points, and random reviews. It offers XP bonuses and helps maintain your streak. If your Living Memory has fewer than 8 words, generic questions are used.',
    category: 'features',
    icon: Sparkles,
  },
  {
    id: 'coach-autonome',
    question: 'What is the Autonomous Coach?',
    answer: 'The Autonomous Coach activates automatically if you are inactive for 15+ days. It analyzes your forgetting curve (Ebbinghaus formula) and proposes an emergency review plan to recover words at risk of being forgotten.',
    category: 'features',
    icon: Brain,
  },
  {
    id: 'parcours-inverse',
    question: 'What is the Reverse Path?',
    answer: 'The Reverse Path is a training mode that starts from your goal (e.g., HSK 4 in 3 months) and builds a work plan backwards. It calculates the number of words to learn per week and guides you step by step.',
    category: 'features',
    icon: ArrowRight,
  },
  // Audio
  {
    id: 'audio-tts',
    question: 'How does the audio work?',
    answer: 'Audio is generated by Edge-TTS with the zh-CN-XiaoxiaoNeural voice. Click the speaker icon next to any Chinese word or phrase to hear the pronunciation. Auto-play can be enabled/disabled in Settings.',
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
          Lingullio is in beta - new features are coming regularly
        </p>
      </div>
    </div>
  );
}
