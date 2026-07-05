'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import {
  Library, BookOpen, PenTool, Languages, ChevronRight,
  Search, ExternalLink, Star, Layers, Lightbulb,
  GraduationCap, FileText, Headphones, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Data ───────────────────────────────────────────────────────────────

interface ResourceCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: 'grammar' | 'vocabulary' | 'characters' | 'tools' | 'culture';
  href?: string;
  externalUrl?: string;
  items?: { title: string; detail: string }[];
}

const RESOURCES: ResourceCard[] = [
  // ── Grammar
  {
    id: 'grammar-overview',
    title: 'HSK Grammar Sheets',
    description: 'All grammatical structures by level, with examples and common mistakes',
    icon: PenTool,
    color: 'bg-violet-50 text-violet-600',
    category: 'grammar',
    href: '/courses',
    items: [
      { title: 'HSK 1-2', detail: '40 basic structures (是, 在, 了, 的, 吗...)' },
      { title: 'HSK 3-4', detail: '80 intermediate structures (把, 被, 虽然…但是…)' },
      { title: 'HSK 5-6', detail: '120+ advanced structures (不但…而且…, 既…又…)' },
    ],
  },
  {
    id: 'grammar-patterns',
    title: 'Sentence patterns',
    description: 'The 50 most useful patterns for building sentences in Chinese',
    icon: Layers,
    color: 'bg-violet-50 text-violet-600',
    category: 'grammar',
    items: [
      { title: 'S + V + O', detail: 'Basic order : 我吃饭 (I eat)' },
      { title: 'S + 在 + lieu + V', detail: 'Location : 我在家吃饭' },
      { title: 'S + 时间 + V', detail: 'Time : 我明天去' },
      { title: 'Comparaison A 比 B + Adj', detail: '他比我高 (He is taller than me)' },
      { title: 'Resultative V + 得 + complement', detail: '他跑得很快' },
    ],
  },
  // ── Characters
  {
    id: 'radicals-table',
    title: 'Table of 214 Radicals',
    description: 'The basic keys to decompose and memorize Chinese characters',
    icon: Languages,
    color: 'bg-sky-50 text-sky-600',
    category: 'characters',
    items: [
      { title: '人 (ren)', detail: 'Man — 你, 他, 们, 住, 作' },
      { title: '口 (kou)', detail: 'Mouth — 吃, 喝, 吗, 吧, 呢' },
      { title: '水/氵 (shui)', detail: 'Water — 河, 海, 洗, 游, 汉' },
      { title: '木 (mu)', detail: 'Wood — 树, 林, 森, 本, 杯' },
      { title: '心/忄 (xin)', detail: 'Heart — 想, 忙, 快, 情, 怕' },
      { title: '手/扌 (shou)', detail: 'Hand — 打, 找, 拿, 推, 把' },
      { title: '言/讠 (yan)', detail: 'Speech — 说, 话, 语, 读, 请' },
      { title: '金/钅 (jin)', detail: 'Metal — 钱, 银, 铁, 错, 钟' },
    ],
  },
  {
    id: 'stroke-order',
    title: 'Regles d\'ordre des traits',
    description: 'The 8 fundamental rules for writing characters in the correct order',
    icon: PenTool,
    color: 'bg-sky-50 text-sky-600',
    category: 'characters',
    items: [
      { title: 'Top to bottom', detail: '三 : top stroke, middle, then bottom' },
      { title: 'Left to right', detail: '你 : left part 亻 then right 尔' },
      { title: 'Horizontal before vertical', detail: '十 : horizontal stroke then vertical' },
      { title: 'Frame before content', detail: '国 : cadre 口 puis 玉 then bottom bar' },
      { title: 'Left diagonal before right', detail: '人 : 丿 puis 乀' },
      { title: 'Center before sides', detail: '小 : center stroke then left/right' },
    ],
  },
  // ── Vocabulary
  {
    id: 'vocab-themes',
    title: 'Thematic Vocabulary',
    description: 'Vocabulary lists organized by daily life themes',
    icon: BookOpen,
    color: 'bg-teal-50 text-teal-600',
    category: 'vocabulary',
    href: '/courses',
    items: [
      { title: 'Greetings Salutations & politesse politeness', detail: '你好, 谢谢, 对不起, 没关系, 请...' },
      { title: 'Family', detail: '爸爸, 妈妈, 哥哥, 姐姐, 儿子, 女儿...' },
      { title: 'Food Nourriture & boissons drinks', detail: '米饭, 面条, 茶, 咖啡, 水果...' },
      { title: 'Transportation', detail: '飞机, 火车, 地铁, 出租车, 公共汽车...' },
      { title: 'Colors Couleurs & nombres numbers', detail: '红, 蓝, 绿, 一到十, 百, 千, 万...' },
    ],
  },
  {
    id: 'measure-words',
    title: 'Classifiers (量词)',
    description: 'The most common measure words, essential for speaking naturally',
    icon: Lightbulb,
    color: 'bg-teal-50 text-teal-600',
    category: 'vocabulary',
    items: [
      { title: '个 (ge)', detail: 'Universal classifier — 一个人, 一个苹果' },
      { title: '本 (ben)', detail: 'Books — 一本书, 三本杂志' },
      { title: '张 (zhang)', detail: 'Flat objects — 一张纸, 两张票' },
      { title: '杯 (bei)', detail: 'Glasses/cups — 一杯水, 两杯咖啡' },
      { title: '件 (jian)', detail: 'Clothes/matters — 一件衣服, 两件事' },
      { title: '条 (tiao)', detail: 'Long objects — 一条路, 一条鱼' },
      { title: '只 (zhi)', detail: 'Animals — 一只猫, 两只鸟' },
      { title: '块 (kuai)', detail: 'Pieces/money — 一块蛋糕, 十块钱' },
    ],
  },
  // ── Tools
  {
    id: 'hsk-structure',
    title: 'Structure de l\'examen HSK 2026',
    description: 'Format, duration, sections and scoring for each HSK level',
    icon: GraduationCap,
    color: 'bg-amber-50 text-amber-600',
    category: 'tools',
    items: [
      { title: 'HSK 1', detail: '40 min — Listening (20) + Reading (20) = 200pts, threshold 120pts' },
      { title: 'HSK 2', detail: '55 min — Listening (25) + Reading (25) = 200pts, threshold 120pts' },
      { title: 'HSK 3', detail: '90 min — Listening (30) + Reading (30) + Writing (10) = 300pts, threshold 180pts' },
      { title: 'HSK 4', detail: '105 min — Listening (35) + Reading (35) + Writing (15) = 300pts, threshold 180pts' },
      { title: 'HSK 5', detail: '125 min — Listening (35) + Reading (40) + Writing (10) = 300pts, threshold 180pts' },
      { title: 'HSK 6', detail: '140 min — Listening (40) + Reading (50) + Writing (1) = 300pts, threshold 180pts' },
    ],
  },
  // ── Culture
  {
    id: 'tips-learning',
    title: 'Tips d\'apprentissage',
    description: 'Effective strategies for rapid progress in Chinese',
    icon: Star,
    color: 'bg-gold-50 text-gold-600',
    category: 'culture',
    items: [
      { title: 'Spaced repetition', detail: "Review with Lingullio's SRS system — it optimizes your reviews automatically" },
      { title: 'Daily immersion', detail: 'Listen to Chinese podcasts, watch Chinese shows with Chinese subtitles' },
      { title: 'Handwriting practice', detail: 'Pratiquer l\'ecriture aide a memoriser les caracteres 3x plus vite' },
      { title: 'Context over lists', detail: 'Learn words in sentences, not in isolation' },
      { title: 'Regularity > intensity', detail: '20 min/day is better than 3h on weekends' },
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Library },
  { id: 'grammar', label: 'Grammar', icon: PenTool },
  { id: 'characters', label: 'Characters', icon: Languages },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'tools', label: 'Tools', icon: FileText },
  { id: 'culture', label: 'Tips', icon: Star },
] as const;

