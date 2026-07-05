'use client';

import { useTranslations, useMessages } from 'next-intl';
import { useState, useRef, useMemo } from 'react';
import { BookOpen, PenTool, Languages, Layers, ChevronDown, ChevronUp, Search, Volume2, Play, Clock, Dumbbell, FileText, CheckCircle2, Eye, Brain } from 'lucide-react';
import { useUserKnowledgeStore, type MasteryLevel } from '@/stores/user-knowledge-store';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useRouter } from '@/i18n/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VocabWord {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  level: string;
  frequency_rank: number | null;
  word_type: string | null;
  theme: string | null;
  audio_url: string | null;
  meaning: string;
  example_sentence: string | null;
  example_pinyin: string | null;
  example_translation: string | null;
}

interface GrammarCard {
  id: string;
  pattern: string;
  level: string;
  difficulty: number;
  title: string;
  explanation_html: string;
}

interface CharacterCard {
  id: string;
  character: string;
  pinyin: string;
  radical: string | null;
  stroke_count: number;
  level: string;
  frequency_rank: number | null;
  audio_url: string | null;
  meaning: string;
  mnemonic: string | null;
}

interface LessonCard {
  id: string;
  sort_order: number;
  status: string;
  lesson_type: string;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  exercise_count: number;
}

interface ModuleCard {
  id: string;
  sort_order: number;
  status: string;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  lesson_count: number;
  lessons: LessonCard[];
}

type TabId = 'vocabulary' | 'grammar' | 'characters' | 'modules';

interface StatData {
  tabId: TabId;
  label: string;
  value: number;
  target?: number;
  color: string;
}

export interface CourseTabsProps {
  statsData: StatData[];
  slug: string;
  cefrLevel: string | null;
  cefrDescription: string | null;
  vocabulary: { words: VocabWord[]; total: number; themes: string[]; wordTypes: string[] };
  grammar: GrammarCard[];
  characters: CharacterCard[];
  modules: ModuleCard[];
  counts: {
    vocabulary: number;
    grammar: number;
    characters: number;
    modules: number;
  };
}

// ─── Tab definitions ────────────────────────────────────────────────────────

