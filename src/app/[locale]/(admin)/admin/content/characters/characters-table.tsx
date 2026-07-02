'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import type { CharacterWithTranslation } from '@/lib/admin/queries';
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

function getMeaning(
  translations: Array<{ locale: string; meaning: string }>,
  locale: string
): string {
  const match = translations.find((t) => t.locale === locale);
  if (match) return match.meaning;
  const fallback = translations.find((t) => t.locale === 'fr') ?? translations[0];
  return fallback?.meaning ?? '---';
}

interface Props {
  items: CharacterWithTranslation[];
  locale: string;
}

export function CharactersTable({ items, locale }: Props) {
  const t = useTranslations('admin');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    if (levelFilter) result = result.filter((c) => c.hsk_level === levelFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.character.includes(q) ||
        c.pinyin.toLowerCase().includes(q) ||
        getMeaning(c.translations, locale).toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search, statusFilter, levelFilter, locale]);

  const columns: Column<CharacterWithTranslation>[] = [
    {
      key: 'character',
      header: t('character'),
      className: 'w-20',
      render: (item) => (
        <span className="text-3xl font-normal text-navy-900">{item.character}</span>
      ),
    },
    {
      key: 'pinyin',
      header: t('pinyin'),
      render: (item) => (
        <span className="text-sm text-blue-600 font-mono">{item.pinyin}</span>
      ),
    },
    {
      key: 'meaning',
      header: t('meaning'),
      render: (item) => (
        <span className="text-sm text-navy-700">{getMeaning(item.translations, locale)}</span>
      ),
    },
    {
      key: 'radical',
      header: t('radical'),
      className: 'w-16 hidden lg:table-cell',
      render: (item) => (
        <span className="text-lg text-navy-500">{item.radical ?? '---'}</span>
      ),
    },
    {
      key: 'stroke_count',
      header: t('strokeCount'),
      className: 'w-16',
      render: (item) => (
        <span className="text-sm text-navy-600">{item.stroke_count}</span>
      ),
    },
    {
      key: 'hsk_level',
      header: t('level'),
      className: 'w-16',
      render: (item) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy-100 text-xs font-bold text-navy-700">
          {item.hsk_level}
        </span>
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