// ─── Hand Component ─────────────────────────────────────────────────────

export function ResourcesView() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = RESOURCES.filter(r => {
    if (activeCategory !== 'all' && r.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) ||
        r.items?.some(i => i.title.toLowerCase().includes(q) || i.detail.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <Library className="h-5 w-5 text-navy-700" />
          </div>
          Resources
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">
          Reference sheets, guides and tools for your preparation
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
        <input
          type="text"
          placeholder="Search for a resource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
      </div>

      {/* Category tabs */}
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
            <cat.icon className="h-3 w-3" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Resource cards */}
      <div className="space-y-3">
        {filtered.map(resource => {
          const isExpanded = expandedCard === resource.id;
          return (
            <Card key={resource.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : resource.id)}
                className="w-full text-left"
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', resource.color)}>
                      <resource.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{resource.title}</p>
                      <p className="text-xs text-navy-400 line-clamp-1">{resource.description}</p>
                    </div>
                    {resource.items && (
                      <span className="text-[10px] text-navy-300 shrink-0">{resource.items.length} items</span>
                    )}
                    <ChevronRight className={cn(
                      'h-4 w-4 text-navy-300 shrink-0 transition-transform',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </CardContent>
              </button>

              {isExpanded && resource.items && (
                <div className="px-5 pb-4 border-t border-cream-50 pt-3 space-y-2">
                  {resource.items.map((item, i) => (
                    <div key={i} className="flex gap-3 p-2.5 rounded-lg bg-cream-25">
                      <span className="text-xs font-bold text-teal-600 w-5 shrink-0 pt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-900">{item.title}</p>
                        <p className="text-xs text-navy-500 mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                  {resource.href && (
                    <Link href={resource.href}>
                      <div className="flex items-center justify-center gap-2 mt-3 py-2 rounded-lg bg-teal-50 text-teal-600 text-sm font-medium hover:bg-teal-100 transition-colors">
                        View in courses <ChevronRight className="h-4 w-4" />
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-navy-200 mx-auto mb-3" />
          <p className="text-navy-400">No resources found</p>
        </div>
      )}
    </div>
  );
}
