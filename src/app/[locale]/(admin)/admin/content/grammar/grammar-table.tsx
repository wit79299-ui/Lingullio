'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import type { GrammarPointWithTranslation } from '@/lib/admin/queries';
import type { ContentStatus } from '@/types/database';
import type { Column } from '@/components/ui/data-table';

function getStatusVariant(status: ContentStatus) {
  const map: Record<ContentStatus, 'published' | 'draft' | 'archived' | 'new'> = {
    published: 'published',
    draft: 'draft',
    validated: 'new',
    archived: 'archived',
  };
  return map[status] ?? 'draft';
}

function getTitle(
  translations: Array<{ locale: string; title: string }>,
  locale: string
): string {
  const match = translations.find((t) => t.locale === locale);
  if (match) return match.title;
  const fallback = translations.find((t) => t.locale === 'fr') ?? translations[0];
  return fallback?.title ?? '---';
}

interface Props {
  items: GrammarPointWithTranslation[];
  locale: string;
}

export function GrammarTable({ items, locale }: Props) {
  const t = useTranslations('admin');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter) result = result.filter((g) => g.status === statusFilter);
    if (levelFilter) result = result.filter((g) => g.level === levelFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) =>
        g.pattern.toLowerCase().includes(q) ||
        getTitle(g.translations, locale).toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search, statusFilter, levelFilter, locale]);

  const columns: Column<GrammarPointWithTranslation>[] = [
    {
      key: 'sort_order',
      header: '#',
      className: 'w-12',
      render: (item) => (
        <span className="text-xs text-navy-400">{item.sort_order ?? ''}</span>
      ),
    },
    {
      key: 'pattern',
      header: t('pattern'),
      render: (item) => (
        <span className="font-mono text-sm font-medium text-navy-900">{item.pattern}</span>
      ),
    },
    {
      key: 'title',
      header: t('title'),
      render: (item) => (
        <span className="text-sm text-navy-700">{getTitle(item.translations, locale)}</span>
      ),
    },
    {
      key: 'level',
      header: t('level'),
      className: 'w-20',
      render: (item) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy-100 text-xs font-bold text-navy-700">
          {item.level}
        </span>
      ),
    },
    {
      key: 'difficulty',
      header: t('difficulty'),
      className: 'w-24 hidden lg:table-cell',
      render: (item) => (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${i < item.difficulty ? 'bg-gold-500' : 'bg-navy-100'}`}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      className: 'w-24',
      render: (item) => (
        <Badge variant={getStatusVariant(item.status)}>
          {t(item.status)}
        </Badge>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'published', label: t('published') },
    { value: 'draft', label: t('draft') },
  ];

  const levelOptions = [
    { value: '', label: t('allLevels') },
    ...Array.from({ length: 9 }, (_, i) => ({
      value: String(i + 1),
      label: `HSK ${i + 1}`,
    })),
  ];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('search')}
            className="sm:max-w-xs"
          />
          <StatusFilter
            value={levelFilter}
            onChange={setLevelFilter}
            options={levelOptions}
          />
          <StatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
          />
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(item) => item.id}
          emptyMessage={t('noData')}
        />
      </CardContent>
    </Card>
  );
}