const TAB_CONFIG: { id: TabId; icon: typeof BookOpen; countKey: keyof CourseTabsProps['counts'] }[] = [
  { id: 'vocabulary', icon: BookOpen, countKey: 'vocabulary' },
  { id: 'grammar', icon: PenTool, countKey: 'grammar' },
  { id: 'characters', icon: Languages, countKey: 'characters' },
  { id: 'modules', icon: Layers, countKey: 'modules' },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export function CourseTabs(props: CourseTabsProps) {
  const t = useTranslations('courses');
  const messages = useMessages();
  const courseMessages = (messages?.courses ?? {}) as Record<string, unknown>;
  const themeMessages = (courseMessages?.themes ?? {}) as Record<string, string>;
  const wordTypeMessages = (courseMessages?.wordTypes ?? {}) as Record<string, string>;

  const [activeTab, setActiveTab] = useState<TabId>('vocabulary');
  const [expandedVocab, setExpandedVocab] = useState<string | null>(null);
  const [expandedGrammar, setExpandedGrammar] = useState<string | null>(null);
  const [expandedChar, setExpandedChar] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const router = useRouter();
  const [vocabSearch, setVocabSearch] = useState('');
  const [grammarSearch, setGrammarSearch] = useState('');
  const [charSearch, setCharSearch] = useState('');
  const { playingId, play: playAudio } = useAudioPlayer();
  const tabsRef = useRef<HTMLDivElement>(null);

  // ── Knowledge Map integration for mastery badges ──
  const knowledgeItems = useUserKnowledgeStore(s => s.items);
  const kmLastUpdated = useUserKnowledgeStore(s => s.last_updated);

  function getMastery(itemId: string): MasteryLevel {
    return knowledgeItems[itemId]?.mastery ?? 'unknown';
  }
  const MASTERY_BADGE: Record<MasteryLevel, { label: string; color: string } | null> = {
    unknown: null,
    seen: { label: 'Seen', color: 'bg-sky-50 text-sky-600' },
    learning: { label: 'Learning', color: 'bg-amber-50 text-amber-600' },
    familiar: { label: 'Familiar', color: 'bg-teal-50 text-teal-600' },
    mastered: { label: 'Mastered', color: 'bg-emerald-50 text-emerald-600' },
  };

  // ── E12: Mastery statistics per tab ──
  const masteryStats = useMemo(() => {
    function countMastery(ids: string[]) {
      const counts: Record<MasteryLevel, number> = { unknown: 0, seen: 0, learning: 0, familiar: 0, mastered: 0 };
      for (const id of ids) {
        const m = knowledgeItems[id]?.mastery ?? 'unknown';
        counts[m]++;
      }
      const total = ids.length;
      const studied = total - counts.unknown;
      const masteredPct = total > 0 ? Math.round((counts.mastered / total) * 100) : 0;
      const studiedPct = total > 0 ? Math.round((studied / total) * 100) : 0;
      return { ...counts, total, studied, masteredPct, studiedPct };
    }
    return {
      vocabulary: countMastery(props.vocabulary.words.map(w => w.id)),
      grammar: countMastery(props.grammar.map(g => g.id)),
      characters: countMastery(props.characters.map(c => c.id)),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.vocabulary.words, props.grammar, props.characters, knowledgeItems, kmLastUpdated]);

  // ── E12: Mastery Progress Bar component ──
  function MasteryProgressBar({ stats }: { stats: typeof masteryStats.vocabulary }) {
    if (stats.total === 0) return null;
    const segments: { key: MasteryLevel; count: number; color: string }[] = [
      { key: 'mastered', count: stats.mastered, color: 'bg-emerald-400' },
      { key: 'familiar', count: stats.familiar, color: 'bg-teal-400' },
      { key: 'learning', count: stats.learning, color: 'bg-amber-400' },
      { key: 'seen', count: stats.seen, color: 'bg-sky-300' },
    ];
    const hasAnyStudied = stats.studied > 0;
    if (!hasAnyStudied) return null;

    return (
      <div className="rounded-xl border border-cream-100 bg-white p-3 space-y-2">
        {/* Segmented bar */}
        <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden flex">
          {segments.map(seg => {
            const pct = (seg.count / stats.total) * 100;
            if (pct === 0) return null;
            return <div key={seg.key} className={cn('h-full', seg.color)} style={{ width: `${pct}%` }} />;
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-navy-500">
          {stats.mastered > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Mastered {stats.mastered}
            </span>
          )}
          {stats.familiar > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Familiar {stats.familiar}
            </span>
          )}
          {stats.learning > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Learning {stats.learning}
            </span>
          )}
          {stats.seen > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-300" />
              Seen {stats.seen}
            </span>
          )}
          <span className="text-navy-300 ml-auto">
            {stats.unknown > 0 ? `${stats.unknown} not studied yet` : 'All studied!'}
          </span>
        </div>
      </div>
    );
  }
  function MasteryBadge({ itemId }: { itemId: string }) {
    const m = getMastery(itemId);
    const badge = MASTERY_BADGE[m];
    if (!badge) return null;
    return <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badge.color)}>{badge.label}</span>;
  }

  function translateTheme(key: string): string {
    return themeMessages[key] ?? key.replace(/_/g, ' ');
  }
  function translateWordType(key: string): string {
    return wordTypeMessages[key] ?? key.replace(/_/g, ' ');
  }

  const tabLabels: Record<TabId, string> = {
    vocabulary: t('vocabularyTab'),
    grammar: t('grammarTab'),
    characters: t('charactersTab'),
    modules: t('modulesTab'),
  };

  // Handle stat card click — switch tab and scroll
  const handleStatClick = (tabId: TabId) => {
    setActiveTab(tabId);
    // Scroll to tabs section smoothly
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // ─── Build character lookup for vocab enrichment ──────────────────────────
  const charMap = new Map<string, CharacterCard>();
  for (const c of props.characters) {
    charMap.set(c.character, c);
  }

  // Filter vocab client-side
  const filteredVocab = vocabSearch
    ? props.vocabulary.words.filter(
        (w) =>
          w.simplified.includes(vocabSearch) ||
          w.pinyin.toLowerCase().includes(vocabSearch.toLowerCase()) ||
          w.meaning.toLowerCase().includes(vocabSearch.toLowerCase())
      )
    : props.vocabulary.words;

  // Filter grammar client-side
  const filteredGrammar = grammarSearch
    ? props.grammar.filter(
        (g) =>
          g.pattern.includes(grammarSearch) ||
          g.title.toLowerCase().includes(grammarSearch.toLowerCase())
      )
    : props.grammar;

  // Filter characters client-side
  const filteredChars = charSearch
    ? props.characters.filter(
        (c) =>
          c.character.includes(charSearch) ||
          c.pinyin.toLowerCase().includes(charSearch.toLowerCase()) ||
          c.meaning.toLowerCase().includes(charSearch.toLowerCase())
      )
    : props.characters;

  // ─── Audio play button component ──────────────────────────────────────────
  const PlayButton = ({ text, itemId, audioUrl, size = 'sm' }: { text: string; itemId: string; audioUrl?: string | null; size?: 'sm' | 'md' }) => {
    const isPlaying = playingId === itemId;
    const sizeClasses = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          playAudio(itemId, audioUrl ?? null, text);
        }}
        className={cn(
          'shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95',
          sizeClasses,
          isPlaying
            ? 'text-white bg-teal-500 shadow-sm animate-pulse'
            : 'text-teal-500 bg-teal-50 hover:bg-teal-100 active:bg-teal-200'
        )}
        aria-label={`Écouter ${text}`}
      >
        <Volume2 className={iconSize} />
      </button>
    );
  };

  return (
    <div>
      {/* ── Clickable Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {props.statsData.map((stat) => {
          const tabCfg = TAB_CONFIG.find(tc => tc.id === stat.tabId);
          const Icon = tabCfg?.icon ?? BookOpen;
          const isActive = activeTab === stat.tabId;
          return (
            <button
              key={stat.tabId}
              type="button"
              onClick={() => handleStatClick(stat.tabId)}
              className="text-left w-full"
            >
              <Card className={cn(
                '!py-0 transition-all cursor-pointer hover:shadow-md',
                isActive && 'ring-2 ring-teal-400 shadow-md'
              )}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', stat.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-navy-900">
                      {stat.value}
                      {stat.target && (
                        <span className="text-xs font-normal text-navy-300">/{stat.target}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-navy-400 leading-tight">{stat.label}</p>
                    {/* E12: Mini mastery bar in stat card */}
                    {stat.tabId !== 'modules' && (() => {
                      const ms = masteryStats[stat.tabId as 'vocabulary' | 'grammar' | 'characters'];
                      if (!ms || ms.studied === 0) return null;
                      const pct = ms.masteredPct;
                      return (
                        <div className="mt-1.5 space-y-0.5">
                          <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[9px] text-navy-300">{pct}% mastered</p>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* ── Tab bar ── */}
      <div ref={tabsRef} className="flex border-b border-cream-100 overflow-x-auto -mx-1 scrollbar-hide">
        {TAB_CONFIG.map(({ id, icon: Icon, countKey }) => {
          const count = props.counts[countKey];
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-teal-500 text-teal-700'
                  : 'border-transparent text-navy-400 hover:text-navy-700 hover:border-cream-200'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tabLabels[id]}</span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-teal-100 text-teal-700' : 'bg-cream-100 text-navy-400'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="mt-6">
        {/* ── Vocabulary Tab ── */}
        {activeTab === 'vocabulary' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={vocabSearch}
                onChange={(e) => setVocabSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>

            {/* E12: Vocabulary mastery summary */}
            <MasteryProgressBar stats={masteryStats.vocabulary} />

            {/* Word count */}
            <p className="text-xs text-navy-400">
              {filteredVocab.length} {t('wordsShowing')} {vocabSearch ? `(${t('filtered')})` : `(${props.vocabulary.total} ${t('total')})`}
            </p>

            {/* Word cards */}
            <div className="space-y-2">
              {filteredVocab.map((word) => {
                const isExpanded = expandedVocab === word.id;
                // Find matching characters for this word
                const wordChars = word.simplified.split('').map(ch => charMap.get(ch)).filter(Boolean) as CharacterCard[];
                return (
                  <div
                    key={word.id}
                    className="rounded-xl border border-cream-100 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                      {/* Play audio button */}
                      <PlayButton text={word.simplified} itemId={word.id} audioUrl={word.audio_url} />

                      {/* Expandable word row */}
                      <button
                        type="button"
                        onClick={() => setExpandedVocab(isExpanded ? null : word.id)}
                        className="flex-1 flex items-center gap-2 sm:gap-3 text-left min-w-0"
                      >
                        <span className="text-xl font-medium text-navy-900 min-w-[3rem]">
                          {word.simplified}
                        </span>
                        <span className="text-sm text-teal-600 font-mono">{word.pinyin}</span>
                        <span className="flex-1 text-sm text-navy-600 truncate">{word.meaning}</span>
                        <MasteryBadge itemId={word.id} />
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-navy-300 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-navy-300 shrink-0" />
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-cream-50 pt-3 space-y-3">
                        {word.traditional && (
                          <p className="text-sm text-navy-400">
                            <span className="font-medium">{t('traditional')} :</span> {word.traditional}
                          </p>
                        )}
                        {word.theme && (
                          <p className="text-sm text-navy-400">
                            <span className="font-medium">{t('themeLabel')} :</span> {translateTheme(word.theme)}
                          </p>
                        )}
                        {word.word_type && (
                          <p className="text-sm text-navy-400">
                            <span className="font-medium">{t('wordTypeLabel')} :</span> {translateWordType(word.word_type)}
                          </p>
                        )}
                        {word.example_sentence && (
                          <div className="bg-cream-25 rounded-lg p-3">
                            <p className="text-base text-navy-900">{word.example_sentence}</p>
                            {word.example_pinyin && (
                              <p className="text-sm text-teal-600 font-mono mt-1">{word.example_pinyin}</p>
                            )}
                            {word.example_translation && (
                              <p className="text-sm text-navy-500 mt-1">{word.example_translation}</p>
                            )}
                          </div>
                        )}

                        {/* Character breakdown — integrated from Characters data */}
                        {wordChars.length > 0 && (
                          <div className="border-t border-cream-100 pt-3">
                            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">
                              {t('characterBreakdown') ?? 'Character breakdown'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {wordChars.map((ch) => (
                                <div
                                  key={ch.id}
                                  className="flex items-center gap-2 bg-sky-50/70 rounded-lg px-3 py-2 text-sm"
                                >
                                  <PlayButton text={ch.character} itemId={`char-${ch.id}`} audioUrl={ch.audio_url} size="sm" />
                                  <span className="text-lg font-medium text-navy-900">{ch.character}</span>
                                  <span className="text-teal-600 font-mono text-xs">{ch.pinyin}</span>
                                  <span className="text-navy-500 text-xs">{ch.meaning}</span>
                                  {ch.radical && (
                                    <span className="text-navy-400 text-[10px]">部 {ch.radical}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredVocab.length === 0 && (
              <div className="text-center py-10 text-navy-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-navy-200" />
                <p>{vocabSearch ? t('noResults') : t('noContent')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Grammar Tab ── */}
        {activeTab === 'grammar' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input
                type="text"
                placeholder={t('searchGrammarPlaceholder')}
                value={grammarSearch}
                onChange={(e) => setGrammarSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>

            {/* E12: Grammar mastery summary */}
            <MasteryProgressBar stats={masteryStats.grammar} />

            <p className="text-xs text-navy-400">
              {filteredGrammar.length} {t('grammarPointsShowing')}
            </p>

            {/* Grammar cards */}
            <div className="space-y-3">
              {filteredGrammar.map((g, idx) => {
                const isExpanded = expandedGrammar === g.id;
                return (
                  <div
                    key={g.id}
                    className="rounded-xl border border-cream-100 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGrammar(isExpanded ? null : g.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-violet-600 text-sm font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy-900">{g.title}</p>
                        <p className="text-sm text-teal-600 font-mono mt-0.5">{g.pattern}</p>
                        <MasteryBadge itemId={g.id} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          g.difficulty <= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        )}>
                          {g.difficulty <= 1 ? '\u2605' : '\u2605\u2605'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-navy-300" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-navy-300" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-cream-50 pt-3">
                        <div
                          className="prose prose-sm max-w-none text-navy-700
                            [&_h3]:text-navy-900 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                            [&_p]:text-sm [&_p]:leading-relaxed
                            [&_strong]:text-navy-900
                            [&_.examples]:mt-4 [&_.examples]:border-t [&_.examples]:border-cream-100 [&_.examples]:pt-3
                            [&_.example]:bg-cream-25 [&_.example]:rounded-lg [&_.example]:p-3 [&_.example]:mb-2
                            [&_.zh]:text-base [&_.zh]:text-navy-900 [&_.zh]:font-medium
                            [&_.pinyin]:text-sm [&_.pinyin]:text-teal-600 [&_.pinyin]:font-mono
                            [&_.translation]:text-sm [&_.translation]:text-navy-500
                            [&_.common-errors]:mt-4 [&_.common-errors]:border-t [&_.common-errors]:border-cream-100 [&_.common-errors]:pt-3
                            [&_.error-item]:bg-red-50/50 [&_.error-item]:rounded-lg [&_.error-item]:p-3 [&_.error-item]:mb-2
                            [&_.wrong]:text-red-500 [&_.wrong]:font-bold [&_.wrong]:mr-1
                            [&_.right]:text-emerald-500 [&_.right]:font-bold [&_.right]:mr-1
                            [&_.error]:text-sm [&_.error]:text-red-700
                            [&_.correction]:text-sm [&_.correction]:text-emerald-700
                            [&_.error-explanation]:text-xs [&_.error-explanation]:text-navy-400 [&_.error-explanation]:mt-1"
                          dangerouslySetInnerHTML={{ __html: g.explanation_html }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredGrammar.length === 0 && (
              <div className="text-center py-10 text-navy-400">
                <PenTool className="h-8 w-8 mx-auto mb-2 text-navy-200" />
                <p>{grammarSearch ? t('noResults') : t('noContent')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Characters Tab (full detail view with search) ── */}
        {activeTab === 'characters' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input
                type="text"
                placeholder={t('searchCharPlaceholder') ?? 'Search a character, pinyin...'}
                value={charSearch}
                onChange={(e) => setCharSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>

            {/* E12: Characters mastery summary */}
            <MasteryProgressBar stats={masteryStats.characters} />

            <p className="text-xs text-navy-400">
              {filteredChars.length} {t('charactersShowing') ?? 'caractères'}
            </p>

            {filteredChars.length > 0 ? (
              <div className="space-y-2">
                {filteredChars.map((c) => {
                  const isExpanded = expandedChar === c.id;
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-cream-100 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                        {/* Play audio */}
                        <PlayButton text={c.character} itemId={`ctab-${c.id}`} audioUrl={c.audio_url} />

                        {/* Expandable character row */}
                        <button
                          type="button"
                          onClick={() => setExpandedChar(isExpanded ? null : c.id)}
                          className="flex-1 flex items-center gap-2 sm:gap-3 text-left min-w-0"
                        >
                          <span className="text-2xl font-medium text-navy-900 min-w-[2.5rem] text-center">
                            {c.character}
                          </span>
                          <span className="text-sm text-teal-600 font-mono">{c.pinyin}</span>
                          <span className="flex-1 text-sm text-navy-600 truncate">{c.meaning}</span>
                          <MasteryBadge itemId={c.id} />
                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.radical && (
                              <span className="text-[10px] text-navy-400 bg-cream-50 px-1.5 py-0.5 rounded">部 {c.radical}</span>
                            )}
                            <span className="text-[10px] text-navy-400 bg-cream-50 px-1.5 py-0.5 rounded">{c.stroke_count}画</span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-navy-300" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-navy-300" />
                            )}
                          </div>
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-cream-50 pt-3 space-y-2">
                          {c.radical && (
                            <p className="text-sm text-navy-400">
                              <span className="font-medium">{t('radical') ?? 'Radical'} :</span> {c.radical}
                            </p>
                          )}
                          <p className="text-sm text-navy-400">
                            <span className="font-medium">{t('strokes', { count: c.stroke_count }) ?? `${c.stroke_count} traits`}</span>
                          </p>
                          {c.frequency_rank && (
                            <p className="text-sm text-navy-400">
                              <span className="font-medium">{t('frequency', { rank: c.frequency_rank }) ?? `Fréquence #${c.frequency_rank}`}</span>
                            </p>
                          )}
                          {c.mnemonic && (
                            <div className="bg-amber-50/60 rounded-lg p-3 mt-2">
                              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                                {t('mnemonicLabel') ?? 'Memory tip'}
                              </p>
                              <p className="text-sm text-navy-700">{c.mnemonic}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-navy-400">
                <Languages className="h-8 w-8 mx-auto mb-2 text-navy-200" />
                <p>{charSearch ? t('noResults') : t('noContent')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Modules Tab ── */}
        {activeTab === 'modules' && (
          <div className="space-y-3">
            {props.modules.length > 0 ? (
              props.modules.map((mod) => {
                const isExpanded = expandedModule === mod.id;
                return (
                  <div
                    key={mod.id}
                    className="rounded-xl border border-cream-100 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    {/* Module header — clickable accordion */}
                    <button
                      type="button"
                      onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                      className="w-full flex items-center gap-4 px-4 py-4 text-left"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50 text-navy-600 font-semibold text-sm shrink-0">
                        {mod.sort_order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-navy-900">{mod.title}</h3>
                        {mod.description && (
                          <p className="text-sm text-navy-400 line-clamp-1">{mod.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-navy-400">
                          <span>{t('lessons', { count: mod.lesson_count })}</span>
                          {mod.estimated_duration_minutes && (
                            <span>{t('estimatedTime', { minutes: mod.estimated_duration_minutes })}</span>
                          )}
                          <span className={cn(
                            'px-1.5 py-0.5 rounded-full text-[10px]',
                            mod.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-cream-100 text-navy-400'
                          )}>
                            {mod.status === 'published' ? t('available') : t('comingSoon')}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-navy-300" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-navy-300" />
                        )}
                      </div>
                    </button>

                    {/* Lessons list — expandable */}
                    {isExpanded && mod.lessons.length > 0 && (
                      <div className="border-t border-cream-100 bg-cream-25/50">
                        {mod.lessons.map((lesson, idx) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => router.push(`/courses/${props.slug}/lessons/${lesson.id}`)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-50/50',
                              idx < mod.lessons.length - 1 && 'border-b border-cream-100/50'
                            )}
                          >
                            {/* Lesson number */}
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 text-teal-600 text-xs font-semibold shrink-0">
                              {lesson.sort_order}
                            </div>

                            {/* Lesson info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-navy-800 truncate">{lesson.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-navy-400">
                                {lesson.estimated_duration_minutes && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {lesson.estimated_duration_minutes} min
                                  </span>
                                )}
                                {lesson.exercise_count > 0 && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Dumbbell className="h-3 w-3" />
                                    {lesson.exercise_count} {t('exerciseCount') ?? 'exercises'}
                                  </span>
                                )}
                                {lesson.lesson_type && lesson.lesson_type !== 'standard' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500">
                                    <FileText className="h-3 w-3" />
                                    {lesson.lesson_type}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status + arrow */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                'w-2 h-2 rounded-full',
                                lesson.status === 'published' ? 'bg-emerald-400' : 'bg-cream-300'
                              )} />
                              <Play className="h-4 w-4 text-teal-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Empty lessons state */}
                    {isExpanded && mod.lessons.length === 0 && (
                      <div className="border-t border-cream-100 px-4 py-6 text-center text-sm text-navy-400">
                        {t('noLessonsYet') ?? 'Lessons coming soon...'}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-navy-400">
                <Layers className="h-8 w-8 mx-auto mb-2 text-navy-200" />
                <p>{t('noModules')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
