'use client';

import { useTranslations, useMessages } from 'next-intl';
import { useState, useCallback, useRef } from 'react';
import { BookOpen, PenTool, Languages, Layers, ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from '@/i18n/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VocabWord {
  id: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  hsk_level: string;
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
  hsk_level: string;
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
  hsk_level: string;
  frequency_rank: number | null;
  meaning: string;
  mnemonic: string | null;
}

interface ModuleCard {
  id: string;
  sort_order: number;
  status: string;
  estimated_duration_minutes: number | null;
  title: string;
  description: string | null;
  lesson_count: number;
}

export interface CourseTabsProps {
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

type TabId = 'vocabulary' | 'grammar' | 'characters' | 'modules';

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
  const [vocabSearch, setVocabSearch] = useState('');
  const [grammarSearch, setGrammarSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((word: VocabWord) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setPlayingId(word.id);

    // Use Web Speech API (works on all modern browsers including mobile)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word.simplified);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;

      // Try to find a Chinese voice for better quality
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh')) 
        ?? voices.find(v => v.lang.includes('CN') || v.lang.includes('cmn'));
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);

      // Some mobile browsers need a small delay
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);

      // Safety timeout: reset playing state after 3s in case events don't fire
      setTimeout(() => setPlayingId((prev) => prev === word.id ? null : prev), 3000);
    } else {
      setPlayingId(null);
    }
  }, []);

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

  // Filter vocab client-side for quick search within loaded page
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

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-cream-100 overflow-x-auto -mx-1 scrollbar-hide">
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

      {/* Tab content */}
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

            {/* Word count */}
            <p className="text-xs text-navy-400">
              {filteredVocab.length} {t('wordsShowing')} {vocabSearch ? `(${t('filtered')})` : `(${props.vocabulary.total} ${t('total')})`}
            </p>

            {/* Word cards */}
            <div className="space-y-2">
              {filteredVocab.map((word) => {
                const isExpanded = expandedVocab === word.id;
                return (
                  <div
                    key={word.id}
                    className="rounded-xl border border-cream-100 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                      {/* Play audio button — larger touch target on mobile */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playAudio(word);
                        }}
                        className={cn(
                          'shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95',
                          playingId === word.id
                            ? 'text-white bg-teal-500 shadow-sm animate-pulse'
                            : 'text-teal-500 bg-teal-50 hover:bg-teal-100 active:bg-teal-200'
                        )}
                        aria-label={`Écouter ${word.simplified}`}
                      >
                        <Volume2 className="h-4.5 w-4.5" />
                      </button>

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
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-navy-300 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-navy-300 shrink-0" />
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-cream-50 pt-3 space-y-2">
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
                          <div className="bg-cream-25 rounded-lg p-3 mt-2">
                            <p className="text-base text-navy-900">{word.example_sentence}</p>
                            {word.example_pinyin && (
                              <p className="text-sm text-teal-600 font-mono mt-1">{word.example_pinyin}</p>
                            )}
                            {word.example_translation && (
                              <p className="text-sm text-navy-500 mt-1">{word.example_translation}</p>
                            )}
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
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          g.difficulty <= 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        )}>
                          {g.difficulty <= 1 ? '★' : '★★'}
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

        {/* ── Characters Tab ── */}
        {activeTab === 'characters' && (
          <div className="space-y-4">
            {props.characters.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {props.characters.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col items-center p-4 rounded-xl border border-cream-100 bg-white hover:shadow-sm transition-shadow"
                  >
                    <span className="text-3xl font-medium text-navy-900 mb-1">{c.character}</span>
                    <span className="text-sm text-teal-600 font-mono">{c.pinyin}</span>
                    <span className="text-xs text-navy-500 text-center mt-1 line-clamp-2">{c.meaning}</span>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-navy-400">
                      {c.radical && <span>部 {c.radical}</span>}
                      <span>{c.stroke_count} traits</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-navy-400">
                <Languages className="h-8 w-8 mx-auto mb-2 text-navy-200" />
                <p>{t('noContent')}</p>
                <p className="text-xs mt-1">{t('comingSoon')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Modules Tab ── */}
        {activeTab === 'modules' && (
          <div className="space-y-3">
            {props.modules.length > 0 ? (
              props.modules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl border border-cream-100 bg-white hover:shadow-sm transition-shadow"
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
                </div>
              ))
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
