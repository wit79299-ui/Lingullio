'use client';

import { useState } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTranslations, useMessages } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { VocabWord } from '@/lib/learner/queries';
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Volume2,
  Hash,
} from 'lucide-react';

interface VocabularyExplorerProps {
  words: VocabWord[];
  total: number;
  themes: string[];
  wordTypes: string[];
  currentPage: number;
  currentSearch: string;
  currentTheme: string;
  currentWordType: string;
  slug: string;
  courseTitle: string;
  hskLevel: string;
}

export function VocabularyExplorer({
  words,
  total,
  themes,
  wordTypes,
  currentPage,
  currentSearch,
  currentTheme,
  currentWordType,
  slug,
  courseTitle,
  hskLevel,
}: VocabularyExplorerProps) {
  const t = useTranslations('courses');
  const messages = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Safe translation helpers that fallback to raw key
  const courseMessages = (messages?.courses ?? {}) as Record<string, unknown>;
  const themeMessages = (courseMessages?.themes ?? {}) as Record<string, string>;
  const wordTypeMessages = (courseMessages?.wordTypes ?? {}) as Record<string, string>;

  function translateTheme(key: string): string {
    return themeMessages[key] ?? key.replace(/_/g, ' ');
  }
  function translateWordType(key: string): string {
    return wordTypeMessages[key] ?? key.replace(/_/g, ' ');
  }
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(Boolean(currentTheme || currentWordType));

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = {
      search: currentSearch,
      theme: currentTheme,
      wordType: currentWordType,
      page: String(currentPage),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== '' && v !== '1') params.set(k, v);
    });
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: searchInput, page: '1' });
  }

  function clearFilters() {
    setSearchInput('');
    router.push(pathname);
  }

  const hasActiveFilters = currentSearch || currentTheme || currentWordType;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            {t('vocabularyTab')} HSK {hskLevel}
          </h1>
          <p className="text-sm text-navy-400 mt-1 ml-[52px]">
            {t('wordsCount', { count: total, total })}
          </p>
        </div>
      </header>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <Button
            type="button"
            variant={showFilters ? 'teal' : 'secondary'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            aria-label={t('allThemes')}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-cream-25 rounded-xl border border-cream-100">
            {/* Theme filter */}
            <select
              value={currentTheme}
              onChange={(e) => navigate({ theme: e.target.value, page: '1' })}
              className="px-3 py-2 rounded-full border border-cream-200 bg-white text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{t('allThemes')}</option>
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {translateTheme(theme)}
                </option>
              ))}
            </select>

            {/* Word type filter */}
            <select
              value={currentWordType}
              onChange={(e) => navigate({ wordType: e.target.value, page: '1' })}
              className="px-3 py-2 rounded-full border border-cream-200 bg-white text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">{t('allTypes')}</option>
              {wordTypes.map((wt) => (
                <option key={wt} value={wt}>
                  {translateWordType(wt)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-navy-400">
        <span>{t('wordsCount', { count: words.length, total })}</span>
        {totalPages > 1 && (
          <span>{t('page', { current: currentPage, total: totalPages })}</span>
        )}
      </div>

      {/* Vocabulary Cards */}
      {words.length > 0 ? (
        <div className="space-y-3">
          {words.map((word) => {
            const isExpanded = expandedId === word.id;

            return (
              <Card
                key={word.id}
                className={`transition-all duration-200 ${isExpanded ? 'ring-2 ring-teal-200 shadow-md' : 'hover:shadow-sm'}`}
              >
                <CardContent className="py-0 px-0">
                  {/* Main row — always visible */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : word.id)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    {/* Chinese character(s) */}
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-cream-50 to-cream-100 shrink-0">
                      <span className="text-2xl font-medium text-navy-900">
                        {word.simplified}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-navy-900">
                          {word.simplified}
                        </span>
                        {word.traditional && word.traditional !== word.simplified && (
                          <span className="text-sm text-navy-300">({word.traditional})</span>
                        )}
                        <span className="text-sm text-teal-600 font-medium">
                          {word.pinyin}
                        </span>
                      </div>
                      <p className="text-sm text-navy-500 mt-0.5 truncate">
                        {word.meaning}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {word.word_type && (
                          <Badge variant="new" className="text-[10px] py-0.5">
                            {translateWordType(word.word_type)}
                          </Badge>
                        )}
                        {word.theme && (
                          <Badge variant="inProgress" className="text-[10px] py-0.5">
                            {translateTheme(word.theme)}
                          </Badge>
                        )}
                        {word.frequency_rank && (
                          <span className="text-[10px] text-navy-300 flex items-center gap-0.5">
                            <Hash className="h-2.5 w-2.5" />
                            {word.frequency_rank}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand icon */}
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-navy-300" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-navy-300" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-cream-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Meaning */}
                        <div>
                          <p className="text-xs font-medium text-navy-400 uppercase mb-1">{t('meaning')}</p>
                          <p className="text-sm text-navy-700">{word.meaning}</p>
                        </div>

                        {/* Pinyin */}
                        <div>
                          <p className="text-xs font-medium text-navy-400 uppercase mb-1">{t('pinyin')}</p>
                          <p className="text-sm text-navy-700 flex items-center gap-2">
                            {word.pinyin}
                            <Volume2 className="h-4 w-4 text-teal-500 cursor-pointer hover:text-teal-600" />
                          </p>
                        </div>

                        {/* Word type */}
                        {word.word_type && (
                          <div>
                            <p className="text-xs font-medium text-navy-400 uppercase mb-1">{t('wordType')}</p>
                            <p className="text-sm text-navy-700">
                              {translateWordType(word.word_type)}
                            </p>
                          </div>
                        )}

                        {/* Theme */}
                        {word.theme && (
                          <div>
                            <p className="text-xs font-medium text-navy-400 uppercase mb-1">{t('theme')}</p>
                            <p className="text-sm text-navy-700">
                              {translateTheme(word.theme)}
                            </p>
                          </div>
                        )}

                        {/* Frequency */}
                        {word.frequency_rank && (
                          <div>
                            <p className="text-xs font-medium text-navy-400 uppercase mb-1">{t('frequency', { rank: word.frequency_rank })}</p>
                            <div className="w-full bg-cream-100 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-teal-500 h-1.5 rounded-full"
                                style={{ width: `${Math.max(5, 100 - (word.frequency_rank / 300) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Example sentence */}
                      {word.example_sentence && (
                        <div className="mt-4 p-3 rounded-lg bg-cream-25 border border-cream-100">
                          <p className="text-xs font-medium text-navy-400 uppercase mb-2">{t('example')}</p>
                          <p className="text-base text-navy-900 font-medium">{word.example_sentence}</p>
                          {word.example_pinyin && (
                            <p className="text-sm text-teal-600 mt-1">{word.example_pinyin}</p>
                          )}
                          {word.example_translation && (
                            <p className="text-sm text-navy-500 mt-1 italic">{word.example_translation}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 text-navy-200 mx-auto mb-3" />
            <p className="text-navy-400">
              {hasActiveFilters ? t('noResults') : t('noVocabulary')}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => navigate({ page: String(currentPage - 1) })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('prevPage')}
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => navigate({ page: String(p) })}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-navy-900 text-white'
                    : 'text-navy-500 hover:bg-cream-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => navigate({ page: String(currentPage + 1) })}
          >
            {t('nextPage')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
